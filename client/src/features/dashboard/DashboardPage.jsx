import { useState } from 'react';
import { useDashboardStats } from './useDashboard';
import { usePurchases } from '../purchases/usePurchases';
import { formatCurrency, formatWeight, formatDate } from '../../utils/formatters';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { DateRangePicker } from '../../components/ui/DateRangePicker';

export function DashboardPage() {
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  
  const { data: stats, isLoading: isLoadingStats } = useDashboardStats(dateRange);
  const { data: purchasesData, isLoading: isLoadingPurchases } = usePurchases({
    page: 1,
    limit: 5,
    ...dateRange
  });

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl text-primary font-serif">Dashboard</h1>
        
        <DateRangePicker 
          startDate={dateRange.startDate} 
          endDate={dateRange.endDate} 
          onChange={handleDateChange} 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total P&L" 
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
          title="Net Gold Position" 
          value={stats?.netGoldPosition !== undefined ? formatWeight(stats.netGoldPosition) : '-'} 
          isLoading={isLoadingStats}
          valueClass={parseFloat(stats?.netGoldPosition || 0) >= 0 ? 'text-success' : 'text-danger'}
        />
      </div>

      <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-2">
          <h2 className="text-lg font-semibold text-ink">Recent Transactions</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                <th className="px-4 py-3 border-b border-border">Date</th>
                <th className="px-4 py-3 border-b border-border">Type</th>
                <th className="px-4 py-3 border-b border-border">Member</th>
                <th className="px-4 py-3 border-b border-border text-right">Pure Wt</th>
                <th className="px-4 py-3 border-b border-border text-right">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoadingPurchases ? (
                <TableSkeleton rows={5} cols={5} />
              ) : purchasesData?.data?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8">
                    <EmptyState 
                      icon="📊"
                      title="No recent transactions"
                      message="No transactions found for the selected period."
                    />
                  </td>
                </tr>
              ) : (
                purchasesData?.data?.map((p) => (
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
                    <td className="px-4 py-4 font-medium text-ink">{p.member?.name || '-'}</td>
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
