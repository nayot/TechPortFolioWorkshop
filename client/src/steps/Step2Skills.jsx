import { useState } from 'react';
import { aiComplete } from '../api.js';
import { STEPS } from '../prompts.js';
import AIStepPanel from '../components/AIStepPanel.jsx';

const stepConfig = STEPS.find(s => s.id === 'skills');

export default function Step2Skills({ project, onSave }) {
  const saved = project.steps?.skills || {};
  const profile = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};
  const [selected, setSelected] = useState(new Set(saved.selections || []));
  const [statement, setStatement] = useState(saved.finalText || '');
  const [writingStatement, setWritingStatement] = useState(false);

  function toggle(skill) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(skill) ? next.delete(skill) : next.add(skill);
      return next;
    });
  }

  async function writeStatement(skillList) {
    if (skillList.length === 0) return;
    setWritingStatement(true);
    try {
      const content = await aiComplete([{
        role: 'user',
        content: `Write a 3–4 sentence skills/competencies statement for a university researcher's Tech Portfolio. The statement should integrate these selected skills into a coherent narrative about their capabilities:\n\nSkills: ${skillList.join(', ')}\nResearcher domain: ${profile.domain || ''}\n\nReturn only the statement, no explanation.`
      }]);
      setStatement(content.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setWritingStatement(false);
    }
  }

  return (
    <AIStepPanel
      stepConfig={stepConfig}
      buildContext={() => ({ cvText: project.cvText, profile })}
      outputType="selectable-list"
      onSave={data => onSave({ ...data, selections: [...selected], finalText: statement })}
      savedData={saved}
    >
      {({ parsed, onSave: save }) => {
        const skills = Array.isArray(parsed) ? parsed : [];
        const selectedArr = [...selected];
        return (
          <div className="space-y-4">
            {skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">เลือกทักษะที่ตรงกับคุณ</p>
                <div className="flex flex-wrap gap-2">
                  {skills.map(skill => (
                    <button
                      key={skill}
                      onClick={() => toggle(skill)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selected.has(skill)
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                      }`}
                    >
                      {selected.has(skill) ? '✓ ' : ''}{skill}
                    </button>
                  ))}
                </div>
                {selectedArr.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">เลือกแล้ว {selectedArr.length} ทักษะ</p>
                )}
              </div>
            )}

            {selectedArr.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">คำแถลงทักษะ</label>
                  <button
                    onClick={() => writeStatement(selectedArr)}
                    disabled={writingStatement}
                    className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
                  >
                    {writingStatement ? '⏳ กำลังเขียน...' : '✨ ให้ AI เขียน'}
                  </button>
                </div>
                <textarea
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  rows={4}
                  value={statement}
                  onChange={e => setStatement(e.target.value)}
                  placeholder="คำแถลงทักษะจะปรากฏที่นี่..."
                />
              </div>
            )}

            <button
              disabled={selectedArr.length === 0}
              onClick={() => save({ selections: selectedArr, finalText: statement })}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              บันทึก Skills
            </button>
          </div>
        );
      }}
    </AIStepPanel>
  );
}
