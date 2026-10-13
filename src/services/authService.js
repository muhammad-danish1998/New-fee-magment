import { supabase } from '../lib/supabase';

const AUTH_STORAGE_KEY = 'jmt_fee_lms_session_user';

export const authService = {
  /**
   * Log in user with username/email and password
   */
  async login(identifier, password) {
    if (!identifier || !password) {
      throw new Error('Please enter both username/email and password.');
    }

    const cleanIdentifier = identifier.trim().toLowerCase();

    // Query admin_users matching either username or email
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .or(`username.ilike.${cleanIdentifier},email.ilike.${cleanIdentifier}`)
      .limit(1);

    if (error) {
      console.error('Login query error:', error);
      throw new Error('Authentication failed. Database connection error.');
    }

    if (!data || data.length === 0) {
      throw new Error('Invalid username or email address.');
    }

    const user = data[0];

    // Check password
    if (user.password !== password) {
      throw new Error('Incorrect password. Please try again.');
    }

    // Save session without exposing password in session store
    const sessionUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role || 'Administrator',
      full_name: user.full_name || 'JMT Admin',
      logged_in_at: new Date().toISOString()
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
    return sessionUser;
  },

  /**
   * Get currently logged-in user from localStorage
   */
  getCurrentUser() {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Failed to parse auth session:', e);
      return null;
    }
  },

  /**
   * Log out and clear local storage session
   */
  logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  },

  /**
   * Update credentials (username, email, fullName, password)
   */
  async updateCredentials({ id, username, email, fullName, currentPassword, newPassword }) {
    if (!id) throw new Error('User identifier missing.');

    // Fetch existing user to verify current password
    const { data: userRecords, error: fetchErr } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', id)
      .limit(1);

    if (fetchErr || !userRecords || userRecords.length === 0) {
      throw new Error('Could not find user record in database.');
    }

    const existingUser = userRecords[0];

    // If changing password or sensitive info, verify current password
    if (currentPassword && existingUser.password !== currentPassword) {
      throw new Error('Current password does not match. Please verify.');
    }

    const updatePayload = {
      updated_at: new Date().toISOString()
    };

    if (username && username.trim()) updatePayload.username = username.trim().toLowerCase();
    if (email && email.trim()) updatePayload.email = email.trim().toLowerCase();
    if (fullName && fullName.trim()) updatePayload.full_name = fullName.trim();
    if (newPassword && newPassword.trim()) {
      if (newPassword.length < 4) {
        throw new Error('New password must be at least 4 characters long.');
      }
      updatePayload.password = newPassword.trim();
    }

    const { data: updated, error: updateErr } = await supabase
      .from('admin_users')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      console.error('Update credentials error:', updateErr);
      if (updateErr.code === '23505') {
        throw new Error('Username or Email is already taken by another account.');
      }
      throw new Error('Failed to update credentials: ' + updateErr.message);
    }

    // Refresh stored session
    const updatedSession = {
      id: updated.id,
      username: updated.username,
      email: updated.email,
      role: updated.role,
      full_name: updated.full_name,
      logged_in_at: new Date().toISOString()
    };

    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedSession));
    return updatedSession;
  }
};
