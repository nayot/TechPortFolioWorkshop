import { useState } from 'react';
import { api } from '../api.js';

function EditableText({ value, onChange, rows = 4, placeholder = '' }) {
  return (
    <textarea
      className="w-full border border-warm-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold bg-white text-navy"
      rows={rows}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function Section({ title, onEdit, editing, children }) {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between border-b-2 border-gold/30 pb-2 mb-3">
        <h2 className="text-base font-bold text-navy tracking-wide">{title}</h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className={`text-xs px-2 py-1 rounded transition-colors border ${
              editing ? 'bg-gold-pale border-gold text-navy' : 'border-warm-border text-warm-muted hover:text-navy hover:border-navy'
            }`}
          >
            {editing ? '✓ เสร็จแล้ว' : '✏️ แก้ไข'}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function buildHtml(draft, project) {
  const steps = project.steps || {};
  const prof = steps.profile?.fields || steps.profile?.parsed || {};
  const skills = steps.skills?.selections || [];
  const projects = steps.projects?.selections || [];
  const process = steps.process?.selections || [];
  const evidence = steps.evidence?.selections || [];
  const impact = steps.impact?.selections || [];

  return `<!DOCTYPE html>
<html lang="th"><head><meta charset="UTF-8"><title>Tech Portfolio — ${prof.name || ''}</title>
<style>body{font-family:Sarabun,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}
h1{color:#1a1a2e}h2{color:#4338ca;border-bottom:2px solid #e0e7ff;padding-bottom:8px}
.brief{background:#eef2ff;border-left:4px solid #818cf8;padding:10px 14px;border-radius:4px;margin-bottom:12px;font-style:italic}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.chip{background:#e0e7ff;color:#3730a3;padding:4px 12px;border-radius:20px;font-size:13px}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px}
.label{font-size:12px;color:#6b7280;text-transform:uppercase}
.ref{font-size:11px;color:#9ca3af;font-style:italic;margin-top:4px}</style>
</head><body>
<h1>${prof.name || 'Tech Portfolio'}</h1>
<p><strong>${prof.position || ''}</strong>${prof.institution ? ' · ' + prof.institution : ''}</p>

<h2>1. โปรไฟล์</h2>
${draft.profileBrief ? `<p class="brief">${draft.profileBrief}</p>` : ''}
<p>${draft.profileStatement}</p>

<h2>2. ทักษะ</h2>
${draft.skillsBrief ? `<p class="brief">${draft.skillsBrief}</p>` : ''}
<div class="chips">${skills.map(s => `<span class="chip">${s}</span>`).join('')}</div>
${draft.skillsStatement ? `<p style="margin-top:12px">${draft.skillsStatement}</p>` : ''}

<h2>3. โครงการ</h2>
${draft.projectsBrief ? `<p class="brief">${draft.projectsBrief}</p>` : ''}
${projects.map(p => `<div class="card"><strong>${p.title}</strong>${p.period ? ` (${p.period})` : ''}<p>${p.description || ''}</p>${p.impact ? `<p><em>💡 ${p.impact}</em></p>` : ''}${p.references?.length ? `<div class="ref">${p.references.map(r => `📚 ${r}`).join('<br/>')}</div>` : ''}</div>`).join('')}

<h2>4. กระบวนการ</h2>
${draft.processBrief ? `<p class="brief">${draft.processBrief}</p>` : ''}
<div class="chips">${process.map(s => `<span class="chip">${s}</span>`).join('')}</div>

<h2>5. หลักฐาน</h2>
${draft.evidenceBrief ? `<p class="brief">${draft.evidenceBrief}</p>` : ''}
${evidence.map(e => `<div class="card"><span class="label">${e.type}</span> ${e.year ? `(${e.year})` : ''}<p><strong>${e.title}</strong></p><p>${e.description || ''}</p></div>`).join('')}

<h2>6. ผลกระทบ</h2>
${draft.impactBrief ? `<p class="brief">${draft.impactBrief}</p>` : ''}
<ul>${impact.map(i => `<li>${i}</li>`).join('')}</ul>

<h2>7. Reflection</h2>
<p style="white-space:pre-wrap">${draft.reflection}</p>
</body></html>`;
}

function buildMarkdownBrief(draft, project) {
  const steps = project.steps || {};
  const prof = steps.profile?.fields || steps.profile?.parsed || {};
  const skills = steps.skills?.selections || [];
  const projects = steps.projects?.selections || [];
  const process = steps.process?.selections || [];
  const impact = steps.impact?.selections || [];

  return `# Tech Portfolio Infographic Brief

**นักวิจัย:** ${prof.name || 'N/A'}
**สาขา:** ${prof.domain || 'N/A'}
**สังกัด:** ${prof.institution || 'N/A'}

## สรุปโปรไฟล์
${draft.profileBrief ? draft.profileBrief + '\n\n' : ''}${draft.profileStatement || 'N/A'}

## ทักษะ (${skills.length} รายการ)
${skills.map(s => `- ${s}`).join('\n')}

## โครงการสำคัญ (${projects.length} โครงการ)
${projects.map(p => `- **${p.title}** (${p.period || ''}): ${p.description || ''}${p.references?.length ? `\n  - อ้างอิง: ${p.references[0]}` : ''}`).join('\n')}

## กระบวนการทำงาน
${process.map(p => `- ${p}`).join('\n')}

## ผลกระทบ
${impact.map(i => `- ${i}`).join('\n')}

## Reflection
${draft.reflection || 'N/A'}

---
*วางข้อความนี้ใน ChatGPT หรือ Gemini พร้อมคำสั่ง: "สร้าง Infographic มืออาชีพสำหรับ Tech Portfolio ของนักวิจัยคนนี้ ใช้สไตล์วิชาการที่สะอาดตา พร้อมธีมสีของโครงการ Deep Mentorship Program มหาวิทยาลัยแม่โจ้"*

> **ข้อสำคัญสำหรับ AI:** ห้ามสร้างรูปภาพหรือรูปถ่ายของนักวิจัยโดยเด็ดขาด เว้นแต่ผู้ใช้จะอัปโหลดรูปภาพจริงมาให้เท่านั้น`;
}

function initDraft(project) {
  const steps = project.steps || {};
  const prof = steps.profile?.fields || steps.profile?.parsed || {};
  return {
    profileStatement: steps.profile?.finalText || prof.statement || '',
    profileBrief: prof.brief || steps.profile?.parsed?.brief || '',
    skillsBrief: steps.skills?.parsed?.brief || '',
    skillsStatement: steps.skills?.finalText || '',
    projectsBrief: steps.projects?.parsed?.brief || '',
    processBrief: steps.process?.parsed?.brief || '',
    evidenceBrief: steps.evidence?.parsed?.brief || '',
    impactBrief: steps.impact?.parsed?.brief || '',
    reflection: steps.reflection?.finalText || '',
    gapsBrief: steps.commercialization?.parsed?.brief || '',
    gaps: (steps.commercialization?.selections || []).map(g => ({ ...g })),
  };
}

export default function AssemblyPage({ project, projectMeta, onEditStep, onBack }) {
  const steps = project.steps || {};
  const profile = steps.profile?.fields || steps.profile?.parsed || {};
  const skills = steps.skills?.selections || [];
  const projects = steps.projects?.selections || [];
  const process = steps.process?.selections || [];
  const evidence = steps.evidence?.selections || [];
  const impact = steps.impact?.selections || [];

  const [draft, setDraft] = useState(() => initDraft(project));
  const [editing, setEditing] = useState({});

  const [exporting, setExporting] = useState(false);
  const [exportLink, setExportLink] = useState('');
  const [exportError, setExportError] = useState('');
  const [briefCopied, setBriefCopied] = useState(false);
  const [showBrief, setShowBrief] = useState(false);
  const [gapsCopied, setGapsCopied] = useState(false);

  function toggleEdit(key) {
    setEditing(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function updateDraft(key, value) {
    setDraft(prev => ({ ...prev, [key]: value }));
  }

  function updateGap(index, field, value) {
    setDraft(prev => {
      const gaps = prev.gaps.map((g, i) => i === index ? { ...g, [field]: value } : g);
      return { ...prev, gaps };
    });
  }

  async function exportToGoogleDocs() {
    setExporting(true);
    setExportError('');
    try {
      const html = buildHtml(draft, project);
      const title = `Tech Portfolio — ${profile.name || projectMeta.name}`;
      const data = await api.post(`/api/projects/${projectMeta.id}/export-doc`, { html, title });
      setExportLink(data.link);
    } catch (err) {
      setExportError(err.message);
    } finally {
      setExporting(false);
    }
  }

  function copyBrief() {
    navigator.clipboard.writeText(buildMarkdownBrief(draft, project));
    setBriefCopied(true);
    setTimeout(() => setBriefCopied(false), 2000);
  }

  function copyGaps() {
    const brief = draft.gapsBrief || '';
    const text = `# วิเคราะห์ช่องว่างเชิงพาณิชย์ (Commercialization Gaps)\n${brief ? brief + '\n\n' : ''}${draft.gaps.map(g => `## ${g.gap}\n${g.description || ''}\n- โอกาส: ${g.opportunity || ''}\n- อุปสรรค: ${g.barrier || ''}\n- คำแนะนำ: ${g.recommendation || ''}`).join('\n\n')}`;
    navigator.clipboard.writeText(text);
    setGapsCopied(true);
    setTimeout(() => setGapsCopied(false), 2000);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b-2 border-gold/40 px-4 py-3 flex items-center justify-between bg-navy sticky top-0 z-10">
        <button onClick={onBack} className="text-sm text-gold-light/70 hover:text-gold transition-colors">← กลับแก้ไข</button>
        <h2 className="text-sm font-bold text-white tracking-wide">Tech Portfolio ฉบับสมบูรณ์</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBrief(v => !v)}
            className="px-3 py-1.5 border border-gold/50 text-gold-light text-sm rounded-lg hover:bg-white/10 transition-colors"
          >
            📊 Infographic Brief
          </button>
          <button
            onClick={exportToGoogleDocs}
            disabled={exporting}
            className="px-3 py-1.5 bg-gold hover:bg-gold/90 text-navy text-sm rounded-lg font-semibold disabled:opacity-50 transition-colors"
          >
            {exporting ? 'กำลัง export...' : '📄 Export to Google Docs'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {exportLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-6 text-sm text-green-700 flex items-center gap-2">
              ✅ สร้าง Google Doc แล้ว —{' '}
              <a href={exportLink} target="_blank" rel="noopener noreferrer" className="underline font-medium">เปิด Doc</a>
            </div>
          )}
          {exportError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6 text-sm text-red-700">{exportError}</div>
          )}

          {showBrief && (
            <div className="bg-parchment border-2 border-gold/40 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-navy">Infographic Brief (สำหรับ ChatGPT)</p>
                <button onClick={copyBrief} className="text-xs text-gold hover:text-gold/70 border border-gold/40 px-2 py-1 rounded transition-colors">
                  {briefCopied ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
                </button>
              </div>
              <pre className="text-xs text-warm-muted whitespace-pre-wrap font-mono overflow-auto max-h-64">
                {buildMarkdownBrief(draft, project)}
              </pre>
            </div>
          )}

          {/* 1. Profile */}
          <Section title="1. โปรไฟล์" onEdit={() => toggleEdit('profile')} editing={editing.profile}>
            <div className="space-y-2">
              <p className="font-semibold text-gray-900">{profile.name || '—'}</p>
              <p className="text-sm text-gray-500">{profile.position}{profile.institution ? ' · ' + profile.institution : ''}</p>
              {profile.expertise?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {profile.expertise.map(k => (
                    <span key={k} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">{k}</span>
                  ))}
                </div>
              )}
              {editing.profile ? (
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-medium text-gray-500">คำอธิบายโดยย่อ</label>
                  <EditableText value={draft.profileBrief} onChange={v => updateDraft('profileBrief', v)} rows={2} />
                  <label className="text-xs font-medium text-gray-500">คำแถลงโปรไฟล์</label>
                  <EditableText value={draft.profileStatement} onChange={v => updateDraft('profileStatement', v)} rows={5} />
                </div>
              ) : (
                <>
                  {draft.profileBrief && <p className="text-sm text-gray-500 italic border-l-2 border-indigo-200 pl-3">{draft.profileBrief}</p>}
                  <p className="text-sm text-gray-700">{draft.profileStatement || '—'}</p>
                </>
              )}
              <button onClick={() => onEditStep('profile')} className="text-xs text-indigo-400 hover:text-indigo-600">↩ แก้ไขใน Wizard</button>
            </div>
          </Section>

          {/* 2. Skills */}
          <Section title="2. ทักษะ" onEdit={() => toggleEdit('skills')} editing={editing.skills}>
            <div className="space-y-2">
              {editing.skills ? (
                <>
                  <label className="text-xs font-medium text-gray-500">คำแถลงทักษะ</label>
                  <EditableText value={draft.skillsStatement} onChange={v => updateDraft('skillsStatement', v)} rows={3} />
                </>
              ) : (
                <>
                  {draft.skillsBrief && <p className="text-sm text-gray-500 italic border-l-2 border-indigo-200 pl-3">{draft.skillsBrief}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {skills.length > 0 ? skills.map(s => (
                      <span key={s} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">{s}</span>
                    )) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
                  </div>
                  {draft.skillsStatement && <p className="text-sm text-gray-700 mt-2">{draft.skillsStatement}</p>}
                </>
              )}
              <button onClick={() => onEditStep('skills')} className="text-xs text-indigo-400 hover:text-indigo-600">↩ แก้ไขใน Wizard</button>
            </div>
          </Section>

          {/* 3. Projects */}
          <Section title="3. โครงการ">
            <div className="space-y-3">
              {draft.projectsBrief && <p className="text-sm text-gray-500 italic border-l-2 border-indigo-200 pl-3">{draft.projectsBrief}</p>}
              {projects.length > 0 ? projects.map((p, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-gray-900">{p.title} {p.period && <span className="font-normal text-gray-400">({p.period})</span>}</p>
                  {p.description && <p className="text-xs text-gray-600 mt-1">{p.description}</p>}
                  {p.impact && <p className="text-xs text-indigo-600 mt-1">💡 {p.impact}</p>}
                  {p.references?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {p.references.map((ref, ri) => <p key={ri} className="text-xs text-gray-400 italic">📚 {ref}</p>)}
                    </div>
                  )}
                </div>
              )) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
              <button onClick={() => onEditStep('projects')} className="text-xs text-indigo-400 hover:text-indigo-600">↩ แก้ไขใน Wizard</button>
            </div>
          </Section>

          {/* 4. Process */}
          <Section title="4. กระบวนการ">
            <div className="space-y-2">
              {draft.processBrief && <p className="text-sm text-gray-500 italic border-l-2 border-indigo-200 pl-3">{draft.processBrief}</p>}
              <div className="flex flex-wrap gap-1.5">
                {process.length > 0 ? process.map(s => (
                  <span key={s} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">{s}</span>
                )) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
              </div>
              <button onClick={() => onEditStep('process')} className="text-xs text-indigo-400 hover:text-indigo-600">↩ แก้ไขใน Wizard</button>
            </div>
          </Section>

          {/* 5. Evidence */}
          <Section title="5. หลักฐาน">
            <div className="space-y-2">
              {draft.evidenceBrief && <p className="text-sm text-gray-500 italic border-l-2 border-indigo-200 pl-3">{draft.evidenceBrief}</p>}
              {evidence.length > 0 ? evidence.map((e, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{e.type}</span>
                    {e.year && <span className="text-xs text-gray-400">{e.year}</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-900 mt-1">{e.title}</p>
                  {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
                </div>
              )) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
              <button onClick={() => onEditStep('evidence')} className="text-xs text-indigo-400 hover:text-indigo-600">↩ แก้ไขใน Wizard</button>
            </div>
          </Section>

          {/* 6. Impact */}
          <Section title="6. ผลกระทบ">
            <div className="space-y-1">
              {draft.impactBrief && <p className="text-sm text-gray-500 italic border-l-2 border-indigo-200 pl-3 mb-2">{draft.impactBrief}</p>}
              {impact.length > 0 ? impact.map((item, idx) => (
                <div key={idx} className="flex gap-2 text-sm text-gray-700"><span className="text-indigo-400 shrink-0">•</span>{item}</div>
              )) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
              <button onClick={() => onEditStep('impact')} className="text-xs text-indigo-400 hover:text-indigo-600 mt-1 block">↩ แก้ไขใน Wizard</button>
            </div>
          </Section>

          {/* 7. Reflection */}
          <Section title="7. Reflection" onEdit={() => toggleEdit('reflection')} editing={editing.reflection}>
            {editing.reflection ? (
              <EditableText value={draft.reflection} onChange={v => updateDraft('reflection', v)} rows={10} placeholder="เขียน Reflection..." />
            ) : (
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{draft.reflection || <span className="text-gray-400">ยังไม่ได้เขียน</span>}</p>
            )}
            <button onClick={() => onEditStep('reflection')} className="text-xs text-indigo-400 hover:text-indigo-600 mt-2 block">↩ แก้ไขใน Wizard</button>
          </Section>

        </div>

        {/* Diagnostic: Commercialization Gaps — not part of the portfolio export */}
        {(draft.gaps.length > 0 || draft.gapsBrief) && (
          <div className="max-w-2xl mx-auto px-4 pb-8">
            <div className="border-2 border-amber-300/60 rounded-xl bg-amber-50/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">วิเคราะห์เชิงพาณิชย์</span>
                  <p className="text-xs text-amber-600/80 mt-0.5">ไม่รวมใน Portfolio — เฉพาะพี่เลี้ยงและทีมงาน</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyGaps}
                    className="text-xs border border-amber-400/60 text-amber-700 hover:bg-amber-100 px-2 py-1 rounded transition-colors"
                  >
                    {gapsCopied ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
                  </button>
                  <button onClick={() => onEditStep('commercialization')} className="text-xs text-amber-600 hover:text-amber-800">↩ แก้ไข</button>
                </div>
              </div>

              {/* Editable brief */}
              {editing.gaps ? (
                <EditableText value={draft.gapsBrief} onChange={v => updateDraft('gapsBrief', v)} rows={3} />
              ) : (
                draft.gapsBrief && (
                  <p className="text-sm text-amber-800 italic border-l-2 border-amber-300 pl-3 mb-3">{draft.gapsBrief}</p>
                )
              )}
              <button
                onClick={() => toggleEdit('gaps')}
                className="text-xs text-amber-600 hover:text-amber-800 mb-3"
              >
                {editing.gaps ? '✓ เสร็จแล้ว' : '✏️ แก้ไขสรุป'}
              </button>

              {/* Gap cards with per-card editable fields */}
              <div className="space-y-3">
                {draft.gaps.map((g, i) => {
                  const cardEditKey = `gap-${i}`;
                  const isEditingCard = !!editing[cardEditKey];
                  return (
                    <div key={i} className="border border-amber-200 bg-white rounded-lg p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        {isEditingCard ? (
                          <input
                            className="flex-1 text-sm font-semibold text-gray-900 border border-warm-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white"
                            value={g.gap}
                            onChange={e => updateGap(i, 'gap', e.target.value)}
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">🔍 {g.gap}</p>
                        )}
                        <button
                          onClick={() => toggleEdit(cardEditKey)}
                          className={`shrink-0 text-xs px-2 py-0.5 rounded border transition-colors ${
                            isEditingCard
                              ? 'bg-amber-100 border-amber-400 text-amber-700'
                              : 'border-warm-border text-warm-muted hover:text-amber-700 hover:border-amber-400'
                          }`}
                        >
                          {isEditingCard ? '✓ เสร็จ' : '✏️'}
                        </button>
                      </div>

                      {isEditingCard ? (
                        <textarea
                          className="w-full text-xs text-gray-600 border border-warm-border rounded px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-amber-400 bg-white mb-2"
                          rows={2}
                          value={g.description || ''}
                          onChange={e => updateGap(i, 'description', e.target.value)}
                          placeholder="คำอธิบาย..."
                        />
                      ) : (
                        g.description && <p className="text-xs text-gray-600 mb-2">{g.description}</p>
                      )}

                      <div className="grid grid-cols-3 gap-2">
                        {/* โอกาส */}
                        <div className="bg-green-100 rounded p-2">
                          <p className="text-xs font-medium text-green-700 mb-1">โอกาส</p>
                          {isEditingCard ? (
                            <textarea
                              className="w-full text-xs text-green-800 bg-white border border-green-300 rounded px-1.5 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-green-400"
                              rows={3}
                              value={g.opportunity || ''}
                              onChange={e => updateGap(i, 'opportunity', e.target.value)}
                            />
                          ) : (
                            <p className="text-xs text-green-600">{g.opportunity}</p>
                          )}
                        </div>
                        {/* อุปสรรค */}
                        <div className="bg-red-100 rounded p-2">
                          <p className="text-xs font-medium text-red-700 mb-1">อุปสรรค</p>
                          {isEditingCard ? (
                            <textarea
                              className="w-full text-xs text-red-800 bg-white border border-red-300 rounded px-1.5 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
                              rows={3}
                              value={g.barrier || ''}
                              onChange={e => updateGap(i, 'barrier', e.target.value)}
                            />
                          ) : (
                            <p className="text-xs text-red-600">{g.barrier}</p>
                          )}
                        </div>
                        {/* คำแนะนำ */}
                        <div className="bg-blue-100 rounded p-2">
                          <p className="text-xs font-medium text-blue-700 mb-1">คำแนะนำ</p>
                          {isEditingCard ? (
                            <textarea
                              className="w-full text-xs text-blue-800 bg-white border border-blue-300 rounded px-1.5 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-blue-400"
                              rows={3}
                              value={g.recommendation || ''}
                              onChange={e => updateGap(i, 'recommendation', e.target.value)}
                            />
                          ) : (
                            <p className="text-xs text-blue-600">{g.recommendation}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
