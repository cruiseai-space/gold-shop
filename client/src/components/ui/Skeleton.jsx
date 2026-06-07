/**
 * Reusable skeleton component for loading states.
 */
export function Skeleton({ className = '', variant = 'rect' }) {
  const baseClass = "animate-pulse bg-ink/5";
  const variantClasses = {
    rect: "rounded-md",
    circle: "rounded-full",
    text: "rounded h-4 w-full",
  };

  return (
    <div className={`${baseClass} ${variantClasses[variant]} ${className}`} />
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <>
      {[...Array(rows)].map((_, i) => (
        <tr key={i} className="border-b border-border/50">
          {[...Array(cols)].map((_, j) => (
            <td key={j} className="px-4 py-4">
              <Skeleton variant="text" className={j === 0 ? "w-24" : "w-16 ml-auto"} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
