import { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';

export function NegativePrompt() {
  const { state, dispatch } = useAppContext();
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-xs font-medium text-[--text-secondary] hover:text-[--text-primary] transition-colors duration-150"
      >
        <span>Negative Prompt</span>
        <svg
          className={`h-3.5 w-3.5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <>
          <textarea
            value={state.negativePrompt}
            onChange={(e) =>
              dispatch({ type: 'SET_NEGATIVE_PROMPT', negativePrompt: e.target.value })
            }
            placeholder="Things to exclude from the image..."
            rows={2}
            className="mt-2 w-full resize-y rounded-xl border border-[--border-subtle] bg-surface-2 p-3 text-xs text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none transition-colors duration-150"
          />
          <p className="mt-1 text-[10px] text-[--text-tertiary]">
            Negative prompts are advisory. Some models may not fully exclude all listed elements.
          </p>
        </>
      )}
    </div>
  );
}
