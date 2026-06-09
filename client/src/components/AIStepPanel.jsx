import { useState } from 'react';
import { aiComplete, parseJsonSafe } from '../api.js';

export default function AIStepPanel({ stepConfig, buildContext, outputType, onSave, savedData, onParsed, children }) {
  const [prompt, setPrompt] = useState('');
  const [rawOutput, setRawOutput] = useState(savedData?.rawSuggestion || '');
  const [parsed, setParsed] = useState(savedData?.parsed || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promptVisible, setPromptVisible] = useState(false);

  function getPrompt() {
    if (prompt) return prompt;
    return stepConfig.buildPrompt(buildContext());
  }

  async function generate() {
    setLoading(true);
    setError('');
    const fullPrompt = getPrompt() || stepConfig.buildPrompt(buildContext());
    if (!prompt) setPrompt(fullPrompt);
    try {
      const content = await aiComplete([{ role: 'user', content: fullPrompt }]);
      setRawOutput(content);
      if (outputType !== 'text') {
        const p = parseJsonSafe(content);
        setParsed(p);
        if (p && onParsed) onParsed(p);
      } else if (onParsed) {
        onParsed(content);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSave(finalData) {
    onSave({
      prompt: getPrompt(),
      rawSuggestion: rawOutput,
      parsed,
      ...finalData,
    });
  }

  return (
    <div className="space-y-4">
      {/* Prompt editor */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <button
          onClick={() => setPromptVisible(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span>📝 ดู/แก้ไข Prompt (RTCF)</span>
          <span className="text-gray-400">{promptVisible ? '▲' : '▼'}</span>
        </button>
        {promptVisible && (
          <div className="p-3">
            <textarea
              className="w-full text-xs font-mono border border-gray-200 rounded p-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-300"
              rows={10}
              value={prompt || stepConfig.buildPrompt(buildContext())}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Prompt จะปรากฏที่นี่ — แก้ไขได้ก่อนกด Generate"
            />
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="flex gap-2">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              กำลังสร้าง...
            </>
          ) : rawOutput ? '🔄 สร้างใหม่' : '✨ สร้างด้วย AI'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error} — <button onClick={generate} className="underline">ลองใหม่</button>
        </div>
      )}

      {/* Step-specific output + save UI */}
      {children({ rawOutput, parsed, onSave: handleSave, loading })}
    </div>
  );
}
