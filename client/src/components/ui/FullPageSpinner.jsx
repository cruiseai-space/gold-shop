import { Spinner } from './Spinner';

export function FullPageSpinner({ variant = 'gold', message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg/80 backdrop-blur-sm">
      <Spinner size="xl" variant={variant} />
      {message && (
        <p className="mt-4 text-lg font-medium text-ink font-display">
          {message}
        </p>
      )}
    </div>
  );
}
