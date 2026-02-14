import { useCallback, useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';

export function CharacterReferenceUpload() {
  const { state, dispatch } = useAppContext();
  const refs = state.characterReferences;
  const canAdd = refs.length < 5;
  const [error, setError] = useState<string | null>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      if (!canAdd) return;
      setError(null);
      try {
        const result = await api.uploadReference(file);
        dispatch({ type: 'ADD_CHARACTER_REFERENCE', reference: result });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        console.warn('Character reference upload failed:', err);
        setError(message);
      }
    },
    [canAdd, dispatch],
  );

  const handleRemove = useCallback(
    async (referenceId: string) => {
      await api.deleteReference(referenceId).catch(() => {});
      dispatch({ type: 'REMOVE_CHARACTER_REFERENCE', referenceId });
    },
    [dispatch],
  );

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
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-[--text-secondary]">
          Character References
        </label>
        <span className="text-[10px] text-[--text-tertiary]">{refs.length}/5</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {refs.map((ref) => (
          <div key={ref.reference_id} className="relative">
            <img
              src={ref.thumbnail_url}
              alt="Character reference"
              className="h-14 w-14 rounded-lg border border-[--border-subtle] object-cover"
              onError={() => console.warn('Character reference thumbnail failed to load:', ref.thumbnail_url)}
            />
            <button
              onClick={() => handleRemove(ref.reference_id)}
              className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500/90 text-[9px] text-white hover:bg-red-500 transition-colors"
              aria-label="Remove reference"
            >
              &times;
            </button>
          </div>
        ))}

        {canAdd && (
          <label
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-lg border border-dashed border-[--border-medium] bg-surface-2 text-[--text-tertiary] hover:border-[--border-focus] hover:text-[--text-secondary] transition-colors duration-150"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        )}
      </div>
      {error && (
        <p className="mt-1 text-[10px] text-[--color-error]">{error}</p>
      )}
      <p className="mt-1 text-[10px] text-[--text-tertiary]">
        Maintains identity across generations
      </p>
    </div>
  );
}
