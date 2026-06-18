import { supabase } from './supabase.js';
import { ApiError } from '../utils/ApiError.js';
import Decimal from 'decimal.js';
import { getLatestRate } from './rates.service.js';

export async function getOverallStats({ dateFrom, dateTo }) {
  let query = supabase.from('purchases').select('transaction_type, pure_weight, pure_value, pending_amount');
  
  if (dateFrom) query = query.gte('purchase_date', dateFrom);
  if (dateTo) query = query.lte('purchase_date', dateTo);

  const { data, error } = await query;
  if (error) throw new ApiError(500, 'DB_ERROR', error.message);

  const latestRateData = await getLatestRate();
  const currentRate = latestRateData?.market_rate || 0;

  return aggregateStats(data, currentRate);
}

export async function getMemberStats(memberId, { dateFrom, dateTo } = {}) {
  let query = supabase.from('purchases').select('transaction_type, pure_weight, pure_value, pending_amount')
    .eq('member_id', memberId);
    
  if (dateFrom) query = query.gte('purchase_date', dateFrom);
  if (dateTo) query = query.lte('purchase_date', dateTo);

  const { data, error } = await query;
  if (error) throw new ApiError(500, 'DB_ERROR', error.message);

  const latestRateData = await getLatestRate();
  const currentRate = latestRateData?.market_rate || 0;

  return aggregateStats(data, currentRate);
}

function aggregateStats(purchases, currentRate) {
  let totalGoldIn = new Decimal(0);
  let totalGoldOut = new Decimal(0);
  let totalCashIn = new Decimal(0);
  let totalCashOut = new Decimal(0);
  let netPending = new Decimal(0);

  purchases.forEach(p => {
    const pureWeight = new Decimal(p.pure_weight || 0);
    const pureValue = new Decimal(p.pure_value || 0);
    const pendingAmount = new Decimal(p.pending_amount || 0);

    if (p.transaction_type === 'BUYING') {
      // Shop BUYING gold FROM member -> Shop spends cash (Cash Out)
      totalGoldIn = totalGoldIn.plus(pureWeight);
      totalCashOut = totalCashOut.plus(pureValue);
    } else if (p.transaction_type === 'SELLING') {
      // Shop SELLING gold TO member -> Shop receives cash (Cash In)
      totalGoldOut = totalGoldOut.plus(pureWeight);
      totalCashIn = totalCashIn.plus(pureValue);
    }
    
    netPending = netPending.plus(pendingAmount);
  });

  // Net Gold Position = Gold we hold in inventory (or owed) from these transactions
  const netGoldPosition = totalGoldIn.minus(totalGoldOut);

  // Mark-To-Market P&L:
  // (Cash Received - Cash Spent) + (Current Value of Net Gold Position)
  const totalPL = totalCashIn.minus(totalCashOut).plus(netGoldPosition.times(currentRate));

  return {
    totalGoldIn: totalGoldIn.toNumber(),
    totalGoldOut: totalGoldOut.toNumber(),
    netGoldPosition: netGoldPosition.toNumber(),
    netPendingAmount: netPending.toNumber(),
    transactionCount: purchases.length,
    totalPL: totalPL.toNumber(),
    currentRateUsed: currentRate
  };
}
