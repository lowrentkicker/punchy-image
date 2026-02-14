import { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';
import type { GenerationError } from '../../types';

const RESOLUTION_OPTIONS = [
  { value: '2K', label: '2K' },
  { value: '4K', label: '4K' },
];

export function EnhanceButton() {
  const { state, dispatch } = useAppContext();
  const { currentGeneration, isGenerating } = state;
  const [showMenu, setShowMenu] = useState(false);

  if (!currentGeneration) return null;

  const currentRes = currentGeneration.resolution ?? '1K';
  const availableOptions = RESOLUTION_OPTIONS.filter((opt) => {
    if (currentRes === '4K') return false;
    if (currentRes === '2K') return opt.value === '4K';
    return true;
  });

  if (availableOptions.length === 0) {
    return (
      <button
        disabled
        className="rounded-xl border border-[--border-subtle] px-3 py-1.5 text-xs text-[--text-tertiary] opacity-50 cursor-not-allowed"
        title="Already at maximum resolution"
      >
        Enhance
      </button>
    );
  }

  const handleEnhance = async (targetResolution: string) => {
    setShowMenu(false);
    dispatch({ type: 'START_GENERATION', requestId: crypto.randomUUID() });

    try {
      const result = await api.enhance({
        image_id: currentGeneration.image_id,
        target_resolution: targetResolution,
      });
      dispatch({ type: 'GENERATION_SUCCESS', result });
    } catch (err) {
      dispatch({ type: 'GENERATION_ERROR', error: err as GenerationError });
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={isGenerating}
        className="rounded-xl border border-[--border-medium] bg-transparent px-3 py-1.5 text-xs font-medium text-[--text-secondary] hover:bg-surface-3 transition-colors disabled:opacity-30"
      >
        Enhance
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute bottom-full right-0 z-20 mb-1 rounded-lg border border-[--border-default] bg-surface-2 p-1 shadow-xl shadow-black/30">
            {availableOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleEnhance(opt.value)}
                className="block w-full rounded-md px-3 py-1.5 text-left text-xs text-[--text-primary] hover:bg-surface-3 transition-colors"
              >
                Enhance to {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
