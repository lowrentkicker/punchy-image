import { useAppContext } from '../../hooks/useAppContext';

const RESOLUTIONS = [
  { value: '1K', label: '1K', description: 'Standard' },
  { value: '2K', label: '2K', description: '2x cost' },
  { value: '4K', label: '4K', description: '4x cost' },
] as const;

export function ResolutionSelector() {
  const { state, dispatch } = useAppContext();

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
        Resolution
      </label>
      <div className="flex gap-1.5">
        {RESOLUTIONS.map((res) => {
          const isActive = state.resolution === res.value;
          return (
            <button
              key={res.value}
              onClick={() =>
                dispatch({ type: 'SET_RESOLUTION', resolution: res.value })
              }
              className={`flex-1 rounded-lg py-2 text-center transition-colors duration-150 ${
                isActive
                  ? 'bg-accent text-[#0A0A0A]'
                  : 'bg-surface-2 text-[--text-secondary] hover:text-[--text-primary] hover:bg-surface-3'
              }`}
            >
              <div className="text-xs font-semibold">{res.label}</div>
              <div className={`text-[10px] ${isActive ? 'text-[#0A0A0A]/70' : 'text-[--text-tertiary]'}`}>
                {res.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
