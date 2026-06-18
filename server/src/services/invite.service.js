// server/src/services/invite.service.js
import { supabase } from './supabase.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Check if the user can send an invite (max 3 per hour)
 */
export async function canSendInvite(invitedByUserId) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from('invite_status')
    .select('*', { count: 'exact', head: true })
    .eq('invited_by', invitedByUserId)
    .gte('invited_at', oneHourAgo);

  if (error) {
    throw new ApiError(500, 'DB_ERROR', error.message);
  }

  return count < 3;
}

/**
 * Invite a new user via Supabase Auth and track status in invite_status
 */
export async function createInvite(data, userId) {
  const { email, fullName, role } = data;

  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, role: role },
    redirectTo: process.env.CORS_ORIGIN || 'http://localhost:5173',
  });

  if (authError) {
    throw new ApiError(500, 'AUTH_ERROR', authError.message);
  }

  // Insert or Update the invite status (handling unique email constraint)
  const { data: dbData, error: dbError } = await supabase
    .from('invite_status')
    .upsert({
      email,
      full_name: fullName,
      role,
      invited_by: userId,
      status: 'PENDING',
      invited_at: new Date().toISOString()
    }, { onConflict: 'email' })
    .select('*')
    .single();

  if (dbError) {
    throw new ApiError(500, 'DB_ERROR', dbError.message);
  }

  // Return the inserted row + the auth user so controller returns similar data
  return { ...dbData, authUser: authData.user };
}

/**
 * List all invites
 */
export async function listInvites() {
  const { data, error } = await supabase
    .from('invite_status')
    .select('*')
    .order('invited_at', { ascending: false });

  if (error) {
    throw new ApiError(500, 'DB_ERROR', error.message);
  }

  return data;
}
