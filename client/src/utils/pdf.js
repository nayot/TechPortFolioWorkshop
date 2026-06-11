import { API_BASE } from '../api.js';

const PRINT_STYLE = `
  @media print {
    @page { margin: 15mm; size: A4 portrait; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export function downloadPdf(html, title) {
  const win = window.open('', '_blank');
  if (!win) {
    alert('กรุณาอนุญาต popup เพื่อดาวน์โหลด PDF');
    return;
  }
  const styledHtml = html.replace('</head>', `<style>${PRINT_STYLE}</style></head>`);
  win.document.write(styledHtml);
  win.document.close();
  win.document.title = title || 'document';
  setTimeout(() => { win.focus(); win.print(); }, 500);
}

export async function downloadDocx(html, filename) {
  try {
    const res = await fetch(API_BASE + '/api/export/docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ html, filename }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename || 'document'}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    alert(`ดาวน์โหลด DOCX ไม่สำเร็จ: ${err.message}`);
  }
}

export function buildGapsHtml(draft, project) {
  const prof = project.steps?.profile?.fields || project.steps?.profile?.parsed || {};
  return `<!DOCTYPE html>
<html lang="th"><head>
<meta charset="UTF-8">
<title>Commercialization Gaps — ${prof.name || ''}</title>
<style>
body{font-family:Sarabun,'Noto Sans Thai',Tahoma,Arial,sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#333}
h1{color:#92400e;margin-bottom:4px}
.meta{color:#6b7280;font-size:14px;margin-bottom:20px}
.brief{background:#fffbeb;border-left:4px solid #f59e0b;padding:10px 14px;border-radius:4px;margin-bottom:20px;font-style:italic;font-size:14px}
.card{border:1px solid #fcd34d;border-radius:8px;padding:16px;margin-bottom:16px;background:#fffdf0}
.card-title{font-weight:700;font-size:15px;color:#1a1a2e;margin-bottom:6px}
.card-desc{color:#555;font-size:13px;margin-bottom:12px}
.cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
.col{border-radius:6px;padding:10px}
.opp{background:#dcfce7}.bar{background:#fee2e2}.rec{background:#dbeafe}
.col-label{font-size:11px;font-weight:700;text-transform:uppercase;margin-bottom:4px}
.opp .col-label{color:#166534}.bar .col-label{color:#991b1b}.rec .col-label{color:#1e40af}
.col-text{font-size:13px}
</style>
</head><body>
<h1>วิเคราะห์ช่องว่างเชิงพาณิชย์</h1>
<p class="meta">${prof.name || ''}${prof.institution ? ' · ' + prof.institution : ''}</p>
${draft.gapsBrief ? `<div class="brief">${draft.gapsBrief}</div>` : ''}
${(draft.gaps || []).map(g => `
<div class="card">
  <div class="card-title">🔍 ${g.gap}</div>
  ${g.description ? `<div class="card-desc">${g.description}</div>` : ''}
  <div class="cols">
    <div class="col opp"><div class="col-label">โอกาส</div><div class="col-text">${g.opportunity || '—'}</div></div>
    <div class="col bar"><div class="col-label">อุปสรรค</div><div class="col-text">${g.barrier || '—'}</div></div>
    <div class="col rec"><div class="col-label">คำแนะนำ</div><div class="col-text">${g.recommendation || '—'}</div></div>
  </div>
</div>`).join('')}
</body></html>`;
}
