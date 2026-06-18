import { apiClient } from './client';

export async function getDashboardStats(filters = {}) {
  const { startDate, endDate } = filters;
  const params = new URLSearchParams();
  if (startDate) params.append('dateFrom', startDate);
  if (endDate) params.append('dateTo', endDate);

  return apiClient.get(`/dashboard/stats?${params.toString()}`);
}

export async function getMemberStats(memberId, filters = {}) {
  const { startDate, endDate } = filters;
  const params = new URLSearchParams();
  if (startDate) params.append('dateFrom', startDate);
  if (endDate) params.append('dateTo', endDate);

  return apiClient.get(`/dashboard/members/${memberId}/stats?${params.toString()}`);
}
