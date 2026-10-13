import { formatCurrency, formatDate } from './feeCalculator';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function printFeeDueNotice({ student, noticeData }) {
  if (!student) return;

  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";
  const collegePhone = import.meta.env.COLLEGE_PHONE || "+92 3424049132";
  const collegeAddress = import.meta.env.COLLEGE_ADDRESS || "Plot#381, street 9 Qazzafi town Bin Qasim Malir karachi";

  const totalFee = Number(student.total_fee) || 0;
  const totalPaid = Number(student.total_paid) || 0;
  const dueAmount = Number(noticeData?.due_amount ?? student.dues) || 0;

  const noticeDate = noticeData?.notice_date || new Date().toISOString().split('T')[0];
  const deadlineDate = noticeData?.deadline_date || student.next_payment_due_date || '';
  const noticeNo = noticeData?.notice_no || `FDN-${student.id.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const remarks = noticeData?.remarks || '';

  const cleanStudentName = escapeHtml((student.student_name || 'Student').trim().replace(/[^a-zA-Z0-9_-]/g, '_'));
  const pdfTitle = `Fee_Due_Notice_${cleanStudentName}_${noticeNo}`;

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
    .notice-card {
      position: relative;
      width: 100%;
      max-width: 190mm;
      border: 2px solid #b45309;
      border-radius: 12px;
      padding: 24px 28px;
      background: #ffffff;
      overflow: hidden;
      page-break-inside: avoid;
    }
    .watermark-container {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 340px;
      height: 340px;
      opacity: 0.05;
      pointer-events: none;
      z-index: 1;
      filter: grayscale(100%);
    }
    .content-layer {
      position: relative;
      z-index: 2;
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      border-bottom: 2px solid #d97706;
      gap: 16px;
    }
    .brand-section {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .logo-img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #0f172a;
      padding: 2px;
      border: 2px solid #d97706;
    }
    .college-title {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .college-sub {
      font-size: 10.5px;
      color: #475569;
      margin-top: 2px;
      font-weight: 500;
    }
    .college-contact {
      font-size: 10px;
      color: #b45309;
      font-family: monospace;
      font-weight: 600;
      margin-top: 2px;
    }
    .badge-box {
      text-align: right;
      flex-shrink: 0;
    }
    .notice-badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 6px;
      background: #fef3c7;
      color: #92400e;
      border: 1.5px solid #f59e0b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .ref-bar {
      margin-top: 14px;
      display: flex;
      justify-content: space-between;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 11px;
      font-weight: 600;
      color: #78350f;
    }
    .salutation {
      margin-top: 16px;
      font-size: 12px;
      line-height: 1.5;
      color: #1e293b;
    }
    .salutation-title {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .student-grid {
      margin-top: 12px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11px;
    }
    .grid-item {
      display: flex;
      flex-direction: column;
    }
    .grid-label {
      font-size: 9.5px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
    }
    .grid-val {
      font-weight: 700;
      color: #0f172a;
      margin-top: 1px;
    }
    .statement-table {
      margin-top: 16px;
      width: 100%;
      border-collapse: collapse;
      font-size: 11.5px;
    }
    .statement-table th {
      background: #0f172a;
      color: #ffffff;
      padding: 7px 10px;
      text-align: left;
      font-weight: 700;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .statement-table td {
      padding: 7px 10px;
      border-bottom: 1px solid #e2e8f0;
    }
    .amount-highlight {
      background: #fef2f2 !important;
      border-top: 2px solid #ef4444;
      border-bottom: 2px solid #ef4444;
    }
    .amount-val {
      font-size: 14px;
      font-weight: 900;
      color: #b91c1c;
      font-family: monospace;
      text-align: right;
    }
    .deadline-box {
      margin-top: 14px;
      background: #fff1f2;
      border: 1.5px dashed #e11d48;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .deadline-text {
      font-size: 11px;
      color: #881337;
      font-weight: 600;
    }
    .deadline-val {
      font-size: 13px;
      font-weight: 800;
      color: #be123c;
    }
    .body-text {
      margin-top: 14px;
      font-size: 11px;
      line-height: 1.6;
      color: #334155;
      text-align: justify;
    }
    .warning-box {
      margin-top: 12px;
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 9px 12px;
      border-radius: 0 8px 8px 0;
      font-size: 10.5px;
      line-height: 1.5;
      color: #92400e;
      font-weight: 600;
    }
    .remarks-box {
      margin-top: 10px;
      background: #f1f5f9;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 10.5px;
      color: #334155;
      border: 1px solid #cbd5e1;
    }
    .signatures {
      margin-top: 36px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding: 0 20px;
    }
    .sig-box {
      text-align: center;
      width: 180px;
    }
    .sig-line {
      border-bottom: 1.5px solid #0f172a;
      margin-bottom: 6px;
    }
    .sig-label {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="notice-card">
    <div class="watermark-container">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" style="width:100%; height:100%;">
        <circle cx="100" cy="100" r="94" stroke="#d97706" stroke-width="4" />
        <path d="M 60 60 L 140 60 C 140 110 100 145 100 145 C 100 145 60 110 60 60 Z" fill="#78350f"/>
        <text x="100" y="162" text-anchor="middle" fill="#d97706" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="14">JMT</text>
      </svg>
    </div>

    <div class="content-layer">
      <!-- Header -->
      <div class="header-bar">
        <div class="brand-section">
          <div class="logo-img">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" style="width:100%; height:100%;">
              <circle cx="100" cy="100" r="86" fill="#0f172a" stroke="#d97706" stroke-width="3" />
              <path d="M 60 60 L 140 60 C 140 110 100 145 100 145 C 100 145 60 110 60 60 Z" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
              <text x="100" y="130" text-anchor="middle" fill="#fef3c7" font-family="'Segoe UI', sans-serif" font-weight="900" font-size="16">JMT</text>
            </svg>
          </div>
          <div>
            <h1 class="college-title">${escapeHtml(collegeName)}</h1>
            <p class="college-sub">${escapeHtml(collegeAddress)}</p>
            <p class="college-contact">Accounts &amp; Admissions Directorate | Tel: ${escapeHtml(collegePhone)}</p>
          </div>
        </div>

        <div class="badge-box">
          <div class="notice-badge">Fee Due Reminder Notice</div>
          <div style="font-size: 9.5px; color: #64748b; margin-top: 3px;">Official Accounts Notice</div>
        </div>
      </div>

      <!-- Ref Bar -->
      <div class="ref-bar">
        <div>Ref: <strong>${escapeHtml(noticeNo)}</strong></div>
        <div>Date of Issue: <strong>${escapeHtml(formatDate(noticeDate))}</strong></div>
      </div>

      <!-- Salutation -->
      <div class="salutation">
        <div class="salutation-title">To: The Respected Parents / Guardian of Student:</div>
        <div>Student Name: <strong>${escapeHtml(student.student_name)}</strong> (S/O <strong>${escapeHtml(student.father_name)}</strong>)</div>
        <div>Contact: <strong>${escapeHtml(student.contact_number || 'N/A')}</strong> | CNIC: <strong>${escapeHtml(student.student_cnic || 'N/A')}</strong></div>
      </div>

      <!-- Academic Metadata Grid -->
      <div class="student-grid">
        <div class="grid-item">
          <span class="grid-label">Academic Class</span>
          <span class="grid-val">${escapeHtml(student.academic_class || 'N/A')}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Program / Group</span>
          <span class="grid-val">${escapeHtml(student.program_group || 'N/A')}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Admission Type</span>
          <span class="grid-val">${escapeHtml(student.admission_type || 'Regular')}</span>
        </div>
        <div class="grid-item">
          <span class="grid-label">Session</span>
          <span class="grid-val">${escapeHtml(student.admission_session || 'Annual I')}</span>
        </div>
      </div>

      <!-- Statement of Dues Table -->
      <table class="statement-table">
        <thead>
          <tr>
            <th>Fee Description</th>
            <th style="text-align: right;">Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Approved Academic / Admission Fee</td>
            <td style="text-align: right; font-family: monospace; font-weight: bold;">${escapeHtml(formatCurrency(totalFee))}</td>
          </tr>
          <tr>
            <td>Total Amount Paid / Deposited to Date</td>
            <td style="text-align: right; font-family: monospace; color: #16a34a; font-weight: bold;">${escapeHtml(formatCurrency(totalPaid))}</td>
          </tr>
          <tr class="amount-highlight">
            <td style="font-weight: 800; font-size: 12px; color: #991b1b;">TOTAL OUTSTANDING BALANCE DUE</td>
            <td class="amount-val">${escapeHtml(formatCurrency(dueAmount))}</td>
          </tr>
        </tbody>
      </table>

      <!-- Deadline Highlight Box -->
      <div class="deadline-box">
        <div class="deadline-text">
          <span>Final Payment Clearance Deadline:</span>
        </div>
        <div class="deadline-val">
          ${deadlineDate ? escapeHtml(formatDate(deadlineDate)) : 'Immediate / Within 7 Days'}
        </div>
      </div>

      <!-- Body Notice Text -->
      <div class="body-text">
        This is a formal reminder regarding the outstanding admission/tuition fee of <strong>${escapeHtml(formatCurrency(dueAmount))}</strong> for the current academic session. You are kindly requested to deposit the remaining fee dues with the College Accounts Department on or before the aforementioned deadline.
      </div>

      <!-- Warning Clause -->
      <div class="warning-box">
        ⚠️ <strong>Important Advisory:</strong> In compliance with the Board of Intermediate &amp; Secondary Education regulations and College policy, please ensure timely clearance of dues. Delayed payment may incur late fine charges and could result in withholding or delays in Board Enrollment and Examination Admit Card issuance.
      </div>

      ${remarks ? `
      <div class="remarks-box">
        <strong>Special Administrative Remarks:</strong> ${escapeHtml(remarks)}
      </div>
      ` : ''}

      <!-- Signatures -->
      <div class="signatures">
        <div class="sig-box">
          <div class="sig-line"></div>
          <span class="sig-label">Accounts Officer</span>
        </div>
        <div class="sig-box">
          <div class="sig-line"></div>
          <span class="sig-label">Principal / Administrator</span>
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        Official Fee Due Demand Notice • ${escapeHtml(collegeName)} • Accounts Department Verification
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const originalTitle = document.title;
  document.title = pdfTitle;

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
