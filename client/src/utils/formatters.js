// client/src/utils/formatters.js

/**
 * Format number as Indian Rupee (INR)
 */
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
};

/**
 * Format weight in grams (4 decimal places)
 */
export const formatWeight = (weight) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(weight || 0) + ' g';
};

/**
 * Format percentage (2-4 decimal places)
 */
export const formatPercent = (percent) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(percent || 0) + ' %';
};

/**
 * Format date to readable string (IST)
 */
export const formatDate = (dateString) => {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  });
};
