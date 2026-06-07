// client/src/features/rates/useRates.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ratesApi from '../../api/rates.js';
import { toast } from 'sonner';

const QUERY_KEY = ['rates'];

export function useRates(filters) {
  return useQuery({
    queryKey: [...QUERY_KEY, 'list', filters],
    queryFn: () => ratesApi.list(filters),
  });
}

export function useTodayRate() {
  return useQuery({
    queryKey: [...QUERY_KEY, 'today'],
    queryFn: () => ratesApi.getToday(),
    staleTime: 60000, // 1 minute
  });
}

export function useCreateRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ratesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Daily rate updated');
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update rate');
    }
  });
}
