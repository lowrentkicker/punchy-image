import { Sidebar } from './sidebar/Sidebar';
import { ControlsPanel } from './controls/ControlsPanel';
import { ImageCanvas } from './canvas/ImageCanvas';
import { ErrorBanner } from './common/ErrorBanner';
import { ConnectivityBanner } from './common/ConnectivityBanner';
import { FallbackSuggestionModal } from './common/FallbackSuggestionModal';
import { SettingsPage } from './settings/SettingsPage';
import { HistoryPanel } from './history/HistoryPanel';
import { ConversationPanel } from './conversation/ConversationPanel';
import { ComposePanel } from './compose/ComposePanel';
import { TemplateLibrary } from './templates/TemplateLibrary';
import { useAppContext } from '../hooks/useAppContext';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

export function Workspace() {
  const { state, dispatch } = useAppContext();
  useResponsiveLayout();

  const renderView = () => {
    switch (state.activeView) {
      case 'workspace':
        return (
          <>
            <div className="flex min-w-0 flex-1 overflow-hidden">
              <ImageCanvas />
              {state.currentGeneration && !state.chatPanelDismissed && <ConversationPanel />}
            </div>
            <ControlsPanel />
          </>
        );
      case 'templates':
        return (
          <TemplateLibrary
            onSelectTemplate={(promptText) => {
              dispatch({ type: 'SET_PROMPT', prompt: promptText });
              dispatch({ type: 'SET_VIEW', view: 'workspace' });
            }}
          />
        );
      case 'compose':
        return <ComposePanel />;
      case 'history':
        return <HistoryPanel />;
      case 'settings':
        return <SettingsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ConnectivityBanner />
        <ErrorBanner />
        <div className="flex flex-1 overflow-hidden">
          {renderView()}
        </div>
      </div>
      <FallbackSuggestionModal />
    </div>
  );
}
