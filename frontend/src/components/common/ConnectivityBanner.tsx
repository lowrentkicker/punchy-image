import { useAppContext } from '../../hooks/useAppContext';

export function ConnectivityBanner() {
  const { state } = useAppContext();

  if (state.isOnline) return null;

  return (
    <div className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/5 px-4 py-2">
      <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728m12.728-9.9a5 5 0 010 7.072M8.464 8.464a5 5 0 000 7.072"
        />
      </svg>
      <span className="text-xs text-amber-300">
        Offline — image generation unavailable. Your workspace and history are fully accessible.
      </span>
    </div>
  );
}
