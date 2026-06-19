// client/src/features/logs/LogsPage.jsx
import { useState } from 'react';
import { useLogs } from './useLogs.js';

import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

export function LogsPage() {
  const [filters, setFilters] = useState({ page: 1 });
  const { data, isLoading } = useLogs(filters);

  const getActionBadge = (action) => {
    const base = "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider";
    switch (action) {
      case 'CREATE_PURCHASE': return `${base} bg-success-subtle text-success`;
      case 'UPDATE_PURCHASE': return `${base} bg-warning-subtle text-warning`;
      case 'DELETE_PURCHASE': return `${base} bg-danger-subtle text-danger`;
      case 'LOGIN': return `${base} bg-primary-subtle text-primary`;
      case 'CREATE_RATE': return `${base} bg-gold-subtle text-ink`;
      default: return `${base} bg-ink/10 text-ink-muted`;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl text-primary">Audit Logs</h1>

      <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                <th className="px-4 py-3 border-b border-border">Timestamp</th>
                <th className="px-4 py-3 border-b border-border">User</th>
                <th className="px-4 py-3 border-b border-border">Action</th>
                <th className="px-4 py-3 border-b border-border">Entity</th>
                <th className="px-4 py-3 border-b border-border">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton rows={10} cols={5} />
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12">
                    <EmptyState 
                      icon="📜"
                      title="Audit trail is empty"
                      message="All system actions will be logged here automatically."
                    />
                  </td>
                </tr>
              ) : (
                data?.data?.map((log) => (
                  <tr key={log.id} className="hover:bg-ink/5 transition-colors group cursor-pointer">
                    <td className="px-4 py-4 text-xs font-mono text-ink-muted whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-ink">
                      {log.user_name || 'System'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={getActionBadge(log.action_type)}>
                        {log.action_type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-ink-muted truncate max-w-[200px]">
                      {log.entity_type ? `${log.entity_type}:${log.entity_id?.split('-')[0]}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-ink-muted">
                      {log.ip_address || '—'}
                    </td>
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
    </div>
  );
}
