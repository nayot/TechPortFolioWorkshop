require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const { google } = require('googleapis');

const {
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL = 'qwen/qwen3-235b-a22b',
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI = 'http://localhost:3000/api/auth/google/callback',
  SESSION_SECRET,
  PORT = 3000,
  ALLOWED_ORIGIN = 'http://localhost:5173',
  NODE_ENV,
} = process.env;

if (!SESSION_SECRET) console.warn('[warn] SESSION_SECRET not set — using insecure default');
if (!GOOGLE_CLIENT_ID) console.warn('[warn] GOOGLE_CLIENT_ID not set');
if (!GOOGLE_CLIENT_SECRET) console.warn('[warn] GOOGLE_CLIENT_SECRET not set — OAuth will not work');
if (!OPENROUTER_API_KEY) console.warn('[warn] OPENROUTER_API_KEY not set');

const app = express();
app.set('trust proxy', 1);

app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(session({
  name: 'techport.sid',
  secret: SESSION_SECRET || 'insecure-dev-secret',
  resave: false,
  saveUninitialized: false,
  store: new FileStore({ path: './sessions', ttl: 7 * 24 * 3600, retries: 0, logFn: () => {} }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function makeOAuth2Client() {
  return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
}

function getDriveClient(req) {
  const oauth2 = makeOAuth2Client();
  oauth2.setCredentials(req.session.tokens);
  return google.drive({ version: 'v3', auth: oauth2 });
}

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'unauthenticated' });
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/config', (_req, res) => res.json({ model: OPENROUTER_MODEL || 'unknown' }));

// ─── Auth routes ──────────────────────────────────────────────────────────────

app.get('/api/auth/google', (_req, res) => {
  const oauth2 = makeOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/drive.file',
    ],
  });
  res.redirect(url);
});

app.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const oauth2 = makeOAuth2Client();
    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);

    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
    const { data: profile } = await oauth2Api.userinfo.get();

    req.session.user = {
      sub: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    };
    req.session.tokens = tokens;

    const frontendOrigin = ALLOWED_ORIGIN.replace(/\/$/, '');
    res.redirect(`${frontendOrigin}/`);
  } catch (err) {
    console.error('[auth/callback]', err.message);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'unauthenticated' });
  res.json({ user: req.session.user });
});

app.post('/api/auth/logout', (req, res) => {
  if (req.session) req.session.destroy(() => res.clearCookie('techport.sid').json({ ok: true }));
  else res.json({ ok: true });
});

// ─── AI proxy ─────────────────────────────────────────────────────────────────

const aiLimiter = rateLimit({ windowMs: 60_000, max: 30 });

app.post('/api/ai/complete', requireAuth, aiLimiter, async (req, res) => {
  if (!OPENROUTER_API_KEY) return res.status(500).json({ error: 'OPENROUTER_API_KEY not set' });

  const { messages, model } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const MAX_ATTEMPTS = 3;
  let lastStatus, lastText;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    try {
      const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': ALLOWED_ORIGIN,
          'X-Title': 'Maejo Tech Portfolio',
        },
        body: JSON.stringify({ model: model || OPENROUTER_MODEL, messages }),
      });
      clearTimeout(timeout);

      if (upstream.status === 429) {
        lastStatus = 429;
        lastText = await upstream.text();
        const retryAfter = parseInt(upstream.headers.get('retry-after') || '5', 10);
        const delay = Math.min(retryAfter, 15) * 1000;
        console.warn(`[ai] 429 rate limit (attempt ${attempt + 1}), retrying in ${delay / 1000}s`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }

      if (!upstream.ok) {
        const text = await upstream.text();
        console.error('[ai] upstream error', upstream.status, text);
        return res.status(502).json({ error: `AI service returned ${upstream.status}` });
      }

      const data = await upstream.json();
      const content = data?.choices?.[0]?.message?.content ?? '';
      return res.json({ content });
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') return res.status(504).json({ error: 'AI request timed out' });
      console.error('[ai] error', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  console.error('[ai] rate limited after all retries', lastText);
  return res.status(429).json({ error: 'AI rate limit exceeded, please try again in a moment' });
});

// ─── Drive: folder helper ─────────────────────────────────────────────────────

const FOLDER_NAME = 'Tech Port App';
const FILE_EXT = '.techport.json';

async function ensureFolder(drive, session) {
  if (session.driveFolderId) return session.driveFolderId;

  const q = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const list = await drive.files.list({ q, fields: 'files(id)', pageSize: 1 });
  if (list.data.files.length > 0) {
    session.driveFolderId = list.data.files[0].id;
    return session.driveFolderId;
  }

  const folder = await drive.files.create({
    requestBody: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  session.driveFolderId = folder.data.id;
  return session.driveFolderId;
}

// ─── Projects CRUD ────────────────────────────────────────────────────────────

app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const drive = getDriveClient(req);
    const folderId = await ensureFolder(drive, req.session);
    const q = `'${folderId}' in parents and name contains '${FILE_EXT}' and trashed=false`;
    const list = await drive.files.list({ q, fields: 'files(id,name,modifiedTime)', orderBy: 'modifiedTime desc' });
    res.json({ projects: list.data.files });
  } catch (err) {
    console.error('[projects/list]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', requireAuth, async (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const drive = getDriveClient(req);
    const folderId = await ensureFolder(drive, req.session);
    const fileName = `${name}${FILE_EXT}`;
    const initialData = { name, createdAt: new Date().toISOString(), steps: {} };
    const file = await drive.files.create({
      requestBody: { name: fileName, parents: [folderId], mimeType: 'application/json' },
      media: { mimeType: 'application/json', body: JSON.stringify(initialData) },
      fields: 'id,name',
    });
    res.json({ id: file.data.id, name: file.data.name, data: initialData });
  } catch (err) {
    console.error('[projects/create]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const drive = getDriveClient(req);
    const content = await drive.files.get({ fileId: req.params.id, alt: 'media' });
    res.json(content.data);
  } catch (err) {
    console.error('[projects/get]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const drive = getDriveClient(req);
    await drive.files.update({
      fileId: req.params.id,
      media: { mimeType: 'application/json', body: JSON.stringify(req.body) },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[projects/update]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const drive = getDriveClient(req);
    await drive.files.delete({ fileId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    console.error('[projects/delete]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Export to Google Docs ────────────────────────────────────────────────────

app.post('/api/projects/:id/export-doc', requireAuth, async (req, res) => {
  const { html, title } = req.body || {};
  if (!html) return res.status(400).json({ error: 'html required' });
  try {
    const drive = getDriveClient(req);
    const folderId = await ensureFolder(drive, req.session);
    const file = await drive.files.create({
      requestBody: {
        name: title || 'Tech Portfolio',
        parents: [folderId],
        mimeType: 'application/vnd.google-apps.document',
      },
      media: { mimeType: 'text/html', body: html },
      fields: 'id,webViewLink',
    });
    res.json({ link: file.data.webViewLink });
  } catch (err) {
    console.error('[export-doc]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── CV upload + parse ────────────────────────────────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

app.post('/api/cv/upload', requireAuth, upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file or unsupported type (PDF/DOCX only)' });
  try {
    let text = '';
    if (req.file.mimetype === 'application/pdf') {
      const pdfParse = require('pdf-parse');
      const parsed = await pdfParse(req.file.buffer);
      text = parsed.text;
    } else {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    }
    res.json({ text: text.trim() });
  } catch (err) {
    console.error('[cv/upload]', err.message);
    res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

// ─── Static (production Vite build) ──────────────────────────────────────────

if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => console.log(`Tech Portfolio server → http://localhost:${PORT}`));
