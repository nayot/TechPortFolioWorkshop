import { useState } from 'react';
import { STEPS } from '../prompts.js';
import AIStepPanel from '../components/AIStepPanel.jsx';

const stepConfig = STEPS.find(s => s.id === 'projects');

export default function Step3Projects({ project, onSave }) {
  const saved = project.steps?.projects || {};
  const profile = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};
  const [selected, setSelected] = useState(new Set((saved.selections || []).map(p => p.title)));
  const [projects, setProjects] = useState(
    Array.isArray(saved.parsed) ? saved.parsed : (saved.parsed?.items ?? [])
  );
  const [extra, setExtra] = useState({ title: '', period: '', description: '', impact: '' });
  const [showAdd, setShowAdd] = useState(false);

  function toggle(title) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  function addProject() {
    if (!extra.title) return;
    setProjects(prev => [...prev, extra]);
    setSelected(prev => new Set([...prev, extra.title]));
    setExtra({ title: '', period: '', description: '', impact: '' });
    setShowAdd(false);
  }

  return (
    <AIStepPanel
      stepConfig={stepConfig}
      buildContext={() => ({ cvText: project.cvText, profile, skills: project.steps?.skills?.selections || [] })}
      outputType="selectable-cards"
      onSave={data => onSave({ ...data, selections: projects.filter(p => selected.has(p.title)) })}
      savedData={saved}
      onParsed={(p) => { const its = Array.isArray(p) ? p : (p?.items ?? []); if (its.length) setProjects(its); }}
    >
      {({ parsed, onSave: save }) => {
        const parsedItems = Array.isArray(parsed) ? parsed : (parsed?.items ?? []);
        const brief = !Array.isArray(parsed) ? parsed?.brief : '';
        const items = parsedItems.length ? parsedItems : projects;

        return (
          <div className="space-y-3">
            {brief && <p className="text-sm text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{brief}</p>}
            {items.map((p, i) => (
              <div
                key={i}
                onClick={() => toggle(p.title)}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selected.has(p.title) ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${
                        selected.has(p.title) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'
                      }`}>
                        {selected.has(p.title) ? '✓' : ''}
                      </span>
                      <h4 className="text-sm font-semibold text-gray-900">{p.title}</h4>
                      {p.period && <span className="text-xs text-gray-400">({p.period})</span>}
                    </div>
                    {p.description && <p className="text-xs text-gray-600 mt-1 ml-6">{p.description}</p>}
                    {p.impact && <p className="text-xs text-indigo-600 mt-0.5 ml-6">💡 {p.impact}</p>}
                    {p.references?.length > 0 && (
                      <div className="ml-6 mt-1">
                        {p.references.map((ref, ri) => (
                          <p key={ri} className="text-xs text-gray-400 italic">📚 {ref}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {showAdd ? (
              <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">เพิ่มโครงการด้วยตนเอง</p>
                <input className="w-full border border-warm-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white" placeholder="ชื่อโครงการ *" value={extra.title} onChange={e => setExtra(p => ({ ...p, title: e.target.value }))} />
                <input className="w-full border border-warm-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white" placeholder="ปี / ช่วงเวลา" value={extra.period} onChange={e => setExtra(p => ({ ...p, period: e.target.value }))} />
                <textarea className="w-full border border-warm-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white" rows={2} placeholder="คำอธิบาย" value={extra.description} onChange={e => setExtra(p => ({ ...p, description: e.target.value }))} />
                <input className="w-full border border-warm-border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white" placeholder="ผลกระทบหลัก" value={extra.impact} onChange={e => setExtra(p => ({ ...p, impact: e.target.value }))} />
                <div className="flex gap-2">
                  <button onClick={addProject} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">เพิ่ม</button>
                  <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-gray-500 text-sm">ยกเลิก</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAdd(true)} className="text-sm text-indigo-600 hover:text-indigo-800">+ เพิ่มโครงการด้วยตนเอง</button>
            )}

            <button
              disabled={selected.size === 0}
              onClick={() => save({ selections: items.filter(p => selected.has(p.title)) })}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              บันทึก Projects ({selected.size})
            </button>
          </div>
        );
      }}
    </AIStepPanel>
  );
}
