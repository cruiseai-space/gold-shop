// client/src/features/settings/SettingsPage.jsx
import { useState } from 'react';
import { useUsers, useInvites, useInviteUser, useUpdateUserRole, useSetUserStatus } from './useUsers.js';
import { InviteUserModal } from './InviteUserModal.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { ROLES } from '../../constants/roles.js';
import { formatDate } from '../../utils/formatters.js';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

export function SettingsPage() {
  const { user: currentUser } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  const { data: users, isLoading } = useUsers();
  const { data: invites, isLoading: isLoadingInvites } = useInvites();
  const inviteMutation = useInviteUser();
  const roleMutation = useUpdateUserRole();
  const statusMutation = useSetUserStatus();

  const handleInvite = async (data) => {
    await inviteMutation.mutateAsync(data);
    setIsInviteModalOpen(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    if (window.confirm(`Change user role to ${newRole}?`)) {
      await roleMutation.mutateAsync({ id: userId, role: newRole });
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'reactivate';
    if (window.confirm(`Are you sure you want to ${action} this user?`)) {
      await statusMutation.mutateAsync({ id: userId, isActive: !currentStatus });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl text-primary font-display font-bold">Settings</h1>
        <button 
          onClick={() => setIsInviteModalOpen(true)}
          className="btn btn-primary"
        >
          + Invite User
        </button>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-display font-semibold text-ink">User Management</h2>
        
        <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                <th className="px-4 py-3 border-b border-border">Name</th>
                <th className="px-4 py-3 border-b border-border">Role</th>
                <th className="px-4 py-3 border-b border-border">Status</th>
                <th className="px-4 py-3 border-b border-border">Joined</th>
                <th className="px-4 py-3 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton rows={3} cols={5} />
              ) : !users?.data || users.data.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12">
                    <EmptyState 
                      icon="👥"
                      title="No users found"
                      message="Invite your staff members to get started."
                    />
                  </td>
                </tr>
              ) : (
                users.data.map((user) => (
                  <tr key={user.id} className="hover:bg-ink/5 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-medium text-ink">{user.full_name}</p>
                      <p className="text-xs text-ink-muted font-mono">{user.id.split('-')[0]}...</p>
                    </td>
                    <td className="px-4 py-4">
                      {user.id === currentUser.id ? (
                        <span className="text-sm font-semibold text-primary">{user.role}</span>
                      ) : (
                        <select 
                          className="bg-transparent border-none text-sm font-semibold text-primary cursor-pointer focus:ring-0 p-0"
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        >
                          <option value={ROLES.OWNER}>OWNER</option>
                          <option value={ROLES.STAFF}>STAFF</option>
                          <option value={ROLES.VIEWER}>VIEWER</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'
                      }`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-ink-muted">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      {user.id !== currentUser.id && (
                        <button 
                          onClick={() => handleStatusToggle(user.id, user.is_active)}
                          className={`text-xs font-bold uppercase tracking-wider hover:underline ${
                            user.is_active ? 'text-danger' : 'text-success'
                          }`}
                        >
                          {user.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-display font-semibold text-ink">Pending & Past Invites</h2>
        <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                <th className="px-4 py-3 border-b border-border">Email</th>
                <th className="px-4 py-3 border-b border-border">Role</th>
                <th className="px-4 py-3 border-b border-border">Status</th>
                <th className="px-4 py-3 border-b border-border">Invited At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingInvites ? (
                <TableSkeleton rows={2} cols={4} />
              ) : !invites?.data || invites.data.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-12">
                    <EmptyState 
                      icon="✉️"
                      title="No invites sent"
                      message="You haven't invited anyone yet."
                    />
                  </td>
                </tr>
              ) : (
                invites.data.map((inv) => (
                  <tr key={inv.id} className="hover:bg-ink/5 transition-colors">
                    <td className="px-4 py-4">
                      <p className="font-medium text-ink">{inv.email}</p>
                      <p className="text-xs text-ink-muted">{inv.full_name}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-primary">
                      {inv.role}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        inv.status === 'PENDING' ? 'bg-warning-subtle text-warning' :
                        inv.status === 'ACCEPTED' ? 'bg-success-subtle text-success' :
                        'bg-danger-subtle text-danger'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-ink-muted">
                      {formatDate(inv.invited_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <InviteUserModal 
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={handleInvite}
        isSubmitting={inviteMutation.isLoading}
      />
    </div>
  );
}
