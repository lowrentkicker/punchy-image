import { useState, useCallback } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';
import type { ReferenceImage, GenerationError, ComposeSource } from '../../types';

interface SourceSlot {
  reference: ReferenceImage | null;
  label: string;
}

const DEFAULT_LABELS = ['Subject', 'Background', 'Style', 'Accent', 'Extra'];

export function ComposePanel() {
  const { state, dispatch } = useAppContext();
  const { selectedModelId, isGenerating } = state;
  const [slots, setSlots] = useState<SourceSlot[]>([
    { reference: null, label: DEFAULT_LABELS[0] },
    { reference: null, label: DEFAULT_LABELS[1] },
  ]);
  const [prompt, setPrompt] = useState('');

  const canAddSlot = slots.length < 5;
  const filledSlots = slots.filter((s) => s.reference !== null);

  const handleUpload = useCallback(
    async (index: number, file: File) => {
      try {
        const result = await api.uploadReference(file);
        setSlots((prev) =>
          prev.map((s, i) => (i === index ? { ...s, reference: result } : s)),
        );
      } catch {
        // Error handled at higher level
      }
    },
    [],
  );

  const handleRemove = useCallback(
    async (index: number) => {
      const slot = slots[index];
      if (slot.reference) {
        await api.deleteReference(slot.reference.reference_id).catch(() => {});
      }
      setSlots((prev) =>
        prev.map((s, i) => (i === index ? { ...s, reference: null } : s)),
      );
    },
    [slots],
  );

  const handleAddSlot = () => {
    if (!canAddSlot) return;
    setSlots((prev) => [...prev, { reference: null, label: DEFAULT_LABELS[prev.length] || '' }]);
  };

  const handleRemoveSlot = (index: number) => {
    if (slots.length <= 2) return;
    const slot = slots[index];
    if (slot.reference) {
      api.deleteReference(slot.reference.reference_id).catch(() => {});
    }
    setSlots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleLabelChange = (index: number, label: string) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, label } : s)),
    );
  };

  const handleCompose = async () => {
    if (!selectedModelId || !prompt.trim() || filledSlots.length < 2) return;

    dispatch({ type: 'START_GENERATION', requestId: crypto.randomUUID() });

    const sourceImages: ComposeSource[] = filledSlots.map((s) => ({
      reference_id: s.reference!.reference_id,
      label: s.label,
    }));

    try {
      const result = await api.compose({
        source_images: sourceImages,
        prompt: prompt.trim(),
        model_id: selectedModelId,
        image_weight: state.imageWeight !== 50 ? state.imageWeight : null,
        aspect_ratio: state.aspectRatio,
        resolution: state.resolution !== '1K' ? state.resolution : null,
      });
      dispatch({ type: 'GENERATION_SUCCESS', result });
      dispatch({ type: 'SET_VIEW', view: 'workspace' });
    } catch (err) {
      dispatch({ type: 'GENERATION_ERROR', error: err as GenerationError });
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-base">
      <div className="border-b border-[--border-default] bg-surface-1 px-6 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[--text-primary]">Compose Images</h2>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', view: 'workspace' })}
            className="rounded-lg px-3 py-1.5 text-xs text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary] transition-colors"
          >
            Back to Workspace
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Source image slots */}
          <div className="space-y-3">
            <h3 className="text-xs font-medium text-[--text-secondary]">
              Source Images ({filledSlots.length}/{slots.length})
            </h3>
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="text"
                  value={slot.label}
                  onChange={(e) => handleLabelChange(i, e.target.value)}
                  className="w-24 rounded-lg border border-[--border-subtle] bg-surface-2 px-2 py-1.5 text-xs text-[--text-primary] focus:border-[--border-focus] focus:outline-none"
                  placeholder="Label"
                />
                {slot.reference ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={slot.reference.thumbnail_url}
                      alt={slot.label}
                      className="h-12 w-12 rounded-lg border border-[--border-subtle] object-cover"
                    />
                    <button
                      onClick={() => handleRemove(i)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[--border-medium] bg-surface-2 px-3 py-2 text-xs text-[--text-tertiary] hover:border-[--border-focus] transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(i, file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                )}
                {slots.length > 2 && (
                  <button
                    onClick={() => handleRemoveSlot(i)}
                    className="text-[--text-tertiary] hover:text-red-400 transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            {canAddSlot && (
              <button
                onClick={handleAddSlot}
                className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors"
              >
                + Add image slot
              </button>
            )}
          </div>

          {/* Composition prompt */}
          <div>
            <h3 className="mb-1.5 text-xs font-medium text-[--text-secondary]">
              Composition Prompt
            </h3>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want the images combined..."
              rows={3}
              className="w-full rounded-xl border border-[--border-subtle] bg-surface-2 px-3 py-2.5 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none resize-none transition-colors"
            />
          </div>

          {/* Compose button */}
          <button
            onClick={handleCompose}
            disabled={filledSlots.length < 2 || !prompt.trim() || !selectedModelId || isGenerating}
            className="w-full rounded-xl bg-[--cta-bg] py-3 text-sm font-medium text-[--cta-text] hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {isGenerating ? 'Composing...' : 'Compose'}
          </button>
        </div>
      </div>
    </div>
  );
}
