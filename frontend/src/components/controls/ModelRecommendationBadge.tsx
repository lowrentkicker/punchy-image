import { useEffect, useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';
import type { ModelCapability } from '../../types';

export function ModelRecommendationBadge() {
  const { state, dispatch } = useAppContext();
  const [showMatrix, setShowMatrix] = useState(false);
  const rec = state.modelRecommendation;

  // Fetch recommendation when relevant inputs change
  useEffect(() => {
    const hasTextInImage = !!state.textInImage?.text?.trim();
    const stylePreset = state.stylePreset !== 'none' ? state.stylePreset : null;
    const resolution = state.resolution !== '1K' ? state.resolution : null;
    const hasCharacterRefs = state.characterReferences.length > 0;

    api
      .getModelRecommendation({
        has_text_in_image: hasTextInImage,
        style_preset: stylePreset,
        resolution: resolution,
        has_character_refs: hasCharacterRefs,
      })
      .then((r) => dispatch({ type: 'SET_MODEL_RECOMMENDATION', recommendation: r }))
      .catch(() => {});
  }, [
    state.textInImage,
    state.stylePreset,
    state.resolution,
    state.characterReferences.length,
    dispatch,
  ]);

  if (!rec) return null;

  const isCurrentRecommended = state.selectedModelId === rec.recommended_model_id;

  return (
    <div className="space-y-1.5">
      {!isCurrentRecommended && (
        <button
          onClick={() => dispatch({ type: 'SELECT_MODEL', modelId: rec.recommended_model_id })}
          className="flex w-full items-center gap-1.5 rounded-lg border border-[--accent]/30 bg-[--accent]/5 px-2.5 py-1.5 text-left transition-colors hover:bg-[--accent]/10"
        >
          <svg className="h-3.5 w-3.5 shrink-0 text-[--accent]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <div className="min-w-0 flex-1">
            <span className="block text-[10px] font-medium text-[--accent]">Recommended</span>
            <span className="block truncate text-[10px] text-[--text-tertiary]">{rec.reason}</span>
          </div>
        </button>
      )}

      <button
        onClick={() => setShowMatrix(!showMatrix)}
        className="text-[10px] text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
      >
        {showMatrix ? 'Hide' : 'Compare'} models
      </button>

      {showMatrix && rec.capabilities.length > 0 && (
        <CompareMatrix capabilities={rec.capabilities} recommendedId={rec.recommended_model_id} />
      )}
    </div>
  );
}

function CompareMatrix({
  capabilities,
  recommendedId,
}: {
  capabilities: ModelCapability[];
  recommendedId: string;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[--border-subtle] bg-surface-2">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-[--border-subtle]">
            <th className="px-2 py-1.5 text-left font-medium text-[--text-secondary]">Model</th>
            <th className="px-2 py-1.5 text-left font-medium text-[--text-secondary]">Text</th>
            <th className="px-2 py-1.5 text-left font-medium text-[--text-secondary]">Speed</th>
            <th className="px-2 py-1.5 text-left font-medium text-[--text-secondary]">Cost</th>
          </tr>
        </thead>
        <tbody>
          {capabilities.map((cap) => (
            <tr
              key={cap.model_id}
              className={`border-b border-[--border-subtle] last:border-0 ${
                cap.model_id === recommendedId ? 'bg-[--accent]/5' : ''
              }`}
            >
              <td className="px-2 py-1.5 text-[--text-primary]">
                {cap.name}
                {cap.model_id === recommendedId && (
                  <span className="ml-1 text-[--accent]">*</span>
                )}
              </td>
              <td className="px-2 py-1.5 text-[--text-tertiary]">{cap.text_rendering}</td>
              <td className="px-2 py-1.5 text-[--text-tertiary]">{cap.speed}</td>
              <td className="px-2 py-1.5 text-[--text-tertiary]">{cap.relative_cost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
