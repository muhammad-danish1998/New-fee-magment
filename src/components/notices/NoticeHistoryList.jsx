import React, { useState } from 'react';
import { FileText, Printer, Share2, Trash2, Calendar, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/feeCalculator';
import { printFeeDueNotice } from '../../utils/printFeeDueNotice';
import { markNoticeAsSent, deleteNotice } from '../../services/noticeService';
import { ConfirmDialog } from '../common/ConfirmDialog';

export function NoticeHistoryList({ student, notices = [], onReload }) {
  const [noticeToDelete, setNoticeToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  if (!notices || notices.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl">
        <FileText className="w-8 h-8 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">No fee due notices have been generated for this student yet.</p>
      </div>
    );
  }

  const collegeName = import.meta.env.COLLEGE_NAME || "JMT Public Higher Secondary School and College";
  const collegePhone = import.meta.env.COLLEGE_PHONE || "+92 3424049132";

  const handleReprint = (notice) => {
    printFeeDueNotice({
      student,
      noticeData: notice
    });
  };

  const handleResendWhatsApp = async (notice) => {
    const dueAmount = Number(notice.due_amount) || Number(student.dues) || 0;
    const totalFee = Number(student.total_fee) || 0;
    const totalPaid = Number(student.total_paid) || 0;

    const message = `*${collegeName}*\n*OFFICIAL FEE DUE NOTICE / REMINDER*\nRef: ${notice.notice_no || 'FDN'}\n\nDear Respected Parents of *${student.student_name}* (S/O ${student.father_name}),\n\nThis is a formal reminder regarding the outstanding admission/tuition fee dues for the current session.\n\n*Class & Group:* ${student.academic_class} - ${student.program_group}\n*Total Fee:* ${formatCurrency(totalFee)}\n*Total Paid:* ${formatCurrency(totalPaid)}\n*Outstanding Balance Due:* *${formatCurrency(dueAmount)}*\n*Payment Clearance Deadline:* *${formatDate(notice.deadline_date)}*\n${notice.remarks ? `*Remarks:* ${notice.remarks}\n` : ''}\n⚠️ *Important Notice:* Please clear the remaining balance on or before the due date to avoid late submission penalties and to ensure uninterrupted Board Enrollment / Admit Card issuance.\n\nThank you.\n*Accounts & Admissions Office*\n${collegeName}\nContact: ${collegePhone}`;

    const cleanPhone = (student.contact_number || '').replace(/[^0-9]/g, '');
    const encodedMsg = encodeURIComponent(message);
    const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;

    await markNoticeAsSent(notice.id);
    window.open(whatsappUrl, '_blank');
    if (onReload) onReload();
  };

  const handleConfirmDelete = async () => {
    if (!noticeToDelete) return;
    try {
      setIsDeleting(true);
      await deleteNotice(noticeToDelete.id);
      setNoticeToDelete(null);
      if (onReload) onReload();
    } catch (err) {
      alert('Failed to delete notice: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                {notice.notice_no || 'FDN-OFFICIAL'}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                notice.status === 'Sent'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
              }`}>
                {notice.status || 'Generated'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-700 dark:text-slate-300">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Issued On: </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatDate(notice.notice_date || notice.created_at)}</span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400">Deadline: </span>
                <span className="font-bold text-rose-700 dark:text-rose-400">{formatDate(notice.deadline_date)}</span>
              </div>

              <div>
                <span className="text-slate-500 dark:text-slate-400">Due Amount: </span>
                <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{formatCurrency(notice.due_amount)}</span>
              </div>
            </div>

            {notice.remarks && (
              <p className="text-slate-600 dark:text-slate-400 text-[11px] italic">
                "{notice.remarks}"
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleReprint(notice)}
              title="Print / Download PDF"
              className="p-2 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            </button>

            <button
              onClick={() => handleResendWhatsApp(notice)}
              title="Resend WhatsApp Notice"
              className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-600/20 hover:bg-emerald-100 dark:hover:bg-emerald-600/30 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 transition-colors shadow-sm"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </button>

            <button
              onClick={() => setNoticeToDelete(notice)}
              title="Delete Notice"
              className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-500/20 transition-colors shadow-sm"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Delete Notice Confirmation */}
      <ConfirmDialog
        isOpen={!!noticeToDelete}
        onClose={() => setNoticeToDelete(null)}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        title="Remove Fee Notice?"
        description={
          noticeToDelete ? (
            <span>
              Are you sure you want to remove notice <strong>{noticeToDelete.notice_no || 'FDN-OFFICIAL'}</strong> from this student's history?
            </span>
          ) : null
        }
        confirmLabel="Yes, Remove"
        cancelLabel="Cancel"
        variant="danger"
        focusCancel={true}
      />
    </div>
  );
}
