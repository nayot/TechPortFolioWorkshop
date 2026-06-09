import { useState } from 'react';
import { STEPS } from '../prompts.js';
import AIStepPanel from '../components/AIStepPanel.jsx';

const stepConfig = STEPS.find(s => s.id === 'impact');

export default function Step6Impact({ project, onSave }) {
  const saved = project.steps?.impact || {};
  const profile = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};
  const projects = project.steps?.projects?.selections || [];
  const [selected, setSelected] = useState(new Set(saved.selections || []));
  const [customItem, setCustomItem] = useState('');

  function toggle(item) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }

  function addCustom() {
    if (!customItem.trim()) return;
    setSelected(prev => new Set([...prev, customItem.trim()]));
    setCustomItem('');
  }

  return (
    <AIStepPanel
      stepConfig={stepConfig}
      buildContext={() => ({ cvText: project.cvText, profile, projects })}
      outputType="selectable-list"
      onSave={data => onSave({ ...data, selections: [...selected] })}
      savedData={saved}
    >
      {({ parsed, onSave: save }) => {
        const suggestions = Array.isArray(parsed) ? parsed : (parsed?.items ?? []);
        const brief = !Array.isArray(parsed) ? parsed?.brief : '';
        const extra = [...selected].filter(s => !suggestions.includes(s));
        const selectedArr = [...selected];
        return (
          <div className="space-y-4">
            {brief && <p className="text-sm text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{brief}</p>}
            {suggestions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">เลือกผลกระทบที่ตรงกับงานของคุณ</p>
                <div className="flex flex-col gap-2">
                  {suggestions.map(item => (
                    <label key={item} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                      <input type="checkbox" checked={selected.has(item)} onChange={() => toggle(item)} className="w-4 h-4 accent-indigo-600 mt-0.5 shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {extra.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">ที่เพิ่มเอง</p>
                {extra.map(item => (
                  <label key={item} className="flex items-start gap-3 p-3 border border-indigo-200 bg-indigo-50 rounded-lg mb-2">
                    <input type="checkbox" checked={true} onChange={() => toggle(item)} className="w-4 h-4 accent-indigo-600 mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700">{item}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <input
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="เพิ่มผลกระทบด้วยตนเอง..."
                value={customItem}
                onChange={e => setCustomItem(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCustom()}
              />
              <button onClick={addCustom} className="px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">เพิ่ม</button>
            </div>

            {selectedArr.length > 0 && <p className="text-xs text-gray-500">เลือกแล้ว {selectedArr.length} รายการ</p>}

            <button
              disabled={selectedArr.length === 0}
              onClick={() => save({ selections: selectedArr })}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              บันทึก Impact ({selectedArr.length})
            </button>
          </div>
        );
      }}
    </AIStepPanel>
  );
}
