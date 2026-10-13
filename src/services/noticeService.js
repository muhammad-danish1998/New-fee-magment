import { supabase } from '../lib/supabase';

const LOCAL_STORAGE_NOTICES_KEY = 'jmt_fee_due_notices_backup';

function getLocalNotices() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_NOTICES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalNotice(notice) {
  try {
    const notices = getLocalNotices();
    notices.unshift(notice);
    localStorage.setItem(LOCAL_STORAGE_NOTICES_KEY, JSON.stringify(notices));
  } catch (e) {
    console.error('Failed to save notice locally:', e);
  }
}

/**
 * Fetch all notices issued to a particular student
 */
export async function getNoticesByStudentId(studentId) {
  try {
    const { data, error } = await supabase
      .from('fee_due_notices')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fee_due_notices fetch warning, using local fallback:', error.message);
      const local = getLocalNotices().filter(n => n.student_id === studentId);
      return local;
    }
    return data || [];
  } catch (err) {
    console.warn('getNoticesByStudentId error fallback:', err);
    return getLocalNotices().filter(n => n.student_id === studentId);
  }
}

/**
 * Create a new fee due notice
 */
export async function createFeeDueNotice({
  studentId,
  dueAmount,
  noticeDate,
  deadlineDate,
  remarks = '',
  status = 'Generated'
}) {
  const noticeNo = `FDN-${studentId.slice(0, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
  const newRecord = {
    id: crypto.randomUUID ? crypto.randomUUID() : `notice_${Date.now()}`,
    student_id: studentId,
    notice_no: noticeNo,
    due_amount: Number(dueAmount),
    notice_date: noticeDate || new Date().toISOString().split('T')[0],
    deadline_date: deadlineDate,
    remarks: remarks || null,
    status: status,
    sent_at: status === 'Sent' ? new Date().toISOString() : null,
    created_at: new Date().toISOString()
  };

  try {
    const { data, error } = await supabase
      .from('fee_due_notices')
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      console.warn('Supabase fee_due_notices insert warning, using local fallback:', error.message);
      saveLocalNotice(newRecord);
      return newRecord;
    }

    saveLocalNotice(data);
    return data;
  } catch (err) {
    console.warn('createFeeDueNotice fallback to local:', err);
    saveLocalNotice(newRecord);
    return newRecord;
  }
}

/**
 * Mark a notice as Sent (e.g. via WhatsApp or manual dispatch)
 */
export async function markNoticeAsSent(noticeId) {
  const sentAt = new Date().toISOString();
  try {
    const { error } = await supabase
      .from('fee_due_notices')
      .update({
        status: 'Sent',
        sent_at: sentAt
      })
      .eq('id', noticeId);

    if (error) {
      console.warn('Supabase markNoticeAsSent warning:', error.message);
    }
  } catch (err) {
    console.warn('markNoticeAsSent catch:', err);
  }

  // Update local storage too
  try {
    const notices = getLocalNotices();
    const updated = notices.map(n => n.id === noticeId ? { ...n, status: 'Sent', sent_at: sentAt } : n);
    localStorage.setItem(LOCAL_STORAGE_NOTICES_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

/**
 * Delete a notice record
 */
export async function deleteNotice(noticeId) {
  try {
    await supabase.from('fee_due_notices').delete().eq('id', noticeId);
  } catch (err) {
    console.warn('deleteNotice error:', err);
  }

  try {
    const notices = getLocalNotices().filter(n => n.id !== noticeId);
    localStorage.setItem(LOCAL_STORAGE_NOTICES_KEY, JSON.stringify(notices));
  } catch (e) {
    // ignore
  }
}
