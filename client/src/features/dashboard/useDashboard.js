import { useQuery } from '@tanstack/react-query';
import { getDashboardStats, getMemberStats } from '../../api/dashboard';

export function useDashboardStats(filters = {}) {
  return useQuery({
    queryKey: ['dashboardStats', filters],
    queryFn: () => getDashboardStats(filters),
    select: (res) => res.data,
  });
}

export function useMemberStats(memberId, filters = {}) {
  return useQuery({
    queryKey: ['memberStats', memberId, filters],
    queryFn: () => getMemberStats(memberId, filters),
    enabled: !!memberId,
    select: (res) => res.data,
  });
}
