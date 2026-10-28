/**
 * Financial Calculation Utilities
 * Strictly adhering to Section 13, 14, 17, 33, 35 of AGENTS.md
 */

/**
 * Calculates total paid from an array of payment objects
 * Total Paid = Sum of all successful payments
 */
export function calculateTotalPaid(payments = []) {
  if (!Array.isArray(payments) || payments.length === 0) return 0;
  return payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/**
 * Calculates remaining dues
 * Dues = Total Fee - Total Paid
 */
export function calculateDues(totalFee = 0, totalPaid = 0) {
  const fee = Number(totalFee) || 0;
  const paid = Number(totalPaid) || 0;
  return Math.max(0, fee - paid);
}

/**
 * Calculates fee status based on:
 * - Unpaid: totalPaid = 0 and dues > 0
 * - Partial / Due: totalPaid > 0 and dues > 0
 * - Paid in Full: dues <= 0
 * - Overdue: dues > 0 and dueDate passed
 */
export function calculateFeeStatus(totalFee = 0, totalPaid = 0, dueDate = null) {
  const fee = Number(totalFee) || 0;
  const paid = Number(totalPaid) || 0;
  const dues = calculateDues(fee, paid);

  if (fee <= 0) {
    return 'NO FEE / WAIVED';
  }

  if (dues <= 0 && fee > 0) {
    return 'PAID IN FULL';
  }

  if (dueDate) {
    const dueTime = new Date(dueDate).setHours(23, 59, 59, 999);
    const now = new Date().getTime();
    if (dueTime < now && dues > 0) {
      return 'OVERDUE';
    }
  }

  if (paid === 0 && dues > 0) {
    return 'UNPAID';
  }

  if (paid > 0 && dues > 0) {
    return 'DUE';
  }

  return 'PAID IN FULL';
}

export { toTitleCase } from './textHelper';

/**
 * Format currency with standardized single PKR format: "Rs 1,857,500"
 */
export function formatCurrency(amount = 0) {
  const num = Math.round(Number(amount)) || 0;
  return `Rs ${num.toLocaleString('en-PK')}`;
}

/**
 * Shared alias so formatMoney and formatCurrency are identical everywhere
 */
export const formatMoney = formatCurrency;

/**
 * Format standard date
 */
export function formatDate(dateString) {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
}

/**
 * Client-side Fee Status computation adhering to Requirement 4:
 * - PAID IN FULL: dues = 0
 * - OVERDUE: dues > 0 AND due date is before today (with days overdue calculation)
 * - DUE: dues > 0 AND due date is today or later (or missing)
 *
 * @param {Object} student - Student record with dues or total_fee, total_paid, next_payment_due_date
 * @returns {{ status: string, badge: string, isPaid: boolean, isOverdue: boolean, daysOverdue: number, label: string }}
 */
export function getFeeStatus(student) {
  if (!student) {
    return {
      status: 'PAID IN FULL',
      badge: 'PAID IN FULL',
      isPaid: true,
      isNoFee: false,
      isOverdue: false,
      daysOverdue: 0,
      label: 'Paid in Full'
    };
  }

  const fee = Number(student.total_fee) || 0;
  if (fee <= 0) {
    return {
      status: 'NO FEE / WAIVED',
      badge: 'NO FEE / WAIVED',
      isPaid: false,
      isNoFee: true,
      isOverdue: false,
      daysOverdue: 0,
      label: 'NO FEE / WAIVED'
    };
  }

  const dues = typeof student.dues !== 'undefined'
    ? Number(student.dues) || 0
    : calculateDues(student.total_fee, student.total_paid);

  if (dues <= 0) {
    return {
      status: 'PAID IN FULL',
      badge: 'PAID IN FULL',
      isPaid: true,
      isNoFee: false,
      isOverdue: false,
      daysOverdue: 0,
      label: 'Paid in Full'
    };
  }

  const dueDateStr = student.next_payment_due_date;
  if (dueDateStr) {
    const dueTime = new Date(dueDateStr);
    if (!isNaN(dueTime.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueDate = new Date(dueTime.getFullYear(), dueTime.getMonth(), dueTime.getDate());
      dueDate.setHours(0, 0, 0, 0);

      const diffMs = today.getTime() - dueDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays > 0) {
        return {
          status: 'OVERDUE',
          badge: 'OVERDUE',
          isPaid: false,
          isOverdue: true,
          daysOverdue: diffDays,
          label: `${diffDays}d overdue`
        };
      }
    }
  }

  return {
    status: 'DUE',
    badge: 'DUE',
    isPaid: false,
    isOverdue: false,
    daysOverdue: 0,
    label: 'Due'
  };
}
