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

// ─── Usage logging ────────────────────────────────────────────────────────────

const USAGE_LOG_PATH = path.join(__dirname, 'data', 'usage.jsonl');

// Fallback pricing per 1M tokens (USD) for models that don't return cost directly.
// Source: OpenRouter pricing (June 2026). Use data.usage.cost from response when available.
const MODEL_PRICING = {
  'openai/gpt-4.1-mini':               { in: 0.40,  out: 1.60  },
  'openai/gpt-4.1':                    { in: 2.00,  out: 8.00  },
  'anthropic/claude-sonnet-4-5':       { in: 3.00,  out: 15.00 },
  'google/gemini-2.5-flash':           { in: 0.15,  out: 0.60  },
  'qwen/qwen3-235b-a22b':              { in: 0.14,  out: 0.60  },
  'qwen/qwen3-30b-a3b':                { in: 0.10,  out: 0.30  },
  'meta-llama/llama-3.3-70b-instruct': { in: 0.12,  out: 0.40  },
};

function estimateCost(model, inputTokens, outputTokens) {
  const p = MODEL_PRICING[model] || MODEL_PRICING[model?.split(':')[0]];
  if (!p) return null;
  return (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
}

function appendUsageLog(entry) {
  try {
    fs.mkdirSync(path.dirname(USAGE_LOG_PATH), { recursive: true });
    fs.appendFileSync(USAGE_LOG_PATH, JSON.stringify(entry) + '\n', 'utf8');
  } catch (err) {
    console.error('[usage-log]', err.message);
  }
}

// Bucket a UTC ISO timestamp into a Thai-time (UTC+7) key at the given resolution.
// Returns YYYY-MM-DD for '1d', YYYY-MM-DDTHH:MM for sub-day resolutions.
const RESOLUTION_MS = { '1m': 60_000, '10m': 600_000, '30m': 1_800_000, '1h': 3_600_000, '1d': 86_400_000 };
const THAI_OFFSET_MS = 7 * 3600_000;

function toBucket(isoStr, resolution) {
  const d = new Date(new Date(isoStr).getTime() + THAI_OFFSET_MS);
  const Y = d.getUTCFullYear();
  const M = String(d.getUTCMonth() + 1).padStart(2, '0');
  const D = String(d.getUTCDate()).padStart(2, '0');
  if (resolution === '1d') return `${Y}-${M}-${D}`;
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = d.getUTCMinutes();
  const step = RESOLUTION_MS[resolution] / 60_000; // minutes per bucket
  const bucketMin = String(Math.floor(m / step) * step).padStart(2, '0');
  return `${Y}-${M}-${D}T${h}:${bucketMin}`;
}

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

app.get('/api/admin/projects', requireAdmin, (_req, res) => {
  try {
    const baseDir = path.join(__dirname, 'data', 'projects');
    if (!fs.existsSync(baseDir)) return res.json({ owners: [] });
    const subs = fs.readdirSync(baseDir).filter(name =>
      fs.statSync(path.join(baseDir, name)).isDirectory()
    );
    const owners = subs.map(sub => {
      const dir = path.join(baseDir, sub);
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      let ownerEmail = '', ownerName = '';
      const projects = files.map(f => {
        try {
          const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
          if (!ownerEmail && raw.ownerEmail) { ownerEmail = raw.ownerEmail; ownerName = raw.ownerName || ''; }
          return { id: raw.id, name: raw.name, createdAt: raw.createdAt, updatedAt: raw.updatedAt };
        } catch { return null; }
      }).filter(Boolean);
      return { sub, ownerEmail, ownerName, projects };
    });
    res.json({ owners });
  } catch (err) {
    console.error('[admin/projects]', err.message);
    res.status(500).json({ error: err.message });
  }
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
        body: JSON.stringify({ model: model || adminConfig.model, messages, usage: { include: true } }),
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

      // Log usage — prefer OpenRouter's reported cost; fall back to pricing table
      const usage = data?.usage || {};
      const inputTokens = usage.prompt_tokens || 0;
      const outputTokens = usage.completion_tokens || 0;
      const usedModel = data?.model || model || adminConfig.model;
      const directCost = typeof usage.cost === 'number' ? usage.cost : null;
      const costUsd = directCost ?? estimateCost(usedModel, inputTokens, outputTokens) ?? 0;
      appendUsageLog({
        ts: new Date().toISOString(),
        email: req.session.user?.email || 'unknown',
        model: usedModel,
        inputTokens,
        outputTokens,
        costUsd,
        costSource: directCost !== null ? 'openrouter' : 'estimate',
      });

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
    const data = {
      id, name: fileName, createdAt: new Date().toISOString(),
      ownerEmail: req.session.user.email || '',
      ownerName:  req.session.user.name  || '',
      steps: {},
    };
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

// ─── Usage report ────────────────────────────────────────────────────────────

app.get('/api/admin/usage', requireAdmin, async (req, res) => {
  const resolution = RESOLUTION_MS[req.query.resolution] ? req.query.resolution : '1d';
  const toDate   = req.query.to   ? new Date(req.query.to   + 'T23:59:59Z') : new Date();
  const fromDate = req.query.from ? new Date(req.query.from + 'T00:00:00Z')
                                  : new Date(Date.now() - 29 * 86_400_000);

  const entries = [];
  try {
    const readline = require('readline');
    const rl = readline.createInterface({ input: fs.createReadStream(USAGE_LOG_PATH), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const e = JSON.parse(line);
        const ts = new Date(e.ts);
        if (ts >= fromDate && ts <= toDate) entries.push(e);
      } catch { /* skip malformed */ }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[usage]', err.message);
  }

  const buckets = {}, byUser = {}, byModel = {};
  const add = (map, key, init) => {
    if (!map[key]) map[key] = { ...init, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    map[key].calls++;
    map[key].inputTokens  += e.inputTokens  || 0;
    map[key].outputTokens += e.outputTokens || 0;
    map[key].costUsd      += e.costUsd      || 0;
  };
  for (const e of entries) {
    const key = toBucket(e.ts, resolution);
    if (!buckets[key]) buckets[key] = { bucket: key, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    buckets[key].calls++;
    buckets[key].inputTokens  += e.inputTokens  || 0;
    buckets[key].outputTokens += e.outputTokens || 0;
    buckets[key].costUsd      += e.costUsd      || 0;
    if (!byUser[e.email]) byUser[e.email] = { email: e.email, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    byUser[e.email].calls++;
    byUser[e.email].inputTokens  += e.inputTokens  || 0;
    byUser[e.email].outputTokens += e.outputTokens || 0;
    byUser[e.email].costUsd      += e.costUsd      || 0;
    if (!byModel[e.model]) byModel[e.model] = { model: e.model, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 };
    byModel[e.model].calls++;
    byModel[e.model].inputTokens  += e.inputTokens  || 0;
    byModel[e.model].outputTokens += e.outputTokens || 0;
    byModel[e.model].costUsd      += e.costUsd      || 0;
  }

  // Fill all buckets in range (capped at 2000 to stay fast)
  const stepMs = RESOLUTION_MS[resolution];
  const thaiFrom = Math.floor((fromDate.getTime() + THAI_OFFSET_MS) / stepMs) * stepMs;
  const thaiTo   = toDate.getTime() + THAI_OFFSET_MS;
  const allBuckets = [];
  for (let t = thaiFrom; t <= thaiTo && allBuckets.length < 2000; t += stepMs) {
    const key = toBucket(new Date(t - THAI_OFFSET_MS).toISOString(), resolution);
    allBuckets.push(buckets[key] || { bucket: key, calls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 });
  }

  const summary = entries.reduce((s, e) => ({
    totalCalls:        s.totalCalls + 1,
    totalInputTokens:  s.totalInputTokens  + (e.inputTokens  || 0),
    totalOutputTokens: s.totalOutputTokens + (e.outputTokens || 0),
    totalCostUsd:      s.totalCostUsd      + (e.costUsd      || 0),
  }), { totalCalls: 0, totalInputTokens: 0, totalOutputTokens: 0, totalCostUsd: 0 });

  res.json({
    resolution,
    period:  { from: fromDate.toISOString().slice(0, 10), to: toDate.toISOString().slice(0, 10) },
    summary,
    buckets: allBuckets,
    byUser:  Object.values(byUser).sort((a, b) => b.costUsd - a.costUsd),
    byModel: Object.values(byModel).sort((a, b) => b.costUsd - a.costUsd),
  });
});

// ─── DOCX export ─────────────────────────────────────────────────────────────

app.post('/api/export/docx', requireAppEnabled, requireAuth, async (req, res) => {
  const { html, filename } = req.body || {};
  if (!html) return res.status(400).json({ error: 'html required' });
  try {
    const HTMLtoDOCX = require('html-to-docx');
    const buffer = await HTMLtoDOCX(html, null, {
      title: filename || 'document',
      lang: 'th-TH',
      font: 'Cordia New',
      fontSize: 24,
    });
    const safeName = (filename || 'document').replace(/[/\\?%*:|"<>]/g, '-');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeName + '.docx')}`);
    res.send(buffer);
  } catch (err) {
    console.error('[export/docx]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Static (production Vite build) ──────────────────────────────────────────

if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client', 'dist')));
  app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html')));
}

app.listen(PORT, '0.0.0.0', () => console.log(`Tech Portfolio server → http://localhost:${PORT}`));
