import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';

const MODEL_OPTIONS = [
  { value: 'openai/gpt-4.1-mini',               label: 'GPT-4.1 Mini',        hint: '★ แนะนำ — เร็ว ราคาถูก ภาษาไทยดี' },
  { value: 'openai/gpt-4.1',                    label: 'GPT-4.1',             hint: 'คุณภาพสูง เหมาะงานที่ต้องความแม่นยำ' },
  { value: 'anthropic/claude-sonnet-4-5',        label: 'Claude Sonnet 4.5',   hint: 'เขียนได้ดีมาก เหมาะกับ Portfolio' },
  { value: 'google/gemini-2.5-flash',            label: 'Gemini 2.5 Flash',    hint: 'เร็วมาก รองรับหลายภาษา ราคาถูก' },
  { value: 'qwen/qwen3-235b-a22b',               label: 'Qwen3 235B',          hint: 'ภาษาไทยดีมาก มีรอบฟรี' },
  { value: 'qwen/qwen3-30b-a3b',                 label: 'Qwen3 30B',           hint: 'เล็กกว่า เร็วกว่า ประหยัด' },
  { value: 'meta-llama/llama-3.3-70b-instruct',  label: 'Llama 3.3 70B',       hint: 'โอเพนซอร์ส ราคาถูก' },
  { value: 'custom',                             label: '— ระบุ ID เอง —',     hint: '' },
];

function knownValue(model) {
  return MODEL_OPTIONS.find(o => o.value === model && o.value !== 'custom')?.value ?? 'custom';
}

export default function AdminPage({ onConfigChange }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // allowed emails
  const [newEmail, setNewEmail] = useState('');
  const [addEmailError, setAddEmailError] = useState('');

  // model
  const [modelSelect, setModelSelect] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const [modelSuccess, setModelSuccess] = useState(false);

  // app toggle
  const [togglingApp, setTogglingApp] = useState(false);

  // restart
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [restartDone, setRestartDone] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    api.get('/api/admin/config')
      .then(cfg => {
        setConfig(cfg);
        setModelSelect(knownValue(cfg.model));
        setCustomModel(knownValue(cfg.model) === 'custom' ? (cfg.model || '') : '');
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // poll /api/health after restart
  useEffect(() => {
    if (!restarting) return;
    pollRef.current = setInterval(async () => {
      try {
        const r = await fetch('/api/health');
        if (r.ok) {
          clearInterval(pollRef.current);
          setRestarting(false);
          setRestartDone(true);
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch { /* server still down */ }
    }, 1500);
    return () => clearInterval(pollRef.current);
  }, [restarting]);

  async function updateConfig(patch) {
    const updated = await api.put('/api/admin/config', patch);
    setConfig(updated.config);
    onConfigChange(updated.config);
    return updated.config;
  }

  async function handleToggleApp() {
    setTogglingApp(true);
    try { await updateConfig({ appEnabled: !config.appEnabled }); }
    catch (e) { setError(e.message); }
    finally { setTogglingApp(false); }
  }

  async function handleAddEmail() {
    const email = newEmail.trim().toLowerCase();
    if (!email.includes('@')) { setAddEmailError('อีเมลไม่ถูกต้อง'); return; }
    if (config.allowedEmails.includes(email)) { setAddEmailError('มีอีเมลนี้อยู่แล้ว'); return; }
    setAddEmailError('');
    try {
      await updateConfig({ allowedEmails: [...config.allowedEmails, email] });
      setNewEmail('');
    } catch (e) { setAddEmailError(e.message); }
  }

  async function handleRemoveEmail(email) {
    try { await updateConfig({ allowedEmails: config.allowedEmails.filter(e => e !== email) }); }
    catch (e) { setError(e.message); }
  }

  async function handleSaveModel() {
    const model = modelSelect === 'custom' ? customModel.trim() : modelSelect;
    if (!model) return;
    setSavingModel(true);
    setModelSuccess(false);
    try {
      await updateConfig({ model });
      setModelSuccess(true);
      setTimeout(() => setModelSuccess(false), 3000);
    } catch (e) { setError(e.message); }
    finally { setSavingModel(false); }
  }

  function modelIsDirty() {
    if (!config) return false;
    const current = modelSelect === 'custom' ? customModel.trim() : modelSelect;
    return current !== config.model && current !== '';
  }

  async function handleRestart() {
    setRestartConfirm(false);
    setRestarting(true);
    try { await api.post('/api/admin/restart', {}); }
    catch { /* server closed before response — that's fine */ }
  }

  const selectedOption = MODEL_OPTIONS.find(o => o.value === modelSelect);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center text-warm-muted">กำลังโหลด...</div>
  );
  if (error && !config) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">{error}</div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-xl mx-auto space-y-4">
        <h2 className="text-lg font-bold text-navy mb-1">ผู้ดูแลระบบ</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
        )}

        {/* ── 1. App Status ───────────────────────────────────────────────────── */}
        <div className="bg-parchment border border-warm-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-navy mb-3">สถานะระบบ</h3>
          <div className="flex items-center gap-4">
            <button
              onClick={handleToggleApp}
              disabled={togglingApp}
              className={`px-5 py-2 rounded-lg font-semibold text-sm transition-colors ${
                config.appEnabled
                  ? 'bg-navy text-white hover:bg-navy/90'
                  : 'bg-gray-300 text-gray-600 hover:bg-gray-400'
              }`}
            >
              {togglingApp ? '...' : config.appEnabled ? 'เปิดใช้งาน ✓' : 'ปิดระบบ'}
            </button>
            <p className="text-sm text-warm-muted">
              {config.appEnabled
                ? 'ผู้ใช้ทุกคนเข้าถึงได้ตามปกติ'
                : 'ผู้ใช้ทั่วไปเห็นหน้าจอปิดระบบ — ผู้ดูแลระบบเข้าได้ปกติ'}
            </p>
          </div>
        </div>

        {/* ── 2. Allowed Emails ───────────────────────────────────────────────── */}
        <div className="bg-parchment border border-warm-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-navy mb-3">ผู้ใช้งานที่อนุญาต</h3>

          {config.allowedEmails.length === 0 && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg px-3 py-2 text-xs mb-3">
              ไม่มีการจำกัดผู้ใช้ — ทุกคนที่มีบัญชี Google สามารถเข้าใช้ได้
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            {config.allowedEmails.map(email => (
              <span
                key={email}
                className="flex items-center gap-1.5 bg-white border border-warm-border rounded-full px-3 py-1 text-sm text-navy"
              >
                {email}
                <button
                  onClick={() => handleRemoveEmail(email)}
                  className="text-warm-muted hover:text-red-500 leading-none"
                  aria-label={`ลบ ${email}`}
                >×</button>
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => { setNewEmail(e.target.value); setAddEmailError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAddEmail()}
              placeholder="กรอกอีเมล..."
              className="flex-1 border border-warm-border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-navy"
            />
            <button
              onClick={handleAddEmail}
              className="px-4 py-1.5 bg-navy text-white text-sm rounded-lg hover:bg-navy/90"
            >เพิ่ม</button>
          </div>
          {addEmailError && <p className="text-red-500 text-xs mt-1">{addEmailError}</p>}
          <p className="text-xs text-warm-muted mt-3">บัญชีผู้ดูแลระบบกำหนดไว้ใน .env เท่านั้น</p>
        </div>

        {/* ── 3. AI Model ─────────────────────────────────────────────────────── */}
        <div className="bg-parchment border border-warm-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-navy mb-3">โมเดล AI</h3>

          <select
            value={modelSelect}
            onChange={e => { setModelSelect(e.target.value); setModelSuccess(false); }}
            className="w-full border border-warm-border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-navy mb-2"
          >
            {MODEL_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {selectedOption?.hint && (
            <p className="text-xs text-warm-muted mb-2">{selectedOption.hint}</p>
          )}

          {modelSelect === 'custom' && (
            <input
              type="text"
              value={customModel}
              onChange={e => { setCustomModel(e.target.value); setModelSuccess(false); }}
              onKeyDown={e => e.key === 'Enter' && handleSaveModel()}
              placeholder="เช่น qwen/qwen3-235b-a22b"
              className="w-full font-mono border border-warm-border rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-navy mb-2"
            />
          )}

          <div className="flex items-center justify-between">
            <p className="text-xs text-warm-muted">
              ค่าปัจจุบัน: <span className="font-mono">{config.model}</span>
            </p>
            <button
              onClick={handleSaveModel}
              disabled={savingModel || !modelIsDirty()}
              className="px-4 py-1.5 bg-navy text-white text-sm rounded-lg hover:bg-navy/90 disabled:opacity-40"
            >
              {savingModel ? '...' : 'บันทึก'}
            </button>
          </div>
          {modelSuccess && <p className="text-green-600 text-xs mt-1">บันทึกเรียบร้อย</p>}
        </div>

        {/* ── 4. Server Restart ────────────────────────────────────────────────── */}
        <div className="bg-parchment border border-warm-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-navy mb-1">รีสตาร์ทเซิร์ฟเวอร์</h3>
          <p className="text-xs text-warm-muted mb-3">
            ใช้เมื่อต้องการโหลดค่าจาก .env ใหม่ เช่น Google OAuth keys หรือ API keys
          </p>

          {restarting && (
            <div className="flex items-center gap-2 text-sm text-warm-muted">
              <span className="animate-spin">⟳</span> กำลังรีสตาร์ท — รอสักครู่...
            </div>
          )}

          {restartDone && (
            <div className="text-sm text-green-600">เซิร์ฟเวอร์พร้อมแล้ว — กำลังโหลดหน้าใหม่...</div>
          )}

          {!restarting && !restartDone && !restartConfirm && (
            <button
              onClick={() => setRestartConfirm(true)}
              className="px-4 py-2 border border-warm-border text-sm text-navy rounded-lg hover:border-navy"
            >
              รีสตาร์ทเซิร์ฟเวอร์
            </button>
          )}

          {restartConfirm && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-warm-muted">ยืนยันการรีสตาร์ท?</span>
              <button
                onClick={handleRestart}
                className="px-4 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
              >
                ยืนยัน
              </button>
              <button
                onClick={() => setRestartConfirm(false)}
                className="px-4 py-1.5 border border-warm-border text-sm text-warm-muted rounded-lg hover:text-navy"
              >
                ยกเลิก
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
