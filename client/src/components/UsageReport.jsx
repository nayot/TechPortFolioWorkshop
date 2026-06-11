import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from 'recharts';
import { api } from '../api.js';

const PERIODS = [
  { label: '7 วัน',  days: 7  },
  { label: '30 วัน', days: 30 },
  { label: '90 วัน', days: 90 },
];

function fmtNum(n) { return n.toLocaleString('en-US'); }
function fmtCost(n) { return '$' + n.toFixed(4); }
function fmtDate(d) { const [, m, day] = d.split('-'); return `${day}/${m}`; }

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white border border-warm-border rounded-xl p-4">
      <p className="text-xs text-warm-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-navy font-mono">{value}</p>
    </div>
  );
}

function UsageTable({ rows, cols }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="bg-parchment">
            {cols.map(c => (
              <th key={c.key} className={`px-4 py-2 text-xs text-warm-muted font-semibold ${c.right ? 'text-right' : 'text-left'}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={cols.length} className="px-4 py-6 text-center text-warm-muted text-xs">ไม่มีข้อมูลในช่วงเวลานี้</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="border-t border-warm-border/50 hover:bg-parchment/50">
              {cols.map(c => (
                <td key={c.key} className={`px-4 py-2 ${c.mono ? 'font-mono text-xs' : ''} ${c.right ? 'text-right' : ''} ${c.muted ? 'text-warm-muted text-xs' : 'text-navy'}`}>
                  {c.fmt ? c.fmt(row[c.key]) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UsageReport() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    const to   = new Date().toISOString().slice(0, 10);
    const from = new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
    api.get(`/api/admin/usage?from=${from}&to=${to}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [days]);

  const interval = days === 7 ? 0 : days === 30 ? 4 : 8;

  const chartData = data?.daily.map(d => ({
    date:  fmtDate(d.date),
    calls: d.calls,
    cost:  parseFloat(d.costUsd.toFixed(6)),
  })) ?? [];

  const userCols = [
    { key: 'email',        label: 'ผู้ใช้',         mono: true },
    { key: 'calls',        label: 'Calls',          right: true, fmt: fmtNum },
    { key: 'inputTokens',  label: 'Input tokens',   right: true, muted: true, fmt: fmtNum },
    { key: 'outputTokens', label: 'Output tokens',  right: true, muted: true, fmt: fmtNum },
    { key: 'costUsd',      label: 'Cost (USD)',      right: true, mono: true, fmt: fmtCost },
  ];
  const modelCols = [
    { key: 'model',        label: 'โมเดล',           mono: true },
    { key: 'calls',        label: 'Calls',           right: true, fmt: fmtNum },
    { key: 'inputTokens',  label: 'Input tokens',    right: true, muted: true, fmt: fmtNum },
    { key: 'outputTokens', label: 'Output tokens',   right: true, muted: true, fmt: fmtNum },
    { key: 'costUsd',      label: 'Cost (USD)',       right: true, mono: true, fmt: fmtCost },
  ];

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <button
            key={p.days}
            onClick={() => setDays(p.days)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              days === p.days
                ? 'bg-navy text-white border-navy'
                : 'border-warm-border text-warm-muted hover:border-navy hover:text-navy'
            }`}
          >
            {p.label}
          </button>
        ))}
        {loading && <span className="text-xs text-warm-muted self-center ml-2">กำลังโหลด...</span>}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="API Calls"      value={fmtNum(data.summary.totalCalls)} />
            <SummaryCard label="ค่าใช้จ่าย (USD)" value={fmtCost(data.summary.totalCostUsd)} />
            <SummaryCard label="Input tokens"   value={fmtNum(data.summary.totalInputTokens)} />
            <SummaryCard label="Output tokens"  value={fmtNum(data.summary.totalOutputTokens)} />
          </div>

          {/* Daily calls chart */}
          <div className="bg-white border border-warm-border rounded-xl p-4">
            <p className="text-xs font-semibold text-warm-muted uppercase mb-3">API Calls รายวัน</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={interval} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={v => [v, 'Calls']} />
                <Bar dataKey="calls" fill="#1a1a2e" radius={[2, 2, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Daily cost chart */}
          <div className="bg-white border border-warm-border rounded-xl p-4">
            <p className="text-xs font-semibold text-warm-muted uppercase mb-3">ค่าใช้จ่ายรายวัน (USD)</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={interval} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={v => ['$' + Number(v).toFixed(5), 'Cost']} />
                <Bar dataKey="cost" fill="#d4a843" radius={[2, 2, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* By user */}
          <div className="bg-white border border-warm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-border">
              <p className="text-xs font-semibold text-warm-muted uppercase">แยกตามผู้ใช้</p>
            </div>
            <UsageTable rows={data.byUser} cols={userCols} />
          </div>

          {/* By model */}
          <div className="bg-white border border-warm-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-warm-border">
              <p className="text-xs font-semibold text-warm-muted uppercase">แยกตามโมเดล</p>
            </div>
            <UsageTable rows={data.byModel} cols={modelCols} />
          </div>

          <p className="text-xs text-warm-muted pb-2">
            * ค่าใช้จ่ายใช้ราคาจาก OpenRouter โดยตรงเมื่อมี หรือประมาณตารางราคา (มิ.ย. 2569)
            — เวลาแสดงตาม UTC+7
          </p>
        </>
      )}
    </div>
  );
}
