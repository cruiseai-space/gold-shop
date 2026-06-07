/**
 * Reusable empty state component with a "Modern Ledger" aesthetic.
 */
export function EmptyState({ icon = '📋', title, message, children }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-surface/30 rounded-xl border-2 border-dashed border-border/50">
      <div className="text-5xl mb-4 grayscale opacity-40">{icon}</div>
      <h3 className="text-xl font-display font-semibold text-ink mb-2">{title}</h3>
      <p className="text-ink-muted text-sm max-w-xs mb-6 italic">{message}</p>
      {children}
    </div>
  );
}
