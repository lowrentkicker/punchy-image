import { useEffect, useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';

export function ErrorBanner() {
  const { state, dispatch } = useAppContext();
  const { error } = state;
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (!error) {
      setCountdown(null);
      return;
    }

    if (error.error_type === 'rate_limit' && error.retry_after) {
      setCountdown(error.retry_after);
    }

    // Auto-dismiss non-critical errors after 10 seconds
    if (!['auth', 'credits'].includes(error.error_type)) {
      const timer = setTimeout(() => {
        dispatch({ type: 'CLEAR_ERROR' });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => (c ?? 0) - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  if (!error) return null;

  const colorClasses = {
    auth: 'bg-error-hex/10 border-error-hex/30 text-[--color-error]',
    credits: 'bg-error-hex/10 border-error-hex/30 text-[--color-error]',
    rate_limit: 'bg-accent/10 border-accent/30 text-accent',
    content_policy: 'bg-accent/10 border-accent/30 text-accent',
    timeout: 'bg-info-hex/10 border-info-hex/30 text-[--color-info]',
    network: 'bg-info-hex/10 border-info-hex/30 text-[--color-info]',
    server: 'bg-error-hex/10 border-error-hex/30 text-[--color-error]',
  }[error.error_type];

  return (
    <div
      className={`${colorClasses} flex items-center justify-between border-b px-4 py-3`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{error.message}</span>
        {countdown !== null && countdown > 0 && (
          <span className="text-xs opacity-75">
            (retry in {countdown}s)
          </span>
        )}
        {error.error_type === 'auth' && (
          <button
            onClick={() => {
              dispatch({ type: 'CLEAR_ERROR' });
              dispatch({ type: 'SET_VIEW', view: 'settings' });
            }}
            className="text-sm font-semibold underline"
          >
            Go to Settings
          </button>
        )}
        {error.error_type === 'credits' && (
          <a
            href="https://openrouter.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold underline"
          >
            OpenRouter Dashboard
          </a>
        )}
      </div>
      <button
        onClick={() => dispatch({ type: 'CLEAR_ERROR' })}
        className="ml-4 text-lg font-bold opacity-60 hover:opacity-100"
        aria-label="Dismiss error"
      >
        x
      </button>
    </div>
  );
}
