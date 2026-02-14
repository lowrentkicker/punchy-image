import { useAppContext } from '../../hooks/useAppContext';

const RATIOS = [
  { value: null, label: 'Auto' },
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:2', label: '3:2' },
  { value: '3:4', label: '3:4' },
  { value: '21:9', label: '21:9' },
] as const;

export function AspectRatioSelector() {
  const { state, dispatch } = useAppContext();

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
        Aspect Ratio
      </label>
      <div className="flex flex-wrap gap-1.5">
        {RATIOS.map((ratio) => {
          const isActive = state.aspectRatio === ratio.value;
          return (
            <button
              key={ratio.label}
              onClick={() =>
                dispatch({ type: 'SET_ASPECT_RATIO', aspectRatio: ratio.value })
              }
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-accent text-[#0A0A0A]'
                  : 'bg-surface-2 text-[--text-secondary] hover:text-[--text-primary] hover:bg-surface-3'
              }`}
            >
              {ratio.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
