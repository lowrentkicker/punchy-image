import { useAppContext } from '../../hooks/useAppContext';

const FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
] as const;

export function ExportOptions() {
  const { state, dispatch } = useAppContext();
  const showQuality = state.exportFormat !== 'png';

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
        Export Format
      </label>
      <div className="grid grid-cols-3 gap-1.5">
        {FORMATS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => dispatch({ type: 'SET_EXPORT_FORMAT', format: value })}
            className={`rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors duration-150 ${
              state.exportFormat === value
                ? 'border-[--accent] bg-[--accent]/10 text-[--accent]'
                : 'border-[--border-subtle] bg-surface-2 text-[--text-secondary] hover:border-[--border-medium]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {showQuality && (
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[--text-tertiary]">Quality</span>
            <span className="text-[10px] text-[--text-tertiary]">{state.exportQuality}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={state.exportQuality}
            onChange={(e) =>
              dispatch({ type: 'SET_EXPORT_QUALITY', quality: Number(e.target.value) })
            }
            className="mt-0.5 w-full accent-[--accent] h-1 rounded-full appearance-none bg-surface-3 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[--accent] [&::-webkit-slider-thumb]:border-0"
          />
        </div>
      )}
    </div>
  );
}
