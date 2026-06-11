require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
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
  ALLOWED_EMAILS = '',
  ADMIN_EMAILS = '',
  NODE_ENV,
} = process.env;

if (!SESSION_SECRET) console.warn('[warn] SESSION_SECRET not set — using insecure default');
if (!GOOGLE_CLIENT_ID) console.warn('[warn] GOOGLE_CLIENT_ID not set');
if (!GOOGLE_CLIENT_SECRET) console.warn('[warn] GOOGLE_CLIENT_SECRET not set — OAuth will not work');
if (!OPENROUTER_API_KEY) console.warn('[warn] OPENROUTER_API_KEY not set');

// ─── Admin config ─────────────────────────────────────────────────────────────

const ADMIN_CONFIG_PATH = path.join(__dirname, 'data', 'admin.json');

const adminEmailSet = new Set(
  ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
);
if (adminEmailSet.size === 0) console.warn('[warn] ADMIN_EMAILS not set — no admin access possible');

function isAdmin(email) { return adminEmailSet.has(email?.toLowerCase()); }

function loadAdminConfig() {
  try { return JSON.parse(fs.readFileSync(ADMIN_CONFIG_PATH, 'utf8')); }
  catch {
    const cfg = {
      appEnabled: true,
      allowedEmails: ALLOWED_EMAILS
        ? ALLOWED_EMAILS.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
        : [],
      model: OPENROUTER_MODEL,
    };
    saveAdminConfig(cfg);
    return cfg;
  }
}

function saveAdminConfig(cfg) {
  const dir = path.dirname(ADMIN_CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = ADMIN_CONFIG_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), 'utf8');
  fs.renameSync(tmp, ADMIN_CONFIG_PATH);
}

let adminConfig = loadAdminConfig();

// ─── Local project storage helpers ───────────────────────────────────────────

function safeSub(sub) {
  if (!sub || !/^\d+$/.test(String(sub))) throw new Error('invalid user id');
  return String(sub);
}

function safeProjectId(id) {
  if (!id || !/^[0-9a-f-]{8,40}$/.test(id)) throw new Error('invalid project id');
  return id;
}

function userProjectsDir(sub) {
  return path.join(__dirname, 'data', 'projects', safeSub(sub));
}

function projectFilePath(sub, id) {
  return path.join(userProjectsDir(sub), safeProjectId(id) + '.json');
}

function ensureUserDir(sub) {
  const dir = userProjectsDir(sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeProjectFile(filePath, data) {
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

// ─── Express setup ────────────────────────────────────────────────────────────

const app = express();
app.set('trust proxy', 1);

app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(session({
  name: 'techport.sid',
  secret: SESSION_SECRET || 'insecure-dev-secret',
  resave: false,
  saveUninitialized: false,
  store: new FileStore({ path: './sessions', ttl: 7 * 24 * 3600, retries: 0 }),
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

function requireAuth(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'unauthenticated' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.user) return res.status(401).json({ error: 'unauthenticated' });
  if (!isAdmin(req.session.user.email)) return res.status(403).json({ error: 'forbidden' });
  next();
}

function requireAppEnabled(req, res, next) {
  if (!adminConfig.appEnabled && !isAdmin(req.session?.user?.email))
    return res.status(503).json({ error: 'app_disabled' });
  next();
}

// ─── Health ───────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/config', (_req, res) => res.json({
  model: adminConfig.model || 'unknown',
  appEnabled: adminConfig.appEnabled,
}));

// ─── Auth routes ──────────────────────────────────────────────────────────────

app.get('/api/auth/google', (_req, res) => {
  const oauth2 = makeOAuth2Client();
  const url = oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: ['openid', 'email', 'profile'],
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

    const frontendOrigin = ALLOWED_ORIGIN.replace(/\/$/, '');
    const emailLower = profile.email.toLowerCase();
    const list = adminConfig.allowedEmails;

    if (list.length > 0 && !list.includes(emailLower) && !isAdmin(emailLower)) {
      console.warn('[auth] blocked:', profile.email);
      return res.redirect(`${frontendOrigin}/?error=unauthorized&email=${encodeURIComponent(profile.email)}`);
    }

    req.session.user = {
      sub: profile.id,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    };

    req.session.save((err) => {
      if (err) {
        console.error('[auth/callback] session save error:', err);
        return res.status(500).send('Authentication succeeded, but the session could not be saved');
      }
      res.redirect(`${frontendOrigin}/`);
    });
  } catch (err) {
    console.error('[auth/callback]', err.message);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'unauthenticated' });
  res.json({ user: req.session.user, isAdmin: isAdmin(req.session.user.email) });
});

app.post('/api/auth/logout', (req, res) => {
  if (req.session) req.session.destroy(() => res.clearCookie('techport.sid').json({ ok: true }));
  else res.json({ ok: true });
});

// ─── Admin routes ─────────────────────────────────────────────────────────────

app.get('/api/admin/config', requireAdmin, (_req, res) => res.json(adminConfig));

app.put('/api/admin/config', requireAdmin, (req, res) => {
  const { appEnabled, allowedEmails, model, openrouterApiKey } = req.body || {};
  if (typeof appEnabled === 'boolean') adminConfig.appEnabled = appEnabled;
  if (Array.isArray(allowedEmails))
    adminConfig.allowedEmails = allowedEmails.map(e => e.trim().toLowerCase()).filter(Boolean);
  if (typeof model === 'string' && model.trim()) adminConfig.model = model.trim();
  if (typeof openrouterApiKey === 'string') adminConfig.openrouterApiKey = openrouterApiKey.trim();
  try {
    saveAdminConfig(adminConfig);
    res.json({ ok: true, config: adminConfig });
  } catch (err) {
    console.error('[admin/config] save error:', err.message);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.post('/api/admin/restart', requireAdmin, (_req, res) => {
  res.json({ ok: true });
  setTimeout(() => process.exit(0), 300);
});

// ─── AI proxy ─────────────────────────────────────────────────────────────────

const aiLimiter = rateLimit({ windowMs: 60_000, max: 30 });

app.post('/api/ai/complete', requireAppEnabled, requireAuth, aiLimiter, async (req, res) => {
  const effectiveApiKey = adminConfig.openrouterApiKey || OPENROUTER_API_KEY;
  if (!effectiveApiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not set' });

  const { messages, model } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages array required' });
  }

  const MAX_ATTEMPTS = 3;
  let lastText;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    try {
      const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${effectiveApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': ALLOWED_ORIGIN,
          'X-Title': 'Maejo Tech Portfolio',
        },
        body: JSON.stringify({ model: model || adminConfig.model, messages }),
      });
      clearTimeout(timeout);

      if (upstream.status === 429) {
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

// ─── Projects CRUD (local file storage) ──────────────────────────────────────

app.get('/api/projects', requireAppEnabled, requireAuth, (req, res) => {
  try {
    const dir = userProjectsDir(req.session.user.sub);
    if (!fs.existsSync(dir)) return res.json({ projects: [] });

    const projects = fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
          const stat = fs.statSync(path.join(dir, f));
          return { id: data.id, name: data.name, modifiedTime: stat.mtime.toISOString() };
        } catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => new Date(b.modifiedTime) - new Date(a.modifiedTime));

    res.json({ projects });
  } catch (err) {
    console.error('[projects/list]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects', requireAppEnabled, requireAuth, (req, res) => {
  const { name } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const sub = req.session.user.sub;
    ensureUserDir(sub);
    const id = randomUUID();
    const fileName = `${name}.techport.json`;
    const data = { id, name: fileName, createdAt: new Date().toISOString(), steps: {} };
    writeProjectFile(projectFilePath(sub, id), data);
    res.json({ id, name: fileName, data });
  } catch (err) {
    console.error('[projects/create]', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/projects/:id', requireAppEnabled, requireAuth, (req, res) => {
  try {
    const filePath = projectFilePath(req.session.user.sub, req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  } catch (err) {
    console.error('[projects/get]', err.message);
    res.status(err.message.includes('invalid') ? 400 : 500).json({ error: err.message });
  }
});

app.put('/api/projects/:id', requireAppEnabled, requireAuth, (req, res) => {
  try {
    const filePath = projectFilePath(req.session.user.sub, req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    const data = { ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
    writeProjectFile(filePath, data);
    res.json({ ok: true });
  } catch (err) {
    console.error('[projects/update]', err.message);
    res.status(err.message.includes('invalid') ? 400 : 500).json({ error: err.message });
  }
});

app.delete('/api/projects/:id', requireAppEnabled, requireAuth, (req, res) => {
  try {
    const filePath = projectFilePath(req.session.user.sub, req.params.id);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
    fs.unlinkSync(filePath);
    res.json({ ok: true });
  } catch (err) {
    console.error('[projects/delete]', err.message);
    res.status(err.message.includes('invalid') ? 400 : 500).json({ error: err.message });
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

app.post('/api/cv/upload', requireAppEnabled, requireAuth, upload.single('cv'), async (req, res) => {
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
