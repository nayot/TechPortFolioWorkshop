import { useState } from 'react';
import { STEPS } from '../prompts.js';
import AIStepPanel from '../components/AIStepPanel.jsx';

const stepConfig = STEPS.find(s => s.id === 'evidence');

const TYPE_LABELS = { publication: '📄 Publication', patent: '🔬 Patent', grant: '💰 Grant', award: '🏆 Award', prototype: '⚙️ Prototype', other: '📌 Other' };

export default function Step5Evidence({ project, onSave }) {
  const saved = project.steps?.evidence || {};
  const profile = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};
  const [selected, setSelected] = useState(new Set((saved.selections || []).map(e => e.title)));
  const [items, setItems] = useState(saved.parsed || []);
  const [extra, setExtra] = useState({ type: 'publication', title: '', year: '', description: '' });
  const [showAdd, setShowAdd] = useState(false);

  function toggle(title) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }

  function addItem() {
    if (!extra.title) return;
    setItems(prev => [...prev, extra]);
    setSelected(prev => new Set([...prev, extra.title]));
    setExtra({ type: 'publication', title: '', year: '', description: '' });
    setShowAdd(false);
  }

  return (
    <AIStepPanel
      stepConfig={stepConfig}
      buildContext={() => ({ cvText: project.cvText, profile })}
      outputType="selectable-cards"
      onSave={data => onSave({ ...data, selections: items.filter(e => selected.has(e.title)) })}
      savedData={saved}
      onParsed={(p) => { if (p?.length) setItems(p); }}
    >
      {({ parsed, onSave: save }) => {
        const allItems = parsed?.length ? parsed : items;

        return (
          <div className="space-y-3">
            {allItems.map((e, i) => (
              <div
                key={i}
                onClick={() => toggle(e.title)}
                className={`border rounded-lg p-3 cursor-pointer transition-all ${selected.has(e.title) ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <div className="flex items-start gap-2">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 mt-0.5 ${selected.has(e.title) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300'}`}>
                    {selected.has(e.title) ? '✓' : ''}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{TYPE_LABELS[e.type] || e.type}</span>
                      {e.year && <span className="text-xs text-gray-400">{e.year}</span>}
                    </div>
                    <p className="text-sm font-medium text-gray-900 mt-1">{e.title}</p>
                    {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
                  </div>
                </div>
              </div>
            ))}

            {showAdd ? (
              <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">เพิ่มหลักฐานด้วยตนเอง</p>
                <select className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm" value={extra.type} onChange={e => setExtra(p => ({ ...p, type: e.target.value }))}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="ชื่อ *" value={extra.title} onChange={e => setExtra(p => ({ ...p, title: e.target.value }))} />
                <input className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" placeholder="ปี" value={extra.year} onChange={e => setExtra(p => ({ ...p, year: e.target.value }))} />
                <textarea className="w-full border border-gray-200 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" rows={2} placeholder="คำอธิบาย" value={extra.description} onChange={e => setExtra(p => ({ ...p, description: e.target.value }))} />
                <div className="flex gap-2">
                  <button onClick={addItem} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700">เพิ่ม</button>
                  <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-gray-500 text-sm">ยกเลิก</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowAdd(true)} className="text-sm text-indigo-600 hover:text-indigo-800">+ เพิ่มหลักฐานด้วยตนเอง</button>
            )}

            <button
              disabled={selected.size === 0}
              onClick={() => save({ selections: allItems.filter(e => selected.has(e.title)) })}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              บันทึก Evidence ({selected.size})
            </button>
          </div>
        );
      }}
    </AIStepPanel>
  );
}
