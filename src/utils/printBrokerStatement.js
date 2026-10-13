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

export function printBrokerStatement({ broker, students = [], sessionFilter = 'All', progressFilter = 'All' }) {
  if (!broker) return;

  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";
  const collegePhone = import.meta.env.COLLEGE_PHONE || "+92 3424049132";
  const collegeAddress = import.meta.env.COLLEGE_ADDRESS || "Plot#381, street 9 Qazzafi town Bin Qasim Malir karachi";

  const cleanBrokerName = escapeHtml(broker.name || 'Referral Partner');
  const printDate = formatDate(new Date().toISOString());
  const reportId = `STMT-${Date.now().toString().slice(-6)}`;

  // Filter student list
  const filteredList = students.filter(s => {
    if (sessionFilter !== 'All' && s.admission_session !== sessionFilter) return false;
    if (progressFilter !== 'All' && s.current_progress !== progressFilter) return false;
    return true;
  });

  const totalCount = filteredList.length;
  const totalAgreed = filteredList.reduce((sum, s) => sum + (Number(s.agreed_snapshot || s.broker_agreed_amount || s.total_fee) || 0), 0);
  const totalPaid = filteredList.reduce((sum, s) => sum + (Number(s.total_paid) || 0), 0);
  const totalDues = filteredList.reduce((sum, s) => sum + (Number(s.dues) || 0), 0);

  const tableRowsHtml = filteredList.map((s, idx) => {
    const studentFee = Number(s.agreed_snapshot || s.broker_agreed_amount || s.total_fee) || 0;
    const studentPaid = Number(s.total_paid) || 0;
    const studentDues = Number(s.dues) || 0;
    const isPaid = studentDues === 0;

    return `
      <tr>
        <td style="text-align: center; font-weight: 700; color: #475569; width: 30px;">${idx + 1}</td>
        <td>
          <div style="font-weight: 700; color: #0f172a; font-size: 11px; line-height: 1.2;">${escapeHtml(s.student_name)}</div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">S/O ${escapeHtml(s.father_name)}</div>
        </td>
        <td>
          <div style="font-weight: 600; color: #1e293b; font-size: 10.5px;">${escapeHtml(s.academic_class)}</div>
          <div style="font-size: 9.5px; color: #64748b;">${escapeHtml(s.program_group)}</div>
        </td>
        <td style="text-align: center;">
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; background: #f0fdfa; color: #0d9488; border: 1px solid #99f6e4;">
            ${escapeHtml(s.admission_session)}
          </span>
        </td>
        <td style="text-align: center; font-size: 10px; color: #334155; font-family: monospace;">
          ${escapeHtml(formatDate(s.created_at))}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: #6b21a8; font-size: 11px;">
          ${escapeHtml(formatCurrency(studentFee))}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: #047857; font-size: 11px;">
          ${escapeHtml(formatCurrency(studentPaid))}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: ${isPaid ? '#047857' : '#b45309'}; font-size: 11px;">
          ${isPaid ? 'PAID' : escapeHtml(formatCurrency(studentDues))}
        </td>
        <td>
          <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9.5px; font-weight: 700; ${
            s.step_number === 4 ? 'background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;' :
            s.step_number === 3 ? 'background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;' :
            s.step_number === 2 ? 'background: #faf5ff; color: #6b21a8; border: 1px solid #e9d5ff;' :
            'background: #fffbeb; color: #92400e; border: 1px solid #fde68a;'
          }">
            Step ${s.step_number || 1}: ${escapeHtml(s.current_progress || 'Enrollment in Verification')}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Broker_Statement_${cleanBrokerName}_${reportId}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 8mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: #ffffff;
      color: #0f172a;
      padding: 6px;
      font-size: 11px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      line-height: 1.3;
    }
    .statement-container {
      width: 100%;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      padding: 14px;
      background: #ffffff;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      border-bottom: 2px solid #0d9488;
      padding-bottom: 8px;
    }
    .kpi-grid {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
    }
    .kpi-grid td {
      padding: 6px 10px;
      border-right: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .kpi-grid td:last-child {
      border-right: none;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
    }
    thead {
      display: table-header-group;
    }
    .data-table th {
      background: #0f172a !important;
      color: #f8fafc !important;
      font-size: 9.5px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 6px 8px;
      border: 1px solid #0f172a;
      letter-spacing: 0.5px;
    }
    .data-table td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
    }
    .data-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    tr {
      page-break-inside: avoid;
    }
    .totals-row td {
      background: #f1f5f9 !important;
      font-weight: 800;
      border-top: 2px solid #0f172a !important;
    }
    .signature-section {
      width: 100%;
      margin-top: 16px;
      border-collapse: collapse;
      page-break-inside: avoid;
    }
    .sig-box {
      width: 30%;
      text-align: center;
      border-top: 1.5px solid #475569;
      padding-top: 4px;
      font-size: 9.5px;
      font-weight: 700;
      color: #334155;
    }
    @media print {
      body { padding: 0; }
      .statement-container { border: none; padding: 0; }
    }
  </style>
</head>
<body>

  <div class="statement-container">
    
    <!-- Top Header & College Letterhead -->
    <table class="header-table">
      <tr>
        <td style="width: 60px; vertical-align: middle;">
          <div style="width: 54px; height: 54px;">
            ${collegeLogoSvg}
          </div>
        </td>
        <td style="vertical-align: middle; padding-left: 10px;">
          <div style="font-size: 15px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
            ${escapeHtml(collegeName)}
          </div>
          <div style="font-size: 9.5px; color: #475569; margin-top: 2px;">
            ${escapeHtml(collegeAddress)} • Ph: ${escapeHtml(collegePhone)}
          </div>
          <div style="font-size: 11px; font-weight: 800; color: #0d9488; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.8px;">
            Official Referral Partner Statement &amp; Verification Ledger
          </div>
        </td>
        <td style="text-align: right; vertical-align: middle; width: 190px;">
          <div style="display: inline-block; padding: 5px 10px; border: 1.5px solid #0d9488; border-radius: 6px; background: #f0fdfa; text-align: right; width: 100%;">
            <div style="font-size: 8.5px; font-weight: 700; color: #0f766e; text-transform: uppercase;">Statement Ref #</div>
            <div style="font-size: 12px; font-weight: 900; color: #0f172a; font-family: monospace;">${escapeHtml(reportId)}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 1px;">Date: <strong>${escapeHtml(printDate)}</strong></div>
          </div>
        </td>
      </tr>
    </table>

    <!-- Partner Info & KPI Metric Summary Cards -->
    <table class="kpi-grid">
      <tr>
        <td style="width: 22%;">
          <div style="font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Partner / Broker</div>
          <div style="font-size: 12px; font-weight: 800; color: #0f172a; margin-top: 1px;">${escapeHtml(cleanBrokerName)}</div>
          <div style="font-size: 9.5px; color: #475569;">${escapeHtml(broker.phone || 'Registered Partner')}</div>
        </td>
        <td style="width: 16%;">
          <div style="font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Session Filter</div>
          <div style="font-size: 11px; font-weight: 700; color: #0d9488; margin-top: 1px;">
            ${sessionFilter === 'All' ? 'All Sessions (Annual I & II)' : escapeHtml(sessionFilter)}
          </div>
        </td>
        <td style="width: 12%; text-align: center;">
          <div style="font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Enrolled</div>
          <div style="font-size: 15px; font-weight: 900; color: #7c3aed; margin-top: 1px;">${totalCount}</div>
        </td>
        <td style="width: 17%; text-align: right;">
          <div style="font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Package</div>
          <div style="font-size: 13px; font-weight: 900; color: #0f172a; font-family: monospace; margin-top: 1px;">${escapeHtml(formatCurrency(totalAgreed))}</div>
        </td>
        <td style="width: 17%; text-align: right;">
          <div style="font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Total Received</div>
          <div style="font-size: 13px; font-weight: 900; color: #047857; font-family: monospace; margin-top: 1px;">${escapeHtml(formatCurrency(totalPaid))}</div>
        </td>
        <td style="width: 16%; text-align: right;">
          <div style="font-size: 8.5px; font-weight: 800; color: #64748b; text-transform: uppercase;">Outstanding Balance</div>
          <div style="font-size: 13px; font-weight: 900; color: ${totalDues === 0 ? '#047857' : '#b45309'}; font-family: monospace; margin-top: 1px;">
            ${totalDues === 0 ? 'Rs. 0 (PAID)' : escapeHtml(formatCurrency(totalDues))}
          </div>
        </td>
      </tr>
    </table>

    <!-- Student Referral Table -->
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 28px; text-align: center;">#</th>
          <th style="width: 22%;">Student &amp; Father Name</th>
          <th style="width: 17%;">Class &amp; Stream</th>
          <th style="width: 80px; text-align: center;">Session</th>
          <th style="width: 85px; text-align: center;">Enrolled</th>
          <th style="width: 95px; text-align: right;">Agreed Fee</th>
          <th style="width: 90px; text-align: right;">Paid</th>
          <th style="width: 90px; text-align: right;">Dues</th>
          <th style="width: 160px;">Verification Progress</th>
        </tr>
      </thead>
      <tbody>
        ${filteredList.length === 0 ? `
          <tr>
            <td colspan="9" style="text-align: center; padding: 25px; color: #64748b; font-weight: 600;">
              No student referral records found for this selection.
            </td>
          </tr>
        ` : tableRowsHtml}
        
        <!-- Summary Totals Row -->
        <tr class="totals-row">
          <td colspan="5" style="text-align: right; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.5px;">
            <strong>Grand Totals (${totalCount} Students):</strong>
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #6b21a8;">
            ${escapeHtml(formatCurrency(totalAgreed))}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: #047857;">
            ${escapeHtml(formatCurrency(totalPaid))}
          </td>
          <td style="text-align: right; font-family: monospace; font-size: 11.5px; color: ${totalDues === 0 ? '#047857' : '#b45309'};">
            ${escapeHtml(formatCurrency(totalDues))}
          </td>
          <td></td>
        </tr>
      </tbody>
    </table>

    <!-- Official Signatures Section -->
    <table class="signature-section">
      <tr>
        <td class="sig-box">
          Prepared By (Admissions Desk)
        </td>
        <td style="width: 5%;"></td>
        <td class="sig-box">
          Verified By (Accounts Officer)
        </td>
        <td style="width: 5%;"></td>
        <td class="sig-box">
          Partner Signature (${escapeHtml(cleanBrokerName)})
        </td>
      </tr>
    </table>

    <div style="margin-top: 10px; font-size: 8.5px; color: #64748b; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 4px;">
      Computer generated official statement • JMT Public Higher Secondary School &amp; College Fee LMS • Valid without manual alterations.
    </div>

  </div>

</body>
</html>
  `;

  // Create clean isolated iframe to print reliably on desktop, tablet, and mobile
  const existingIframe = document.getElementById('print-broker-statement-frame');
  if (existingIframe) {
    existingIframe.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'print-broker-statement-frame';
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

  setTimeout(() => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (e) {
      console.error('Statement print trigger error:', e);
    }
  }, 350);
}
