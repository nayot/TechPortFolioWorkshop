import { useState, useEffect, useRef } from 'react';
import { aiComplete, parseJsonSafe } from '../api.js';

export default function AIStepPanel({ stepConfig, buildContext, outputType, onSave, savedData, onParsed, children }) {
  const [prompt, setPrompt] = useState('');
  const [rawOutput, setRawOutput] = useState(savedData?.rawSuggestion || '');
  const [parsed, setParsed] = useState(savedData?.parsed || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [promptVisible, setPromptVisible] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  function getPrompt() {
    if (prompt) return prompt;
    return stepConfig.buildPrompt(buildContext());
  }

  async function generate() {
    setLoading(true);
    setError('');
    const fullPrompt = getPrompt() || stepConfig.buildPrompt(buildContext());
    if (!prompt) setPrompt(fullPrompt);

    let lastErr;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt > 0) await new Promise(r => setTimeout(r, 3000));
        const content = await aiComplete([{ role: 'user', content: fullPrompt }]);
        setRawOutput(content);
        if (outputType !== 'text') {
          const p = parseJsonSafe(content);
          setParsed(p);
          if (p && onParsed) onParsed(p);
        } else if (onParsed) {
          onParsed(content);
        }
        setLoading(false);
        return;
      } catch (err) {
        lastErr = err;
      }
    }
    setError(lastErr.message);
    setLoading(false);
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
      <div className="border border-warm-border rounded-lg overflow-hidden">
        <button
          onClick={() => setPromptVisible(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2.5 bg-gold-pale text-sm font-medium text-navy hover:bg-gold-light transition-colors"
        >
          <span>📝 ดู/แก้ไข Prompt (RTCF)</span>
          <span className="text-warm-muted">{promptVisible ? '▲' : '▼'}</span>
        </button>
        {promptVisible && (
          <div className="p-3 bg-white/70">
            <textarea
              className="w-full text-xs font-mono border border-warm-border rounded p-2 resize-y focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white"
              rows={10}
              value={prompt || stepConfig.buildPrompt(buildContext())}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Prompt จะปรากฏที่นี่ — แก้ไขได้ก่อนกด Generate"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-navy hover:bg-navy-hover text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm transition-colors border-2 border-navy"
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
        {loading && (
          <span className="text-sm font-mono text-gold tabular-nums font-semibold">
            {String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error} — <button onClick={generate} className="underline">ลองใหม่</button>
        </div>
      )}

      {children({ rawOutput, parsed, onSave: handleSave, loading })}
    </div>
  );
}
