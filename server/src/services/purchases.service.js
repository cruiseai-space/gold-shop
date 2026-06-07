// server/src/services/purchases.service.js
import { supabase } from './supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { computeGoldPurchase } from '../utils/goldCalc.js';
import Decimal from 'decimal.js';

/**
 * List purchases with pagination and filters.
 */
export async function listPurchases({ page = 1, limit = 20, dateFrom, dateTo, seller }) {
  let query = supabase
    .from('purchases')
    .select(`
      *,
      creator:profiles!purchases_created_by_fkey (id, full_name)
    `, { count: 'exact' })
    .order('purchase_date', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (dateFrom) query = query.gte('purchase_date', dateFrom);
  if (dateTo)   query = query.lte('purchase_date', dateTo);
  if (seller)   query = query.ilike('seller_name', `%${seller}%`);

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
 * Get a single purchase by ID.
 */
export async function getPurchaseById(id) {
  const { data, error } = await supabase
    .from('purchases')
    .select(`
      *,
      creator:profiles!purchases_created_by_fkey (id, full_name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw new ApiError(404, 'NOT_FOUND', 'Purchase not found');
    throw new ApiError(500, 'DB_ERROR', error.message);
  }
  
  return data;
}

/**
 * Create a new gold purchase entry.
 */
export async function createPurchase(data, userId) {
  const calc = computeGoldPurchase({
    grossWeight: data.grossWeight,
    touchPercent: data.touchPercent,
    marketRate: data.marketRate,
    cashGiven: data.cashGiven || 0,
  });

  const { data: row, error } = await supabase
    .from('purchases')
    .insert({
      purchase_date:  data.purchaseDate,
      seller_name:    data.sellerName,
      cash_source:    data.cashSource || null,
      gross_weight:   calc.grossWeight.toFixed(4),
      touch_percent:  calc.touchPercent.toFixed(4),
      pure_weight:    calc.pureWeight.toFixed(4),
      market_rate:    calc.marketRate.toFixed(4),
      booked_rate:    data.bookedRate ? new Decimal(data.bookedRate).toFixed(4) : null,
      pure_value:     calc.pureValue.toFixed(4),
      cash_given:     calc.cashGiven.toFixed(4),
      pending_amount: calc.pendingAmount.toFixed(4),
      notes:          data.notes || null,
      created_by:     userId,
    })
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return row;
}

/**
 * Update an existing purchase.
 */
export async function updatePurchase(id, data, user) {
  // Check permission: OWNER any, STAFF own + today only
  const existing = await getPurchaseById(id);
  
  const isOwner = user.role === 'OWNER';
  const isCreator = existing.created_by === user.id;
  const isToday = new Date(existing.created_at).toDateString() === new Date().toDateString();

  if (!isOwner && (!isCreator || !isToday)) {
    throw new ApiError(403, 'INSUFFICIENT_ROLE', 'You can only edit your own entries created today');
  }

  // Recalculate if weight/rate/cash changes
  const calc = computeGoldPurchase({
    grossWeight:  data.grossWeight  !== undefined ? data.grossWeight  : existing.gross_weight,
    touchPercent: data.touchPercent !== undefined ? data.touchPercent : existing.touch_percent,
    marketRate:   data.marketRate   !== undefined ? data.marketRate   : existing.market_rate,
    cashGiven:    data.cashGiven    !== undefined ? data.cashGiven    : existing.cash_given,
  });

  const { data: row, error } = await supabase
    .from('purchases')
    .update({
      purchase_date:  data.purchaseDate || existing.purchase_date,
      seller_name:    data.sellerName   || existing.seller_name,
      cash_source:    data.cashSource   !== undefined ? data.cash_source : existing.cash_source,
      gross_weight:   calc.grossWeight.toFixed(4),
      touch_percent:  calc.touchPercent.toFixed(4),
      pure_weight:    calc.pureWeight.toFixed(4),
      market_rate:    calc.marketRate.toFixed(4),
      booked_rate:    data.bookedRate   !== undefined ? new Decimal(data.bookedRate).toFixed(4) : existing.booked_rate,
      pure_value:     calc.pureValue.toFixed(4),
      cash_given:     calc.cashGiven.toFixed(4),
      pending_amount: calc.pendingAmount.toFixed(4),
      notes:          data.notes        !== undefined ? data.notes        : existing.notes,
      updated_by:     user.id,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return row;
}

/**
 * Delete a purchase (OWNER only).
 */
export async function deletePurchase(id) {
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id);

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return true;
}
