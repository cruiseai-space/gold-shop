import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as membersApi from '../../api/members.js';
import { toast } from 'sonner';

const QUERY_KEY = ['members'];

export function useMembers(filters) {
  return useQuery({
    queryKey: [...QUERY_KEY, filters],
    queryFn: () => membersApi.list(filters),
    keepPreviousData: true,
  });
}

export function useMember(id) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => membersApi.getById(id),
    enabled: !!id,
  });
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: membersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Member created successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error?.message || 'Failed to create member');
    }
  });
}

export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => membersApi.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, variables.id] });
      toast.success('Member updated successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error?.message || 'Failed to update member');
    }
  });
}
