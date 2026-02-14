import { useAppContext } from '../../hooks/useAppContext';

export function ImageWeightSlider() {
  const { state, dispatch } = useAppContext();
  const hasRefs = !!(state.referenceImage || state.styleReference || state.characterReferences.length);

  if (!hasRefs) return null;

  const weight = state.imageWeight;

  const label =
    weight <= 25 ? 'Loose' :
    weight <= 40 ? 'Moderate' :
    weight <= 60 ? 'Balanced' :
    weight <= 75 ? 'Close' : 'Exact';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-[--text-secondary]">
          Image Weight
        </label>
        <span className="text-xs text-[--text-tertiary]">
          {weight} — {label}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={weight}
        onChange={(e) =>
          dispatch({ type: 'SET_IMAGE_WEIGHT', imageWeight: Number(e.target.value) })
        }
        className="w-full accent-[--accent] h-1.5 rounded-full appearance-none bg-surface-3 cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[--accent] [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:cursor-pointer"
      />
      <div className="mt-1 flex justify-between text-[10px] text-[--text-tertiary]">
        <span>Prompt priority</span>
        <span>Image priority</span>
      </div>
    </div>
  );
}
