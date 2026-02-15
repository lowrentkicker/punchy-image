import { useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';
import { Lightbox } from './Lightbox';
import { EnhanceButton } from './EnhanceButton';
import { MaskCanvas } from '../masking/MaskCanvas';
import type { GenerationResult } from '../../types';

export function ImageCanvas() {
  const { state, dispatch } = useAppContext();
  const { currentGeneration, batchResults, isGenerating, exportFormat, exportQuality } = state;
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const formatLabel = exportFormat.toUpperCase();

  const handleDownload = (imageId?: string) => {
    const id = imageId ?? currentGeneration?.image_id;
    if (!id) return;
    const url = api.getExportUrl(id, exportFormat, exportQuality);
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSelectVariation = (result: GenerationResult) => {
    dispatch({ type: 'SELECT_BATCH_RESULT', result });
  };

  // Loading state — shimmer placeholder(s)
  if (isGenerating) {
    const shimmerCount = state.variations > 1 ? state.variations : 1;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-base">
        {shimmerCount > 1 ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: shimmerCount }).map((_, i) => (
              <div
                key={i}
                className="relative h-48 w-48 overflow-hidden rounded-2xl border border-[--border-default] bg-surface-2"
              >
                <div
                  className="absolute inset-0 bg-linear-to-r from-transparent via-white/3 to-transparent"
                  style={{ animation: `shimmer 2.5s infinite ${i * 0.3}s`, backgroundSize: '200% 100%' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative h-80 w-80 overflow-hidden rounded-2xl border border-[--border-default] bg-surface-2">
            <div
              className="absolute inset-0 bg-linear-to-r from-transparent via-white/3 to-transparent"
              style={{ animation: 'shimmer 2.5s infinite', backgroundSize: '200% 100%' }}
            />
          </div>
        )}
        <p
          className="text-sm text-[--text-secondary]"
          style={{ animation: 'pulse-gentle 2s infinite' }}
        >
          Generating {shimmerCount > 1 ? `${shimmerCount} variations` : 'image'}...
        </p>
      </div>
    );
  }

  // Empty state
  if (!currentGeneration) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-base">
        <div className="rounded-2xl border-2 border-dashed border-[--border-medium] p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[--text-tertiary]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z"
            />
          </svg>
          <p className="mt-3 text-sm text-[--text-tertiary]">
            Enter a prompt and click Generate to create an image
          </p>
        </div>
      </div>
    );
  }

  // Batch variation display
  if (batchResults && batchResults.length >= 1) {
    const isMultiModel = batchResults.some((r) => r.model_id !== batchResults[0].model_id);

    return (
      <div className="relative flex flex-1 flex-col overflow-hidden bg-base">
        <MaskCanvas />
        {/* Main selected image */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center p-6">
          <img
            src={currentGeneration.image_url}
            alt={`Generated from: ${currentGeneration.prompt}`}
            className="max-h-full max-w-full cursor-pointer rounded-2xl border border-[--border-default] object-contain shadow-2xl shadow-black/50"
            style={{ animation: 'fadeIn 300ms ease' }}
            onClick={() => setLightboxOpen(true)}
          />
          <div className="absolute bottom-8 right-8 flex items-center gap-2">
            <button
              onClick={() => dispatch({ type: 'SET_MASK_MODE', enabled: true })}
              className="rounded-xl border border-[--border-medium] bg-transparent px-3 py-1.5 text-xs font-medium text-[--text-secondary] hover:bg-surface-3 transition-colors"
            >
              Edit Region
            </button>
            <EnhanceButton />
            <button
              onClick={() => handleDownload()}
              className="rounded-xl border border-[--border-medium] bg-transparent px-4 py-2 text-sm font-medium text-[--text-secondary] hover:bg-surface-3 transition-colors duration-150"
              aria-label="Download image"
            >
              Download {formatLabel}
            </button>
          </div>
        </div>

        {/* Variation thumbnails strip */}
        <div className="border-t border-[--border-default] bg-surface-1 px-6 py-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-[--text-tertiary]">
              {state.batchTotalRequested && state.batchTotalRequested > batchResults.length
                ? `${batchResults.length} of ${state.batchTotalRequested} variations completed`
                : `${batchResults.length} variations`}
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {batchResults.map((result, i) => {
              const modelName = isMultiModel
                ? (state.models.find((m) => m.id === result.model_id)?.name ?? result.model_id.split('/')[1])
                : null;
              return (
              <button
                key={result.image_id}
                onClick={() => handleSelectVariation(result)}
                className={`group relative shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-150 ${
                  currentGeneration.image_id === result.image_id
                    ? 'border-[--accent] shadow-lg shadow-[--accent]/20'
                    : 'border-transparent hover:border-[--border-medium]'
                }`}
              >
                <img
                  src={result.thumbnail_url}
                  alt={`Variation ${i + 1}${modelName ? ` (${modelName})` : ''}`}
                  className="h-16 w-16 object-cover"
                />
                <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[9px] text-white">
                  {modelName ?? (i + 1)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(result.image_id);
                  }}
                  className="absolute top-0.5 left-0.5 flex items-center justify-center rounded bg-black/60 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                  aria-label={`Download variation ${i + 1}`}
                >
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </button>
              );
            })}
          </div>
        </div>

        {currentGeneration.text_response && (
          <div className="border-t border-[--border-default] bg-surface-1 px-6 py-3">
            <p className="text-sm text-[--text-secondary]">
              {currentGeneration.text_response}
            </p>
          </div>
        )}

        <Lightbox
          imageUrl={currentGeneration.image_url}
          open={lightboxOpen}
          onClose={() => setLightboxOpen(false)}
          onDownload={() => handleDownload()}
        />
      </div>
    );
  }

  // Single image display
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-base">
      {/* Mask overlay */}
      <MaskCanvas />

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-6">
        <img
          src={currentGeneration.image_url}
          alt={`Generated from: ${currentGeneration.prompt}`}
          className="max-h-full max-w-full cursor-pointer rounded-2xl border border-[--border-default] object-contain shadow-2xl shadow-black/50"
          style={{ animation: 'fadeIn 300ms ease' }}
          onClick={() => setLightboxOpen(true)}
        />
        <div className="absolute bottom-8 right-8 flex items-center gap-2">
          <button
            onClick={() => dispatch({ type: 'SET_MASK_MODE', enabled: true })}
            className="rounded-xl border border-[--border-medium] bg-transparent px-3 py-1.5 text-xs font-medium text-[--text-secondary] hover:bg-surface-3 transition-colors"
          >
            Edit Region
          </button>
          <EnhanceButton />
          <button
            onClick={() => handleDownload()}
            className="rounded-xl border border-[--border-medium] bg-transparent px-4 py-2 text-sm font-medium text-[--text-secondary] hover:bg-surface-3 transition-colors duration-150"
            aria-label="Download image"
          >
            Download {formatLabel}
          </button>
        </div>
      </div>

      {currentGeneration.text_response && (
        <div className="border-t border-[--border-default] bg-surface-1 px-6 py-3">
          <p className="text-sm text-[--text-secondary]">
            {currentGeneration.text_response}
          </p>
        </div>
      )}

      <Lightbox
        imageUrl={currentGeneration.image_url}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onDownload={() => handleDownload()}
      />
    </div>
  );
}
