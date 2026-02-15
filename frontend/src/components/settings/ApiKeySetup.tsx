import { useState } from 'react';
import { api } from '../../services/api';
import { useAppContext } from '../../hooks/useAppContext';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function ApiKeySetup() {
  const { dispatch } = useAppContext();
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      // Save first so the backend can use it for the test
      await api.setApiKey(apiKey.trim());
      const result = await api.testConnection();
      setTestResult(result);
      if (!result.success) {
        // Remove the key if test failed
        await api.deleteApiKey();
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to test connection' });
      await api.deleteApiKey().catch(() => {});
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    try {
      await api.setApiKey(apiKey.trim());
      dispatch({ type: 'SET_API_KEY_STATUS', configured: true });
      // Auto-launch tour for first-time users
      const tourCompleted = localStorage.getItem('imagegen-tour-completed') === 'true';
      if (!tourCompleted) {
        setTimeout(() => dispatch({ type: 'START_TOUR' }), 600);
      }
    } catch {
      setTestResult({ success: false, message: 'Failed to save API key' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-base">
      <div className="w-full max-w-md rounded-2xl border border-[--border-default] bg-surface-1 p-8 shadow-2xl shadow-black/50">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-[--text-primary]">Punchy Image</h1>
          <p className="mt-2 text-sm text-[--text-secondary]">
            AI image generation from natural language
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor="api-key"
              className="mb-1.5 block text-sm font-medium text-[--text-secondary]"
            >
              OpenRouter API Key
            </label>
            <input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-or-..."
              className="w-full rounded-2xl border border-[--border-subtle] bg-surface-2 px-4 py-3 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none transition-colors duration-150"
            />
            <p className="mt-1.5 text-xs text-[--text-tertiary]">
              Get your API key at{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[--color-info] underline"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={!apiKey.trim() || testing}
              className="flex items-center gap-2 rounded-xl border border-[--border-medium] px-4 py-2.5 text-sm font-medium text-[--text-secondary] hover:bg-surface-2 disabled:opacity-50 transition-colors duration-150"
            >
              {testing && <LoadingSpinner size="sm" />}
              Test Connection
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey.trim() || saving}
              className="flex-1 h-12 rounded-3xl bg-cta-bg text-cta-text text-sm font-semibold hover:brightness-110 disabled:opacity-50 transition-all duration-150"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
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
      </div>
    </div>
  );
}
