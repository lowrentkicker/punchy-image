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
            text_in_image: state.textInImage,
          },
          controller.signal,
        );

        if (isBatchResult(result)) {
          dispatch({
            type: 'BATCH_GENERATION_SUCCESS',
            results: result.results,
            batchId: result.batch_id,
          });
        } else {
          dispatch({ type: 'GENERATION_SUCCESS', result });
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          dispatch({ type: 'CANCEL_GENERATION' });
        } else {
          dispatch({
            type: 'GENERATION_ERROR',
            error: err as GenerationError,
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
      state.textInImage,
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
