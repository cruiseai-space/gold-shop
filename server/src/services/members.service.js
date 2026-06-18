import { supabase } from './supabase.js';
import { ApiError } from '../utils/ApiError.js';

export async function listMembers({ page = 1, limit = 20, search }) {
  let query = supabase
    .from('members')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (search) {
    query = query.ilike('name', `%${search}%`);
  }

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

export async function getMemberById(id) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new ApiError(404, 'NOT_FOUND', 'Member not found');
    throw new ApiError(500, 'DB_ERROR', error.message);
  }

  return data;
}

export async function createMember(data) {
  const { data: row, error } = await supabase
    .from('members')
    .insert({
      name: data.name,
      phone: data.phone || null,
      city: data.city || null,
      notes: data.notes || null,
      // maybe created_by if needed
    })
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return row;
}

export async function updateMember(id, data) {
  const { data: row, error } = await supabase
    .from('members')
    .update({
      name: data.name,
      phone: data.phone,
      city: data.city,
      notes: data.notes,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return row;
}

export async function getMemberStats(id, filters = {}) {
  // We'll calculate stats by fetching their purchases/transactions
  // Alternatively call getMemberStats from dashboard.service.js or do it here.
  // The task says: "Create members.service.js with CRUD: ... getMemberStats(id, filters)"
  // And "Create dashboard.service.js ... getMemberStats(memberId, { dateFrom, dateTo })"
  // Wait, so dashboard.service.js and members.service.js both have getMemberStats?
  // Let's implement it here by calling dashboard service or just moving logic to dashboard.
  // We'll implement getMemberStats in dashboard.service.js and call it from here, or vice versa.
  const { getMemberStats: dashStats } = await import('./dashboard.service.js');
  return dashStats(id, filters);
}
