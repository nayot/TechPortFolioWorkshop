import { useState } from 'react';
import { aiComplete } from '../api.js';
import { STEPS } from '../prompts.js';
import AIStepPanel from '../components/AIStepPanel.jsx';

const stepConfig = STEPS.find(s => s.id === 'reflection');

export default function Step7Reflection({ project, onSave }) {
  const saved = project.steps?.reflection || {};
  const profile = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};
  const skills = project.steps?.skills?.selections || [];
  const projects = project.steps?.projects?.selections || [];
  const impact = project.steps?.impact?.selections || [];
  const [text, setText] = useState(saved.finalText || '');
  const [polishing, setPolishing] = useState(false);

  async function polish() {
    if (!text) return;
    setPolishing(true);
    try {
      const content = await aiComplete([{
        role: 'user',
        content: `คุณคือโค้ชการเขียน ปรับปรุงบทสะท้อนคิดของนักวิจัยคนนี้สำหรับ Portfolio การเป็นพี่เลี้ยง รักษาความหมายและเอกลักษณ์เดิม แต่ปรับปรุงความชัดเจน ความลื่นไหล และความลึก ใช้ภาษาไทยทั้งหมด ใช้คำว่า "นักวิจัย" แทน "ผม/ดิฉัน" ตอบเฉพาะข้อความที่ปรับปรุงแล้วเท่านั้น:\n\n${text}`
      }]);
      setText(content.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setPolishing(false);
    }
  }

  return (
    <AIStepPanel
      stepConfig={stepConfig}
      buildContext={() => ({ profile, skills, projects, impact })}
      outputType="text"
      onSave={data => onSave({ ...data, finalText: text })}
      savedData={saved}
      onParsed={(content) => { if (content && !text) setText(content.trim()); }}
    >
      {({ onSave: save }) => (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-gray-700">การสะท้อนคิดของฉัน</label>
              <button
                onClick={polish}
                disabled={polishing || !text}
                className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
              >
                {polishing ? '⏳ กำลังปรับปรุง...' : '✨ ปรับปรุงด้วย AI'}
              </button>
            </div>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={12}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="AI จะร่างคำสะท้อนคิดให้ หรือพิมพ์ด้วยตนเอง..."
            />
          </div>
          <button
            disabled={!text}
            onClick={() => save({ finalText: text })}
            className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            บันทึก Reflection
          </button>
        </div>
      )}
    </AIStepPanel>
  );
}
