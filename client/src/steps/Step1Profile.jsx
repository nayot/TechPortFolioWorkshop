import { useState, useRef } from 'react';
import { api, aiComplete } from '../api.js';
import { STEPS } from '../prompts.js';
import AIStepPanel from '../components/AIStepPanel.jsx';

const stepConfig = STEPS.find(s => s.id === 'profile');

export default function Step1Profile({ project, onSave }) {
  const saved = project.steps?.profile || {};
  const [cvText, setCvText] = useState(project.cvText || '');
  const [cvFileName, setCvFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [fields, setFields] = useState(saved.parsed?.fields || saved.fields || {});
  const [statement, setStatement] = useState(saved.finalText || saved.parsed?.statement || '');
  const [rewriting, setRewriting] = useState(false);
  const fileRef = useRef(null);

  async function uploadCV(file) {
    setUploading(true);
    setUploadError('');
    const fd = new FormData();
    fd.append('cv', file);
    try {
      const res = await fetch('/api/cv/upload', { method: 'POST', credentials: 'include', body: fd });
      if (!res.ok) throw new Error((await res.json()).error);
      const { text } = await res.json();
      setCvText(text);
      setCvFileName(file.name);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function rewriteStatement() {
    if (!statement) return;
    setRewriting(true);
    try {
      const content = await aiComplete([
        { role: 'user', content: `You are a portfolio editor. Polish and improve this researcher profile statement while keeping the same facts and tone. Return only the improved statement, no explanations:\n\n${statement}` }
      ]);
      setStatement(content.trim());
    } catch (err) {
      console.error(err);
    } finally {
      setRewriting(false);
    }
  }

  function handleAIOutput({ rawOutput, parsed, onSave: save }) {
    return (
      <div className="space-y-4">
        {parsed && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              ['name', 'ชื่อ-ตำแหน่ง'],
              ['position', 'ตำแหน่ง'],
              ['institution', 'สถาบัน'],
              ['domain', 'สาขาวิจัย'],
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
                <input
                  className="mt-1 w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={fields[key] || parsed[key] || ''}
                  onChange={e => setFields(prev => ({ ...prev, [key]: e.target.value }))}
                />
              </label>
            ))}
            {parsed.expertise && (
              <div className="sm:col-span-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Expertise keywords</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {parsed.expertise.map(k => (
                    <span key={k} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">คำแถลงโปรไฟล์</label>
          <textarea
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
            rows={5}
            value={statement}
            onChange={e => setStatement(e.target.value)}
            placeholder="AI จะร่างคำแถลงให้ หรือพิมพ์ด้วยตนเอง..."
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={rewriteStatement}
              disabled={rewriting || !statement}
              className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-40 flex items-center gap-1"
            >
              {rewriting ? '⏳ กำลังเขียนใหม่...' : '✨ เขียนใหม่ด้วย AI'}
            </button>
          </div>
        </div>

        <button
          disabled={!statement}
          onClick={() => save({
            finalText: statement,
            fields: { ...fields, ...(parsed || {}) },
            cvText,
          })}
          className="w-full py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          บันทึก Profile
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* CV upload */}
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-5">
        <p className="text-sm font-medium text-gray-700 mb-2">อัปโหลด CV (PDF หรือ DOCX)</p>
        {cvFileName && (
          <p className="text-xs text-green-600 mb-2">✓ {cvFileName} — ข้อความถูกดึงแล้ว ({cvText.length} ตัวอักษร)</p>
        )}
        {uploadError && <p className="text-xs text-red-600 mb-2">{uploadError}</p>}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {uploading ? 'กำลังอัปโหลด...' : '📎 เลือกไฟล์'}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={e => e.target.files[0] && uploadCV(e.target.files[0])} />
          {cvText && (
            <button onClick={() => { setCvText(''); setCvFileName(''); }} className="text-xs text-gray-400 hover:text-gray-600">✕ ลบ CV</button>
          )}
        </div>
        {!cvFileName && (
          <p className="text-xs text-gray-400 mt-2">ถ้าไม่มี CV สามารถให้ AI ร่างโปรไฟล์โดยใช้ข้อมูลที่กรอกในฟอร์ม</p>
        )}
      </div>

      <AIStepPanel
        stepConfig={stepConfig}
        buildContext={() => ({ cvText })}
        outputType="json-profile"
        onSave={data => onSave({ ...data, cvText })}
        savedData={saved}
        onParsed={(p) => {
          if (p?.statement && !statement) setStatement(p.statement);
          if (p) setFields(prev => ({ ...prev, ...p }));
        }}
      >
        {(props) => handleAIOutput(props)}
      </AIStepPanel>
    </div>
  );
}
