// server/src/services/rates.service.js
import { supabase } from './supabase.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * List rate entries with pagination.
 */
export async function listRates({ page = 1, limit = 30, dateFrom, dateTo }) {
  let query = supabase
    .from('rate_entries')
    .select(`
      *,
      setter:profiles!rate_entries_set_by_fkey (id, full_name)
    `, { count: 'exact' })
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (dateFrom) query = query.gte('effective_date', dateFrom);
  if (dateTo)   query = query.lte('effective_date', dateTo);

  const { data, error, count } = await query;
  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  
  return { 
    data, 
    meta: { 
      page, 
      limit, 
      total: count,
      pages: Math.ceil(count / limit)
    } 
  };
}

/**
 * Get the most recent rate for today or the last set rate.
 */
export async function getLatestRate() {
  const { data, error } = await supabase
    .from('rate_entries')
    .select('*')
    .order('effective_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return data;
}

/**
 * Create a new rate entry.
 */
export async function createRate(data, userId) {
  const { data: row, error } = await supabase
    .from('rate_entries')
    .insert({
      market_rate:    data.marketRate,
      booked_rate:    data.bookedRate || null,
      effective_date: data.effectiveDate || new Date().toISOString().split('T')[0],
      notes:          data.notes || null,
      set_by:         userId,
    })
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return row;
}
