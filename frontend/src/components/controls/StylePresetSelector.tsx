import { useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';

export function StylePresetSelector() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    if (state.stylePresets.length === 0) {
      api.getStylePresets().then((presets) => {
        dispatch({ type: 'SET_STYLE_PRESETS', stylePresets: presets });
      }).catch(() => {});
    }
  }, [state.stylePresets.length, dispatch]);

  const presets = state.stylePresets.length > 0
    ? state.stylePresets
    : [{ id: 'none', name: 'None', suffix: '' }];

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
        Style Preset
      </label>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {presets.map((preset) => {
          const isActive = state.stylePreset === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() =>
                dispatch({ type: 'SET_STYLE_PRESET', stylePreset: preset.id })
              }
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-accent text-[#0A0A0A]'
                  : 'bg-surface-2 text-[--text-secondary] hover:text-[--text-primary] hover:bg-surface-3'
              }`}
            >
              {preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
