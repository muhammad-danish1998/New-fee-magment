import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, AlertCircle, Info, ShieldCheck } from 'lucide-react';
import { reopenStudentAsActive } from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';

export function ReopenStudentModal({ isOpen, onClose, student, onStudentReopened }) {
  if (!isOpen || !student) return null;

  const { user } = useAuth();
  const cancelBtnRef = useRef(null);

  const [reopenReason, setReopenReason] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    cancelBtnRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setIsSubmitting(true);
      await reopenStudentAsActive(student.id, {
        reopen_reason: reopenReason.trim(),
        reopened_by: user?.id || null
      });

      if (onStudentReopened) {
        onStudentReopened();
      }
      onClose();
    } catch (err) {
      console.error('Failed to reopen student:', err);
      setError(err.message || 'Failed to reopen student. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reopen-student-dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-700/50 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="reopen-student-dialog-title" className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                Reopen Student as Active
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Restore <strong className="text-slate-800 dark:text-slate-200">{student.student_name}</strong> to active directory
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="reopen-student-form" onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-700/40 text-teal-900 dark:text-teal-300 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span>Administrator Re-enrollment Action</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              This will restore the student to the active Directory and re-enable payment processing, commitments, and progress tracking.
            </p>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Reopen Reason / Remarks (Optional)
            </label>
            <textarea
              rows={3}
              maxLength={250}
              placeholder="e.g. Readmitted for remaining exams / Resolved clearance issue"
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
            />
          </div>
        </form>

        {/* Sticky Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/95 flex items-center justify-end gap-3 shrink-0">
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="reopen-student-form"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition-all active:scale-[0.98] min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <span>Reopening...</span>
              </>
            ) : (
              <span>Confirm Reopen as Active</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
