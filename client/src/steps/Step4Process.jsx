import { useState } from 'react';
import { STEPS } from '../prompts.js';
import AIStepPanel from '../components/AIStepPanel.jsx';

const stepConfig = STEPS.find(s => s.id === 'process');

export default function Step4Process({ project, onSave }) {
  const saved = project.steps?.process || {};
  const profile = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};
  const skills = project.steps?.skills?.selections || [];
  const [selected, setSelected] = useState(new Set(saved.selections || []));

  function toggle(item) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(item) ? next.delete(item) : next.add(item);
      return next;
    });
  }

  return (
    <AIStepPanel
      stepConfig={stepConfig}
      buildContext={() => ({ cvText: project.cvText, profile, skills })}
      outputType="selectable-list"
      onSave={data => onSave({ ...data, selections: [...selected] })}
      savedData={saved}
    >
      {({ parsed, onSave: save }) => {
        const items = Array.isArray(parsed) ? parsed : (parsed?.items ?? []);
        const brief = !Array.isArray(parsed) ? parsed?.brief : '';
        const selectedArr = [...selected];
        return (
          <div className="space-y-4">
            {brief && <p className="text-sm text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{brief}</p>}
            {items.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">เลือกกระบวนการที่ตรงกับวิธีทำงานของคุณ</p>
                <div className="flex flex-col gap-2">
                  {items.map(item => (
                    <label key={item} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-indigo-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={selected.has(item)}
                        onChange={() => toggle(item)}
                        className="w-4 h-4 accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700">{item}</span>
                    </label>
                  ))}
                </div>
                {selectedArr.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">เลือกแล้ว {selectedArr.length} กระบวนการ</p>
                )}
              </div>
            )}

            <button
              disabled={selectedArr.length === 0}
              onClick={() => save({ selections: selectedArr })}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              บันทึก Process ({selectedArr.length})
            </button>
          </div>
        );
      }}
    </AIStepPanel>
  );
}
