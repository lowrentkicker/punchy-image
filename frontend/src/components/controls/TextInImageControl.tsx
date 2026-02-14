import { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import type { TextInImageConfig } from '../../types';

const PLACEMENTS = [
  { value: 'top', label: 'Top' },
  { value: 'center', label: 'Center' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'custom', label: 'Custom' },
] as const;

const SIZES = [
  { value: 'headline', label: 'Headline' },
  { value: 'subheading', label: 'Subheading' },
  { value: 'body', label: 'Body' },
  { value: 'fine_print', label: 'Fine Print' },
] as const;

export function TextInImageControl() {
  const { state, dispatch } = useAppContext();
  const [expanded, setExpanded] = useState(!!state.textInImage);

  const config: TextInImageConfig = state.textInImage ?? {
    text: '',
    placement: 'center',
    size: 'headline',
  };

  const update = (partial: Partial<TextInImageConfig>) => {
    const next = { ...config, ...partial };
    dispatch({
      type: 'SET_TEXT_IN_IMAGE',
      textInImage: next.text.trim() ? next : null,
    });
  };

  const handleToggle = () => {
    if (expanded) {
      dispatch({ type: 'SET_TEXT_IN_IMAGE', textInImage: null });
    }
    setExpanded(!expanded);
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="flex w-full items-center justify-between text-xs font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors"
      >
        <span>Text in Image</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-2 space-y-3">
          <input
            type="text"
            value={config.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Enter text to render..."
            className="w-full rounded-xl border border-[--border-subtle] bg-surface-2 px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none transition-colors"
          />

          <div>
            <span className="mb-1 block text-[10px] text-[--text-tertiary]">Placement</span>
            <div className="grid grid-cols-4 gap-1">
              {PLACEMENTS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update({ placement: value })}
                  className={`rounded-lg border px-1.5 py-1 text-[10px] font-medium transition-colors ${
                    config.placement === value
                      ? 'border-[--accent] bg-[--accent]/10 text-[--accent]'
                      : 'border-[--border-subtle] bg-surface-2 text-[--text-tertiary] hover:border-[--border-medium]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {config.placement === 'custom' && (
            <input
              type="text"
              value={config.custom_placement ?? ''}
              onChange={(e) => update({ custom_placement: e.target.value })}
              placeholder="e.g., bottom-right corner"
              className="w-full rounded-xl border border-[--border-subtle] bg-surface-2 px-3 py-1.5 text-xs text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none transition-colors"
            />
          )}

          <div>
            <span className="mb-1 block text-[10px] text-[--text-tertiary]">Size</span>
            <div className="grid grid-cols-4 gap-1">
              {SIZES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => update({ size: value })}
                  className={`rounded-lg border px-1.5 py-1 text-[10px] font-medium transition-colors ${
                    config.size === value
                      ? 'border-[--accent] bg-[--accent]/10 text-[--accent]'
                      : 'border-[--border-subtle] bg-surface-2 text-[--text-tertiary] hover:border-[--border-medium]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1 block text-[10px] text-[--text-tertiary]">Color (optional)</span>
            <input
              type="text"
              value={config.color ?? ''}
              onChange={(e) => update({ color: e.target.value || undefined })}
              placeholder="e.g., white, #FF0000"
              className="w-full rounded-xl border border-[--border-subtle] bg-surface-2 px-3 py-1.5 text-xs text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
}
