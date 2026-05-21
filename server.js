require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const { OAuth2Client } = require('google-auth-library');
const path = require('path');

const {
  OPENROUTER_API_KEY,
  GOOGLE_CLIENT_ID,
  SESSION_SECRET,
  PORT = 3000,
  ALLOWED_ORIGIN = 'http://localhost:3000',
  NODE_ENV
} = process.env;

if (!SESSION_SECRET) {
  console.warn('[warn] SESSION_SECRET is not set — using an insecure default. Set it in .env before any real use.');
}
if (!GOOGLE_CLIENT_ID) {
  console.warn('[warn] GOOGLE_CLIENT_ID is not set — Google sign-in will not work until you set it in .env.');
}
if (!OPENROUTER_API_KEY) {
  console.warn('[warn] OPENROUTER_API_KEY is not set — /api/suggest will return an error until you set it in .env.');
}

const app = express();
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

app.set('trust proxy', 1);

app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));

app.use(session({
  name: 'maejo.sid',
  secret: SESSION_SECRET || 'insecure-dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'ต้องเข้าสู่ระบบก่อน' });
  }
  next();
}

app.get('/api/config', (req, res) => {
  res.json({ googleClientId: GOOGLE_CLIENT_ID || '' });
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'unauthenticated' });
  }
  res.json({ user: req.session.user });
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ error: 'ไม่มีข้อมูลรับรองจาก Google' });
    }
    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า GOOGLE_CLIENT_ID' });
    }
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'ไม่สามารถยืนยันตัวตนจาก Google ได้' });
    }
    req.session.user = {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    res.json({ user: req.session.user });
  } catch (err) {
    console.error('[auth] verifyIdToken failed:', err.message);
    res.status(401).json({ error: 'การยืนยันตัวตนล้มเหลว' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.clearCookie('maejo.sid');
      res.json({ ok: true });
    });
  } else {
    res.json({ ok: true });
  }
});

const suggestLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'มีการเรียกใช้ถี่เกินไป กรุณารอสักครู่' }
});

const SYSTEM_PROMPT = [
  'คุณเป็นผู้เชี่ยวชาญด้านการพัฒนาพี่เลี้ยงนวัตกรรมของมหาวิทยาลัยแม่โจ้',
  'โครงการ Deep Mentorship Program ปีงบประมาณ 2569',
  'ช่วยคณาจารย์สร้าง Technology Portfolio',
  'สำหรับเป็นพี่เลี้ยงนักศึกษาผู้ประกอบการด้านเกษตร อาหาร และสุขภาพ',
  '[ตอบเป็นภาษาไทย หรือ English ตามที่ผู้ใช้เลือก]'
].join('\n');

function buildInitialUserContent({ name, expertise, cvText, cvPdfBase64, language }) {
  const langLine = language === 'en'
    ? 'Please respond in English.'
    : 'กรุณาตอบเป็นภาษาไทย';

  const lines = [
    'สร้างส่วน Profile สำหรับ Technology Portfolio',
    '',
    `ชื่อ-ตำแหน่ง: ${name || '-'}`,
    `ความเชี่ยวชาญ: ${expertise || '-'}`
  ];
  if (cvText && !cvPdfBase64) {
    lines.push(`ข้อมูลจาก CV (ข้อความ):\n${cvText}`);
  }
  lines.push('');
  lines.push('จัดทำ:');
  lines.push('1. สรุปประวัติวิชาชีพ (2-3 ประโยค)');
  lines.push('2. ความเชี่ยวชาญหลัก (3-5 ข้อ อ้างอิงจาก CV ถ้ามี)');
  lines.push('3. คำแถลงการวางตำแหน่งพี่เลี้ยง (1 ประโยค)');
  lines.push('4. คีย์เวิร์ดโปรไฟล์ (5-7 คำ)');
  lines.push('5. จุดแข็งจาก CV ที่ทำให้เป็นพี่เลี้ยงที่ดี');
  lines.push('');
  lines.push(langLine);

  const textPart = { type: 'text', text: lines.join('\n') };

  if (cvPdfBase64) {
    return [
      textPart,
      {
        type: 'file',
        file: {
          filename: 'cv.pdf',
          file_data: `data:application/pdf;base64,${cvPdfBase64}`
        }
      }
    ];
  }
  return [textPart];
}

app.post('/api/suggest', requireAuth, suggestLimiter, async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'เซิร์ฟเวอร์ยังไม่ได้ตั้งค่า OPENROUTER_API_KEY' });
    }

    const {
      name = '',
      expertise = '',
      language = 'th',
      cvText = '',
      cvPdfBase64 = '',
      followUp = '',
      history = []
    } = req.body || {};

    const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

    if (Array.isArray(history) && history.length > 0) {
      for (const m of history) {
        if (m && typeof m.role === 'string' && typeof m.content !== 'undefined') {
          messages.push({ role: m.role, content: m.content });
        }
      }
    } else {
      messages.push({
        role: 'user',
        content: buildInitialUserContent({ name, expertise, cvText, cvPdfBase64, language })
      });
    }

    if (followUp && followUp.trim()) {
      messages.push({ role: 'user', content: followUp.trim() });
    }

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': ALLOWED_ORIGIN,
        'X-Title': 'Maejo Deep Mentorship'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages
      })
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error('[openrouter] non-ok response', upstream.status, text);
      return res.status(502).json({ error: `OpenRouter ตอบกลับด้วยรหัส ${upstream.status}` });
    }

    const data = await upstream.json();
    const result = data?.choices?.[0]?.message?.content ?? '';
    if (!result) {
      return res.status(502).json({ error: 'ไม่ได้รับเนื้อหาตอบกลับจาก AI' });
    }
    res.json({ result });
  } catch (err) {
    console.error('[suggest] error:', err);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Maejo portfolio server listening on http://localhost:${PORT}`);
});
