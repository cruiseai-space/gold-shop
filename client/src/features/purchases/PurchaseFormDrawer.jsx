// client/src/features/purchases/PurchaseFormDrawer.jsx
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { computeGoldPurchase } from '../../utils/goldCalc.js';
import { formatCurrency, formatWeight } from '../../utils/formatters.js';

const purchaseSchema = z.object({
  purchaseDate: z.string().min(1, 'Date is required'),
  sellerName: z.string().min(1, 'Seller name is required'),
  cashSource: z.string().optional(),
  grossWeight: z.coerce.number().positive('Must be positive'),
  touchPercent: z.coerce.number().gt(0).lte(100, 'Max 100%'),
  marketRate: z.coerce.number().positive('Must be positive'),
  bookedRate: z.coerce.number().optional(),
  cashGiven: z.coerce.number().min(0, 'Cannot be negative'),
  notes: z.string().optional(),
});

export function PurchaseFormDrawer({ isOpen, onClose, onSubmit, initialData = null, isSubmitting = false }) {
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm({
    resolver: zodResolver(purchaseSchema),
    defaultValues: initialData || {
      purchaseDate: new Date().toISOString().split('T')[0],
      grossWeight: '',
      touchPercent: '',
      marketRate: '',
      cashGiven: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        purchaseDate: new Date().toISOString().split('T')[0],
        grossWeight: '',
        touchPercent: '',
        marketRate: '',
        cashGiven: 0,
      });
    }
  }, [isOpen, initialData, reset]);

  const watchedFields = watch(['grossWeight', 'touchPercent', 'marketRate', 'cashGiven']);
  
  const calculations = useMemo(() => {
    const [gw, tp, mr, cg] = watchedFields;
    if (gw > 0 && tp > 0 && mr > 0) {
      try {
        return computeGoldPurchase({
          grossWeight: gw,
          touchPercent: tp,
          marketRate: mr,
          cashGiven: cg || 0
        });
      } catch (e) {
        return null;
      }
    }
    return null;
  }, [watchedFields]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] overflow-hidden">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="absolute inset-y-0 right-0 max-w-lg w-full bg-surface shadow-lg transform transition-transform duration-300 ease-drawer">
        <div className="h-full flex flex-col p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl text-primary">{initialData ? 'Edit Purchase' : 'Add New Purchase'}</h2>
            <button onClick={onClose} className="text-ink-muted hover:text-ink">✕</button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Date</label>
                <input type="date" {...register('purchaseDate')} className="input" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Seller Name</label>
                <input {...register('sellerName')} className="input" placeholder="Muthu" />
                {errors.sellerName && <p className="text-xs text-danger mt-1">{errors.sellerName.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Cash Source</label>
              <input {...register('cashSource')} className="input" placeholder="Safe / Bank" />
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold uppercase text-ink-muted mb-4">Gold Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Gross Weight (g)</label>
                  <input type="number" step="0.0001" {...register('grossWeight')} className="input font-mono" placeholder="0.0000" />
                  {errors.grossWeight && <p className="text-xs text-danger mt-1">{errors.grossWeight.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Touch (%)</label>
                  <input type="number" step="0.01" {...register('touchPercent')} className="input font-mono" placeholder="0.00" />
                  {errors.touchPercent && <p className="text-xs text-danger mt-1">{errors.touchPercent.message}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-semibold uppercase text-ink-muted mb-4">Rates & Payment</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Market Rate (₹/g)</label>
                  <input type="number" step="1" {...register('marketRate')} className="input font-mono" placeholder="0" />
                  {errors.marketRate && <p className="text-xs text-danger mt-1">{errors.marketRate.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1">Cash Given (₹)</label>
                  <input type="number" step="1" {...register('cashGiven')} className="input font-mono" />
                  {errors.cashGiven && <p className="text-xs text-danger mt-1">{errors.cashGiven.message}</p>}
                </div>
              </div>
            </div>

            {calculations && (
              <div className="p-4 bg-primary-subtle border border-primary/20 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Pure Weight:</span>
                  <span className="font-mono font-medium">{formatWeight(calculations.pureWeight)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Pure Value:</span>
                  <span className="font-mono font-medium">{formatCurrency(calculations.pureValue)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-primary/10">
                  <span className="font-display font-semibold">Pending:</span>
                  <span className={`font-mono font-bold ${calculations.pendingAmount.gt(0) ? 'text-success' : calculations.pendingAmount.lt(0) ? 'text-danger' : 'text-ink-muted'}`}>
                    {formatCurrency(calculations.pendingAmount)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase text-ink-muted mb-1">Notes</label>
              <textarea {...register('notes')} className="input min-h-[80px]" />
            </div>

            <div className="pt-6 flex gap-3">
              <button type="button" onClick={onClose} className="btn border border-border flex-1">Cancel</button>
              <button type="submit" disabled={isSubmitting} className="btn btn-primary flex-1">
                {isSubmitting ? 'Saving...' : initialData ? 'Update Entry' : 'Save Entry'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
