import { supabase } from '../lib/supabase';

/**
 * Fetch commitment history for a student
 */
export async function getCommitmentsByStudentId(studentId) {
  try {
    const { data, error } = await supabase
      .from('fee_commitments')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getCommitmentsByStudentId error:', err);
    throw err;
  }
}

/**
 * Set a new commitment for a student
 */
export async function setStudentCommitment({
  studentId,
  promisedAmount,
  promisedDate = null,
  notes = ''
}) {
  try {
    const cleanDate = promisedDate && promisedDate.trim() ? promisedDate.trim() : null;

    // 1. Create commitment record in history
    const { data: commitment, error: cError } = await supabase
      .from('fee_commitments')
      .insert([{
        student_id: studentId,
        promised_amount: Number(promisedAmount),
        promised_date: cleanDate,
        status: 'Active',
        reason_or_notes: notes || 'New payment commitment made'
      }])
      .select()
      .single();

    if (cError) {
      console.warn('fee_commitments insert note:', cError);
    }

    // 2. Update active commitment on student record
    const { error: sError } = await supabase
      .from('students')
      .update({
        promised_amount: Number(promisedAmount),
        next_payment_due_date: cleanDate,
        commitment_status: 'Active',
        commitment_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId);

    if (sError) throw sError;

    return commitment || { student_id: studentId, promised_amount: promisedAmount };
  } catch (err) {
    console.error('setStudentCommitment error:', err);
    throw err;
  }
}

/**
 * Resolve or Extend an existing commitment when a payment is made or rescheduled
 */
export async function resolveOrExtendCommitment({
  studentId,
  paidAmount,
  newExtendedDate = null,
  newPromisedAmount = null,
  extensionReason = ''
}) {
  try {
    const numPaid = Number(paidAmount) || 0;

    // Fetch the latest active commitment
    const { data: activeCommitments } = await supabase
      .from('fee_commitments')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'Active')
      .order('created_at', { ascending: false })
      .limit(1);

    const active = activeCommitments && activeCommitments.length > 0 ? activeCommitments[0] : null;

    if (active) {
      const isFullyFulfilled = numPaid >= Number(active.promised_amount);
      const isPartiallyPaidWithExtension = numPaid > 0 && newExtendedDate;
      const isUnfulfilledWithExtension = numPaid === 0 && newExtendedDate;

      let resolutionStatus = 'Fulfilled';
      if (isPartiallyPaidWithExtension) {
        resolutionStatus = 'Partially Fulfilled / Extended';
      } else if (isUnfulfilledWithExtension) {
        resolutionStatus = 'Unfulfilled / Rescheduled';
      } else if (!isFullyFulfilled && !newExtendedDate) {
        resolutionStatus = 'Partially Fulfilled';
      }

      // Update existing commitment status
      await supabase
        .from('fee_commitments')
        .update({
          paid_amount: numPaid,
          status: resolutionStatus,
          extended_to_date: newExtendedDate || null,
          reason_or_notes: extensionReason
            ? `${active.reason_or_notes ? active.reason_or_notes + ' | ' : ''}Resolved: ${extensionReason}`
            : active.reason_or_notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', active.id);
    }

    // If there is a new extended date, create a new active commitment entry
    if (newExtendedDate && Number(newPromisedAmount) > 0) {
      await supabase
        .from('fee_commitments')
        .insert([{
          student_id: studentId,
          promised_amount: Number(newPromisedAmount),
          promised_date: newExtendedDate,
          status: 'Active',
          reason_or_notes: extensionReason || `Extended commitment from previous promised date`
        }]);

      await supabase
        .from('students')
        .update({
          promised_amount: Number(newPromisedAmount),
          next_payment_due_date: newExtendedDate,
          commitment_status: 'Partially Fulfilled / Extended',
          commitment_notes: extensionReason || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);
    } else if (numPaid > 0 && (!newExtendedDate || Number(newPromisedAmount) <= 0)) {
      // Cleared or no extension
      await supabase
        .from('students')
        .update({
          commitment_status: 'Fulfilled',
          updated_at: new Date().toISOString()
        })
        .eq('id', studentId);
    }

    return true;
  } catch (err) {
    console.error('resolveOrExtendCommitment error:', err);
    throw err;
  }
}
