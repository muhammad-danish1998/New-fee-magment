import { supabase } from '../lib/supabase';

/**
 * Add a new payment record for a student
 */
export async function addPayment({ studentId, amount, paymentDate, paymentMethod = 'Cash', notes = '' }) {
  try {
    const numAmount = Math.round(Number(amount));
    if (!numAmount || numAmount <= 0) {
      throw new Error('Payment amount must be a valid number greater than zero.');
    }

    // Verify current student dues from database before insertion
    const { data: student, error: studentErr } = await supabase
      .from('students')
      .select('total_fee, payments(amount)')
      .eq('id', studentId)
      .single();

    if (studentErr || !student) {
      throw new Error('Could not find student record to verify payment dues.');
    }

    const totalFee = Number(student.total_fee) || 0;
    const currentPaid = (student.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remainingDues = Math.max(0, totalFee - currentPaid);

    if (numAmount > remainingDues) {
      throw new Error(`Payment of Rs. ${numAmount.toLocaleString()} exceeds remaining dues of Rs. ${remainingDues.toLocaleString()}.`);
    }

    const receiptNo = `RCP-${Date.now().toString().slice(-6)}`;

    const { data, error } = await supabase
      .from('payments')
      .insert([{
        student_id: studentId,
        amount: numAmount,
        payment_date: paymentDate || new Date().toISOString().split('T')[0],
        payment_method: paymentMethod,
        receipt_no: receiptNo,
        notes: notes ? String(notes).trim().slice(0, 500) : null
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('addPayment error:', err);
    throw err;
  }
}

/**
 * Get all payment records for a student
 */
export async function getPaymentsByStudentId(studentId) {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getPaymentsByStudentId error:', err);
    throw err;
  }
}

/**
 * Delete a payment record
 */
export async function deletePayment(paymentId) {
  try {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deletePayment error:', err);
    throw err;
  }
}

/**
 * Adjust/rebalance a student's total recorded payment transactions to match a target paid amount
 * (e.g., when restructuring fees during a broker referral transfer or retroactive correction).
 */
export async function adjustStudentPaidAmount(studentId, targetPaidAmount, reason = 'Adjustment on fee restructuring') {
  try {
    const targetAmount = Math.max(0, Math.round(Number(targetPaidAmount) || 0));

    // Fetch existing payments
    const { data: existingPayments, error: fetchErr } = await supabase
      .from('payments')
      .select('*')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: true });

    if (fetchErr) throw fetchErr;

    const currentTotal = (existingPayments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // If already equal, do nothing
    if (currentTotal === targetAmount) {
      return true;
    }

    if (targetAmount === 0) {
      // Delete all existing payments for this student
      const { error: delErr } = await supabase
        .from('payments')
        .delete()
        .eq('student_id', studentId);

      if (delErr) throw delErr;
      return true;
    }

    if (existingPayments && existingPayments.length === 1) {
      // Just update the existing single payment record
      const { error: updateErr } = await supabase
        .from('payments')
        .update({
          amount: targetAmount,
          notes: existingPayments[0].notes
            ? `${existingPayments[0].notes} | Adjusted: ${reason}`
            : `Payment Adjusted: ${reason}`
        })
        .eq('id', existingPayments[0].id);

      if (updateErr) throw updateErr;
      return true;
    }

    // If multiple payments or no prior payments, replace with one consolidated/adjusted payment record
    if (existingPayments && existingPayments.length > 0) {
      const { error: delErr } = await supabase
        .from('payments')
        .delete()
        .eq('student_id', studentId);

      if (delErr) throw delErr;
    }

    const receiptNo = `RCP-${Date.now().toString().slice(-6)}`;
    const { error: insertErr } = await supabase
      .from('payments')
      .insert([{
        student_id: studentId,
        amount: targetAmount,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'Cash',
        receipt_no: receiptNo,
        notes: `Adjusted Payment Record: ${reason}`
      }]);

    if (insertErr) throw insertErr;
    return true;
  } catch (err) {
    console.error('adjustStudentPaidAmount error:', err);
    throw err;
  }
}

