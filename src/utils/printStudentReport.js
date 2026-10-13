import { formatCurrency, formatDate } from './feeCalculator';

const collegeLogoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" style="width:100%; height:100%; display:block;">
  <circle cx="100" cy="100" r="94" stroke="#0d9488" stroke-width="4" stroke-dasharray="6 3" />
  <circle cx="100" cy="100" r="86" fill="#0f172a" stroke="#14b8a6" stroke-width="3" />
  <path d="M 40 100 C 35 125 50 155 75 168 C 65 155 58 135 60 115 Z" fill="#0d9488" opacity="0.8"/>
  <path d="M 160 100 C 165 125 150 155 125 168 C 135 155 142 135 140 115 Z" fill="#0d9488" opacity="0.8"/>
  <path d="M 60 60 L 140 60 C 140 110 100 145 100 145 C 100 145 60 110 60 60 Z" fill="#134e4a" stroke="#2dd4bf" stroke-width="2"/>
  <path d="M 100 68 L 128 80 L 100 92 L 72 80 Z" fill="#fbbf24"/>
  <polygon points="128,80 128,95 124,95 124,82" fill="#d97706"/>
  <path d="M 85 86 C 85 96 115 96 115 86" fill="none" stroke="#f59e0b" stroke-width="2"/>
  <path d="M 80 102 C 90 98 100 102 100 102 C 100 102 110 98 120 102 L 120 122 C 110 118 100 122 100 122 C 100 122 90 118 80 122 Z" fill="#f8fafc" stroke="#0f766e" stroke-width="1.5"/>
  <line x1="100" y1="102" x2="100" y2="122" stroke="#0f766e" stroke-width="1.5"/>
  <text x="100" y="162" text-anchor="middle" fill="#5eead4" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="14" letter-spacing="2">JMT</text>
  <text x="100" y="44" text-anchor="middle" fill="#99f6e4" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="9" letter-spacing="1">PUBLIC HIGHER SECONDARY</text>
  <text x="100" y="184" text-anchor="middle" fill="#cbd5e1" font-family="'Segoe UI', sans-serif" font-weight="700" font-size="8" letter-spacing="1">SCHOOL &amp; COLLEGE</text>
</svg>
`;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function printStudentReport({ students = [], brokers = [], subtitle = '' }) {
  if (!students || students.length === 0) {
    alert('No student records available to print.');
    return;
  }

  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";
  const collegePhone = import.meta.env.COLLEGE_PHONE || "+92 3424049132";
  const collegeAddress = import.meta.env.COLLEGE_ADDRESS || "Plot#381, street 9 Qazzafi town Bin Qasim Malir karachi";

  const brokerMap = new Map((brokers || []).map(b => [b.id, b.name]));

  // Calculate grand totals
  const totalStudents = students.length;
  const totalFeeSum = students.reduce((acc, s) => acc + (Number(s.total_fee) || 0), 0);
  const totalPaidSum = students.reduce((acc, s) => acc + (Number(s.total_paid) || 0), 0);
  const totalDuesSum = students.reduce((acc, s) => acc + (Number(s.dues) || 0), 0);

  const reportDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const pdfTitle = `Student_Directory_Report_${new Date().toISOString().split('T')[0]}`;

  const rowsHtml = students.map((s, idx) => {
    const classProgram = [s.academic_class, s.program_group].filter(Boolean).join(' - ');
    const brokerName = s.broker_id ? brokerMap.get(s.broker_id) : null;
    let referral = '';
    if (s.admission_source === 'Referral') {
      referral = brokerName || s.reference || 'Referral';
    } else {
      referral = s.reference && s.reference !== 'Direct' ? s.reference : 'Direct';
    }

    const dues = Number(s.dues) || 0;
    const isOverdue = dues > 0 && s.next_payment_due_date && new Date(s.next_payment_due_date) < new Date();

    return `
      <tr class="${idx % 2 === 1 ? 'even-row' : ''}">
        <td class="text-center font-mono text-muted">${idx + 1}</td>
        <td class="font-bold text-dark">${escapeHtml(s.student_name)}</td>
        <td class="text-dark">${escapeHtml(s.father_name)}</td>
        <td class="text-dark">${escapeHtml(classProgram)}</td>
        <td class="text-right font-mono">${formatCurrency(s.total_fee)}</td>
        <td class="text-right font-mono text-emerald font-bold">${formatCurrency(s.total_paid)}</td>
        <td class="text-right font-mono font-bold ${dues > 0 ? (isOverdue ? 'text-rose' : 'text-amber') : 'text-emerald'}">
          ${formatCurrency(dues)}
        </td>
        <td class="text-dark">
          <span class="badge ${s.admission_source === 'Referral' ? 'badge-purple' : 'badge-neutral'}">
            ${escapeHtml(referral)}
          </span>
        </td>
        <td class="font-mono text-dark">${escapeHtml(s.contact_number || '-')}</td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(pdfTitle)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm 10mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      color: #0f172a;
      background: #ffffff;
      line-height: 1.35;
    }
    .report-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-box {
      width: 52px;
      height: 52px;
      flex-shrink: 0;
    }
    .college-name {
      font-size: 16px;
      font-weight: 900;
      color: #0f766e;
      letter-spacing: 0.3px;
      margin: 0 0 2px 0;
      text-transform: uppercase;
    }
    .college-sub {
      font-size: 9.5px;
      color: #475569;
      margin: 0;
    }
    .report-meta {
      text-align: right;
    }
    .report-title {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 3px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .report-date {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }

    /* Summary KPI Bar */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .summary-card {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
    }
    .card-label {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 2px;
    }
    .card-val {
      font-size: 13px;
      font-weight: 900;
      font-family: 'Segoe UI Mono', Consolas, monospace;
    }

    /* Data Table */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th {
      background: #0f766e;
      color: #ffffff;
      font-weight: 800;
      text-transform: uppercase;
      font-size: 9px;
      letter-spacing: 0.3px;
      padding: 6px 8px;
      border: 1px solid #0f766e;
      text-align: left;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .even-row {
      background: #f8fafc;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: 'Segoe UI Mono', Consolas, monospace; }
    .text-dark { color: #0f172a; }
    .text-muted { color: #64748b; }
    .text-emerald { color: #047857; }
    .text-amber { color: #b45309; }
    .text-rose { color: #be123c; }

    .badge {
      display: inline-block;
      padding: 1px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 600;
    }
    .badge-purple {
      background: #f3e8ff;
      color: #6b21a8;
      border: 1px solid #d8b4fe;
    }
    .badge-neutral {
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
    }

    /* Total Row */
    tr.totals-row td {
      background: #e6fffa !important;
      border-top: 2px solid #0f766e;
      border-bottom: 2px solid #0f766e;
      font-weight: 800;
      font-size: 10.5px;
      padding: 7px 8px;
    }

    /* Signatures Section */
    .signatures-block {
      display: flex;
      justify-content: space-between;
      margin-top: 26px;
      padding-top: 8px;
      page-break-inside: avoid;
    }
    .sig-line {
      width: 28%;
      text-align: center;
      border-top: 1.5px dashed #64748b;
      padding-top: 5px;
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
    }

    /* Footer */
    .footer-note {
      margin-top: 14px;
      text-align: center;
      font-size: 8.5px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 6px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header -->
    <div class="header-bar">
      <div class="brand-section">
        <div class="logo-box">${collegeLogoSvg}</div>
        <div>
          <h1 class="college-name">${escapeHtml(collegeName)}</h1>
          <p class="college-sub">${escapeHtml(collegeAddress)} • Tel: ${escapeHtml(collegePhone)}</p>
        </div>
      </div>
      <div class="report-meta">
        <div class="report-title">Student Directory &amp; Fee Report</div>
        <div class="report-date">Generated: ${escapeHtml(reportDate)} ${subtitle ? `• ${escapeHtml(subtitle)}` : ''}</div>
      </div>
    </div>

    <!-- Summary KPI Cards -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="card-label">Total Students</div>
        <div class="card-val" style="color: #0f766e;">${totalStudents}</div>
      </div>
      <div class="summary-card">
        <div class="card-label">Total Fee Amount</div>
        <div class="card-val" style="color: #0f172a;">${formatCurrency(totalFeeSum)}</div>
      </div>
      <div class="summary-card">
        <div class="card-label">Total Paid Amount</div>
        <div class="card-val" style="color: #047857;">${formatCurrency(totalPaidSum)}</div>
      </div>
      <div class="summary-card">
        <div class="card-label">Outstanding Dues</div>
        <div class="card-val" style="color: ${totalDuesSum > 0 ? '#b45309' : '#047857'};">${formatCurrency(totalDuesSum)}</div>
      </div>
    </div>

    <!-- Main Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 32px;" class="text-center">#</th>
          <th>Student Name</th>
          <th>Father Name</th>
          <th>Class / Program</th>
          <th class="text-right">Total Fee</th>
          <th class="text-right">Paid</th>
          <th class="text-right">Due Amount</th>
          <th>Referral</th>
          <th>Contact Number</th>
        </tr>
      </thead>
      <tbody>
        ${rowsHtml}
        <!-- Grand Totals Row -->
        <tr class="totals-row">
          <td colspan="4" class="font-bold text-dark" style="text-align: left; padding-left: 12px;">
            GRAND TOTAL (${totalStudents} Students)
          </td>
          <td class="text-right font-mono font-bold text-dark">${formatCurrency(totalFeeSum)}</td>
          <td class="text-right font-mono font-bold text-emerald">${formatCurrency(totalPaidSum)}</td>
          <td class="text-right font-mono font-bold ${totalDuesSum > 0 ? 'text-amber' : 'text-emerald'}">${formatCurrency(totalDuesSum)}</td>
          <td colspan="2" class="text-center text-muted" style="font-size: 9px;">— END OF REPORT —</td>
        </tr>
      </tbody>
    </table>

    <!-- Signatures -->
    <div class="signatures-block">
      <div class="sig-line">Prepared By (Accounts Officer)</div>
      <div class="sig-line">Verified By (Admissions Office)</div>
      <div class="sig-line">Authorized Signatory (Principal)</div>
    </div>

    <!-- Footer Note -->
    <div class="footer-note">
      Official Document • ${escapeHtml(collegeName)} • Confidential Student Record
    </div>
  </div>
</body>
</html>
  `;

  // Preserve parent title
  const originalTitle = document.title;
  document.title = pdfTitle;

  // Create isolated iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(htmlContent);
  doc.close();
  doc.title = pdfTitle;

  // Print once iframe finishes loading
  iframe.contentWindow.focus();
  setTimeout(() => {
    iframe.contentWindow.print();
    setTimeout(() => {
      document.title = originalTitle;
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 350);
}
