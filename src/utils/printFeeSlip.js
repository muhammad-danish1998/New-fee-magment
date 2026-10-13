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

export function printFeeSlip({ student, latestPayment = null }) {
  if (!student) return;

  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";
  const collegePhone = import.meta.env.COLLEGE_PHONE || "+92 3424049132";
  const collegeAddress = import.meta.env.COLLEGE_ADDRESS || "Plot#381, street 9 Qazzafi town Bin Qasim Malir karachi";

  const totalFee = Number(student.total_fee) || 0;
  const totalPaid = Number(student.total_paid) || 0;
  const remainingDues = Number(student.dues) || 0;
  const isPaidInFull = remainingDues === 0;

  const paidToday = latestPayment ? Number(latestPayment.amount) : 0;
  const previousPaid = Math.max(0, totalPaid - paidToday);
  const rawReceiptNo = latestPayment?.receipt_no || `RCP-${student.id.slice(0, 6).toUpperCase()}`;
  const receiptNo = escapeHtml(rawReceiptNo);
  const slipDate = latestPayment?.payment_date || new Date().toISOString().split('T')[0];

  const cleanStudentName = escapeHtml((student.student_name || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_'));
  const pdfTitle = `Fee_Slip_${cleanStudentName}_${rawReceiptNo}`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(pdfTitle)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    body {
      background: #ffffff;
      color: #0f172a;
      padding: 0;
      display: flex;
      justify-content: center;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .slip-card {
      position: relative;
      width: 100%;
      max-width: 190mm;
      border: 2px solid #0d9488;
      border-radius: 12px;
      padding: 20px 24px;
      background: #ffffff;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .watermark-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      height: 320px;
      opacity: 0.08;
      pointer-events: none;
      z-index: 1;
      filter: grayscale(80%);
    }
    .content-layer {
      position: relative;
      z-index: 2;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0d9488;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-container {
      width: 65px;
      height: 65px;
      flex-shrink: 0;
    }
    .college-title {
      font-size: 17px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .college-meta {
      font-size: 11px;
      color: #475569;
      margin-top: 3px;
    }
    .header-badge {
      background: #f0fdfa;
      color: #0f766e;
      border: 1.5px solid #0d9488;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      text-align: right;
      letter-spacing: 0.5px;
    }
    .meta-bar {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      font-size: 11.5px;
    }
    .meta-item span.label {
      color: #64748b;
      display: block;
      font-size: 9.5px;
      text-transform: uppercase;
      font-weight: 600;
      margin-bottom: 2px;
    }
    .meta-item span.val {
      color: #0f172a;
      font-weight: 700;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 14px;
      font-size: 11.5px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 4px;
      margin-bottom: 4px;
    }
    .info-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
      padding-bottom: 0;
    }
    .info-row span.k {
      color: #64748b;
    }
    .info-row span.v {
      font-weight: 600;
      color: #0f172a;
    }
    .table-container {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 14px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 7px 12px;
      border-bottom: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-size: 10px;
    }
    td {
      padding: 6.5px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .text-right {
      text-align: right;
    }
    .font-bold {
      font-weight: 700;
    }
    .status-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 14px;
    }
    .status-paid {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      color: #15803d;
    }
    .status-due {
      background: #fffbeb;
      border: 1.5px solid #fde68a;
      color: #b45309;
    }
    .status-badge {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .dues-text {
      font-size: 13px;
      font-weight: 800;
      font-family: monospace;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 10px;
    }
    .sig-box {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-top: 1.5px dashed #64748b;
      margin-bottom: 4px;
    }
    .sig-label {
      font-size: 10px;
      color: #475569;
      font-weight: 600;
      text-transform: uppercase;
    }
    .footer {
      text-align: center;
      margin-top: 16px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 9.5px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="slip-card">
    <!-- Inline Background Watermark Logo -->
    <div class="watermark-container">
      ${collegeLogoSvg}
    </div>

    <div class="content-layer">
      <!-- Header -->
      <div class="header">
        <div class="header-left">
          <div class="logo-container">
            ${collegeLogoSvg}
          </div>
          <div>
            <div class="college-title">${escapeHtml(collegeName)}</div>
            <div class="college-meta">${escapeHtml(collegeAddress)}</div>
            <div class="college-meta" style="color: #0d9488; font-weight: 600;">Phone: ${escapeHtml(collegePhone)}</div>
          </div>
        </div>
        <div>
          <div class="header-badge">Fee Payment Slip</div>
          <div style="font-size: 9px; color: #64748b; text-align: right; margin-top: 3px;">Student &amp; Office Copy</div>
        </div>
      </div>

      <!-- Metadata Bar -->
      <div class="meta-bar">
        <div class="meta-item">
          <span class="label">Receipt Number</span>
          <span class="val" style="color: #0d9488; font-family: monospace;">${receiptNo}</span>
        </div>
        <div class="meta-item">
          <span class="label">Payment Date</span>
          <span class="val">${escapeHtml(formatDate(slipDate))}</span>
        </div>
        <div class="meta-item" style="text-align: right;">
          <span class="label">Payment Method</span>
          <span class="val">${escapeHtml(latestPayment?.payment_method || 'Cash')}</span>
        </div>
      </div>

      <!-- Student Info Grid -->
      <div class="info-grid">
        <div>
          <div class="info-row">
            <span class="k">Student Name:</span>
            <span class="v">${escapeHtml(student.student_name)}</span>
          </div>
          <div class="info-row">
            <span class="k">Father Name:</span>
            <span class="v">${escapeHtml(student.father_name)}</span>
          </div>
          <div class="info-row">
            <span class="k">Student CNIC:</span>
            <span class="v" style="font-family: monospace;">${escapeHtml(student.student_cnic || 'N/A')}</span>
          </div>
          <div class="info-row">
            <span class="k">Contact Number:</span>
            <span class="v">${escapeHtml(student.contact_number || 'N/A')}</span>
          </div>
        </div>

        <div>
          <div class="info-row">
            <span class="k">Admission Session:</span>
            <span class="v" style="color: #0d9488;">${escapeHtml(student.admission_session)}</span>
          </div>
          <div class="info-row">
            <span class="k">Admission Type:</span>
            <span class="v">${escapeHtml(student.admission_type)}</span>
          </div>
          <div class="info-row">
            <span class="k">Program / Group:</span>
            <span class="v">${escapeHtml(student.program_group)}</span>
          </div>
          <div class="info-row">
            <span class="k">Academic Class:</span>
            <span class="v" style="font-weight: 700; color: #0d9488;">${escapeHtml(student.academic_class)}</span>
          </div>
        </div>
      </div>

      <!-- Fee Breakdown Table -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Total Academic Tuition Fee</td>
              <td class="text-right font-bold" style="font-family: monospace;">${escapeHtml(formatCurrency(totalFee))}</td>
            </tr>
            <tr>
              <td>Previously Paid Fee</td>
              <td class="text-right" style="font-family: monospace; color: #475569;">${escapeHtml(formatCurrency(previousPaid))}</td>
            </tr>
            <tr style="background: #f0fdfa;">
              <td style="font-weight: 700; color: #0f766e;">Paid Amount (Current Transaction)</td>
              <td class="text-right font-bold" style="font-family: monospace; color: #0f766e; font-size: 12.5px;">${escapeHtml(formatCurrency(paidToday))}</td>
            </tr>
            <tr style="background: #f8fafc; font-weight: 700;">
              <td>Total Paid Fee to Date</td>
              <td class="text-right font-bold" style="font-family: monospace; color: #15803d;">${escapeHtml(formatCurrency(totalPaid))}</td>
            </tr>
            <tr style="background: ${remainingDues > 0 ? '#fffbeb' : '#f0fdf4'};">
              <td style="font-weight: 800; font-size: 12px; color: ${remainingDues > 0 ? '#b45309' : '#15803d'};">
                ${remainingDues > 0 ? 'Remaining Outstanding Dues' : 'Remaining Balance'}
              </td>
              <td class="text-right font-bold" style="font-family: monospace; font-size: 13px; color: ${remainingDues > 0 ? '#b45309' : '#15803d'};">
                ${escapeHtml(formatCurrency(remainingDues))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Payment Status Card -->
      <div class="status-card ${isPaidInFull ? 'status-paid' : 'status-due'}">
        <div>
          <span class="status-badge">${isPaidInFull ? 'PAID IN FULL' : 'PAYMENT DUE'}</span>
          <div style="font-size: 10px; margin-top: 2px;">
            ${isPaidInFull 
              ? 'All college admission fees are cleared. Thank you.' 
              : student.next_payment_due_date 
                ? 'Promised / Next Due Date: ' + escapeHtml(formatDate(student.next_payment_due_date)) + (student.commitment_notes ? ' (' + escapeHtml(student.commitment_notes) + ')' : '')
                : student.commitment_notes
                ? 'Due Condition / Milestone: <strong>' + escapeHtml(student.commitment_notes) + '</strong>'
                : 'Please clear the remaining fee dues before deadline.'}
          </div>
        </div>
        <div class="dues-text">
          ${isPaidInFull ? 'Balance: Rs. 0' : 'Dues: ' + escapeHtml(formatCurrency(remainingDues))}
        </div>
      </div>

      <!-- Dual Signatures -->
      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line"></div>
          <span class="sig-label">Student / Depositor Signature</span>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <span class="sig-label">Authorized Accounts Officer</span>
        </div>
      </div>

      <!-- Non-Refundable Policy Note -->
      <div style="margin-top: 14px; text-align: center; font-size: 10px; font-weight: 700; color: #b91c1c; letter-spacing: 0.2px;">
        Note: Fee once paid is strictly non-refundable and non-transferable.
      </div>

      <!-- Footer -->
      <div class="footer">
        Computer Generated Official Receipt • ${escapeHtml(collegeName)} • System Verified
      </div>
    </div>
  </div>
</body>
</html>
  `;

  // Preserve original parent title
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
