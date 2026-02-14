import { useAppContext } from '../../hooks/useAppContext';

export function FallbackSuggestionModal() {
  const { state, dispatch } = useAppContext();
  const { fallbackSuggestion } = state;

  if (!fallbackSuggestion) return null;

  const handleAccept = () => {
    dispatch({ type: 'SELECT_MODEL', modelId: fallbackSuggestion.suggested_model_id });
    dispatch({ type: 'SET_FALLBACK_SUGGESTION', suggestion: null });
  };

  const handleDismiss = () => {
    dispatch({ type: 'SET_FALLBACK_SUGGESTION', suggestion: null });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-[--border-default] bg-surface-2 p-6 shadow-2xl shadow-black/40">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
            <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[--text-primary]">Model Unavailable</h3>
            <p className="text-xs text-[--text-tertiary]">{fallbackSuggestion.reason}</p>
          </div>
        </div>

        <p className="mb-5 text-sm text-[--text-secondary]">
          Would you like to try{' '}
          <span className="font-medium text-[--accent]">{fallbackSuggestion.suggested_model_name}</span>{' '}
          instead?
        </p>

        <div className="flex gap-2">
          <button
            onClick={handleAccept}
            className="flex-1 rounded-xl bg-[--cta-bg] py-2.5 text-sm font-medium text-[--cta-text] hover:opacity-90 transition-opacity"
          >
            Switch Model
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 rounded-xl border border-[--border-medium] bg-transparent py-2.5 text-sm font-medium text-[--text-secondary] hover:bg-surface-3 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
