import { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useAppContext } from '../../hooks/useAppContext';
import type { CostTracking } from '../../types';

export function CostTrackingSection() {
  const { dispatch } = useAppContext();
  const [tracking, setTracking] = useState<CostTracking | null>(null);
  const [limitInput, setLimitInput] = useState('');
  const [editingLimit, setEditingLimit] = useState(false);

  useEffect(() => {
    api.getCostTracking().then(setTracking).catch(() => {});
  }, []);

  useEffect(() => {
    if (tracking?.spend_limit != null && tracking.all_time_total >= tracking.spend_limit) {
      dispatch({ type: 'SET_SPEND_LIMIT_WARNING', warning: true });
    }
  }, [tracking, dispatch]);

  const handleSetLimit = async () => {
    const value = parseFloat(limitInput);
    if (isNaN(value) || value <= 0) {
      await api.setSpendLimit(null);
    } else {
      await api.setSpendLimit(value);
    }
    setEditingLimit(false);
    api.getCostTracking().then(setTracking).catch(() => {});
  };

  if (!tracking) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[--text-primary]">Cost Tracking</h3>
        <p className="text-[10px] text-[--text-tertiary]">{tracking.disclaimer}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-[--border-subtle] bg-surface-2 p-3">
          <p className="text-[10px] text-[--text-tertiary]">Session</p>
          <p className="text-lg font-semibold text-[--text-primary]">
            ${tracking.session_total.toFixed(4)}
          </p>
        </div>
        <div className="rounded-lg border border-[--border-subtle] bg-surface-2 p-3">
          <p className="text-[10px] text-[--text-tertiary]">All Time</p>
          <p className="text-lg font-semibold text-[--text-primary]">
            ${tracking.all_time_total.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Spend limit */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[--text-secondary]">Spend limit:</span>
        {editingLimit ? (
          <div className="flex gap-1">
            <input
              type="text"
              value={limitInput}
              onChange={(e) => setLimitInput(e.target.value)}
              placeholder="e.g. 10.00"
              className="w-24 rounded border border-[--border-subtle] bg-surface-2 px-2 py-1 text-xs text-[--text-primary] focus:border-[--border-focus] focus:outline-none"
              autoFocus
            />
            <button onClick={handleSetLimit} className="text-xs text-[--accent]">Save</button>
            <button onClick={() => setEditingLimit(false)} className="text-xs text-[--text-tertiary]">Cancel</button>
          </div>
        ) : (
          <button
            onClick={() => {
              setLimitInput(tracking.spend_limit?.toString() ?? '');
              setEditingLimit(true);
            }}
            className="text-xs text-[--accent] hover:underline"
          >
            {tracking.spend_limit != null ? `$${tracking.spend_limit.toFixed(2)}` : 'Set limit'}
          </button>
        )}
      </div>

      {tracking.spend_limit != null && tracking.all_time_total >= tracking.spend_limit && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          Spend limit reached. Generation is not blocked, but you may want to review your usage.
        </div>
      )}

      {/* Recent entries */}
      {tracking.recent_entries.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium text-[--text-secondary]">Recent Spend</h4>
          <div className="max-h-40 overflow-y-auto rounded-lg border border-[--border-subtle]">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-surface-2">
                <tr className="text-[--text-tertiary]">
                  <th className="px-2 py-1 text-left">Date</th>
                  <th className="px-2 py-1 text-left">Model</th>
                  <th className="px-2 py-1 text-right">Cost</th>
                </tr>
              </thead>
              <tbody>
                {tracking.recent_entries.slice(-20).reverse().map((entry, i) => (
                  <tr key={i} className="border-t border-[--border-subtle] text-[--text-secondary]">
                    <td className="px-2 py-1">{new Date(entry.date).toLocaleDateString()}</td>
                    <td className="px-2 py-1">{entry.model_name}</td>
                    <td className="px-2 py-1 text-right">${entry.estimated_cost.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export */}
      <a
        href={api.getCostExportUrl()}
        download
        className="inline-block rounded-lg border border-[--border-medium] px-3 py-1.5 text-xs text-[--text-secondary] hover:bg-surface-2 transition-colors"
      >
        Export as CSV
      </a>
    </div>
  );
}
