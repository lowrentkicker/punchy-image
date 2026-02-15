import { useAppContext } from '../../hooks/useAppContext';

export function ModelSelector() {
  const { state, dispatch } = useAppContext();

  return (
    <div data-tour="model-selector">
      <label
        htmlFor="model-select"
        className="mb-1.5 block text-xs font-medium text-[--text-secondary]"
      >
        Model
      </label>
      <select
        id="model-select"
        value={state.selectedModelId ?? ''}
        onChange={(e) =>
          dispatch({ type: 'SELECT_MODEL', modelId: e.target.value })
        }
        className="w-full rounded-xl border border-[--border-subtle] bg-surface-2 px-3 py-2.5 text-sm text-[--text-primary] focus:border-[--border-focus] focus:outline-none transition-colors duration-150"
      >
        {state.models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.name} ({model.provider}){' '}
            {model.type === 'conversational' ? '- Chat' : '- Image'}
          </option>
        ))}
      </select>
    </div>
  );
}
