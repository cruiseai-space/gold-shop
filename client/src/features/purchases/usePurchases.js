// client/src/features/purchases/usePurchases.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as purchasesApi from '../../api/purchases.js';
import { toast } from 'sonner';

const QUERY_KEY = ['purchases'];

export function usePurchases(filters) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: () => purchasesApi.list(filters),
    keepPreviousData: true,
  });
}

export function usePurchase(id) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => purchasesApi.getById(id),
    enabled: !!id,
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Purchase recorded successfully');
    },
  });
}

export function useUpdatePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => purchasesApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, variables.id] });
      toast.success('Purchase updated successfully');
    },
  });
}

export function useDeletePurchase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: purchasesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Purchase deleted');
    },
  });
}
