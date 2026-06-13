function Spinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5 inline" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

function AIField({ label, value, loading, placeholder, rows, onChange, onRegen, readOnly }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-warm-muted">{label}</label>
        {!readOnly && (
          <button
            onClick={onRegen}
            disabled={loading}
            className="text-xs px-2 py-0.5 rounded border border-warm-border text-warm-muted hover:text-navy hover:border-navy disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            {loading ? <Spinner /> : '✨'} AI ช่วยใหม่
          </button>
        )}
      </div>
      <textarea
        className={`w-full border border-warm-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white text-navy transition-opacity ${loading ? 'opacity-50 pointer-events-none' : ''}`}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={e => !readOnly && onChange(e.target.value)}
        disabled={loading}
        readOnly={readOnly}
      />
    </div>
  );
}

export default function OverviewPanel({ plan, onChange, onRegen, fieldLoading, readOnly = false }) {
  return (
    <div className="bg-parchment border border-warm-border rounded-xl p-5 space-y-4 mb-4">
      <h3 className="text-sm font-bold text-navy uppercase tracking-wide">ภาพรวม</h3>

      <div>
        <label className="block text-xs font-semibold text-warm-muted mb-1">
          ข้อมูล Mentor <span className="font-normal">(สรุปสั้น ๆ สำหรับประกอบ AI)</span>
        </label>
        <textarea
          className="w-full border border-warm-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-gold/40 bg-white text-navy"
          rows={2}
          placeholder="เช่น รองศาสตราจารย์ด้าน Food Technology มีประสบการณ์ IP และการ spin-off ผลงานวิจัย 15 ปี"
          value={plan.mentorProfile}
          onChange={e => !readOnly && onChange({ mentorProfile: e.target.value })}
          readOnly={readOnly}
        />
      </div>

      <AIField
        label="สรุป Mentee"
        value={plan.menteeSnapshot}
        loading={!!fieldLoading['menteeSnapshot']}
        placeholder="สรุปโปรไฟล์ของ mentee — กด 'สร้าง Draft ทั้งหมด' หรือ 'AI ช่วยใหม่' เพื่อสร้าง"
        rows={3}
        onChange={v => onChange({ menteeSnapshot: v })}
        onRegen={() => onRegen('menteeSnapshot', null)}
        readOnly={readOnly}
      />

      <AIField
        label="จุดแข็งของ Mentor ที่ Match กับ Mentee คนนี้"
        value={plan.mentorStrengths}
        loading={!!fieldLoading['mentorStrengths']}
        placeholder="ความเชี่ยวชาญของ mentor ที่ตรงกับความต้องการของ mentee — กด 'AI ช่วยใหม่' เพื่อสร้าง"
        rows={2}
        onChange={v => onChange({ mentorStrengths: v })}
        onRegen={() => onRegen('mentorStrengths', null)}
        readOnly={readOnly}
      />
    </div>
  );
}
