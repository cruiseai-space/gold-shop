// client/src/features/rates/RatesPanel.jsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRates, useTodayRate, useCreateRate } from './useRates.js';
import { formatCurrency, formatDate } from '../../utils/formatters.js';
import { useAuth } from '../auth/AuthProvider.jsx';
import { ROLES } from '../../constants/roles.js';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';

const rateSchema = z.object({
  marketRate: z.coerce.number().positive('Must be positive'),
  bookedRate: z.coerce.number().optional(),
  effectiveDate: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

export function RatesPanel() {
  const { user } = useAuth();
  const [filters] = useState({ page: 1 });
  const { data: rates, isLoading: isListLoading } = useRates(filters);
  const { data: todayRate } = useTodayRate();
  const createMutation = useCreateRate();

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(rateSchema),
    defaultValues: {
      marketRate: '',
      bookedRate: '',
      effectiveDate: new Date().toISOString().split('T')[0],
    }
  });

  const onSubmit = async (data) => {
    try {
      await createMutation.mutateAsync(data);
      reset();
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left: Set Rate Form */}
      <div className="lg:col-span-1 space-y-6">
        <h2 className="text-2xl text-primary font-display font-bold">Set Daily Rate</h2>
        
        <div className="bg-surface p-6 rounded-lg border border-border shadow-sm">
          {![ROLES.OWNER, ROLES.STAFF].includes(user?.role) ? (
            <p className="text-ink-muted italic text-sm">Only Owner and Staff can set rates.</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Market Rate (₹/g)</label>
                <input type="number" step="1" {...register('marketRate')} className="input font-mono" />
                {errors.marketRate && <p className="text-xs text-danger mt-1">{errors.marketRate.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Booked Rate (₹/g)</label>
                <input type="number" step="1" {...register('bookedRate')} className="input font-mono" placeholder="Optional" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Effective Date</label>
                <input type="date" {...register('effectiveDate')} className="input" />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Notes</label>
                <textarea {...register('notes')} className="input min-h-[60px]" />
              </div>

              <button 
                type="submit" 
                disabled={createMutation.isLoading}
                className="btn btn-primary w-full"
              >
                {createMutation.isLoading ? <Spinner inline size="sm" variant="gold" message="Setting rate..." /> : 'Save Daily Rate'}
              </button>
            </form>
          )}
        </div>

        {todayRate?.data && (
          <div className="bg-gold-subtle p-6 rounded-lg border border-gold/20">
            <h3 className="text-xs font-bold uppercase text-ink-muted mb-2 tracking-widest">Active Rate</h3>
            <p className="text-3xl font-mono font-bold text-ink">{formatCurrency(todayRate.data.market_rate)}</p>
            <p className="text-xs text-ink-muted mt-2">Effective: {formatDate(todayRate.data.effective_date)}</p>
          </div>
        )}
      </div>

      {/* Right: History Table */}
      <div className="lg:col-span-2 space-y-6">
        <h2 className="text-2xl text-primary font-display font-bold">Rate History</h2>
        
        <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                <th className="px-4 py-3 border-b border-border">Date</th>
                <th className="px-4 py-3 border-b border-border text-right">Market Rate</th>
                <th className="px-4 py-3 border-b border-border text-right">Booked</th>
                <th className="px-4 py-3 border-b border-border">Set By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isListLoading ? (
                <TableSkeleton rows={8} cols={4} />
              ) : rates?.data?.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-12">
                    <EmptyState 
                      icon="📈"
                      title="No rate history"
                      message="Historical gold rates will appear here as you set them daily."
                    />
                  </td>
                </tr>
              ) : (
                rates?.data?.map((r) => (
                  <tr key={r.id} className="hover:bg-primary-subtle/10 transition-colors">
                    <td className="px-4 py-4 text-sm font-mono">{formatDate(r.effective_date)}</td>
                    <td className="px-4 py-4 text-sm font-mono text-right font-bold">{formatCurrency(r.market_rate)}</td>
                    <td className="px-4 py-4 text-sm font-mono text-right">{r.booked_rate ? formatCurrency(r.booked_rate) : '—'}</td>
                    <td className="px-4 py-4 text-sm text-ink-muted">{r.setter?.full_name || 'System'}</td>
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
