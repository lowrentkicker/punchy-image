import { useAppContext } from '../../hooks/useAppContext';

export function NegativePrompt() {
  const { state, dispatch } = useAppContext();

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
        Negative Prompt
      </label>
      <textarea
        value={state.negativePrompt}
        onChange={(e) =>
          dispatch({ type: 'SET_NEGATIVE_PROMPT', negativePrompt: e.target.value })
        }
        placeholder="Things to exclude from the image..."
        rows={2}
        className="w-full resize-y rounded-xl border border-[--border-subtle] bg-surface-2 p-3 text-xs text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none transition-colors duration-150"
      />
      <p className="mt-1 text-[10px] text-[--text-tertiary]">
        Negative prompts are advisory. Some models may not fully exclude all listed elements.
      </p>
    </div>
  );
}
