// server/src/services/users.service.js
import { supabase } from './supabase.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Fetch a user profile by their Supabase Auth ID.
 */
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    throw new ApiError(500, 'DB_ERROR', error.message);
  }

  if (!data) {
    throw new ApiError(404, 'NOT_FOUND', 'User profile not found');
  }

  return data;
}

/**
 * List all user profiles.
 */
export async function listUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return data;
}

/**
 * Invite a new user via Supabase Auth and set their profile.
 */
export async function inviteUser({ email, fullName, role }, adminUserId) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: role },
    redirectTo: process.env.CORS_ORIGIN || 'http://localhost:5173',
  });

  if (error) throw new ApiError(500, 'AUTH_ERROR', error.message);

  return data.user;
}

/**
 * Update a user's role.
 */
export async function updateRole(userId, role, adminUserId) {
  // Prevent demoting the last owner if needed (simplified for v1)
  const { data, error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return data;
}

/**
 * Deactivate/Reactivate a user.
 */
export async function setStatus(userId, isActive, adminUserId) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date() })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return data;
}
