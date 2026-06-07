// client/src/features/purchases/PurchasesPage.jsx
import { useState } from 'react';
import { usePurchases, useCreatePurchase, useUpdatePurchase, useDeletePurchase } from './usePurchases.js';
import { formatCurrency, formatWeight, formatPercent, formatDate } from '../../utils/formatters.js';
import { PurchaseFormDrawer } from './PurchaseFormDrawer.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { ROLES } from '../../constants/roles.js';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';

export function PurchasesPage() {
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [filters, setFilters] = useState({ page: 1, seller: '' });

  const { data, isLoading } = usePurchases(filters);
  const createMutation = useCreatePurchase();
  const updateMutation = useUpdatePurchase();
  const deleteMutation = useDeletePurchase();

  const handleAdd = () => {
    setEditingPurchase(null);
    setIsDrawerOpen(true);
  };

  const handleEdit = (purchase) => {
    setEditingPurchase({
      ...purchase,
      purchaseDate: purchase.purchase_date,
      grossWeight: purchase.gross_weight,
      touchPercent: purchase.touch_percent,
      marketRate: purchase.market_rate,
      cashGiven: purchase.cash_given,
    });
    setIsDrawerOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this purchase?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (e) {
        // Error handled by mutation toast
      }
    }
  };

  const handleSubmit = async (formData) => {
    try {
      if (editingPurchase) {
        await updateMutation.mutateAsync({ id: editingPurchase.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      setIsDrawerOpen(false);
    } catch (e) {
      // Error handled by mutation toast
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl text-primary">Gold Purchases</h1>
        {[ROLES.OWNER, ROLES.STAFF].includes(user?.role) && (
          <button onClick={handleAdd} className="btn btn-primary">
            + Add Entry
          </button>
        )}
      </div>

      <div className="bg-surface rounded-lg border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-surface-2 flex gap-4">
          <input 
            type="text" 
            placeholder="Search seller..." 
            className="input max-w-xs"
            value={filters.seller}
            onChange={(e) => setFilters(f => ({ ...f, seller: e.target.value, page: 1 }))}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2 text-xs font-semibold uppercase text-ink-muted">
                <th className="px-4 py-3 border-b border-border">Date</th>
                <th className="px-4 py-3 border-b border-border">Seller</th>
                <th className="px-4 py-3 border-b border-border text-right">Gross Wt</th>
                <th className="px-4 py-3 border-b border-border text-right">Touch%</th>
                <th className="px-4 py-3 border-b border-border text-right">Pure Wt</th>
                <th className="px-4 py-3 border-b border-border text-right">Pending</th>
                <th className="px-4 py-3 border-b border-border text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton rows={8} cols={7} />
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12">
                    <EmptyState 
                      icon="⚖️"
                      title="No purchases recorded"
                      message="Start by recording your first gold purchase entry using the button above."
                    />
                  </td>
                </tr>
              ) : (
                data?.data?.map((p) => (
                  <tr key={p.id} className="hover:bg-primary-subtle/20 transition-colors">
                    <td className="px-4 py-4 text-sm font-mono whitespace-nowrap">{formatDate(p.purchase_date)}</td>
                    <td className="px-4 py-4 font-medium text-ink">{p.seller_name}</td>
                    <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap">{formatWeight(p.gross_weight)}</td>
                    <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap">{formatPercent(p.touch_percent)}</td>
                    <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap font-semibold">{formatWeight(p.pure_weight)}</td>
                    <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        parseFloat(p.pending_amount) > 0 ? 'bg-success-subtle text-success' : 
                        parseFloat(p.pending_amount) < 0 ? 'bg-danger-subtle text-danger' : 
                        'bg-ink-muted/10 text-ink-muted'
                      }`}>
                        {formatCurrency(p.pending_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleEdit(p)}
                        className="text-ink-muted hover:text-primary transition-colors"
                        title="Edit"
                      >
                        ✎
                      </button>
                      {user?.role === ROLES.OWNER && (
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="text-ink-muted hover:text-danger transition-colors"
                          title="Delete"
                        >
                          🗑
                        </button>
                      )}
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

      <PurchaseFormDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingPurchase}
        isSubmitting={createMutation.isLoading || updateMutation.isLoading}
      />
    </div>
  );
}
