import { useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';
import type { HistoryEntry } from '../../types';

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

function HistoryItem({
  entry,
  onSelect,
  onDelete,
  onDownload,
}: {
  entry: HistoryEntry;
  onSelect: () => void;
  onDelete: () => void;
  onDownload: () => void;
}) {
  const modelName = entry.model_id.split('/').pop() ?? entry.model_id;

  return (
    <div
      className="group flex gap-3 rounded-xl p-2 hover:bg-surface-2 transition-colors duration-150 cursor-pointer"
      onClick={onSelect}
    >
      <img
        src={`/api/images/default/thumbnails/${entry.thumbnail_filename}`}
        alt={entry.prompt}
        className="h-12 w-12 shrink-0 rounded-lg object-cover border border-[--border-subtle]"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-[--text-primary]">{entry.prompt}</p>
        <p className="mt-0.5 text-[10px] text-[--text-tertiary]">
          {modelName} &middot; {formatTime(entry.timestamp)}
        </p>
      </div>
      <div className="flex shrink-0 items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="rounded p-1 text-[--text-tertiary] hover:text-[--text-primary] hover:bg-surface-3"
          title="Download"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-[--text-tertiary] hover:text-[--color-error] hover:bg-surface-3"
          title="Delete"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function HistoryPanel() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    api
      .getHistory()
      .then(({ entries }) => {
        dispatch({ type: 'SET_HISTORY', history: entries });
      })
      .catch(() => {});
  }, [dispatch]);


  const handleDelete = async (imageId: string) => {
    await api.deleteHistoryEntry(imageId).catch(() => {});
    dispatch({ type: 'REMOVE_HISTORY_ENTRY', imageId });
  };

  const handleDownload = (imageId: string) => {
    const url = api.getExportUrl(imageId);
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.click();
  };

  const handleSelect = (entry: HistoryEntry) => {
    dispatch({
      type: 'GENERATION_SUCCESS',
      result: {
        image_id: entry.image_id,
        image_url: `/api/images/default/${entry.image_filename}`,
        thumbnail_url: `/api/images/default/thumbnails/${entry.thumbnail_filename}`,
        text_response: entry.text_response,
        model_id: entry.model_id,
        prompt: entry.prompt,
        timestamp: entry.timestamp,
        usage: entry.usage,
        aspect_ratio: entry.aspect_ratio,
        resolution: entry.resolution,
        style_preset: entry.style_preset,
        negative_prompt: entry.negative_prompt,
        image_weight: entry.image_weight,
        batch_id: entry.batch_id,
      },
    });
    dispatch({ type: 'SET_VIEW', view: 'workspace' });
  };

  const sorted = [...state.history].reverse();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-sm font-semibold text-[--text-primary]">History</h2>
        <span className="text-xs text-[--text-tertiary]">{state.history.length} images</span>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6">
          <p className="text-center text-xs text-[--text-tertiary]">
            Generated images will appear here
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">
          {sorted.map((entry) => (
            <HistoryItem
              key={entry.image_id}
              entry={entry}
              onSelect={() => handleSelect(entry)}
              onDelete={() => handleDelete(entry.image_id)}
              onDownload={() => handleDownload(entry.image_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
