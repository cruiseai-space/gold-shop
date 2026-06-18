import React from 'react';

/**
 * Reusable skeleton component for loading states.
 */
export function Skeleton({ className = '', variant = 'rect' }) {
  // Using shimmer animation instead of pulse
  const baseClass = "bg-ink/5 relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-shimmer before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent";
  const variantClasses = {
    rect: "rounded-md",
    circle: "rounded-full",
    text: "rounded h-4 w-full",
  };

  return (
    <div className={`${baseClass} ${variantClasses[variant] || variantClasses.rect} ${className}`} />
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

export function CardSkeleton() {
  return (
    <div className="p-4 bg-surface border border-border rounded-lg shadow-sm">
      <Skeleton className="h-6 w-1/3 mb-4" />
      <Skeleton className="h-10 w-full mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    </div>
  );
}
