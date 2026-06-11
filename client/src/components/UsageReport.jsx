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

const RESOLUTIONS = [
  { value: '1m',  label: '1 นาที'   },
  { value: '10m', label: '10 นาที'  },
  { value: '30m', label: '30 นาที'  },
  { value: '1h',  label: '1 ชั่วโมง' },
  { value: '1d',  label: '1 วัน'    },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }
function daysAgoStr(n) { return new Date(Date.now() - (n - 1) * 86_400_000).toISOString().slice(0, 10); }
function fmtNum(n) { return n.toLocaleString('en-US'); }
function fmtCost(n) { return '$' + n.toFixed(4); }

// Short label for X axis
function fmtBucket(key, resolution) {
  if (resolution === '1d' || !key.includes('T')) {
    const [, m, d] = key.split('-');
    return `${d}/${m}`;
  }
  return key.split('T')[1]; // HH:MM
}

// Full label for tooltip
function fmtBucketFull(key, resolution) {
  if (!key.includes('T')) return key;
  const [date, time] = key.split('T');
  return `${date} ${time}`;
}

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
  const [from,       setFrom]       = useState(() => daysAgoStr(30));
  const [to,         setTo]         = useState(() => todayStr());
  const [resolution, setResolution] = useState('1d');
  const [activeDays, setActiveDays] = useState(30);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');

  function fetchData(fromDate, toDate, res) {
    setLoading(true);
    setError('');
    api.get(`/api/admin/usage?from=${fromDate}&to=${toDate}&resolution=${res}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(from, to, resolution); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePreset(days) {
    const f = daysAgoStr(days);
    const t = todayStr();
    setFrom(f); setTo(t); setActiveDays(days);
    fetchData(f, t, resolution);
  }

  function handleCustomFetch() {
    if (!from || !to || from > to) { setError('กรุณาเลือกช่วงวันที่ให้ถูกต้อง'); return; }
    setActiveDays(null);
    fetchData(from, to, resolution);
  }

  function handleResolution(r) {
    setResolution(r);
    fetchData(from, to, r);
  }

  const bucketCount = data?.buckets?.length ?? 0;
  const axisInterval = bucketCount <= 12 ? 0
    : bucketCount <= 60  ? 4
    : bucketCount <= 120 ? 9
    : Math.floor(bucketCount / 10);

  const res = data?.resolution ?? resolution;
  const chartData = data?.buckets.map(b => ({
    label: fmtBucket(b.bucket, res),
    full:  fmtBucketFull(b.bucket, res),
    calls: b.calls,
    cost:  parseFloat(b.costUsd.toFixed(6)),
  })) ?? [];

  const userCols = [
    { key: 'email',        label: 'ผู้ใช้',        mono: true },
    { key: 'calls',        label: 'Calls',         right: true, fmt: fmtNum },
    { key: 'inputTokens',  label: 'Input tokens',  right: true, muted: true, fmt: fmtNum },
    { key: 'outputTokens', label: 'Output tokens', right: true, muted: true, fmt: fmtNum },
    { key: 'costUsd',      label: 'Cost (USD)',     right: true, mono: true,  fmt: fmtCost },
  ];
  const modelCols = [
    { key: 'model',        label: 'โมเดล',         mono: true },
    { key: 'calls',        label: 'Calls',         right: true, fmt: fmtNum },
    { key: 'inputTokens',  label: 'Input tokens',  right: true, muted: true, fmt: fmtNum },
    { key: 'outputTokens', label: 'Output tokens', right: true, muted: true, fmt: fmtNum },
    { key: 'costUsd',      label: 'Cost (USD)',     right: true, mono: true,  fmt: fmtCost },
  ];

  return (
    <div className="space-y-4 pb-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map(p => (
          <button key={p.days} onClick={() => handlePreset(p.days)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
              activeDays === p.days
                ? 'bg-navy text-white border-navy'
                : 'border-warm-border text-warm-muted hover:border-navy hover:text-navy'
            }`}
          >{p.label}</button>
        ))}
        <span className="text-warm-border">|</span>
        <input type="date" value={from} max={to}
          onChange={e => { setFrom(e.target.value); setActiveDays(null); }}
          className="border border-warm-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-navy"
        />
        <span className="text-xs text-warm-muted">ถึง</span>
        <input type="date" value={to} min={from} max={todayStr()}
          onChange={e => { setTo(e.target.value); setActiveDays(null); }}
          className="border border-warm-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:border-navy"
        />
        <button onClick={handleCustomFetch} disabled={loading}
          className="px-4 py-1.5 bg-navy text-white text-sm rounded-lg hover:bg-navy/90 disabled:opacity-50"
        >{loading ? '...' : 'ดึงข้อมูล'}</button>
      </div>

      {/* Resolution selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-warm-muted font-semibold">ความละเอียด:</span>
        {RESOLUTIONS.map(r => (
          <button key={r.value} onClick={() => handleResolution(r.value)}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${
              resolution === r.value
                ? 'bg-gold text-navy border-gold'
                : 'border-warm-border text-warm-muted hover:border-navy hover:text-navy'
            }`}
          >{r.label}</button>
        ))}
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3">
            <SummaryCard label="API Calls"        value={fmtNum(data.summary.totalCalls)} />
            <SummaryCard label="ค่าใช้จ่าย (USD)"  value={fmtCost(data.summary.totalCostUsd)} />
            <SummaryCard label="Input tokens"     value={fmtNum(data.summary.totalInputTokens)} />
            <SummaryCard label="Output tokens"    value={fmtNum(data.summary.totalOutputTokens)} />
          </div>

          {/* Calls chart */}
          <div className="bg-white border border-warm-border rounded-xl p-4">
            <p className="text-xs font-semibold text-warm-muted uppercase mb-3">API Calls</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={axisInterval} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ''}
                  formatter={v => [v, 'Calls']}
                />
                <Bar dataKey="calls" fill="#1a1a2e" radius={[2, 2, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost chart */}
          <div className="bg-white border border-warm-border rounded-xl p-4">
            <p className="text-xs font-semibold text-warm-muted uppercase mb-3">ค่าใช้จ่าย (USD)</p>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 0, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={axisInterval} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ''}
                  formatter={v => ['$' + Number(v).toFixed(5), 'Cost']}
                />
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

          <p className="text-xs text-warm-muted">
            * ค่าใช้จ่ายใช้ราคาจาก OpenRouter โดยตรงเมื่อมี หรือประมาณตามตารางราคา (มิ.ย. 2569)
            — เวลาแสดงตาม UTC+7
          </p>
        </>
      )}
    </div>
  );
}
