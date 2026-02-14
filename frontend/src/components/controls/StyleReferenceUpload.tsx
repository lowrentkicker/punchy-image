import { useCallback } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';

export function StyleReferenceUpload() {
  const { state, dispatch } = useAppContext();
  const ref = state.styleReference;

  const handleUpload = useCallback(
    async (file: File) => {
      try {
        const result = await api.uploadReference(file);
        dispatch({ type: 'SET_STYLE_REFERENCE', styleReference: result });
      } catch {
        // Upload errors handled at a higher level
      }
    },
    [dispatch],
  );

  const handleRemove = useCallback(async () => {
    if (!ref) return;
    await api.deleteReference(ref.reference_id).catch(() => {});
    dispatch({ type: 'SET_STYLE_REFERENCE', styleReference: null });
  }, [ref, dispatch]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file?.type.startsWith('image/')) handleUpload(file);
    },
    [handleUpload],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleUpload(file);
      e.target.value = '';
    },
    [handleUpload],
  );

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
        Style Reference
      </label>
      {ref ? (
        <div className="relative inline-block">
          <img
            src={ref.thumbnail_url}
            alt="Style reference"
            className="h-16 w-16 rounded-lg border border-[--border-subtle] object-cover"
          />
          <button
            onClick={handleRemove}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500/90 text-[10px] text-white hover:bg-red-500 transition-colors"
            aria-label="Remove style reference"
          >
            &times;
          </button>
        </div>
      ) : (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-[--border-medium] bg-surface-2 px-3 py-2.5 text-xs text-[--text-tertiary] hover:border-[--border-focus] hover:text-[--text-secondary] transition-colors duration-150"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
          </svg>
          <span>Drop style image or click</span>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}
      <p className="mt-1 text-[10px] text-[--text-tertiary]">
        Copies visual style, not subject matter
      </p>
    </div>
  );
}
