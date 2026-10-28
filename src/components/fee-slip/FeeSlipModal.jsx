import React from 'react';
import { X, Printer, Share2, Download, CheckCircle, AlertTriangle, Building2, Phone, Calendar, User, FileText, MinusCircle } from 'lucide-react';
import { formatCurrency, formatDate, toTitleCase } from '../../utils/feeCalculator';
import { formatPhoneNumber } from '../../utils/phoneHelper';
import { CollegeLogo } from '../common/CollegeLogo';
import { printFeeSlip } from '../../utils/printFeeSlip';

export function FeeSlipModal({ isOpen, onClose, student, latestPayment = null }) {
  if (!isOpen || !student) return null;

  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";
  const collegePhone = import.meta.env.COLLEGE_PHONE || "+92 3424049132";
  const collegeAddress = import.meta.env.COLLEGE_ADDRESS || "Plot#381, street 9 Qazzafi town Bin Qasim Malir karachi";

  const totalFee = Number(student.total_fee) || 0;
  const totalPaid = Number(student.total_paid) || 0;
  const remainingDues = Number(student.dues) || 0;
  const isNoFee = totalFee <= 0;
  const isPaidInFull = remainingDues === 0 && !isNoFee;

  // Calculate payment breakdown
  const paidToday = latestPayment ? Number(latestPayment.amount) : 0;
  const previousPaid = Math.max(0, totalPaid - paidToday);
  const receiptNo = latestPayment?.receipt_no || `RCP-${student.id.slice(0, 6).toUpperCase()}`;
  const slipDate = latestPayment?.payment_date || new Date().toISOString().split('T')[0];

  const handlePrint = () => {
    printFeeSlip({ student, latestPayment });
  };

  const handleWhatsApp = () => {
    let message = '';
    const formattedStudentName = toTitleCase(student.student_name);
    const formattedFatherName = toTitleCase(student.father_name);
    if (isNoFee) {
      message = `*${collegeName}*\n*OFFICIAL FEE RECORD SLIP*\n\nDear *${formattedStudentName}* (S/O ${formattedFatherName}),\n\nClass & Group: ${student.academic_class} - ${student.program_group}\n\n*Total Fee:* Rs 0\n*Remaining Dues:* Rs 0\n*Status:* NO FEE / WAIVED\n\nNo fee applies to this student.\n\nThank you.\n${collegeName}\n${collegePhone}`;
    } else if (isPaidInFull) {
      message = `*${collegeName}*\n*OFFICIAL FEE PAYMENT SLIP*\n\nDear *${formattedStudentName}* (S/O ${formattedFatherName}),\n\nYour fee payment has been received successfully.\n\nReceipt No: ${receiptNo}\nPayment Date: ${formatDate(slipDate)}\nClass & Group: ${student.academic_class} - ${student.program_group}\n\n*Total Fee:* ${formatCurrency(totalFee)}\n*Total Paid:* ${formatCurrency(totalPaid)}\n*Remaining Dues:* Rs 0\n*Status:* PAID IN FULL\n\nThank you.\n${collegeName}\n${collegePhone}`;
    } else {
      const dueScheduleInfo = student.next_payment_due_date
        ? `*Due Date:* ${formatDate(student.next_payment_due_date)}${student.commitment_notes ? ` (${student.commitment_notes})` : ''}`
        : student.commitment_notes
        ? `*Due Condition / Stage:* ${student.commitment_notes}`
        : '';

      message = `*${collegeName}*\n*OFFICIAL FEE PAYMENT SLIP*\n\nDear *${formattedStudentName}* (S/O ${formattedFatherName}),\n\nYour fee payment${paidToday > 0 ? ` of *${formatCurrency(paidToday)}*` : ''} has been recorded.\n\nReceipt No: ${receiptNo}\nPayment Date: ${formatDate(slipDate)}\nClass & Group: ${student.academic_class} - ${student.program_group}\n\n*Total Fee:* ${formatCurrency(totalFee)}\n*Total Paid:* ${formatCurrency(totalPaid)}\n*Remaining Dues:* ${formatCurrency(remainingDues)}\n${dueScheduleInfo ? `${dueScheduleInfo}\n` : ''}\nThank you.\n${collegeName}\n${collegePhone}`;
    }

    const cleanPhone = (student.contact_number || '').replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Modal Controls Bar (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5 font-bold text-teal-600 dark:text-teal-400">
            <FileText className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span className="text-slate-900 dark:text-white">Official Fee Payment Slip</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Slip Container */}
        <div
          id="printable-fee-slip"
          className="relative p-6 md:p-8 bg-slate-950 text-slate-100 overflow-hidden"
        >
          {/* Watermark Logo in Background */}
          <CollegeLogo watermark={true} className="opacity-[0.06]" />

          <div className="relative z-10 space-y-5">
            {/* Slip Header with Logo */}
            <div className="flex items-center justify-between pb-5 border-b-2 border-teal-500/40 gap-4">
              <div className="flex items-center gap-3.5">
                <CollegeLogo className="w-16 h-16 shadow-md rounded-full bg-slate-900 p-1 border border-teal-500/40" />
                <div>
                  <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-white print-dark-text leading-tight">
                    {collegeName}
                  </h2>
                  <p className="text-xs text-slate-300 print-muted-text mt-0.5 font-medium">
                    {collegeAddress}
                  </p>
                  <p className="text-[11px] text-teal-400 font-mono mt-0.5">
                    Phone: {collegePhone}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-3 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/30 text-xs font-bold uppercase tracking-wider">
                  Fee Payment Slip
                </div>
                <div className="text-[10px] text-slate-400 print-muted-text mt-1">
                  Office &amp; Student Copy
                </div>
              </div>
            </div>

            {/* Receipt Meta Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900/80 print-bg-light border border-slate-800 print-border text-xs">
              <div>
                <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-bold">Receipt No</span>
                <span className="font-mono font-bold text-teal-300 print-dark-text text-sm">{receiptNo}</span>
              </div>
              <div>
                <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-bold">Payment Date</span>
                <span className="font-semibold text-slate-200 print-dark-text">{formatDate(slipDate)}</span>
              </div>
              <div className="col-span-2 sm:col-span-1 text-left sm:text-right">
                <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-bold">Payment Method</span>
                <span className="font-semibold text-slate-200 print-dark-text">{latestPayment?.payment_method || 'Cash'}</span>
              </div>
            </div>

            {/* Student & Admission Information Grid */}
            <div className="p-4 rounded-xl bg-slate-900/40 print-bg-light border border-slate-800 print-border text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-semibold">Student Name</span>
                  <span className="font-bold text-white print-dark-text text-sm">{toTitleCase(student.student_name)}</span>
                </div>
                <div>
                  <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-semibold">Father Name</span>
                  <span className="font-medium text-slate-200 print-dark-text">{toTitleCase(student.father_name)}</span>
                </div>
                <div>
                  <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-semibold">Session &amp; Stream</span>
                  <span className="font-medium text-slate-200 print-dark-text">{student.admission_session} • {student.admission_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-semibold">Class &amp; Program</span>
                  <span className="font-bold text-teal-300 print-dark-text">{student.academic_class} ({student.program_group})</span>
                </div>
                <div>
                  <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-semibold">Student CNIC</span>
                  <span className="font-mono text-slate-300 print-dark-text">{student.student_cnic || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-semibold">Contact No</span>
                  <span className="font-sans tabular-nums text-slate-300 print-dark-text">{student.contact_number ? formatPhoneNumber(student.contact_number) : 'N/A'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 print-muted-text block text-[10px] uppercase font-semibold">Reference</span>
                  <span className="text-slate-300 print-dark-text">
                    {student.admission_source === 'Referral'
                      ? (student.reference && student.reference !== 'Direct Admission' && student.reference !== 'Direct'
                          ? student.reference
                          : (student.broker_name || 'Referral Partner'))
                      : (student.reference || 'Direct Admission')}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Ledger Table */}
            <div className="rounded-xl overflow-hidden border border-slate-800 print-border">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 print-bg-light border-b border-slate-800 print-border text-slate-400 print-muted-text font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Fee Particulars</th>
                    <th className="py-2.5 px-4 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 print-border text-slate-200 print-dark-text">
                  <tr>
                    <td className="py-2 px-4 font-medium">Total Agreed Course Fee</td>
                    <td className="py-2 px-4 text-right font-sans tabular-nums font-bold">{formatCurrency(totalFee)}</td>
                  </tr>
                  {paidToday > 0 && (
                    <>
                      <tr className="text-slate-400 print-muted-text">
                        <td className="py-1.5 px-4">Previously Paid Amount</td>
                        <td className="py-1.5 px-4 text-right font-sans tabular-nums">{formatCurrency(previousPaid)}</td>
                      </tr>
                      <tr className="text-teal-300 print-dark-text font-semibold bg-teal-500/5">
                        <td className="py-2 px-4">Amount Paid Today ({formatDate(slipDate)})</td>
                        <td className="py-2 px-4 text-right font-sans tabular-nums">{formatCurrency(paidToday)}</td>
                      </tr>
                    </>
                  )}
                  <tr className="font-bold bg-slate-900/50 print-bg-light">
                    <td className="py-2 px-4">Cumulative Total Paid</td>
                    <td className="py-2 px-4 text-right font-sans tabular-nums text-emerald-400 print-dark-text">{formatCurrency(totalPaid)}</td>
                  </tr>
                  <tr className="font-extrabold bg-slate-900/90 print-bg-light text-sm">
                    <td className="py-2.5 px-4">Remaining Outstanding Dues</td>
                    <td className={`py-2.5 px-4 text-right font-sans tabular-nums ${remainingDues > 0 ? 'text-amber-400 print-dark-text' : 'text-emerald-400 print-dark-text'}`}>
                      {formatCurrency(remainingDues)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Payment Status & Next Due Date Banner */}
            <div>
              {isNoFee ? (
                <div className="p-3.5 rounded-xl bg-slate-800/40 print-bg-light border border-slate-600/40 text-slate-300 print-dark-text flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MinusCircle className="w-5 h-5 text-slate-400" />
                    <div>
                      <div className="font-bold text-sm tracking-wide">STATUS: NO FEE / WAIVED</div>
                      <div className="text-[11px] opacity-80">No fee applies to this student.</div>
                    </div>
                  </div>
                  <div className="font-sans tabular-nums font-bold text-base">Rs 0 Dues</div>
                </div>
              ) : isPaidInFull ? (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 print-bg-light border border-emerald-500/40 text-emerald-300 print-dark-text flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-bold text-sm tracking-wide">STATUS: PAID IN FULL</div>
                      <div className="text-[11px] opacity-80">All course tuition fees are settled. Thank you!</div>
                    </div>
                  </div>
                  <div className="font-sans tabular-nums font-bold text-base">Rs 0 Dues</div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-950/40 print-bg-light border border-amber-500/40 text-amber-200 print-dark-text flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    <div>
                      <div className="font-bold text-sm tracking-wide">STATUS: PAYMENT DUE</div>
                      <div className="text-[11px] opacity-90">
                        {student.next_payment_due_date ? (
                          <>
                            Next Due Date: <span className="font-bold underline">{formatDate(student.next_payment_due_date)}</span>
                            {student.commitment_notes ? ` (${student.commitment_notes})` : ''}
                          </>
                        ) : student.commitment_notes ? (
                          <>
                            Due Condition / Milestone: <span className="font-bold underline text-amber-300 print-dark-text">{student.commitment_notes}</span>
                          </>
                        ) : (
                          'Please clear remaining fee dues before deadlines.'
                        )}
                        {student.promised_amount ? ` • Promised: ${formatCurrency(student.promised_amount)}` : ''}
                      </div>
                    </div>
                  </div>
                  <div className="font-sans tabular-nums font-bold text-rose-400 print-dark-text text-base">
                    {formatCurrency(remainingDues)}
                  </div>
                </div>
              )}
            </div>

            {/* Signature & Verification Sign-off Box */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-slate-400 print-dark-text">
              <div className="border-t border-slate-700 print-border pt-1.5 text-center">
                <span className="font-semibold block text-[11px]">Student / Depositor Signature</span>
              </div>
              <div className="border-t border-slate-700 print-border pt-1.5 text-center">
                <span className="font-semibold block text-[11px]">Accounts Officer / Authorized Signatory</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">{collegeName}</span>
              </div>
            </div>

            {/* Non-Refundable Policy Note */}
            <div className="text-center text-[10px] font-bold text-rose-400 print-dark-text pt-2 tracking-wide">
              Note: Fee once paid is strictly non-refundable and non-transferable.
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Controls (Hidden in Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share via WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Download / Print Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
