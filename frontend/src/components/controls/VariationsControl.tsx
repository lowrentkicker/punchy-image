import { useAppContext } from '../../hooks/useAppContext';

const OPTIONS = [1, 2, 3, 4] as const;

export function VariationsControl() {
  const { state, dispatch } = useAppContext();

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
        Variations
      </label>
      <div className="grid grid-cols-4 gap-1.5">
        {OPTIONS.map((n) => (
          <button
            key={n}
            onClick={() => dispatch({ type: 'SET_VARIATIONS', variations: n })}
            className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors duration-150 ${
              state.variations === n
                ? 'border-[--accent] bg-[--accent]/10 text-[--accent]'
                : 'border-[--border-subtle] bg-surface-2 text-[--text-secondary] hover:border-[--border-medium]'
            }`}
          >
            {n}x
          </button>
        ))}
      </div>
    </div>
  );
}
