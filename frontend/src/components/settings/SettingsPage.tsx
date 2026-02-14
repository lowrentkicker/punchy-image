import { useState } from 'react';
import { api } from '../../services/api';
import { useAppContext } from '../../hooks/useAppContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { CostTrackingSection } from './CostTrackingSection';
import { StorageSection } from './StorageSection';

export function SettingsPage() {
  const { dispatch } = useAppContext();
  const [newKey, setNewKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.testConnection();
      setTestResult(result);
    } catch {
      setTestResult({ success: false, message: 'Failed to test connection' });
    } finally {
      setTesting(false);
    }
  };

  const handleUpdateKey = async () => {
    if (!newKey.trim()) return;
    try {
      await api.setApiKey(newKey.trim());
      setNewKey('');
      setTestResult({ success: true, message: 'API key updated' });
    } catch {
      setTestResult({ success: false, message: 'Failed to update API key' });
    }
  };

  const handleRemoveKey = async () => {
    try {
      await api.deleteApiKey();
      dispatch({ type: 'SET_API_KEY_STATUS', configured: false });
    } catch {
      setTestResult({ success: false, message: 'Failed to remove API key' });
    }
  };

  return (
    <div className="flex flex-1 items-start justify-center overflow-y-auto bg-base p-8">
      <div className="w-full max-w-lg rounded-2xl border border-[--border-default] bg-surface-1 p-6">
        <h2 className="mb-4 text-xl font-bold text-[--text-primary]">Settings</h2>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[--text-primary]">API Key</h3>
            <p className="text-xs text-[--text-tertiary]">
              Your OpenRouter API key is stored locally and never sent to the
              frontend.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 rounded-xl border border-[--border-medium] px-3 py-1.5 text-sm text-[--text-secondary] hover:bg-surface-2 disabled:opacity-50 transition-colors duration-150"
            >
              {testing && <LoadingSpinner size="sm" />}
              Test Connection
            </button>
            <button
              onClick={handleRemoveKey}
              className="rounded-xl border border-error-hex/30 px-3 py-1.5 text-sm text-[--color-error] hover:bg-error-hex/10 transition-colors duration-150"
            >
              Remove Key
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Enter new API key..."
              className="flex-1 rounded-xl border border-[--border-subtle] bg-surface-2 px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none transition-colors duration-150"
            />
            <button
              onClick={handleUpdateKey}
              disabled={!newKey.trim()}
              className="rounded-xl bg-accent px-3 py-2 text-sm font-medium text-cta-text hover:brightness-110 disabled:opacity-50 transition-all duration-150"
            >
              Update
            </button>
          </div>

          {testResult && (
            <div
              className={`rounded-xl p-3 text-sm ${
                testResult.success
                  ? 'bg-success-hex/10 text-[--color-success]'
                  : 'bg-error-hex/10 text-[--color-error]'
              }`}
            >
              {testResult.message}
            </div>
          )}
        </div>

        <hr className="border-[--border-default]" />
        <CostTrackingSection />

        <hr className="border-[--border-default]" />
        <StorageSection />
      </div>
    </div>
  );
}
