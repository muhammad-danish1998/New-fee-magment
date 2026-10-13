import React, { useState, useRef, useEffect } from 'react';
import { X, CreditCard, DollarSign, Calendar, AlertCircle, Clock, CalendarClock } from 'lucide-react';
import { addPayment } from '../../services/paymentService';
import { resolveOrExtendCommitment } from '../../services/commitmentService';
import { formatCurrency, formatDate } from '../../utils/feeCalculator';

export function AddPaymentModal({ isOpen, onClose, student, onPaymentAdded }) {
  if (!isOpen || !student) return null;

  const remainingDues = Number(student.dues) || 0;
  const hasActiveCommitment = student.promised_amount && student.next_payment_due_date;

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes] = useState('');

  // Extension / Commitment rescheduling state
  const [extendCommitment, setExtendCommitment] = useState(false);
  const [newExtendedDate, setNewExtendedDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [newPromisedAmount, setNewPromisedAmount] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [isCustomReason, setIsCustomReason] = useState(false);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLockedRef = useRef(false);

  // Reset form cleanly when modal opens or student changes
  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Cash');
      setNotes('');
      setExtendCommitment(false);
      setNewExtendedDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
      setNewPromisedAmount('');
      setExtensionReason('');
      setIsCustomReason(false);
      setError('');
    }
  }, [isOpen, student?.id]);

  const numAmount = Math.round(Number(amount)) || 0;
  const duesAfterPayment = Math.max(0, remainingDues - numAmount);

  // Auto calculate default remaining promise and reason dynamically as amount changes
  const handleAmountChange = (val) => {
    setAmount(val);
    const entered = Math.round(Number(val)) || 0;
    const remaining = Math.max(0, remainingDues - entered);

    if (entered >= remainingDues && entered > 0) {
      // Full payment clears dues; no extension needed
      setExtendCommitment(false);
      setNewPromisedAmount('0');
      if (!isCustomReason) {
        setExtensionReason('');
      }
    } else if (entered > 0) {
      // Partial payment leaves remaining dues: suggest extension and auto-compute note
      setExtendCommitment(true);
      setNewPromisedAmount(remaining.toString());
      if (!isCustomReason) {
        setExtensionReason(`Paid ${formatCurrency(entered)} today. Requested extension for remaining ${formatCurrency(remaining)}`);
      }
    } else {
      // Empty or 0 amount entered
      setNewPromisedAmount(remainingDues.toString());
      if (!isCustomReason) {
        setExtensionReason('');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLockedRef.current || isSubmitting) return;

    setError('');

    if (!numAmount || numAmount <= 0) {
      setError('Please enter a valid payment amount greater than 0.');
      return;
    }

    // Section 35 Rule: Paid cannot exceed Total Fee / remaining dues
    if (numAmount > remainingDues) {
      setError(`Payment amount cannot exceed remaining dues of ${formatCurrency(remainingDues)}.`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    if (extendCommitment && duesAfterPayment > 0 && newExtendedDate && newExtendedDate < today) {
      setError('Commitment extension date cannot be in the past.');
      return;
    }

    try {
      isLockedRef.current = true;
      setIsSubmitting(true);

      // 1. Record payment transaction
      const newPayment = await addPayment({
        studentId: student.id,
        amount: numAmount,
        paymentDate,
        paymentMethod,
        notes: notes || (extendCommitment ? extensionReason : '')
      });

      // 2. Handle commitment resolution or extension
      await resolveOrExtendCommitment({
        studentId: student.id,
        paidAmount: numAmount,
        newExtendedDate: extendCommitment && duesAfterPayment > 0 ? newExtendedDate : null,
        newPromisedAmount: extendCommitment && duesAfterPayment > 0 ? (Math.round(Number(newPromisedAmount)) || duesAfterPayment) : null,
        extensionReason: extendCommitment ? extensionReason : ''
      });

      if (onPaymentAdded) {
        onPaymentAdded(newPayment);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record payment. Please try again.');
    } finally {
      isLockedRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5 font-bold text-teal-600 dark:text-teal-400">
            <CreditCard className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span className="text-slate-900 dark:text-white">Record Student Payment</span>
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

          {/* Student Dues & Active Commitment Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span>Student: <span className="font-semibold text-white">{student.student_name}</span></span>
              <span className="font-bold text-amber-300">Dues: {formatCurrency(remainingDues)}</span>
            </div>

            {hasActiveCommitment && (
              <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-teal-300 text-[11px]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  Promised Commitment:
                </span>
                <span className="font-semibold">
                  {formatCurrency(student.promised_amount)} on {formatDate(student.next_payment_due_date)}
                </span>
              </div>
            )}
          </div>

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Payment Amount (PKR) <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={remainingDues}
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder={`Max ${remainingDues}`}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm font-mono font-bold"
              />
              <button
                type="button"
                onClick={() => handleAmountChange(remainingDues.toString())}
                className="absolute right-2 top-2 px-2.5 py-1 rounded text-[11px] font-semibold bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 transition-colors"
              >
                Pay Full
              </button>
            </div>
          </div>

          {/* Payment Date & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Payment Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-teal-500 text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Payment Method <span className="text-rose-400">*</span>
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:border-teal-500 text-xs"
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank / Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Partial Payment Extension / Commitment Section */}
          {duesAfterPayment > 0 && (
            <div className="pt-2">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-300">
                    <input
                      type="checkbox"
                      checked={extendCommitment}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setExtendCommitment(checked);
                        if (checked && duesAfterPayment > 0 && !isCustomReason) {
                          setExtensionReason(
                            numAmount > 0
                              ? `Paid ${formatCurrency(numAmount)} today. Requested extension for remaining ${formatCurrency(duesAfterPayment)}`
                              : `Extension requested for remaining dues ${formatCurrency(duesAfterPayment)}`
                          );
                        }
                      }}
                      className="w-4 h-4 rounded text-teal-600 bg-slate-900 border-slate-700 focus:ring-teal-500"
                    />
                    <CalendarClock className="w-4 h-4 text-amber-400" />
                    <span>Extend Commitment / Reschedule Remaining Dues</span>
                  </label>
                  <span className="text-[11px] font-mono font-bold text-amber-400">
                    Rem. Dues: {formatCurrency(duesAfterPayment)}
                  </span>
                </div>

                {extendCommitment && (
                  <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1">
                          New Promised Date <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="date"
                          required={extendCommitment}
                          value={newExtendedDate}
                          onChange={(e) => setNewExtendedDate(e.target.value)}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">
                          Next Promised Amount
                        </label>
                        <input
                          type="number"
                          max={duesAfterPayment}
                          value={newPromisedAmount}
                          onChange={(e) => setNewPromisedAmount(e.target.value)}
                          placeholder={`Max ${duesAfterPayment}`}
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono focus:outline-none focus:border-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1">
                        Reason for Extension / Note
                      </label>
                      <input
                        type="text"
                        value={extensionReason}
                        onChange={(e) => {
                          const val = e.target.value;
                          setExtensionReason(val);
                          setIsCustomReason(val.trim().length > 0);
                        }}
                        placeholder="e.g. Paid Rs. 10,000, promised to pay remaining next month"
                        className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              General Transaction Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Bank slip reference, branch name"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 text-xs"
            />
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
              {isSubmitting ? 'Saving...' : 'Save Payment & Commitment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
