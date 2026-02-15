import { useAppContext } from '../../hooks/useAppContext';

const FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
] as const;

const DPI_PRESETS = [
  { value: 72, label: '72', description: 'Screen' },
  { value: 150, label: '150', description: 'Web Print' },
  { value: 300, label: '300', description: 'Print' },
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
            className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-150 ${
              state.exportFormat === value
                ? 'bg-accent text-[#0A0A0A]'
                : 'bg-surface-2 text-[--text-secondary] hover:text-[--text-primary] hover:bg-surface-3'
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
            className="mt-0.5 w-full h-1.5 rounded-full appearance-none bg-surface-3 cursor-pointer"
          />
        </div>
      )}

      <div className="mt-2">
        <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
          DPI
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {DPI_PRESETS.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => dispatch({ type: 'SET_EXPORT_DPI', dpi: value })}
              className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors duration-150 ${
                state.exportDpi === value
                  ? 'bg-accent text-[#0A0A0A]'
                  : 'bg-surface-2 text-[--text-secondary] hover:text-[--text-primary] hover:bg-surface-3'
              }`}
              title={description}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
