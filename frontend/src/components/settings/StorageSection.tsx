import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAppContext } from '../../hooks/useAppContext';
import type { StorageUsage } from '../../types';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function StorageSection() {
  const { dispatch } = useAppContext();
  const [usage, setUsage] = useState<StorageUsage | null>(null);
  const [editingQuota, setEditingQuota] = useState(false);
  const [quotaInput, setQuotaInput] = useState('');

  useEffect(() => {
    api.getStorageUsage().then((data) => {
      setUsage(data);
      if (data.percentage >= 95) {
        dispatch({ type: 'SET_STORAGE_WARNING', level: 'critical' });
      } else if (data.percentage >= 80) {
        dispatch({ type: 'SET_STORAGE_WARNING', level: 'warning' });
      } else {
        dispatch({ type: 'SET_STORAGE_WARNING', level: null });
      }
    }).catch(() => {});
  }, [dispatch]);

  const handleSetQuota = async () => {
    const gb = parseFloat(quotaInput);
    if (isNaN(gb) || gb < 0.1) return;
    const bytes = Math.round(gb * 1024 * 1024 * 1024);
    await api.setStorageQuota(bytes).catch(() => {});
    setEditingQuota(false);
    api.getStorageUsage().then(setUsage).catch(() => {});
  };

  if (!usage) return null;

  const barColor =
    usage.percentage >= 95 ? 'bg-red-500' :
    usage.percentage >= 80 ? 'bg-amber-500' :
    'bg-[--accent]';

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[--text-primary]">Storage</h3>
        <p className="text-[10px] text-[--text-tertiary]">Local disk usage for images, thumbnails, and references</p>
      </div>

      {/* Usage bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-[--text-secondary]">
            {formatBytes(usage.total_bytes)} / {formatBytes(usage.quota_bytes)}
          </span>
          <span className={`font-medium ${usage.percentage >= 80 ? 'text-amber-400' : 'text-[--text-tertiary]'}`}>
            {usage.percentage}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-surface-3">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.min(100, usage.percentage)}%` }}
          />
        </div>
      </div>

      {usage.percentage >= 95 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs text-red-300">
          Storage nearly full. Clean up projects or increase quota before generating new images.
        </div>
      )}

      {usage.percentage >= 80 && usage.percentage < 95 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          Storage: {formatBytes(usage.total_bytes)} / {formatBytes(usage.quota_bytes)}
        </div>
      )}

      {/* Quota */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[--text-secondary]">Quota:</span>
        {editingQuota ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={quotaInput}
              onChange={(e) => setQuotaInput(e.target.value)}
              placeholder="GB"
              className="w-20 rounded border border-[--border-subtle] bg-surface-2 px-2 py-1 text-xs text-[--text-primary] focus:border-[--border-focus] focus:outline-none"
              autoFocus
            />
            <span className="py-1 text-xs text-[--text-tertiary]">GB</span>
            <button onClick={handleSetQuota} className="text-xs text-[--accent]">Save</button>
            <button onClick={() => setEditingQuota(false)} className="text-xs text-[--text-tertiary]">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => {
              setQuotaInput((usage.quota_bytes / (1024 * 1024 * 1024)).toFixed(1));
              setEditingQuota(true);
            }}
            className="text-xs text-[--accent] hover:underline"
          >
            {formatBytes(usage.quota_bytes)}
          </button>
        )}
      </div>

      {/* Per-project breakdown */}
      {usage.by_project.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium text-[--text-secondary]">By Project</h4>
          <div className="space-y-1.5">
            {usage.by_project.map((p) => (
              <div key={p.project_id} className="flex items-center justify-between text-xs">
                <span className="text-[--text-secondary]">{p.project_name}</span>
                <span className="text-[--text-tertiary]">{formatBytes(p.bytes_used)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
