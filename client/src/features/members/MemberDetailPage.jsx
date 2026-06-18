import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMember } from './useMembers';
import { useMemberStats } from '../dashboard/useDashboard';
import { usePurchases } from '../purchases/usePurchases';
import { formatCurrency, formatWeight, formatPercent, formatDate } from '../../utils/formatters';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { DateRangePicker } from '../../components/ui/DateRangePicker';

export function MemberDetailPage() {
  const { id } = useParams();
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  const { data: memberRes, isLoading: isLoadingMember } = useMember(id);
  const member = memberRes?.data;

  const { data: stats, isLoading: isLoadingStats } = useMemberStats(id, dateRange);

  const { data: purchasesRes, isLoading: isLoadingPurchases } = usePurchases({
    memberId: id,
    page: 1,
    limit: 100, // Just loading 100 for simplicity or we can add pagination
    ...dateRange
  });

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  if (isLoadingMember) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-surface-2 animate-pulse rounded w-1/3"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-24 bg-surface-2 animate-pulse rounded"></div>
          <div className="h-24 bg-surface-2 animate-pulse rounded"></div>
          <div className="h-24 bg-surface-2 animate-pulse rounded"></div>
          <div className="h-24 bg-surface-2 animate-pulse rounded"></div>
        </div>
        <div className="bg-surface rounded-lg border border-border shadow-sm">
          <div className="p-4 border-b border-border bg-surface-2 animate-pulse h-16"></div>
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-border">
                <TableSkeleton rows={5} cols={6} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <EmptyState 
        icon="👤"
        title="Member not found"
        message="The member you are looking for does not exist or has been removed."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link to="/members" className="text-ink-muted hover:text-primary transition-colors text-sm font-semibold">
              ← Back to Members
            </Link>
          </div>
          <h1 className="text-3xl text-primary font-serif">{member.name}</h1>
          <div className="flex items-center gap-4 text-sm text-ink-muted mt-2">
            <span>📞 {member.phone || 'No phone'}</span>
            {member.address && <span>📍 {member.address}</span>}
          </div>
          {member.notes && (
            <p className="text-sm text-ink-muted mt-2 max-w-2xl bg-surface-2 p-3 rounded border border-border">
              {member.notes}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <DateRangePicker 
            startDate={dateRange.startDate} 
            endDate={dateRange.endDate} 
            onChange={handleDateChange} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Member P&L" 
          value={stats?.totalPL !== undefined ? formatCurrency(stats.totalPL) : '-'} 
          isLoading={isLoadingStats}
          valueClass={parseFloat(stats?.totalPL || 0) >= 0 ? 'text-success' : 'text-danger'}
        />
        <StatCard 
          title="Gold In (Buy)" 
          value={stats?.totalGoldIn !== undefined ? formatWeight(stats.totalGoldIn) : '-'} 
          isLoading={isLoadingStats}
        />
        <StatCard 
          title="Gold Out (Sell)" 
          value={stats?.totalGoldOut !== undefined ? formatWeight(stats.totalGoldOut) : '-'} 
          isLoading={isLoadingStats}
        />
        <StatCard 
          title="Transactions" 
          value={stats?.transactionCount ?? '-'} 
          isLoading={isLoadingStats}
        />
      </div>

      <div className="bg-surface rounded-lg border border-border shadow-sm">
        <div className="p-4 border-b border-border bg-surface-2">
          <h2 className="text-lg font-semibold text-ink">Member Transactions</h2>
        </div>
        
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                <th className="px-4 py-3 border-b border-border">Date</th>
                <th className="px-4 py-3 border-b border-border">Type</th>
                <th className="px-4 py-3 border-b border-border text-right">Gross Wt</th>
                <th className="px-4 py-3 border-b border-border text-right">Touch%</th>
                <th className="px-4 py-3 border-b border-border text-right">Pure Wt</th>
                <th className="px-4 py-3 border-b border-border text-right">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingPurchases ? (
                <TableSkeleton rows={5} cols={6} />
              ) : purchasesRes?.data?.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-8">
                    <EmptyState 
                      icon="📊"
                      title="No transactions"
                      message="No transactions found for this member."
                    />
                  </td>
                </tr>
              ) : (
                purchasesRes?.data?.map((p) => (
                  <tr key={p.id} className="hover:bg-primary-subtle/20 transition-colors">
                    <td className="px-4 py-4 text-sm font-mono whitespace-nowrap">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-4">
                      {p.transaction_type === 'SELLING' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                          ↑ SELLING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success-subtle text-success rounded text-xs font-bold">
                          ↓ BUYING
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap">{formatWeight(p.gross_weight)}</td>
                    <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap">{formatPercent(p.touch_percent)}</td>
                    <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap font-semibold">{formatWeight(p.pure_weight)}</td>
                    <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        parseFloat(p.pending_amount) > 0 ? (p.transaction_type === 'SELLING' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success') : 
                        parseFloat(p.pending_amount) < 0 ? (p.transaction_type === 'SELLING' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger') : 
                        'bg-ink-muted/10 text-ink-muted'
                      }`}>
                        {formatCurrency(p.pending_amount)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, isLoading, valueClass = 'text-ink' }) {
  return (
    <div className="bg-surface rounded-lg border border-border p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-ink-muted uppercase tracking-wider mb-2">{title}</h3>
      {isLoading ? (
        <div className="h-8 bg-surface-2 animate-pulse rounded w-1/2"></div>
      ) : (
        <div className={`text-2xl font-mono font-bold ${valueClass}`}>
          {value}
        </div>
      )}
    </div>
  );
}
