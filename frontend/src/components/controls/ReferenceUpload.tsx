import { useCallback, useRef, useState } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';

export function ReferenceUpload() {
  const { state, dispatch } = useAppContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      setUploading(true);
      setError(null);
      try {
        const ref = await api.uploadReference(file);
        dispatch({ type: 'SET_REFERENCE_IMAGE', referenceImage: ref });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.';
        console.warn('Reference upload failed:', err);
        setError(message);
      } finally {
        setUploading(false);
      }
    },
    [dispatch],
  );

  const handleRemove = useCallback(async () => {
    if (state.referenceImage) {
      await api.deleteReference(state.referenceImage.reference_id).catch(() => {});
      dispatch({ type: 'SET_REFERENCE_IMAGE', referenceImage: null });
    }
  }, [state.referenceImage, dispatch]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  if (state.referenceImage) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
          Reference Image
        </label>
        <div className="relative inline-block">
          <img
            src={state.referenceImage.thumbnail_url}
            alt="Reference"
            className="h-16 w-16 rounded-lg border border-[--border-subtle] object-cover"
            onError={() => console.warn('Reference thumbnail failed to load:', state.referenceImage?.thumbnail_url)}
          />
          <button
            onClick={handleRemove}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-3 text-[--text-secondary] hover:text-[--text-primary] transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {state.referenceImage.was_resized && (
            <span className="mt-1 block text-[10px] text-[--text-tertiary]">Resized to fit</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[--text-secondary]">
        Reference Image
      </label>
      <button
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        disabled={uploading}
        className={`flex w-full items-center justify-center gap-2 rounded-xl border border-dashed py-4 text-xs transition-colors duration-150 ${
          dragOver
            ? 'border-accent bg-accent/10 text-accent'
            : 'border-[--border-medium] text-[--text-tertiary] hover:border-[--border-focus] hover:text-[--text-secondary]'
        } ${uploading ? 'opacity-50' : ''}`}
      >
        {uploading ? (
          <span>Uploading...</span>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Drop image or click to upload</span>
          </>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />
      {error && (
        <p className="mt-1 text-[10px] text-[--color-error]">{error}</p>
      )}
      <p className="mt-1 text-[10px] text-[--text-tertiary]">
        Works best with conversational models (Gemini, GPT-5)
      </p>
    </div>
  );
}
