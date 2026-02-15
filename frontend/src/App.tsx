import { useEffect } from 'react';
import { useAppContext } from './hooks/useAppContext';
import { api } from './services/api';
import { ApiKeySetup } from './components/settings/ApiKeySetup';
import { Workspace } from './components/Workspace';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingSpinner } from './components/common/LoadingSpinner';

function App() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    async function init() {
      try {
        const [keyStatus, modelData] = await Promise.all([
          api.getApiKeyStatus(),
          api.getModels(),
        ]);
        dispatch({ type: 'SET_API_KEY_STATUS', configured: keyStatus.configured });
        dispatch({ type: 'SET_MODELS', models: modelData.models });
      } catch {
        dispatch({ type: 'SET_API_KEY_STATUS', configured: false });
      }
    }
    init();
  }, [dispatch]);

  // Still checking
  if (state.apiKeyConfigured === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-base">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // No API key — show setup
  if (!state.apiKeyConfigured) {
    return <ApiKeySetup />;
  }

  // Main workspace
  return (
    <ErrorBoundary>
      <Workspace />
    </ErrorBoundary>
  );
}

export default App;
