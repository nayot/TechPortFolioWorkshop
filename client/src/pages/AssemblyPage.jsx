import { useState } from 'react';
import { api } from '../api.js';
import { STEPS } from '../prompts.js';

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-indigo-700 border-b border-indigo-100 pb-2 mb-3">{title}</h2>
      {children}
    </section>
  );
}

function buildHtml(project) {
  const steps = project.steps || {};
  const profile = steps.profile?.fields || steps.profile?.parsed || {};
  const skills = steps.skills?.selections || [];
  const skillsStatement = steps.skills?.finalText || '';
  const projects = steps.projects?.selections || [];
  const process = steps.process?.selections || [];
  const evidence = steps.evidence?.selections || [];
  const impact = steps.impact?.selections || [];
  const reflection = steps.reflection?.finalText || '';

  return `<!DOCTYPE html>
<html lang="th"><head><meta charset="UTF-8"><title>Tech Portfolio — ${profile.name || ''}</title>
<style>body{font-family:Sarabun,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}
h1{color:#1a1a2e}h2{color:#4338ca;border-bottom:2px solid #e0e7ff;padding-bottom:8px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.chip{background:#e0e7ff;color:#3730a3;padding:4px 12px;border-radius:20px;font-size:13px}
.card{border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:12px}
.label{font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em}</style>
</head><body>
<h1>${profile.name || 'Tech Portfolio'}</h1>
<p><strong>${profile.position || ''}</strong>${profile.institution ? ' · ' + profile.institution : ''}</p>

<h2>1. Profile</h2>
<p>${steps.profile?.finalText || profile.statement || ''}</p>

<h2>2. Skills</h2>
<div class="chips">${skills.map(s => `<span class="chip">${s}</span>`).join('')}</div>
${skillsStatement ? `<p style="margin-top:12px">${skillsStatement}</p>` : ''}

<h2>3. Projects</h2>
${projects.map(p => `<div class="card"><strong>${p.title}</strong>${p.period ? ` (${p.period})` : ''}<p>${p.description || ''}</p>${p.impact ? `<p><em>💡 ${p.impact}</em></p>` : ''}</div>`).join('')}

<h2>4. Process</h2>
<div class="chips">${process.map(s => `<span class="chip">${s}</span>`).join('')}</div>

<h2>5. Evidence</h2>
${evidence.map(e => `<div class="card"><span class="label">${e.type}</span> ${e.year ? `(${e.year})` : ''}<p><strong>${e.title}</strong></p><p>${e.description || ''}</p></div>`).join('')}

<h2>6. Impact</h2>
<ul>${impact.map(i => `<li>${i}</li>`).join('')}</ul>

<h2>7. Reflection</h2>
<p style="white-space:pre-wrap">${reflection}</p>
</body></html>`;
}

function buildMarkdownBrief(project) {
  const steps = project.steps || {};
  const profile = steps.profile?.fields || steps.profile?.parsed || {};
  const skills = steps.skills?.selections || [];
  const projects = steps.projects?.selections || [];
  const process = steps.process?.selections || [];
  const impact = steps.impact?.selections || [];
  const reflection = steps.reflection?.finalText || '';

  return `# Tech Portfolio Infographic Brief

**Researcher:** ${profile.name || 'N/A'}
**Domain:** ${profile.domain || 'N/A'}
**Institution:** ${profile.institution || 'N/A'}

## Profile Statement
${steps.profile?.finalText || profile.statement || 'N/A'}

## Skills (${skills.length})
${skills.map(s => `- ${s}`).join('\n')}

## Key Projects (${projects.length})
${projects.map(p => `- **${p.title}** (${p.period || ''}): ${p.description || ''}`).join('\n')}

## Working Process
${process.map(p => `- ${p}`).join('\n')}

## Impact
${impact.map(i => `- ${i}`).join('\n')}

## Reflection
${reflection}

---
*Paste this brief into ChatGPT or Gemini with the instruction: "Create a professional infographic for this researcher's Tech Portfolio. Use a clean, academic style with the Maejo University Deep Mentorship Program branding."*`;
}

export default function AssemblyPage({ project, projectMeta, onEditStep, onBack }) {
  const steps = project.steps || {};
  const profile = steps.profile?.fields || steps.profile?.parsed || {};
  const skills = steps.skills?.selections || [];
  const projects = steps.projects?.selections || [];
  const process = steps.process?.selections || [];
  const evidence = steps.evidence?.selections || [];
  const impact = steps.impact?.selections || [];
  const reflection = steps.reflection?.finalText || '';

  const [exporting, setExporting] = useState(false);
  const [exportLink, setExportLink] = useState('');
  const [exportError, setExportError] = useState('');
  const [briefCopied, setBriefCopied] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  async function exportToGoogleDocs() {
    setExporting(true);
    setExportError('');
    try {
      const html = buildHtml(project);
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
    navigator.clipboard.writeText(buildMarkdownBrief(project));
    setBriefCopied(true);
    setTimeout(() => setBriefCopied(false), 2000);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white sticky top-0 z-10">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-gray-700">← กลับแก้ไข</button>
        <h2 className="text-sm font-semibold text-gray-900">ภาพรวม Portfolio</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBrief(v => !v)}
            className="px-3 py-1.5 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
          >
            📊 Infographic Brief
          </button>
          <button
            onClick={exportToGoogleDocs}
            disabled={exporting}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50"
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
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Infographic Brief (สำหรับ ChatGPT)</p>
                <button onClick={copyBrief} className="text-xs text-indigo-600 hover:text-indigo-800">
                  {briefCopied ? '✅ คัดลอกแล้ว' : '📋 คัดลอก'}
                </button>
              </div>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono overflow-auto max-h-64">
                {buildMarkdownBrief(project)}
              </pre>
            </div>
          )}

          {/* Profile */}
          <Section title="1. Profile">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{profile.name || '—'}</p>
                <p className="text-sm text-gray-500">{profile.position}{profile.institution ? ' · ' + profile.institution : ''}</p>
                {profile.expertise && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {profile.expertise.map(k => (
                      <span key={k} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">{k}</span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-700 mt-3">{steps.profile?.finalText || profile.statement || '—'}</p>
              </div>
              <button onClick={() => onEditStep('profile')} className="text-xs text-indigo-500 hover:text-indigo-700 ml-4 shrink-0">แก้ไข</button>
            </div>
          </Section>

          {/* Skills */}
          <Section title="2. Skills">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {skills.length > 0 ? skills.map(s => (
                    <span key={s} className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">{s}</span>
                  )) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
                </div>
                {steps.skills?.finalText && <p className="text-sm text-gray-700 mt-3">{steps.skills.finalText}</p>}
              </div>
              <button onClick={() => onEditStep('skills')} className="text-xs text-indigo-500 hover:text-indigo-700 ml-4 shrink-0">แก้ไข</button>
            </div>
          </Section>

          {/* Projects */}
          <Section title="3. Projects">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                {projects.length > 0 ? projects.map((p, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <p className="text-sm font-semibold text-gray-900">{p.title} {p.period && <span className="font-normal text-gray-400">({p.period})</span>}</p>
                    {p.description && <p className="text-xs text-gray-600 mt-1">{p.description}</p>}
                    {p.impact && <p className="text-xs text-indigo-600 mt-1">💡 {p.impact}</p>}
                  </div>
                )) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
              </div>
              <button onClick={() => onEditStep('projects')} className="text-xs text-indigo-500 hover:text-indigo-700 ml-4 shrink-0">แก้ไข</button>
            </div>
          </Section>

          {/* Process */}
          <Section title="4. Process">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {process.length > 0 ? process.map(s => (
                    <span key={s} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">{s}</span>
                  )) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
                </div>
              </div>
              <button onClick={() => onEditStep('process')} className="text-xs text-indigo-500 hover:text-indigo-700 ml-4 shrink-0">แก้ไข</button>
            </div>
          </Section>

          {/* Evidence */}
          <Section title="5. Evidence">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                {evidence.length > 0 ? evidence.map((e, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{e.type}</span>
                      {e.year && <span className="text-xs text-gray-400">{e.year}</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{e.title}</p>
                  </div>
                )) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
              </div>
              <button onClick={() => onEditStep('evidence')} className="text-xs text-indigo-500 hover:text-indigo-700 ml-4 shrink-0">แก้ไข</button>
            </div>
          </Section>

          {/* Impact */}
          <Section title="6. Impact">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {impact.length > 0 ? (
                  <ul className="space-y-1">
                    {impact.map((i, idx) => (
                      <li key={idx} className="text-sm text-gray-700 flex gap-2"><span className="text-indigo-400 shrink-0">•</span>{i}</li>
                    ))}
                  </ul>
                ) : <span className="text-gray-400 text-sm">ยังไม่ได้เลือก</span>}
              </div>
              <button onClick={() => onEditStep('impact')} className="text-xs text-indigo-500 hover:text-indigo-700 ml-4 shrink-0">แก้ไข</button>
            </div>
          </Section>

          {/* Reflection */}
          <Section title="7. Reflection">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{reflection || <span className="text-gray-400">ยังไม่ได้เขียน</span>}</p>
              </div>
              <button onClick={() => onEditStep('reflection')} className="text-xs text-indigo-500 hover:text-indigo-700 ml-4 shrink-0">แก้ไข</button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
