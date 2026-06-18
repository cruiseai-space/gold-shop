// client/src/features/settings/useUsers.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as usersApi from '../../api/users.js';
import { toast } from 'sonner';

const QUERY_KEY = ['users'];

export function useUsers() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => usersApi.list(),
  });
}

export function useInvites() {
  return useQuery({
    queryKey: ['invites'],
    queryFn: () => usersApi.listInvites(),
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: usersApi.invite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      toast.success('Invitation sent successfully');
    }
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('User role updated');
    }
  });
}

export function useSetUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => usersApi.setStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('User status updated');
    }
  });
}
