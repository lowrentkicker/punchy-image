import { useAppContext } from '../../hooks/useAppContext';

const OPTIONS = [1, 2, 3, 4] as const;

export function VariationsControl() {
  const { state, dispatch } = useAppContext();

  // Compute which models would be used for multi-model variations
  const getMultiModelIds = (): string[] => {
    if (!state.selectedModelId || state.variations <= 1) return [];
    // Use user-selected IDs if they match the variation count
    if (state.selectedModelIds.length === state.variations) {
      return state.selectedModelIds;
    }
    // Default: selected model first, then other models in order
    const otherModels = state.models
      .filter((m) => m.id !== state.selectedModelId)
      .map((m) => m.id);
    const needed = state.variations - 1;
    return [state.selectedModelId, ...otherModels.slice(0, needed)];
  };

  const modelIds = state.multiModel ? getMultiModelIds() : [];

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
            className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-150 ${
              state.variations === n
                ? 'bg-accent text-[#0A0A0A]'
                : 'bg-surface-2 text-[--text-secondary] hover:text-[--text-primary] hover:bg-surface-3'
            }`}
          >
            {n}x
          </button>
        ))}
      </div>

      {state.variations > 1 && (
        <div className="mt-2 space-y-1.5">
          <button
            onClick={() => dispatch({ type: 'SET_MULTI_MODEL', multiModel: !state.multiModel })}
            className="flex w-full items-center justify-between rounded-lg bg-surface-2 px-2.5 py-1.5 transition-colors hover:bg-surface-3"
          >
            <span className="text-[10px] text-[--text-secondary]">Use different models</span>
            <div
              className={`h-4 w-7 rounded-full transition-colors duration-150 ${
                state.multiModel ? 'bg-accent' : 'bg-surface-3'
              }`}
            >
              <div
                className={`h-3 w-3 translate-y-0.5 rounded-full bg-white transition-transform duration-150 ${
                  state.multiModel ? 'translate-x-3.5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>

          {state.multiModel && modelIds.length > 1 && (
            <div className="space-y-1">
              {modelIds.map((id, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="shrink-0 text-[9px] text-[--text-tertiary] w-3">{i + 1}.</span>
                  <select
                    value={id}
                    onChange={(e) => {
                      const updated = [...modelIds];
                      updated[i] = e.target.value;
                      dispatch({ type: 'SET_SELECTED_MODEL_IDS', modelIds: updated });
                    }}
                    className="flex-1 rounded-lg border border-[--border-subtle] bg-surface-3 px-1.5 py-1 text-[10px] text-[--text-secondary] focus:border-[--border-focus] focus:outline-none cursor-pointer"
                  >
                    {state.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
