import { useState, useEffect, useRef } from 'react';
import { api, aiComplete, parseJsonSafe } from '../api.js';
import { downloadPdf } from '../utils/pdf.js';
import { buildOverviewPrompt, buildFullDraftPrompt, buildSingleFieldPrompt } from '../prompts/mentoringPlanPrompts.js';
import OverviewPanel from '../components/mentoringPlan/OverviewPanel.jsx';
import SessionPanel from '../components/mentoringPlan/SessionPanel.jsx';

const SESSION_NAMES = ['สำรวจและสร้างความไว้วางใจ', 'เจาะลึกและพัฒนา', 'วางแผนก้าวต่อไป'];

function extractMenteeData(project) {
  const steps = project.steps || {};
  return {
    profile: steps.profile?.fields || steps.profile?.parsed || {},
    skills: steps.skills?.selections || [],
    projects: steps.projects?.selections || [],
    process: steps.process?.selections || [],
    evidence: steps.evidence?.selections || [],
    impact: steps.impact?.selections || [],
  };
}

function initPlan(existing) {
  const defaultSession = (n) => ({
    sessionNumber: n,
    sessionName: SESSION_NAMES[n - 1],
    sessionGoal: '',
    diagnosticQuestions: [],
    gapsToClose: '',
    successMarkers: '',
  });
  return {
    mentorProfile: existing?.mentorProfile || '',
    menteeSnapshot: existing?.menteeSnapshot || '',
    mentorStrengths: existing?.mentorStrengths || '',
    sessions: [0, 1, 2].map(i => ({ ...defaultSession(i + 1), ...(existing?.sessions?.[i] || {}) })),
    overallNote: existing?.overallNote || '',
    lastSaved: existing?.lastSaved || '',
  };
}

function buildMentoringPlanHtml(plan, menteeProfile) {
  const menteeName = menteeProfile?.name || 'Mentee';
  const { menteeSnapshot, mentorStrengths, sessions, overallNote } = plan;
  return `<!DOCTYPE html>
<html lang="th"><head><meta charset="UTF-8"><title>แผน Mentoring — ${menteeName}</title>
<style>body{font-family:Sarabun,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}
h1{color:#1a1a2e}h2{color:#4338ca;border-bottom:2px solid #e0e7ff;padding-bottom:8px}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px}
.lbl{font-size:11px;color:#6b7280;text-transform:uppercase;margin-bottom:4px;font-weight:600}
ul{padding-left:1.2em;margin:6px 0}li{margin-bottom:4px}</style>
</head><body>
<h1>แผน Mentoring — ${menteeName}</h1>
<h2>สรุป Mentee</h2><p>${menteeSnapshot || '—'}</p>
<h2>จุดแข็งของ Mentor ที่ Match กับ Mentee คนนี้</h2><p>${mentorStrengths || '—'}</p>
${sessions.map(s => `
<h2>Session ${s.sessionNumber}: ${s.sessionName || SESSION_NAMES[s.sessionNumber - 1]}</h2>
<div class="card">
  <div class="lbl">เป้าหมาย</div><p>${s.sessionGoal || '—'}</p>
  <div class="lbl" style="margin-top:10px">คำถาม Diagnostic</div>
  <ul>${(s.diagnosticQuestions || []).map(q => `<li>${q}</li>`).join('') || '<li>—</li>'}</ul>
  <div class="lbl" style="margin-top:10px">Gap ที่ต้องปิด</div><p>${s.gapsToClose || '—'}</p>
  <div class="lbl" style="margin-top:10px">Success Markers</div><p>${s.successMarkers || '—'}</p>
</div>`).join('')}
${overallNote ? `<h2>หมายเหตุรวม</h2><p style="white-space:pre-wrap">${overallNote}</p>` : ''}
</body></html>`;
}

export default function MentoringPlanPage({ project, projectMeta, onProjectUpdate, onBack }) {
  const [plan, setPlan] = useState(() => initPlan(project.mentoringPlan));
  const [activeSession, setActiveSession] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [fieldLoading, setFieldLoading] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const debounceRef = useRef(null);
  const planRef = useRef(plan);
  planRef.current = plan;
  const projectRef = useRef(project);
  projectRef.current = project;

  const menteeData = extractMenteeData(project);
  const menteeProfile = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};

  function buildUpdated(p) {
    return { ...projectRef.current, mentoringPlan: { ...p, lastSaved: new Date().toISOString() } };
  }

  async function doSave(p) {
    setSaving(true);
    try {
      const updated = buildUpdated(p);
      await api.put(`/api/projects/${projectMeta.id}`, updated);
      onProjectUpdate(updated);
    } catch (err) {
      console.error('[mentoring-save]', err);
    } finally {
      setSaving(false);
    }
  }

  // Autosave with 3s debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSave(planRef.current), 3000);
    return () => clearTimeout(debounceRef.current);
  }, [plan]);

  // Save immediately on unmount to prevent data loss when switching tabs
  useEffect(() => {
    return () => {
      clearTimeout(debounceRef.current);
      api.put(`/api/projects/${projectMeta.id}`, buildUpdated(planRef.current)).catch(console.error);
    };
  }, []);

  function showToast(msg, dur = 2500) {
    setToast(msg);
    setTimeout(() => setToast(''), dur);
  }

  function updatePlan(updates) {
    setPlan(prev => ({ ...prev, ...updates }));
  }

  function updateSession(i, updates) {
    setPlan(prev => ({
      ...prev,
      sessions: prev.sessions.map((s, idx) => idx === i ? { ...s, ...updates } : s),
    }));
  }

  async function regenField(fieldName, sessionIndex) {
    const key = sessionIndex !== null ? `s${sessionIndex}_${fieldName}` : fieldName;
    setFieldLoading(prev => ({ ...prev, [key]: true }));
    try {
      const { system, user } = buildSingleFieldPrompt(fieldName, sessionIndex, planRef.current, menteeData);
      const content = await aiComplete([{ role: 'system', content: system }, { role: 'user', content: user }]);
      const parsed = parseJsonSafe(content);
      if (!parsed) throw new Error('ไม่สามารถแปลงผลลัพธ์ได้');
      if (sessionIndex !== null) {
        updateSession(sessionIndex, { [fieldName]: parsed[fieldName] });
      } else {
        updatePlan({ [fieldName]: parsed[fieldName] });
      }
    } catch (err) {
      showToast(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setFieldLoading(prev => ({ ...prev, [key]: false }));
    }
  }

  async function handleFullDraft() {
    const filled = planRef.current.sessions.reduce((n, s) =>
      n + (s.sessionGoal ? 1 : 0) + (s.diagnosticQuestions?.length > 0 ? 1 : 0) +
          (s.gapsToClose ? 1 : 0) + (s.successMarkers ? 1 : 0), 0);

    if (filled > 0 && !window.confirm('จะเขียนทับ content ที่มีอยู่ทั้งหมด ยืนยัน?')) return;

    setGenerating(true);
    try {
      const { system: s1, user: u1 } = buildOverviewPrompt(menteeData, planRef.current.mentorProfile);
      const overview = parseJsonSafe(await aiComplete([{ role: 'system', content: s1 }, { role: 'user', content: u1 }]));

      const snapshot = overview?.menteeSnapshot || '';
      const { system: s2, user: u2 } = buildFullDraftPrompt(menteeData, planRef.current.mentorProfile, snapshot);
      const draft = parseJsonSafe(await aiComplete([{ role: 'system', content: s2 }, { role: 'user', content: u2 }]));

      if (!overview || !draft?.sessions) throw new Error('ผลลัพธ์ไม่ถูกต้อง กรุณาลองใหม่');

      setPlan(prev => ({
        ...prev,
        menteeSnapshot: overview.menteeSnapshot || prev.menteeSnapshot,
        mentorStrengths: overview.mentorStrengths || prev.mentorStrengths,
        sessions: prev.sessions.map((s, i) => ({ ...s, ...(draft.sessions[i] || {}) })),
      }));
      showToast('สร้างเสร็จแล้ว ✓');
    } catch (err) {
      showToast(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  function handlePdf() {
    const title = `แผน Mentoring — ${menteeProfile.name || projectMeta.name.replace('.techport.json', '')}`;
    downloadPdf(buildMentoringPlanHtml(plan, menteeProfile), title);
  }

  const filled = plan.sessions.reduce((n, s) =>
    n + (s.sessionGoal ? 1 : 0) + (s.diagnosticQuestions?.length > 0 ? 1 : 0) +
        (s.gapsToClose ? 1 : 0) + (s.successMarkers ? 1 : 0), 0);

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {generating && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 shadow-xl text-center">
            <svg className="animate-spin h-8 w-8 text-navy mx-auto mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-navy font-semibold">กำลังร่างแผนทั้งหมด...</p>
            <p className="text-xs text-warm-muted mt-1">อาจใช้เวลา 30–60 วินาที</p>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-navy text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <button onClick={onBack} className="text-sm text-warm-muted hover:text-navy transition-colors mb-1 block">
                ← รายการ Portfolio
              </button>
              <h2 className="text-lg font-bold text-navy">📋 แผน Mentoring</h2>
              {menteeProfile.name && (
                <p className="text-xs text-warm-muted mt-0.5">Mentee: {menteeProfile.name}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-warm-muted">
              <span className="font-mono tabular-nums">{filled}/12 fields</span>
              {saving && <span>💾 กำลังบันทึก...</span>}
            </div>
          </div>

          <OverviewPanel
            plan={plan}
            onChange={updatePlan}
            onRegen={regenField}
            fieldLoading={fieldLoading}
          />

          <div className="flex gap-1 mb-3">
            {plan.sessions.map((s, i) => (
              <button
                key={i}
                onClick={() => setActiveSession(i)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg font-medium transition-colors border-2 ${
                  activeSession === i
                    ? 'bg-navy text-white border-navy'
                    : 'bg-parchment text-warm-muted border-warm-border hover:text-navy hover:border-navy'
                }`}
              >
                Session {i + 1}
              </button>
            ))}
          </div>

          <div className="bg-white border border-warm-border rounded-xl p-5 mb-4">
            <SessionPanel
              session={plan.sessions[activeSession]}
              sessionIndex={activeSession}
              onChange={(updates) => updateSession(activeSession, updates)}
              onRegen={regenField}
              fieldLoading={fieldLoading}
            />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-warm-muted mb-1">📝 หมายเหตุรวม</label>
            <textarea
              className="w-full border border-warm-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white text-navy"
              rows={3}
              placeholder="บันทึกส่วนตัวหรือข้อสังเกตเพิ่มเติมสำหรับ mentee คนนี้"
              value={plan.overallNote}
              onChange={e => updatePlan({ overallNote: e.target.value })}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-warm-border">
            <button
              onClick={handleFullDraft}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-navy hover:bg-navy-hover text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors border-2 border-navy"
            >
              ✨ สร้าง Draft ทั้งหมด
            </button>
            <button
              onClick={handlePdf}
              className="flex items-center gap-2 px-4 py-2 bg-parchment hover:bg-gold-light text-navy rounded-lg border-2 border-warm-border font-semibold text-sm transition-colors"
            >
              📄 ดาวน์โหลด PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
