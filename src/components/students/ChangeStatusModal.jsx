import React, { useState, useEffect, useRef } from 'react';
import { X, AlertTriangle, AlertCircle, ArrowRightLeft, UserMinus, GraduationCap, UserX, Info, Calendar } from 'lucide-react';
import { ARCHIVE_STATUS_OPTIONS, STUDENT_STATUS_PASSED_OUT } from '../../utils/studentStatus';
import { changeStudentStatus } from '../../services/studentService';
import { formatCurrency } from '../../utils/feeCalculator';
import { useAuth } from '../../context/AuthContext';

export function ChangeStatusModal({ isOpen, onClose, student, onStatusChanged }) {
  if (!isOpen || !student) return null;

  const { user } = useAuth();
  const cancelBtnRef = useRef(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const dues = Number(student.dues) || 0;

  const [selectedStatus, setSelectedStatus] = useState(ARCHIVE_STATUS_OPTIONS[0].value);
  const [leftDate, setLeftDate] = useState(todayStr);
  const [leftReason, setLeftReason] = useState('');
  const [warningAcknowledged, setWarningAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Focus cancel button on mount for safety
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

  const currentOption = ARCHIVE_STATUS_OPTIONS.find((opt) => opt.value === selectedStatus) || ARCHIVE_STATUS_OPTIONS[0];
  const isReasonRequired = currentOption.reasonRequired;
  const isPassedOutWithDues = selectedStatus === STUDENT_STATUS_PASSED_OUT && dues > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!leftDate) {
      setError('Date is required.');
      return;
    }

    if (leftDate > todayStr) {
      setError('Departure date cannot be in the future.');
      return;
    }

    if (isReasonRequired && !leftReason.trim()) {
      setError(`Remarks / reason is required for status "${currentOption.label}".`);
      return;
    }

    if (leftReason.length > 300) {
      setError('Remarks cannot exceed 300 characters.');
      return;
    }

    // Passed out with pending dues warning check
    if (isPassedOutWithDues && !warningAcknowledged) {
      setError(`This student still has ${formatCurrency(dues)} unpaid. Please check the acknowledgment box below to continue.`);
      return;
    }

    try {
      setIsSubmitting(true);
      await changeStudentStatus(student.id, {
        status: selectedStatus,
        left_date: leftDate,
        left_reason: leftReason.trim() || null,
        status_changed_by: user?.id || null
      });

      if (onStatusChanged) {
        onStatusChanged(selectedStatus);
      }
      onClose();
    } catch (err) {
      console.error('Failed to change student status:', err);
      setError(err.message || 'Failed to update student status. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-status-dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 shrink-0">
              <UserMinus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="change-status-dialog-title" className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                Change Student Status
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Move <strong className="text-slate-800 dark:text-slate-200">{student.student_name}</strong> to Archive
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

        {/* Scrollable Form Body */}
        <form id="change-status-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 text-rose-800 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Dues Notice */}
          {dues > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-700/40 text-amber-900 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Pending Financial Record</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Remaining dues: <strong className="font-mono">{formatCurrency(dues)}</strong> will stay on record as outstanding dues of an archived student.
              </p>
            </div>
          )}

          {/* New Status Select */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Select New Archival Status <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setWarningAcknowledged(false);
                setError('');
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[44px]"
            >
              {ARCHIVE_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Departure Date */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
              Effective Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              max={todayStr}
              value={leftDate}
              onChange={(e) => setLeftDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-amber-500 min-h-[44px]"
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
              Date the student passed out or departed (cannot be in the future).
            </p>
          </div>

          {/* Reason / Remarks */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-700 dark:text-slate-300 font-bold">
                Reason / Remarks {isReasonRequired && <span className="text-rose-500">*</span>}
              </label>
              <span className={`text-[10px] font-mono ${leftReason.length > 300 ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                {leftReason.length}/300
              </span>
            </div>
            <textarea
              rows={3}
              required={isReasonRequired}
              maxLength={300}
              placeholder={
                isReasonRequired
                  ? 'e.g., Relocated to another city / Financial hardship / Joined another academy'
                  : 'Optional graduation notes or board exam completion remarks'
              }
              value={leftReason}
              onChange={(e) => setLeftReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Warning confirmation for Passed Out with remaining dues */}
          {isPassedOutWithDues && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700/50 flex items-start gap-2.5">
              <input
                id="ack-passed-out-dues"
                type="checkbox"
                checked={warningAcknowledged}
                onChange={(e) => setWarningAcknowledged(e.target.checked)}
                className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 border-rose-300 dark:border-rose-700 shrink-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="ack-passed-out-dues" className="text-[11px] text-rose-800 dark:text-rose-300 cursor-pointer select-none leading-relaxed">
                <strong>Confirm:</strong> This student still has <strong>{formatCurrency(dues)}</strong> unpaid. I understand and wish to mark as Passed Out anyway.
              </label>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 mt-0.5 shrink-0" />
            <span>
              Archived students move to the <strong>Archive</strong> view. Their fee history is preserved for auditing and cannot be altered by staff.
            </span>
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
            form="change-status-form"
            disabled={isSubmitting}
            className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-600/20 transition-all active:scale-[0.98] min-h-[44px] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                <span>Saving...</span>
              </>
            ) : (
              <span>Confirm Status Change</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
