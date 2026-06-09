import { useState } from 'react';
import { aiComplete, parseJsonSafe } from '../api.js';
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
      const prompt = `[ROLE] บรรณาธิการ Tech Portfolio โครงการ Deep Mentorship Program มหาวิทยาลัยแม่โจ้
[TASK] เขียนคำแถลงทักษะ/สมรรถนะ 3–4 ประโยค โดยรวมทักษะที่เลือกเข้าด้วยกันเป็นเรื่องราวที่สอดคล้องกัน
[CONTEXT] สาขาวิจัย: ${profile.domain || ''}
ทักษะที่เลือก: ${skillList.join(', ')}
[FORMAT] JSON: { "statement": "..." } — ใช้ภาษาไทยทั้งหมด ใช้ "นักวิจัย" แทน "ผม/ดิฉัน"
ตอบกลับเป็น JSON ที่ถูกต้องเท่านั้น ไม่ต้องมีคำอธิบาย ไม่ต้องมี markdown หรือ code fence`;
      const content = await aiComplete([{ role: 'user', content: prompt }]);
      const parsed = parseJsonSafe(content);
      setStatement(parsed?.statement || content.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setWritingStatement(false);
    }
  }

  async function polishStatement() {
    if (!statement) return;
    setWritingStatement(true);
    try {
      const content = await aiComplete([
        { role: 'user', content: stepConfig.buildRewritePrompt(statement) }
      ]);
      const parsed = parseJsonSafe(content);
      setStatement(parsed?.statement || content.trim());
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
        const skills = Array.isArray(parsed) ? parsed : (parsed?.items ?? []);
        const brief = !Array.isArray(parsed) ? parsed?.brief : '';
        const selectedArr = [...selected];
        return (
          <div className="space-y-4">
            {brief && <p className="text-sm text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{brief}</p>}
            {skills.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">เลือกทักษะให้ตรงกับนักวิจัย</p>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => writeStatement(selectedArr)}
                      disabled={writingStatement}
                      className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
                    >
                      {writingStatement ? '⏳ กำลังเขียน...' : '✨ ให้ AI เขียน'}
                    </button>
                    {statement && (
                      <button
                        onClick={polishStatement}
                        disabled={writingStatement}
                        className="text-xs text-gold hover:text-gold/70 disabled:opacity-40"
                      >
                        ✨ ปรับปรุงด้วย AI
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  className="w-full border border-warm-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white"
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
