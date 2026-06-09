import { useState } from 'react';
import { STEPS } from '../prompts.js';
import AIStepPanel from '../components/AIStepPanel.jsx';

const stepConfig = STEPS.find(s => s.id === 'commercialization');

const GAP_ICON = '🔍';

export default function Step8CommercializationGaps({ project, onSave }) {
  const saved = project.steps?.commercialization || {};
  const profile = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};
  const projects = project.steps?.projects?.selections || [];
  const evidence = project.steps?.evidence?.selections || [];
  const impact = project.steps?.impact?.selections || [];
  const [selected, setSelected] = useState(new Set((saved.selections || []).map(g => g.gap)));
  const [gaps, setGaps] = useState(saved.parsed?.items || saved.parsed || []);

  function toggle(gapTitle) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(gapTitle) ? next.delete(gapTitle) : next.add(gapTitle);
      return next;
    });
  }

  return (
    <AIStepPanel
      stepConfig={stepConfig}
      buildContext={() => ({
        cvText: project.cvText,
        profile,
        skills: project.steps?.skills?.selections || [],
        projects,
        evidence,
        impact,
      })}
      outputType="selectable-cards"
      onSave={data => onSave({ ...data, selections: gaps.filter(g => selected.has(g.gap)) })}
      savedData={saved}
      onParsed={(p) => {
        const items = Array.isArray(p) ? p : (p?.items ?? []);
        if (items.length) setGaps(items);
      }}
    >
      {({ parsed, onSave: save }) => {
        const parsedItems = Array.isArray(parsed) ? parsed : (parsed?.items ?? []);
        const brief = !Array.isArray(parsed) ? parsed?.brief : '';
        const allGaps = parsedItems.length ? parsedItems : gaps;

        return (
          <div className="space-y-3">
            {brief && (
              <p className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">{brief}</p>
            )}

            {allGaps.map((g, i) => (
              <div
                key={i}
                onClick={() => toggle(g.gap)}
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  selected.has(g.gap) ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 mt-0.5 ${
                    selected.has(g.gap) ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300'
                  }`}>
                    {selected.has(g.gap) ? '✓' : ''}
                  </span>
                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-gray-900">{GAP_ICON} {g.gap}</p>
                    {g.description && <p className="text-xs text-gray-600">{g.description}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                      {g.opportunity && (
                        <div className="bg-green-50 rounded p-2">
                          <p className="text-xs font-medium text-green-700 mb-0.5">โอกาส</p>
                          <p className="text-xs text-green-600">{g.opportunity}</p>
                        </div>
                      )}
                      {g.barrier && (
                        <div className="bg-red-50 rounded p-2">
                          <p className="text-xs font-medium text-red-700 mb-0.5">อุปสรรค</p>
                          <p className="text-xs text-red-600">{g.barrier}</p>
                        </div>
                      )}
                      {g.recommendation && (
                        <div className="bg-blue-50 rounded p-2">
                          <p className="text-xs font-medium text-blue-700 mb-0.5">คำแนะนำ</p>
                          <p className="text-xs text-blue-600">{g.recommendation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              disabled={selected.size === 0}
              onClick={() => save({ selections: allGaps.filter(g => selected.has(g.gap)) })}
              className="w-full py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              บันทึก Commercialization Gaps ({selected.size})
            </button>
          </div>
        );
      }}
    </AIStepPanel>
  );
}
