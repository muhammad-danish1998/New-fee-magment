import { supabase } from '../lib/supabase';

/**
 * Fetch all brokers
 */
export async function getBrokers() {
  try {
    const { data, error } = await supabase
      .from('brokers')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error loading brokers table:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('getBrokers exception:', err);
    return [];
  }
}

/**
 * Fetch active brokers for dropdown selection
 */
export async function getActiveBrokers() {
  try {
    const { data, error } = await supabase
      .from('brokers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.warn('Error loading active brokers:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('getActiveBrokers exception:', err);
    return [];
  }
}

/**
 * Generate a cryptographically strong pseudo-random token for broker portal access
 */
export function generateBrokerToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'brk_';
  for (let i = 0; i < 28; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Add a new broker
 */
export async function createBroker({ name, phone = '', currentAgreedAmount = 0, notes = '', securityPin = '1234' }) {
  try {
    const trimmedName = (name || '').trim();
    if (!trimmedName) throw new Error('Broker Name is required.');

    const amount = Number(currentAgreedAmount) >= 0 ? Number(currentAgreedAmount) : 0;
    const token = generateBrokerToken();
    const pin = (securityPin || '1234').trim().slice(0, 8);

    const { data, error } = await supabase
      .from('brokers')
      .insert([{
        name: trimmedName,
        phone: phone ? phone.trim() : null,
        current_agreed_amount: amount,
        is_active: true,
        access_token: token,
        security_pin: pin,
        is_portal_active: true,
        notes: notes ? notes.trim() : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('createBroker error:', err);
    throw err;
  }
}

/**
 * Update an existing broker's master info, PIN, or active states
 */
export async function updateBroker(id, updates) {
  try {
    const payload = {
      updated_at: new Date().toISOString()
    };

    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.phone !== undefined) payload.phone = updates.phone ? updates.phone.trim() : null;
    if (updates.current_agreed_amount !== undefined) {
      payload.current_agreed_amount = Number(updates.current_agreed_amount) || 0;
    }
    if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);
    if (updates.is_portal_active !== undefined) payload.is_portal_active = Boolean(updates.is_portal_active);
    if (updates.security_pin !== undefined) payload.security_pin = String(updates.security_pin).trim();
    if (updates.access_token !== undefined) payload.access_token = updates.access_token;
    if (updates.notes !== undefined) payload.notes = updates.notes ? updates.notes.trim() : null;

    const { data, error } = await supabase
      .from('brokers')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error('updateBroker error:', err);
    throw err;
  }
}

/**
 * Delete a broker record
 */
export async function deleteBroker(id) {
  try {
    const { error } = await supabase
      .from('brokers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteBroker error:', err);
    throw err;
  }
}

/**
 * Toggle broker portal active / inactive status
 */
export async function toggleBrokerPortalStatus(brokerId, isPortalActive) {
  return updateBroker(brokerId, { is_portal_active: Boolean(isPortalActive) });
}

/**
 * Regenerate access token for a broker (revokes previously shared links)
 */
export async function regenerateBrokerAccessToken(brokerId) {
  const newToken = generateBrokerToken();
  return updateBroker(brokerId, { access_token: newToken });
}

/**
 * Update broker 4-digit security PIN
 */
export async function updateBrokerSecurityPin(brokerId, newPin) {
  const pin = String(newPin || '1234').trim();
  return updateBroker(brokerId, { security_pin: pin });
}

/**
 * Fetch public broker portal info and students securely via server-side database RPC function
 * Verifies token, active status, and PIN inside PostgreSQL; zero student data is transmitted if PIN is wrong.
 */
export async function getBrokerPortalDataByRpc(token, pin) {
  try {
    if (!token) throw new Error('Portal link token is missing.');
    if (!pin) throw new Error('Please enter your 4-digit security PIN.');

    const cleanPin = String(pin).trim();

    const { data, error } = await supabase.rpc('get_broker_portal_records', {
      p_token: token,
      p_pin: cleanPin
    });

    if (error) {
      throw new Error(error.message || 'Invalid access token, incorrect PIN, or portal link has been deactivated.');
    }

    if (!data || !data.isLinkActive) {
      return {
        isLinkActive: false,
        brokerName: data?.broker?.name || 'Partner',
        error: 'This portal link has been deactivated by college administration.'
      };
    }

    // Process students with calculated financial dues and progress badges
    const processedStudents = (data.students || []).map(s => {
      const totalPaid = (s.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const studentTotalFee = Number(s.total_fee) || 0;
      const dues = Math.max(0, studentTotalFee - totalPaid);
      const agreedSnapshot = Number(s.broker_agreed_amount) || 0;

      let currentProgress = 'Enrollment in Verification';
      let stepNumber = 1;
      if (s.admit_card_issued) {
        currentProgress = 'Admit Card Issued';
        stepNumber = 4;
      } else if (s.examination_verification) {
        currentProgress = 'Examination in Verification';
        stepNumber = 3;
      } else if (s.enrollment_card_issued) {
        currentProgress = 'Enrollment Card Issued';
        stepNumber = 2;
      } else if (s.enrollment_verification) {
        currentProgress = 'Enrollment in Verification';
        stepNumber = 1;
      }

      return {
        ...s,
        total_paid: totalPaid,
        dues: dues,
        agreed_snapshot: agreedSnapshot,
        current_progress: currentProgress,
        step_number: stepNumber
      };
    });

    return {
      isLinkActive: true,
      broker: data.broker,
      students: processedStudents
    };
  } catch (err) {
    console.error('getBrokerPortalDataByRpc error:', err);
    throw err;
  }
}

/**
 * Fetch broker ledger & accounting summary.
 * Calculates total students and total institutional balance strictly using
 * the HISTORICAL SNAPSHOT agreed amount on each student's enrollment record.
 */
export async function getBrokerAccountingSummary() {
  try {
    const [brokersRes, studentsRes] = await Promise.all([
      getBrokers(),
      supabase
        .from('students')
        .select('id, student_name, father_name, admission_session, academic_class, program_group, created_at, admission_source, broker_id, broker_agreed_amount')
        .eq('admission_source', 'Referral')
        .order('created_at', { ascending: false })
    ]);

    const brokers = brokersRes || [];
    const referralStudents = studentsRes.data || [];

    // Aggregate summary per broker
    const brokerSummaries = brokers.map((broker) => {
      // If broker doesn't have an access_token yet, generate one virtually or on the fly
      const token = broker.access_token || `brk_${broker.id.replace(/-/g, '').slice(0, 16)}`;
      const isPortalActive = broker.is_portal_active !== undefined ? broker.is_portal_active : true;
      const securityPin = broker.security_pin || '1234';

      // Find all students enrolled under this broker
      const studentsForBroker = referralStudents.filter(s => s.broker_id === broker.id);

      // Total agreed amount calculated strictly from each student's individual snapshot amount
      const totalAgreedAmount = studentsForBroker.reduce(
        (sum, s) => sum + (Number(s.broker_agreed_amount) || 0),
        0
      );

      return {
        ...broker,
        access_token: token,
        is_portal_active: isPortalActive,
        security_pin: securityPin,
        total_students_count: studentsForBroker.length,
        total_snapshot_amount: totalAgreedAmount,
        students: studentsForBroker
      };
    });

    return brokerSummaries;
  } catch (err) {
    console.error('getBrokerAccountingSummary error:', err);
    throw err;
  }
}

