import React, { useState } from 'react';
import { X, CheckSquare, Square, Calendar, CheckCircle2, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { updateStudentProgress } from '../../services/studentService';
import { PROGRESS_STEPS } from './ProgressTracker';
import { formatDate } from '../../utils/feeCalculator';

export function ManageProgressModal({ isOpen, onClose, student, onProgressUpdated }) {
  if (!isOpen || !student) return null;

  const [stepsState, setStepsState] = useState({
    enrollment_verification: !!student.enrollment_verification,
    enrollment_verification_date: student.enrollment_verification_date || '',
    enrollment_card_issued: !!student.enrollment_card_issued,
    enrollment_card_issued_date: student.enrollment_card_issued_date || '',
    examination_verification: !!student.examination_verification,
    examination_verification_date: student.examination_verification_date || '',
    admit_card_issued: !!student.admit_card_issued,
    admit_card_issued_date: student.admit_card_issued_date || ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleStep = (stepKey, dateKey) => {
    const isNowChecked = !stepsState[stepKey];
    setError('');

    const stepIndex = PROGRESS_STEPS.findIndex(s => s.key === stepKey);
    const step = PROGRESS_STEPS[stepIndex];

    if (isNowChecked) {
      // Require previous steps first: a step can only be ticked if all earlier steps are done
      const earlierIncomplete = PROGRESS_STEPS.slice(0, stepIndex).find(s => !stepsState[s.key]);
      if (earlierIncomplete) {
        setError(`Complete Step ${earlierIncomplete.id} first.`);
        return;
      }
    } else {
      // Block unticking if any later step is still completed
      const laterCompleted = PROGRESS_STEPS.slice(stepIndex + 1).find(s => !!stepsState[s.key]);
      if (laterCompleted) {
        setError(`Cannot untick Step ${step.id} while Step ${laterCompleted.id} is completed. Untick later steps first.`);
        return;
      }
    }

    setStepsState(prev => ({
      ...prev,
      [stepKey]: isNowChecked,
      [dateKey]: isNowChecked
        ? (prev[dateKey] || new Date().toISOString().split('T')[0])
        : ''
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');

    // Verify sequential consistency before saving
    for (let i = 0; i < PROGRESS_STEPS.length; i++) {
      if (stepsState[PROGRESS_STEPS[i].key]) {
        for (let j = 0; j < i; j++) {
          if (!stepsState[PROGRESS_STEPS[j].key]) {
            setError(`Complete Step ${PROGRESS_STEPS[j].id} first.`);
            return;
          }
        }
      }
    }

    try {
      setIsSubmitting(true);
      await updateStudentProgress(student.id, stepsState);
      if (onProgressUpdated) {
        onProgressUpdated();
      }
      onClose();
    } catch (err) {
      console.error('Error saving progress stages:', err);
      setError(err.message || 'Failed to update progress stages. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5 font-bold text-teal-600 dark:text-teal-400 text-sm">
            <ShieldCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span className="text-slate-900 dark:text-white">Manage Verification & Exam Stages</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            Student: <span className="font-bold text-white">{student.student_name}</span> • {student.admission_type} ({student.academic_class})
          </div>

          <div className="space-y-3">
            {PROGRESS_STEPS.map((step) => {
              const isChecked = !!stepsState[step.key];
              const dateVal = stepsState[step.dateKey] || '';

              return (
                <div
                  key={step.key}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isChecked
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleStep(step.key, step.dateKey)}
                      className="flex items-center gap-2.5 text-xs font-semibold text-white select-none text-left focus:outline-none"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-5 h-5 text-slate-600 shrink-0" />
                      )}
                      <span>{step.label}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleStep(step.key, step.dateKey)}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                        isChecked
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                      }`}
                    >
                      {isChecked ? '✓ Completed' : '○ Pending'}
                    </button>
                  </div>

                  {isChecked && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                      <span className="text-[11px] text-slate-400">Completion Date:</span>
                      <input
                        type="date"
                        value={dateVal}
                        onChange={(e) =>
                          setStepsState(prev => ({
                            ...prev,
                            [step.dateKey]: e.target.value
                          }))
                        }
                        className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/30 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Stage Updates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
