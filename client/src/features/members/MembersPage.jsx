import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMembers, useCreateMember, useUpdateMember } from './useMembers.js';
import { MemberFormDrawer } from './MemberFormDrawer.jsx';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { ROLES } from '../../constants/roles.js';

export function MembersPage() {
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [filters, setFilters] = useState({ page: 1, search: '' });
  const [showColPicker, setShowColPicker] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('members_columns');
    if (saved) return JSON.parse(saved);
    return ['name', 'phone', 'notes', 'txCount', 'actions'];
  });

  const toggleColumn = (colId) => {
    const next = visibleColumns.includes(colId) 
      ? visibleColumns.filter(c => c !== colId)
      : [...visibleColumns, colId];
    setVisibleColumns(next);
    localStorage.setItem('members_columns', JSON.stringify(next));
  };

  const COLUMNS = [
    { id: 'name', label: 'Name' },
    { id: 'phone', label: 'Phone' },
    { id: 'notes', label: 'Notes' },
    { id: 'txCount', label: 'Tx Count' },
    { id: 'actions', label: 'Actions' },
  ];

  const { data, isLoading } = useMembers(filters);
  const createMutation = useCreateMember();
  const updateMutation = useUpdateMember();

  const handleAdd = () => {
    setEditingMember(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setIsDrawerOpen(true);
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingMember) {
        await updateMutation.mutateAsync({ id: editingMember.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsDrawerOpen(false);
    } catch (e) {
      // Error is handled by mutation callbacks
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl text-primary">Members</h1>
        {[ROLES.OWNER, ROLES.STAFF].includes(user?.role) && (
          <button onClick={handleAdd} className="btn btn-primary">
            + Add Member
          </button>
        )}
      </div>

      <div className="bg-surface rounded-lg border border-border shadow-sm">
        <div className="p-4 border-b border-border bg-surface-2 rounded-t-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-20">
          <input 
            type="text" 
            placeholder="Search name or phone..." 
            className="input w-full sm:w-64 border-2 border-primary/20 bg-surface-2 shadow-inner focus:border-primary focus:bg-surface"
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))}
          />
          <div className="relative w-full sm:w-auto">
            <button 
              className="btn bg-surface border border-border w-full sm:w-auto"
              onClick={() => setShowColPicker(!showColPicker)}
            >
              Columns
            </button>
            {showColPicker && (
              <div className="absolute right-0 mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg z-10 p-2 max-h-60 overflow-y-auto">
                {COLUMNS.map(col => (
                  <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-surface-2 rounded cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-border text-primary focus:ring-primary"
                      checked={visibleColumns.includes(col.id)}
                      onChange={() => toggleColumn(col.id)}
                    />
                    <span className="text-sm">{col.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                {visibleColumns.includes('name') && <th className="px-4 py-3 border-b border-border">Name</th>}
                {visibleColumns.includes('phone') && <th className="px-4 py-3 border-b border-border">Phone</th>}
                {visibleColumns.includes('notes') && <th className="px-4 py-3 border-b border-border">Notes</th>}
                {visibleColumns.includes('txCount') && <th className="px-4 py-3 border-b border-border text-center">Tx Count</th>}
                {visibleColumns.includes('actions') && <th className="px-4 py-3 border-b border-border text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton rows={5} cols={5} />
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-12">
                    <EmptyState 
                      icon="👥"
                      title="No members found"
                      message="Add members to start tracking their transactions."
                    />
                  </td>
                </tr>
              ) : (
                data?.data?.map((m) => (
                  <tr key={m.id} className="hover:bg-primary-subtle/20 transition-colors">
                    {visibleColumns.includes('name') && <td className="px-4 py-4 font-medium">
                      <Link to={`/members/${m.id}`} className="text-primary hover:underline">
                        {m.name}
                      </Link>
                    </td>}
                    {visibleColumns.includes('phone') && <td className="px-4 py-4 text-sm font-mono whitespace-nowrap">{m.phone || '-'}</td>}
                    {visibleColumns.includes('notes') && <td className="px-4 py-4 text-sm text-ink-muted max-w-xs truncate" title={m.notes}>{m.notes || '-'}</td>}
                    {visibleColumns.includes('txCount') && <td className="px-4 py-4 text-sm font-mono text-center">
                      <span className="bg-surface-2 px-2 py-1 rounded text-ink-muted">
                        {m.transaction_count || 0}
                      </span>
                    </td>}
                    {visibleColumns.includes('actions') && <td className="px-4 py-4 text-right">
                      <button 
                        onClick={() => handleEdit(m)}
                        className="text-ink-muted hover:text-primary transition-colors"
                        title="Edit"
                      >
                        ✎
                      </button>
                    </td>}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {data?.meta?.pages > 1 && (
          <div className="p-4 border-t border-border flex justify-between items-center bg-surface-2">
            <button 
              disabled={filters.page === 1}
              onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
              className="btn border border-border disabled:opacity-30"
            >
              Previous
            </button>
            <span className="text-xs text-ink-muted uppercase font-semibold">
              Page {filters.page} of {data.meta.pages}
            </span>
            <button 
              disabled={filters.page === data.meta.pages}
              onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
              className="btn border border-border disabled:opacity-30"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <MemberFormDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingMember}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );
}
