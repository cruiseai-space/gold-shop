import { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePurchases, useCreatePurchase, useUpdatePurchase, useDeletePurchase } from './usePurchases.js';
import { formatCurrency, formatWeight, formatPercent, formatDate } from '../../utils/formatters.js';
import { PurchaseFormDrawer } from './PurchaseFormDrawer.jsx';
import { useAuth } from '../auth/AuthProvider.jsx';
import { useMembers } from '../members/useMembers.js';
import { ROLES } from '../../constants/roles.js';
import { TableSkeleton } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { useRef, useEffect } from 'react';

function AutocompleteFilter({ members, value, onChange }) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Sync initial value name
  useEffect(() => {
    if (!value) setSearch('');
    else {
      const m = members?.find(x => x.id === value);
      if (m) setSearch(m.name);
    }
  }, [value, members]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const filteredMembers = members?.filter(m => 
    m.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    (m.phone && m.phone.includes(debouncedSearch))
  );

  const handleGo = () => {
    // If the user typed a name exactly or we can guess the best match
    if (!search) {
      onChange('');
      return;
    }
    const exact = members?.find(m => m.name.toLowerCase() === search.toLowerCase());
    if (exact) {
      onChange(exact.id);
      setIsOpen(false);
    } else if (filteredMembers?.length > 0) {
      // Pick first match
      onChange(filteredMembers[0].id);
      setSearch(filteredMembers[0].name);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative flex gap-2 w-full sm:w-auto" ref={wrapperRef}>
      <div className="relative flex-1 sm:flex-none">
        <input
          type="text"
          className="input w-full sm:w-64 border-2 border-primary/20 bg-surface-2 shadow-inner focus:border-primary focus:bg-surface"
          placeholder="Search member..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            if (e.target.value === '') onChange('');
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleGo(); }}
        />
        {isOpen && search && (
          <div className="absolute z-50 w-full mt-1 bg-surface border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {filteredMembers?.length === 0 ? (
              <div className="p-3 text-sm text-ink-muted">No members found</div>
            ) : (
              filteredMembers?.map(m => (
                <div
                  key={m.id}
                  className="px-3 py-2 cursor-pointer hover:bg-surface-2 transition-colors border-b border-border last:border-0"
                  onClick={() => {
                    setSearch(m.name);
                    onChange(m.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium text-ink text-sm">{m.name}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      <button onClick={handleGo} className="btn bg-primary text-primary-text px-3">
        Go
      </button>
    </div>
  );
}

export function PurchasesPage() {
  const { user } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState(null);
  const [filters, setFilters] = useState({ page: 1, memberId: '', transactionType: '' });
  const [showColPicker, setShowColPicker] = useState(false);

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('purchases_columns');
    if (saved) return JSON.parse(saved);
    return ['date', 'type', 'member', 'grossWeight', 'touchPercent', 'pureWeight', 'pending', 'actions'];
  });

  const toggleColumn = (colId) => {
    const next = visibleColumns.includes(colId) 
      ? visibleColumns.filter(c => c !== colId)
      : [...visibleColumns, colId];
    setVisibleColumns(next);
    localStorage.setItem('purchases_columns', JSON.stringify(next));
  };

  const COLUMNS = [
    { id: 'date', label: 'Date' },
    { id: 'type', label: 'Type' },
    { id: 'member', label: 'Member' },
    { id: 'grossWeight', label: 'Gross Wt' },
    { id: 'touchPercent', label: 'Touch%' },
    { id: 'pureWeight', label: 'Pure Wt' },
    { id: 'pending', label: 'Pending' },
    { id: 'actions', label: 'Actions' },
  ];

  const { data: membersData } = useMembers({ page: 1, limit: 1000 });
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
      memberId: purchase.member_id,
      transactionType: purchase.transaction_type || 'BUYING',
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

      <div className="bg-surface rounded-lg border border-border shadow-sm">
        <div className="p-4 border-b border-border bg-surface-2 rounded-t-lg flex flex-col sm:flex-row gap-4 justify-between relative z-20">
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <AutocompleteFilter 
              members={membersData?.data || []}
              value={filters.memberId}
              onChange={(id) => setFilters(f => ({ ...f, memberId: id, page: 1 }))}
            />
            <select
              className="input max-w-xs"
              value={filters.transactionType}
              onChange={(e) => setFilters(f => ({ ...f, transactionType: e.target.value, page: 1 }))}
            >
              <option value="">All Transactions</option>
              <option value="BUYING">Buyers Only</option>
              <option value="SELLING">Sellers Only</option>
            </select>
          </div>

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
                {visibleColumns.includes('date') && <th className="px-4 py-3 border-b border-border">Date</th>}
                {visibleColumns.includes('type') && <th className="px-4 py-3 border-b border-border">Type</th>}
                {visibleColumns.includes('member') && <th className="px-4 py-3 border-b border-border">Member</th>}
                {visibleColumns.includes('grossWeight') && <th className="px-4 py-3 border-b border-border text-right">Gross Wt</th>}
                {visibleColumns.includes('touchPercent') && <th className="px-4 py-3 border-b border-border text-right">Touch%</th>}
                {visibleColumns.includes('pureWeight') && <th className="px-4 py-3 border-b border-border text-right">Pure Wt</th>}
                {visibleColumns.includes('pending') && <th className="px-4 py-3 border-b border-border text-right">Pending</th>}
                {visibleColumns.includes('actions') && <th className="px-4 py-3 border-b border-border text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <TableSkeleton rows={8} cols={visibleColumns.length} />
              ) : data?.data?.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-12">
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
                    {visibleColumns.includes('date') && <td className="px-4 py-4 text-sm font-mono whitespace-nowrap">{formatDate(p.purchase_date)}</td>}
                    {visibleColumns.includes('type') && <td className="px-4 py-4">
                      {p.transaction_type === 'SELLING' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">
                          ↑ SELLING
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-success-subtle text-success rounded text-xs font-bold">
                          ↓ BUYING
                        </span>
                      )}
                    </td>}
                    {visibleColumns.includes('member') && <td className="px-4 py-4 font-medium text-ink">
                      {p.member ? (
                        <Link to={`/members/${p.member_id}`} className="text-primary hover:underline">
                          {p.member.name}
                        </Link>
                      ) : '-'}
                    </td>}
                    {visibleColumns.includes('grossWeight') && <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap">{formatWeight(p.gross_weight)}</td>}
                    {visibleColumns.includes('touchPercent') && <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap">{formatPercent(p.touch_percent)}</td>}
                    {visibleColumns.includes('pureWeight') && <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap font-semibold">{formatWeight(p.pure_weight)}</td>}
                    {visibleColumns.includes('pending') && <td className="px-4 py-4 text-sm font-mono text-right whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        parseFloat(p.pending_amount) > 0 ? (p.transaction_type === 'SELLING' ? 'bg-danger-subtle text-danger' : 'bg-success-subtle text-success') : 
                        parseFloat(p.pending_amount) < 0 ? (p.transaction_type === 'SELLING' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger') : 
                        'bg-ink-muted/10 text-ink-muted'
                      }`}>
                        {formatCurrency(p.pending_amount)}
                      </span>
                    </td>}
                    {visibleColumns.includes('actions') && <td className="px-4 py-4 text-right space-x-2">
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
