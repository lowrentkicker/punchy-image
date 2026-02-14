import { useCallback, useRef } from 'react';
import { useAppContext } from './useAppContext';
import { api } from '../services/api';
import type { GenerationError, GenerationResult, BatchGenerationResult } from '../types';

function isBatchResult(
  result: GenerationResult | BatchGenerationResult,
): result is BatchGenerationResult {
  return 'batch_id' in result && 'results' in result;
}

export function useGenerate() {
  const { state, dispatch } = useAppContext();
  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (prompt: string) => {
      if (!state.selectedModelId || !prompt.trim()) return;

      const requestId = crypto.randomUUID();
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'START_GENERATION', requestId });

      try {
        const hasRefs = !!(state.styleReference || state.characterReferences.length);

        // Compute model_ids for multi-model variations
        let modelIds: string[] | null = null;
        if (state.multiModel && state.variations > 1) {
          if (state.selectedModelIds.length === state.variations) {
            modelIds = state.selectedModelIds;
          } else {
            const otherModels = state.models
              .filter((m) => m.id !== state.selectedModelId)
              .map((m) => m.id);
            const needed = state.variations - 1;
            modelIds = [state.selectedModelId!, ...otherModels.slice(0, needed)];
          }
        }

        const result = await api.generate(
          {
            prompt,
            model_id: state.selectedModelId,
            request_id: requestId,
            aspect_ratio: state.aspectRatio,
            resolution: state.resolution !== '1K' ? state.resolution : null,
            style_preset: state.stylePreset !== 'none' ? state.stylePreset : null,
            negative_prompt: state.negativePrompt.trim() || null,
            reference_image_id: state.referenceImage?.reference_id ?? null,
            // Phase 3
            image_weight: hasRefs ? state.imageWeight : null,
            style_reference_id: state.styleReference?.reference_id ?? null,
            character_reference_ids: state.characterReferences.length
              ? state.characterReferences.map((r) => r.reference_id)
              : null,
            variations: state.variations,
            model_ids: modelIds,
          },
          controller.signal,
        );

        if (isBatchResult(result)) {
          dispatch({
            type: 'BATCH_GENERATION_SUCCESS',
            results: result.results,
            batchId: result.batch_id,
            totalRequested: result.total_requested,
          });
        } else {
          dispatch({ type: 'GENERATION_SUCCESS', result });
        }
        // Clear any previous offline banner on successful generation
        dispatch({ type: 'SET_ONLINE_STATUS', online: true });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          dispatch({ type: 'CANCEL_GENERATION' });
        } else {
          const genError = err as GenerationError;
          // Show offline banner when generation fails due to connectivity
          if (genError.error_type === 'network' || genError.error_type === 'timeout') {
            dispatch({ type: 'SET_ONLINE_STATUS', online: false });
          }
          dispatch({
            type: 'GENERATION_ERROR',
            error: genError,
          });
        }
      }
    },
    [
      state.selectedModelId,
      state.aspectRatio,
      state.resolution,
      state.stylePreset,
      state.negativePrompt,
      state.referenceImage,
      state.imageWeight,
      state.styleReference,
      state.characterReferences,
      state.variations,
      state.multiModel,
      state.selectedModelIds,
      state.models,
      dispatch,
    ],
  );

  const cancel = useCallback(async () => {
    abortRef.current?.abort();
    if (state.requestId) {
      await api.cancelGeneration(state.requestId).catch(() => {});
    }
    dispatch({ type: 'CANCEL_GENERATION' });
  }, [state.requestId, dispatch]);

  return { generate, cancel, isGenerating: state.isGenerating };
}
