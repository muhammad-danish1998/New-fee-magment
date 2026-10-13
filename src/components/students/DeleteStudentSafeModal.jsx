import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, Trash2, ShieldAlert, ArrowRight } from 'lucide-react';
import { deleteStudent } from '../../services/studentService';
import { formatCurrency } from '../../utils/feeCalculator';

export function DeleteStudentSafeModal({
  isOpen,
  onClose,
  student,
  onDeleted,
  onChangeStatusInstead
}) {
  if (!isOpen || !student) return null;

  const cancelBtnRef = useRef(null);
  const [typedName, setTypedName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const hasPaymentHistory = (student.payments && student.payments.length > 0) || (Number(student.total_paid) || 0) > 0;
  const isNameMatched = typedName.trim().toLowerCase() === (student.student_name || '').trim().toLowerCase();

  useEffect(() => {
    setTypedName('');
    setError('');
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isDeleting]);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (hasPaymentHistory) {
      setError('This student has payment history and cannot be deleted. Use Change Status instead.');
      return;
    }

    if (!isNameMatched) {
      setError('Please type the exact student name to confirm deletion.');
      return;
    }

    try {
      setIsDeleting(true);
      setError('');
      await deleteStudent(student.id);
      if (onDeleted) {
        onDeleted();
      }
      onClose();
    } catch (err) {
      console.error('Delete student error:', err);
      setError(err.message || 'Failed to delete student.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-student-dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700/50 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="delete-student-dialog-title" className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                Permanent Delete Student
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Danger Zone • Administrator Only
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Condition 1: Blocked if has payment history */}
          {hasPaymentHistory ? (
            <div className="space-y-3.5">
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200 space-y-2">
                <div className="font-bold flex items-center gap-2 text-sm text-rose-700 dark:text-rose-300">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>Deletion Blocked by Financial Integrity Policy</span>
                </div>
                <p className="text-xs leading-relaxed">
                  This student has <strong>{student.payments?.length || 1} payment record(s)</strong> totaling{' '}
                  <strong className="font-mono">{formatCurrency(student.total_paid || 0)}</strong>.
                </p>
                <p className="text-xs font-semibold">
                  This student has payment history and cannot be deleted. Use Change Status instead.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onChangeStatusInstead) onChangeStatusInstead();
                  }}
                  className="w-full sm:flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all min-h-[44px]"
                >
                  <span>Change Status Instead</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-colors min-h-[44px]"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Condition 2: No payments - Confirm by typing student's name */
            <form onSubmit={handleDelete} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/50 text-amber-900 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Permanent Removal</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  This student has zero recorded payments (e.g. entry mistake or duplicate). This action will permanently remove their profile.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5">
                  Type <span className="font-mono font-black text-rose-600 dark:text-rose-400 select-all">{student.student_name}</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Type "${student.student_name}"`}
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-bold focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 min-h-[44px]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  ref={cancelBtnRef}
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 transition-colors min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isNameMatched || isDeleting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 transition-all active:scale-[0.98] min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Permanently Delete</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
