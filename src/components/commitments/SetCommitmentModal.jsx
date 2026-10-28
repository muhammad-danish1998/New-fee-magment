import React, { useState, useRef } from 'react';
import { X, Calendar, DollarSign, AlertCircle, Clock, Award } from 'lucide-react';
import { setStudentCommitment } from '../../services/commitmentService';
import { formatCurrency, toTitleCase } from '../../utils/feeCalculator';

export function SetCommitmentModal({ isOpen, onClose, student, onCommitmentSaved }) {
  if (!isOpen || !student) return null;

  const remainingDues = Number(student.dues) || 0;
  const [promisedAmount, setPromisedAmount] = useState(student.promised_amount || remainingDues || '');
  const [commitmentMode, setCommitmentMode] = useState(
    student.next_payment_due_date && student.commitment_notes
      ? 'both'
      : student.next_payment_due_date
      ? 'date'
      : 'stage'
  );
  const [promisedDate, setPromisedDate] = useState(
    student.next_payment_due_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [selectedStagePreset, setSelectedStagePreset] = useState(
    student.commitment_notes || 'On Enrollment Card Issuance'
  );
  const [customNotes, setCustomNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLockedRef = useRef(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLockedRef.current || isSubmitting) return;

    setError('');

    const numAmount = Math.round(Number(promisedAmount));
    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid promised amount greater than 0.');
      return;
    }

    if (numAmount > remainingDues) {
      setError(`Promised amount cannot exceed total remaining dues of ${formatCurrency(remainingDues)}.`);
      return;
    }

    if (commitmentMode === 'date' && !promisedDate) {
      setError('Please select a valid committed payment date.');
      return;
    }

    let finalNotes = null;
    if (commitmentMode === 'stage' || commitmentMode === 'both') {
      finalNotes = customNotes.trim() || selectedStagePreset || 'On Enrollment Card Issuance';
    } else if (customNotes.trim()) {
      finalNotes = customNotes.trim();
    }

    const finalDate = (commitmentMode === 'date' || commitmentMode === 'both') ? (promisedDate || null) : null;
    const today = new Date().toISOString().split('T')[0];

    if (finalDate && finalDate < today) {
      setError('Committed payment date cannot be in the past.');
      return;
    }

    try {
      isLockedRef.current = true;
      setIsSubmitting(true);
      await setStudentCommitment({
        studentId: student.id,
        promisedAmount: numAmount,
        promisedDate: finalDate,
        notes: finalNotes || 'Payment commitment updated'
      });

      if (onCommitmentSaved) {
        onCommitmentSaved();
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save commitment. Please try again.');
    } finally {
      isLockedRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5 font-bold text-teal-600 dark:text-teal-400">
            <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span className="text-slate-900 dark:text-white">Set / Reschedule Fee Commitment</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Dues Info */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-xs space-y-1">
            <div className="text-slate-400">Student: <span className="font-semibold text-white">{toTitleCase(student.student_name)}</span></div>
            <div className="flex justify-between pt-1 font-semibold text-amber-300">
              <span>Total Remaining Dues:</span>
              <span className="font-sans tabular-nums">{formatCurrency(remainingDues)}</span>
            </div>
          </div>

          {/* Promised Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Promised Payment Amount (PKR) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={remainingDues}
                value={promisedAmount}
                onChange={(e) => setPromisedAmount(e.target.value)}
                placeholder="e.g. 10000"
                required
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-sans tabular-nums font-medium"
              />
              <button
                type="button"
                onClick={() => setPromisedAmount(remainingDues.toString())}
                className="absolute right-2 top-2 px-2 py-1 rounded text-[11px] font-semibold bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition-colors"
              >
                All Dues
              </button>
            </div>
          </div>

          {/* Commitment Mode Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Commitment Type:
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCommitmentMode('stage')}
                className={`py-2 px-2 rounded-lg font-bold border transition-all text-center flex items-center justify-center gap-1 ${
                  commitmentMode === 'stage'
                    ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span className="truncate">Stage Milestone</span>
              </button>

              <button
                type="button"
                onClick={() => setCommitmentMode('date')}
                className={`py-2 px-2 rounded-lg font-bold border transition-all text-center flex items-center justify-center gap-1 ${
                  commitmentMode === 'date'
                    ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span className="truncate">Calendar Date</span>
              </button>

              <button
                type="button"
                onClick={() => setCommitmentMode('both')}
                className={`py-2 px-2 rounded-lg font-bold border transition-all text-center flex items-center justify-center gap-1 ${
                  commitmentMode === 'both'
                    ? 'bg-teal-600 text-white border-teal-400 shadow-md'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <span className="truncate">Date &amp; Stage</span>
              </button>
            </div>
          </div>

          {/* Stage Preset Condition Options */}
          {(commitmentMode === 'stage' || commitmentMode === 'both') && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-300">
                Milestone / Verification Stage Condition:
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {[
                  'On Enrollment Card Issuance',
                  'On Examination in Verification',
                  'On Admit Card Issuance',
                  'On Class Commencement',
                ].map((preset) => {
                  const isSelected = selectedStagePreset === preset && !customNotes;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setSelectedStagePreset(preset);
                        setCustomNotes('');
                      }}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-teal-900/90 border-teal-400 ring-2 ring-teal-400/50 shadow-md'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-850 hover:text-white'
                      }`}
                    >
                      <span className={`font-bold block text-xs ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {preset}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Promised Date */}
          {(commitmentMode === 'date' || commitmentMode === 'both') && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Promised Payment Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={promisedDate}
                onChange={(e) => setPromisedDate(e.target.value)}
                required={commitmentMode === 'date'}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-mono"
              />
            </div>
          )}

          {/* Reason / Custom Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Custom Condition Notes / Reason (Optional)
            </label>
            <input
              type="text"
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="e.g. Will pay remaining Rs. 10,000 when enrollment card is issued"
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/30 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Commitment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
