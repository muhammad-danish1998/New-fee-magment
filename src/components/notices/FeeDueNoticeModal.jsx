import React, { useState } from 'react';
import { X, Printer, Share2, AlertTriangle, Calendar, FileText, CheckCircle2, Clock } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/feeCalculator';
import { toTitleCase } from '../../utils/textHelper';
import { formatPhoneNumber } from '../../utils/phoneHelper';
import { CollegeLogo } from '../common/CollegeLogo';
import { printFeeDueNotice } from '../../utils/printFeeDueNotice';
import { createFeeDueNotice, markNoticeAsSent } from '../../services/noticeService';

export function FeeDueNoticeModal({ isOpen, onClose, student, onNoticeCreated }) {
  if (!isOpen || !student) return null;

  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";
  const collegePhone = import.meta.env.COLLEGE_PHONE || "+92 3424049132";
  const collegeAddress = import.meta.env.COLLEGE_ADDRESS || "Plot#381, street 9 Qazzafi town Bin Qasim Malir karachi";

  const totalFee = Number(student.total_fee) || 0;
  const totalPaid = Number(student.total_paid) || 0;
  const remainingDues = Number(student.dues) || 0;

  const defaultDeadline = student.next_payment_due_date 
    ? student.next_payment_due_date 
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().split('T')[0]);
  const [deadlineDate, setDeadlineDate] = useState(defaultDeadline);
  const [remarks, setRemarks] = useState(student.commitment_notes ? `Commitment reference: ${student.commitment_notes}` : '');
  const [isSaving, setIsSaving] = useState(false);
  const [noticeRef, setNoticeRef] = useState(`FDN-${student.id.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`);

  const handlePrint = async () => {
    try {
      setIsSaving(true);
      const noticeRecord = await createFeeDueNotice({
        studentId: student.id,
        dueAmount: remainingDues,
        noticeDate,
        deadlineDate,
        remarks,
        status: 'Generated'
      });

      printFeeDueNotice({
        student,
        noticeData: {
          ...noticeRecord,
          notice_no: noticeRef,
          notice_date: noticeDate,
          deadline_date: deadlineDate,
          remarks,
          due_amount: remainingDues
        }
      });

      if (onNoticeCreated) onNoticeCreated();
    } catch (err) {
      console.error('Error recording notice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsApp = async () => {
    try {
      setIsSaving(true);
      const noticeRecord = await createFeeDueNotice({
        studentId: student.id,
        dueAmount: remainingDues,
        noticeDate,
        deadlineDate,
        remarks,
        status: 'Sent'
      });

      const message = `*${collegeName}*\n*OFFICIAL FEE DUE NOTICE / REMINDER*\nRef: ${noticeRef}\n\nDear Respected Parents of *${toTitleCase(student.student_name)}* (S/O ${toTitleCase(student.father_name)}),\n\nThis is a formal reminder regarding the outstanding admission/tuition fee dues for the current session.\n\n*Class & Group:* ${student.academic_class} - ${student.program_group}\n*Total Fee:* ${formatCurrency(totalFee)}\n*Total Paid:* ${formatCurrency(totalPaid)}\n*Outstanding Balance Due:* *${formatCurrency(remainingDues)}*\n*Payment Clearance Deadline:* *${formatDate(deadlineDate)}*\n${remarks ? `*Remarks:* ${remarks}\n` : ''}\n⚠️ *Important Notice:* Please clear the remaining balance on or before the due date to avoid late submission penalties and to ensure uninterrupted Board Enrollment / Admit Card issuance.\n\nThank you.\n*Accounts & Admissions Office*\n${collegeName}\nContact: ${collegePhone}`;

      const cleanPhone = (student.contact_number || '').replace(/[^0-9]/g, '');
      const encodedMsg = encodeURIComponent(message);
      const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

      window.open(whatsappUrl, '_blank');
      if (onNoticeCreated) onNoticeCreated();
    } catch (err) {
      console.error('Error sending WhatsApp notice:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5 font-bold text-amber-600 dark:text-amber-400">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span className="text-slate-900 dark:text-white">Official Fee Due Notice &amp; Reminder</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Notice Parameters Form */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Notice Parameters &amp; Payment Deadline</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={noticeDate}
                  onChange={(e) => setNoticeDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-amber-300 font-bold mb-1">
                  Payment Clearance Deadline *
                </label>
                <input
                  type="date"
                  value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-amber-500/50 rounded-lg text-amber-200 font-semibold focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1 text-xs">
                Administrative Remarks / Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Final notice before Board Examination Admit Card deadline"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setRemarks('Final reminder before Board Enrollment registration cutoff.')}
                  className="text-[10.5px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-teal-300 border border-slate-700 transition-colors"
                >
                  + Board Enrollment Cutoff
                </button>
                <button
                  type="button"
                  onClick={() => setRemarks('Cleared payment required for Examination Admit Card release.')}
                  className="text-[10.5px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-teal-300 border border-slate-700 transition-colors"
                >
                  + Admit Card Release
                </button>
                <button
                  type="button"
                  onClick={() => setRemarks('Overdue commitment fee payment reminder.')}
                  className="text-[10.5px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-teal-300 border border-slate-700 transition-colors"
                >
                  + Overdue Commitment
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Notice Document Preview */}
          <div className="border border-amber-500/30 rounded-xl p-5 bg-slate-950 relative overflow-hidden shadow-inner text-slate-200 space-y-4">
            <CollegeLogo watermark={true} className="opacity-[0.04]" />

            {/* Letterhead Preview Header */}
            <div className="flex items-center justify-between pb-4 border-b border-amber-500/30">
              <div className="flex items-center gap-3">
                <CollegeLogo className="w-12 h-12 rounded-full border border-amber-500/40 p-0.5 bg-slate-900" />
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{collegeName}</h3>
                  <p className="text-[11px] text-slate-400">{collegeAddress}</p>
                  <p className="text-[10px] text-amber-400 font-mono">Accounts Directorate • {collegePhone}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase tracking-wider">
                  Fee Due Notice
                </span>
                <p className="text-[9.5px] text-slate-400 font-mono mt-1">Ref: {noticeRef}</p>
              </div>
            </div>

            {/* Student & Addressee details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Student Name</span>
                <span className="font-bold text-white">{toTitleCase(student.student_name)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Father Name</span>
                <span className="font-medium text-slate-300">{toTitleCase(student.father_name)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Class &amp; Group</span>
                <span className="font-semibold text-teal-300">{student.academic_class} - {student.program_group}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Contact</span>
                <span className="font-sans tabular-nums text-slate-300">{formatPhoneNumber(student.contact_number)}</span>
              </div>
            </div>

            {/* Dues Breakdown Table */}
            <div className="rounded-lg overflow-hidden border border-slate-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-slate-300 text-[10.5px] uppercase font-semibold">
                  <tr>
                    <th className="p-2.5">Fee Category</th>
                    <th className="p-2.5 text-right">Amount (PKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950">
                  <tr>
                    <td className="p-2.5 text-slate-300">Total Approved Admission Fee</td>
                    <td className="p-2.5 text-right font-sans tabular-nums font-medium">{formatCurrency(totalFee)}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 text-slate-300">Total Paid Fee to Date</td>
                    <td className="p-2.5 text-right font-sans tabular-nums text-emerald-400 font-semibold">{formatCurrency(totalPaid)}</td>
                  </tr>
                  <tr className="bg-amber-950/20 text-amber-300 font-bold">
                    <td className="p-2.5 text-amber-200">TOTAL REMAINING BALANCE DUE</td>
                    <td className="p-2.5 text-right font-sans tabular-nums text-amber-400 text-sm">{formatCurrency(remainingDues)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deadline Banner */}
            <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-rose-300 font-semibold">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>Payment Clearance Deadline:</span>
              </div>
              <div className="font-sans tabular-nums font-bold text-rose-300 text-sm">
                {deadlineDate ? formatDate(deadlineDate) : 'Not specified'}
              </div>
            </div>

            {/* Warning text */}
            <div className="p-2.5 rounded-lg bg-amber-950/20 border-l-4 border-amber-500 text-[11px] text-amber-200/90 leading-relaxed">
              <strong>Advisory:</strong> Timely clearance is mandatory to avoid late fees and ensure smooth processing of Board of Intermediate &amp; Secondary Education enrollment and examination admit cards.
            </div>

            {remarks && (
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                <span className="font-semibold text-teal-400">Remarks: </span>
                <span>{remarks}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-slate-850">
          <div className="text-xs text-slate-400">
            Notice will be recorded in student history.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handlePrint}
              disabled={isSaving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-sm active:scale-[0.98]"
            >
              <Printer className="w-4 h-4 text-teal-400" />
              <span>Print / Download PDF</span>
            </button>

            <button
              onClick={handleWhatsApp}
              disabled={isSaving}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
            >
              <Share2 className="w-4 h-4" />
              <span>Send via WhatsApp</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
