import { useState } from 'react';
import { aiComplete, parseJsonSafe } from '../api.js';
import { STEPS } from '../prompts.js';
import AIStepPanel from '../components/AIStepPanel.jsx';

const stepConfig = STEPS.find(s => s.id === 'reflection');

export default function Step7Reflection({ project, onSave }) {
  const saved = project.steps?.reflection || {};
  const profile = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};
  const skills = project.steps?.skills?.selections || [];
  const projects = project.steps?.projects?.selections || [];
  const evidence = project.steps?.evidence?.selections || [];
  const impact = project.steps?.impact?.selections || [];
  const [text, setText] = useState(saved.finalText || '');
  const [selectedTitle, setSelectedTitle] = useState(saved.selectedTitle || null);
  const [polishing, setPolishing] = useState(false);

  async function polish() {
    if (!text) return;
    setPolishing(true);
    try {
      const content = await aiComplete([
        { role: 'user', content: stepConfig.buildRewritePrompt(text) }
      ]);
      const parsed = parseJsonSafe(content);
      setText(parsed?.statement || content.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setPolishing(false);
    }
  }

  return (
    <AIStepPanel
      stepConfig={stepConfig}
      buildContext={() => ({ profile, skills, projects, evidence, impact })}
      outputType="selectable-cards"
      onSave={data => onSave({ ...data, finalText: text, selectedTitle })}
      savedData={saved}
      onParsed={(p) => {
        // Don't auto-populate — let the user choose an option
      }}
    >
      {({ parsed, onSave: save }) => {
        const options = Array.isArray(parsed) ? parsed : (parsed?.items ?? []);
        const brief = !Array.isArray(parsed) ? parsed?.brief : '';

        return (
          <div className="space-y-4">
            {brief && (
              <p className="text-sm text-gray-600 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{brief}</p>
            )}

            {/* Selectable reflection options */}
            {options.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">เลือกแนวทาง Reflection ที่เหมาะสม</p>
                {options.map((opt, i) => (
                  <div
                    key={i}
                    onClick={() => { setText(opt.text); setSelectedTitle(opt.title); }}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      selectedTitle === opt.title
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs shrink-0 mt-0.5 font-bold ${
                        selectedTitle === opt.title
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 text-gray-500'
                      }`}>
                        {selectedTitle === opt.title ? '✓' : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{opt.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                          {opt.text?.substring(0, 120)}…
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {selectedTitle && (
                  <p className="text-xs text-indigo-600">✓ เลือกแล้ว — แก้ไขข้อความได้ในช่องด้านล่าง</p>
                )}
              </div>
            )}

            {/* Editable textarea */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Reflection</label>
                <button
                  onClick={polish}
                  disabled={polishing || !text}
                  className="text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-40"
                >
                  {polishing ? '⏳ กำลังปรับปรุง...' : '✨ ปรับปรุงด้วย AI'}
                </button>
              </div>
              <textarea
                className="w-full border border-warm-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white"
                rows={12}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="เลือกแนวทางด้านบน หรือพิมพ์ Reflection ด้วยตนเอง..."
              />
            </div>

            <button
              disabled={!text}
              onClick={() => save({ finalText: text, selectedTitle })}
              className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              บันทึก Reflection
            </button>
          </div>
        );
      }}
    </AIStepPanel>
  );
}
