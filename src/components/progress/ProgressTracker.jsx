import React, { useState } from 'react';
import { Check, Clock, Circle, ArrowRight, CheckSquare, Square, Calendar, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { formatDate } from '../../utils/feeCalculator';
import { ConfirmDialog } from '../common/ConfirmDialog';

export const PROGRESS_STEPS = [
  {
    id: 1,
    key: 'enrollment_verification',
    dateKey: 'enrollment_verification_date',
    label: '1. Enrollment in Verification',
    shortLabel: 'Enrollment Verification'
  },
  {
    id: 2,
    key: 'enrollment_card_issued',
    dateKey: 'enrollment_card_issued_date',
    label: '2. Enrollment Card Issued',
    shortLabel: 'Enrollment Card'
  },
  {
    id: 3,
    key: 'examination_verification',
    dateKey: 'examination_verification_date',
    label: '3. Examination in Verification',
    shortLabel: 'Exam Verification'
  },
  {
    id: 4,
    key: 'admit_card_issued',
    dateKey: 'admit_card_issued_date',
    label: '4. Admit Card Issued',
    shortLabel: 'Admit Card'
  }
];

export function ProgressTracker({ student, onUpdateStep, interactive = false, compact = false }) {
  // Modal states for interactive confirmation
  const [pendingTickStep, setPendingTickStep] = useState(null); // step object to complete
  const [tickDate, setTickDate] = useState('');
  const [tickDateError, setTickDateError] = useState('');

  const [pendingUntickStep, setPendingUntickStep] = useState(null); // step object to untick

  // Feedback states for sequential lifecycle validation
  const [orderError, setOrderError] = useState(null);
  const [blockedAction, setBlockedAction] = useState(null);

  if (!student) return null;

  const completedCount = PROGRESS_STEPS.filter(s => !!student[s.key]).length;

  // Determine current active step (next pending step)
  let nextPendingIndex = PROGRESS_STEPS.findIndex(s => !student[s.key]);
  if (nextPendingIndex === -1) nextPendingIndex = 4; // all done

  const enrollmentDateStr = student.created_at ? student.created_at.split('T')[0] : '';
  const todayStr = new Date().toISOString().split('T')[0];

  const handleInitiateStepChange = (step, currentCompleted) => {
    if (!interactive || !onUpdateStep) return;

    // Clear previous error messages
    setOrderError(null);
    setBlockedAction(null);

    const stepIndex = PROGRESS_STEPS.findIndex(s => s.id === step.id);

    if (currentCompleted) {
      // 1. Unticking: block if any later steps are still completed
      const laterCompleted = PROGRESS_STEPS.slice(stepIndex + 1).filter(s => !!student[s.key]);
      if (laterCompleted.length > 0) {
        const lastLater = laterCompleted[laterCompleted.length - 1];
        const errorMsg = `Cannot untick Step ${step.id} while Step ${lastLater.id} is done.`;
        setOrderError(errorMsg);
        setBlockedAction({
          title: `Cannot Untick Step ${step.id}`,
          message: errorMsg,
          detail: `Step ${laterCompleted.map(s => `Step ${s.id} (${s.shortLabel})`).join(', ')} is currently marked as completed. Please untick later steps first in reverse order.`
        });
        return;
      }

      // Unticking requires confirmation
      setPendingUntickStep(step);
    } else {
      // 2. Ticking: require previous steps first
      const earlierIncomplete = PROGRESS_STEPS.slice(0, stepIndex).find(s => !student[s.key]);
      if (earlierIncomplete) {
        const errorMsg = `Complete Step ${earlierIncomplete.id} first.`;
        setOrderError(errorMsg);
        setBlockedAction({
          title: `Step ${earlierIncomplete.id} Required`,
          message: errorMsg,
          detail: `You cannot mark Step ${step.id} (${step.shortLabel}) as completed until Step ${earlierIncomplete.id} (${earlierIncomplete.shortLabel}) is completed.`
        });
        return;
      }

      // Ticking requires confirmation modal with completion date
      setPendingTickStep(step);
      setTickDate(todayStr);
      setTickDateError('');
    }
  };

  const handleConfirmTick = () => {
    if (!pendingTickStep) return;

    if (!tickDate) {
      setTickDateError('Please choose a completion date.');
      return;
    }

    if (enrollmentDateStr && tickDate < enrollmentDateStr) {
      setTickDateError(`Completion date cannot be earlier than student enrollment date (${formatDate(enrollmentDateStr)}).`);
      return;
    }

    onUpdateStep({
      [pendingTickStep.key]: true,
      [pendingTickStep.dateKey]: tickDate
    });

    setPendingTickStep(null);
  };

  const handleConfirmUntick = () => {
    if (!pendingUntickStep) return;

    onUpdateStep({
      [pendingUntickStep.key]: false,
      [pendingUntickStep.dateKey]: null
    });

    setPendingUntickStep(null);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        {PROGRESS_STEPS.map((step, idx) => {
          const isCompleted = !!student[step.key];
          const isNext = idx === nextPendingIndex;

          return (
            <React.Fragment key={step.key}>
              <div
                title={`${step.shortLabel}: ${isCompleted ? `Completed (${formatDate(student[step.dateKey])})` : isNext ? 'Next Active Step' : 'Pending'}`}
                className={`w-2.5 h-2.5 rounded-full transition-all ${
                  isCompleted
                    ? 'bg-emerald-500 ring-2 ring-emerald-500/20'
                    : isNext
                    ? 'bg-amber-400 ring-2 ring-amber-400/30 animate-pulse'
                    : 'bg-slate-700'
                }`}
              />
              {idx < PROGRESS_STEPS.length - 1 && (
                <div className={`w-3 h-0.5 ${isCompleted ? 'bg-emerald-600' : 'bg-slate-800'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Student Verification & Exam Lifecycle</span>
              {interactive && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700/60">
                  Interactive: Click to tick stages
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              4-Step official lifecycle from enrollment verification to final admit card issuance
            </p>
          </div>

          <div className={`self-start sm:self-auto text-xs font-bold px-3 py-1.5 rounded-xl border ${
            completedCount === 4
              ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40'
              : completedCount > 0
              ? 'bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-500/40'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
          }`}>
            {completedCount === 4
              ? '✓ All 4 Steps Completed'
              : completedCount > 0
              ? `${completedCount} of 4 Completed`
              : '0 of 4 Completed (Enrolled)'}
          </div>
        </div>

        {/* Lifecycle order validation error banner */}
        {orderError && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/60 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between gap-3 shadow-sm animate-in fade-in"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{orderError}</span>
            </div>
            <button
              type="button"
              onClick={() => setOrderError(null)}
              className="p-1 rounded text-amber-800 dark:text-amber-300 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
              aria-label="Dismiss error banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Steps Stepper Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PROGRESS_STEPS.map((step, idx) => {
            const isCompleted = !!student[step.key];
            const isNext = idx === nextPendingIndex;
            const completedDate = student[step.dateKey];
            const isDateBeforeEnrollment = isCompleted && completedDate && enrollmentDateStr && completedDate < enrollmentDateStr;

            // Sequential order states
            const earlierIncomplete = !isCompleted && PROGRESS_STEPS.slice(0, idx).find(s => !student[s.key]);
            const laterCompleted = isCompleted && PROGRESS_STEPS.slice(idx + 1).find(s => !!student[s.key]);

            return (
              <div
                key={step.key}
                className={`relative flex flex-col p-4 rounded-xl border transition-all ${
                  isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-600/50 shadow-sm'
                    : isNext
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-600/50 ring-1 ring-amber-400/50 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800'
                }`}
              >
                {/* Top Header of Card */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    isCompleted
                      ? 'text-emerald-800 dark:text-emerald-300'
                      : isNext
                      ? 'text-amber-800 dark:text-amber-300'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}>
                    Step {step.id}
                  </span>

                  {interactive ? (
                    <button
                      type="button"
                      onClick={() => handleInitiateStepChange(step, isCompleted)}
                      title={
                        isCompleted
                          ? laterCompleted
                            ? `Cannot untick Step ${step.id} while Step ${laterCompleted.id} is completed`
                            : 'Click to untick / mark pending'
                          : earlierIncomplete
                          ? `Complete Step ${earlierIncomplete.id} first.`
                          : 'Click to tick / mark completed'
                      }
                      aria-label={`${isCompleted ? 'Untick' : 'Tick'} ${step.shortLabel}`}
                      className={`p-1 rounded-lg transition-transform active:scale-90 focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none ${
                        isCompleted
                          ? 'text-emerald-700 dark:text-emerald-300 hover:text-emerald-800 dark:hover:text-emerald-200'
                          : isNext
                          ? 'text-amber-700 dark:text-amber-300 hover:text-amber-800'
                          : earlierIncomplete
                          ? 'text-slate-400 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-300'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckSquare className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <Square className="w-5 h-5 stroke-[2]" />
                      )}
                    </button>
                  ) : (
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isCompleted
                          ? 'bg-emerald-600 text-white'
                          : isNext
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : step.id}
                    </div>
                  )}
                </div>

                {/* Step Title */}
                <div className={`font-bold text-sm mb-1 leading-snug ${
                  isCompleted
                    ? 'text-emerald-950 dark:text-emerald-100'
                    : isNext
                    ? 'text-amber-950 dark:text-amber-100'
                    : 'text-slate-900 dark:text-slate-100'
                }`}>
                  {step.shortLabel}
                </div>

                {/* Status and Action */}
                {isDateBeforeEnrollment && (
                  <div className="mb-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-600/50 text-[10px] font-bold text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Date is before enrollment — please review</span>
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    {isCompleted ? (
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-200 font-bold">
                        ✓ Done {completedDate ? `(${formatDate(completedDate)})` : ''}
                      </div>
                    ) : isNext ? (
                      <div className="text-[11px] text-amber-900 dark:text-amber-200 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                        <span>Current Stage</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        ○ Pending
                      </div>
                    )}
                  </div>

                  {interactive && onUpdateStep && (
                    <button
                      type="button"
                      onClick={() => handleInitiateStepChange(step, isCompleted)}
                      title={
                        isCompleted
                          ? laterCompleted
                            ? `Cannot untick Step ${step.id} while Step ${laterCompleted.id} is done`
                            : 'Click to untick / mark pending'
                          : earlierIncomplete
                          ? `Complete Step ${earlierIncomplete.id} first.`
                          : isNext
                          ? 'Click to complete current stage'
                          : 'Click to mark stage completed'
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none ${
                        isCompleted
                          ? laterCompleted
                            ? 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 hover:bg-slate-300 dark:hover:bg-slate-700'
                            : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700'
                          : isNext
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-600/20'
                          : earlierIncomplete
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                          : 'bg-teal-600 hover:bg-teal-500 text-white shadow-sm shadow-teal-600/20'
                      }`}
                    >
                      {isCompleted
                        ? 'Untick'
                        : earlierIncomplete
                        ? `Step ${step.id} (Locked)`
                        : 'Tick Stage'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Confirm Ticking Stage with Date Validation */}
      {pendingTickStep && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tick-stage-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setPendingTickStep(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-400 border border-teal-300 dark:border-teal-800">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="tick-stage-dialog-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                    Complete Stage
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {pendingTickStep.label}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPendingTickStep(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Completion Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={tickDate}
                    max={todayStr}
                    min={enrollmentDateStr || undefined}
                    onChange={(e) => {
                      setTickDate(e.target.value);
                      if (tickDateError) setTickDateError('');
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-950 border ${
                      tickDateError ? 'border-rose-500' : 'border-slate-300 dark:border-slate-700'
                    } text-xs text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none`}
                  />
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                </div>
                {enrollmentDateStr && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Student was enrolled on <span className="font-semibold">{formatDate(enrollmentDateStr)}</span>. Completion date cannot be earlier.
                  </p>
                )}
                {tickDateError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1">
                    {tickDateError}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setPendingTickStep(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-slate-700 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmTick}
                className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 min-h-[44px]"
              >
                Mark Stage Completed
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Unticking Stage (Destructive warning) */}
      <ConfirmDialog
        isOpen={!!pendingUntickStep}
        onClose={() => setPendingUntickStep(null)}
        onConfirm={handleConfirmUntick}
        title={`Revert ${pendingUntickStep?.shortLabel || 'Stage'}?`}
        description={
          <span>
            Are you sure you want to revert <strong>{pendingUntickStep?.label}</strong> back to pending? This will clear the completion record.
          </span>
        }
        confirmLabel="Yes, Revert to Pending"
        cancelLabel="Keep Completed"
        variant="danger"
        focusCancel={true}
      />

      {/* Modal: Blocked Action Alert (Step order requirement or untick block) */}
      {blockedAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="blocked-action-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setBlockedAction(null)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-amber-300 dark:border-amber-700/60 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 id="blocked-action-title" className="text-base font-extrabold text-slate-900 dark:text-white">
                {blockedAction.title}
              </h3>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300 mt-2">
                {blockedAction.message}
              </p>
              {blockedAction.detail && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  {blockedAction.detail}
                </p>
              )}
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => setBlockedAction(null)}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 font-bold text-xs transition-colors shadow-sm min-h-[44px]"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </>
  );
}
