function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 inline" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

const FIELD_META = {
  sessionGoal: {
    label: '🎯 เป้าหมาย Session นี้',
    placeholder: 'เป้าหมายหลักที่ต้องการบรรลุใน session นี้ เช่น สร้าง rapport และทำความเข้าใจ research pipeline ของ mentee',
    rows: 2,
  },
  diagnosticQuestions: {
    label: '❓ คำถาม Diagnostic (3–5 คำถาม, แต่ละคำถาม 1 บรรทัด)',
    placeholder: 'ตัวอย่าง:\nงานวิจัยชิ้นไหนที่คุณภูมิใจมากที่สุด และทำไม?\nอะไรคืออุปสรรคหลักในการนำงานวิจัยไปใช้ประโยชน์?',
    rows: 5,
  },
  gapsToClose: {
    label: '🔧 Gap ที่ต้องปิดใน Session นี้',
    placeholder: 'ช่องว่างหรือปัญหาที่ session นี้ควรช่วยแก้ไข',
    rows: 2,
  },
  successMarkers: {
    label: '✅ Success Markers',
    placeholder: 'สัญญาณที่บอกว่า session นี้ประสบความสำเร็จ เช่น mentee สามารถระบุ top-3 strength ของตัวเองได้',
    rows: 2,
  },
};

const FIELDS = ['sessionGoal', 'diagnosticQuestions', 'gapsToClose', 'successMarkers'];

export default function SessionPanel({ session, sessionIndex, onChange, onRegen, fieldLoading, readOnly = false }) {
  function handleQuestions(raw) {
    onChange({ diagnosticQuestions: raw.split('\n').filter(Boolean) });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-warm-muted mb-1 block">ชื่อ Session</label>
        <input
          className="w-full border border-warm-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white text-navy font-medium"
          value={session.sessionName || ''}
          onChange={e => !readOnly && onChange({ sessionName: e.target.value })}
          placeholder={`Session ${session.sessionNumber}`}
          readOnly={readOnly}
        />
      </div>

      {FIELDS.map(field => {
        const meta = FIELD_META[field];
        const key = `s${sessionIndex}_${field}`;
        const loading = !!fieldLoading[key];
        const value = field === 'diagnosticQuestions'
          ? (session.diagnosticQuestions || []).join('\n')
          : (session[field] || '');
        const handleChange = field === 'diagnosticQuestions' ? handleQuestions : v => onChange({ [field]: v });

        return (
          <div key={field}>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-warm-muted">{meta.label}</label>
              {!readOnly && (
                <button
                  onClick={() => onRegen(field, sessionIndex)}
                  disabled={loading}
                  className="text-xs px-2 py-0.5 rounded border border-warm-border text-warm-muted hover:text-navy hover:border-navy disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  {loading ? <Spinner /> : '✨'} AI ช่วยใหม่
                </button>
              )}
            </div>
            <textarea
              className={`w-full border border-warm-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white text-navy transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}
              rows={meta.rows}
              placeholder={meta.placeholder}
              value={value}
              onChange={e => !readOnly && handleChange(e.target.value)}
              disabled={loading}
              readOnly={readOnly}
            />
          </div>
        );
      })}
    </div>
  );
}
