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
