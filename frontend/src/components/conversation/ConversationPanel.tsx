import { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';
import type { ConversationTurn, GenerationError, TokenUsage } from '../../types';

export function ConversationPanel() {
  const { state, dispatch } = useAppContext();
  const { conversationSession: session, selectedModelId, isGenerating } = state;
  const [prompt, setPrompt] = useState('');
  const [tokenUsage, setTokenUsage] = useState<TokenUsage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const selectedModel = state.models.find((m) => m.id === selectedModelId);
  const isConversational = selectedModel?.type === 'conversational';

  // Auto-scroll to bottom when turns change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [session?.branches]);

  // Fetch token usage when session changes
  useEffect(() => {
    if (!session) return;
    api.getTokenUsage(session.session_id).then(setTokenUsage).catch(() => {});
  }, [session?.branches, session?.session_id]);

  // Don't show for image-only models
  if (!isConversational) return null;

  const handleStartSession = async () => {
    if (!selectedModelId) return;
    try {
      const newSession = await api.createConversationSession(selectedModelId);
      dispatch({ type: 'SET_CONVERSATION_SESSION', session: newSession });
    } catch {
      // Error handled by global error banner
    }
  };

  const handleSend = async () => {
    if (!session || !prompt.trim() || isGenerating) return;
    dispatch({ type: 'START_GENERATION', requestId: crypto.randomUUID() });
    try {
      const result = await api.conversationEdit({
        session_id: session.session_id,
        prompt: prompt.trim(),
        aspect_ratio: state.aspectRatio,
        resolution: state.resolution !== '1K' ? state.resolution : null,
        style_preset: state.stylePreset !== 'none' ? state.stylePreset : null,
        negative_prompt: state.negativePrompt.trim() || null,
      });
      dispatch({ type: 'GENERATION_SUCCESS', result });
      // Refresh session to get updated turns
      const updated = await api.getConversationSession(session.session_id);
      dispatch({ type: 'SET_CONVERSATION_SESSION', session: updated });
      setPrompt('');
    } catch (err) {
      dispatch({ type: 'GENERATION_ERROR', error: err as GenerationError });
    }
  };

  const handleUndo = async () => {
    if (!session) return;
    await api.undoTurn(session.session_id);
    const updated = await api.getConversationSession(session.session_id);
    dispatch({ type: 'SET_CONVERSATION_SESSION', session: updated });
  };

  const handleRevert = async (turnIndex: number) => {
    if (!session) return;
    await api.revertToTurn(session.session_id, turnIndex);
    const updated = await api.getConversationSession(session.session_id);
    dispatch({ type: 'SET_CONVERSATION_SESSION', session: updated });
  };

  const handleBranch = async (turnIndex: number) => {
    if (!session) return;
    await api.branchFromTurn(session.session_id, turnIndex);
    const updated = await api.getConversationSession(session.session_id);
    dispatch({ type: 'SET_CONVERSATION_SESSION', session: updated });
  };

  const handleSwitchBranch = async (branchId: string) => {
    if (!session) return;
    await api.switchBranch(session.session_id, branchId);
    const updated = await api.getConversationSession(session.session_id);
    dispatch({ type: 'SET_CONVERSATION_SESSION', session: updated });
  };

  const handleNewSession = async () => {
    if (!selectedModelId) return;
    if (!window.confirm('Start a new session? Current conversation will be saved.')) return;
    const newSession = await api.createConversationSession(selectedModelId);
    dispatch({ type: 'SET_CONVERSATION_SESSION', session: newSession });
  };

  // No session yet — show start button
  if (!session) {
    return (
      <div className="flex w-80 shrink-0 flex-col border-r border-[--border-default] bg-surface-1">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-default]">
          <span className="text-sm font-semibold text-[--text-primary]">Chat</span>
        </div>
        <div className="flex flex-1 items-center justify-center p-4">
          <button
            onClick={handleStartSession}
            className="rounded-xl bg-[--cta-bg] px-4 py-2 text-sm font-medium text-[--cta-text] hover:opacity-90 transition-opacity"
          >
            Start Editing Session
          </button>
        </div>
      </div>
    );
  }

  const activeBranch = session.branches.find((b) => b.branch_id === session.active_branch_id);
  const turns = activeBranch?.turns ?? [];

  return (
    <div className="flex w-80 shrink-0 flex-col border-r border-[--border-default] bg-surface-1">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-default]">
        <span className="text-sm font-semibold text-[--text-primary]">Chat</span>
        <div className="flex gap-1">
          <button
            onClick={handleUndo}
            disabled={turns.length === 0}
            className="rounded-lg p-1.5 text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary] transition-colors disabled:opacity-30"
            title="Undo last turn"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={handleNewSession}
            className="rounded-lg p-1.5 text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary] transition-colors"
            title="New session"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Branch selector */}
      {session.branches.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-[--border-default] px-4 py-2">
          {session.branches.map((branch) => (
            <button
              key={branch.branch_id}
              onClick={() => handleSwitchBranch(branch.branch_id)}
              className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors ${
                branch.branch_id === session.active_branch_id
                  ? 'bg-[--accent]/10 text-[--accent] border border-[--accent]/30'
                  : 'text-[--text-tertiary] hover:text-[--text-secondary] border border-transparent'
              }`}
            >
              {branch.name}
            </button>
          ))}
        </div>
      )}

      {/* Token usage warning */}
      {tokenUsage?.near_limit && (
        <div className="mx-4 mt-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-[10px] text-amber-400">
          Context {Math.round(tokenUsage.usage_ratio * 100)}% full. Consider starting a new session.
        </div>
      )}

      {/* Turn history */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {turns.length === 0 && (
          <p className="text-center text-xs text-[--text-tertiary] mt-8">
            Send a prompt to start editing
          </p>
        )}
        {turns.map((turn, i) => (
          <TurnItem
            key={turn.turn_id}
            turn={turn}
            index={i}
            onRevert={() => handleRevert(i)}
            onBranch={() => handleBranch(i)}
            onSelectImage={() => {
              if (turn.image_url) {
                dispatch({
                  type: 'GENERATION_SUCCESS',
                  result: {
                    image_id: turn.image_id!,
                    image_url: turn.image_url,
                    thumbnail_url: turn.thumbnail_url!,
                    text_response: turn.text_response,
                    model_id: session.model_id,
                    prompt: turn.prompt ?? '',
                    timestamp: turn.timestamp,
                    usage: null,
                    aspect_ratio: null,
                    resolution: null,
                    style_preset: null,
                    negative_prompt: null,
                    image_weight: null,
                    batch_id: null,
                  },
                });
              }
            }}
          />
        ))}
      </div>

      {/* Input */}
      <div className="border-t border-[--border-default] p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe your edit..."
            disabled={isGenerating}
            className="flex-1 rounded-xl border border-[--border-subtle] bg-surface-2 px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!prompt.trim() || isGenerating}
            className="rounded-xl bg-[--cta-bg] px-3 py-2 text-sm font-medium text-[--cta-text] hover:opacity-90 transition-opacity disabled:opacity-30"
          >
            {isGenerating ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TurnItem({
  turn,
  index,
  onRevert,
  onBranch,
  onSelectImage,
}: {
  turn: ConversationTurn;
  index: number;
  onRevert: () => void;
  onBranch: () => void;
  onSelectImage: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  if (turn.role === 'user') {
    return (
      <div
        className="group relative"
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="ml-8 rounded-xl bg-surface-3 px-3 py-2">
          <p className="text-xs text-[--text-primary]">{turn.prompt}</p>
        </div>
        {showActions && (
          <div className="absolute -left-1 top-0 flex flex-col gap-0.5">
            <button
              onClick={onRevert}
              className="rounded p-0.5 text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-surface-2 transition-colors"
              title={`Revert to step ${index}`}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
              </svg>
            </button>
            <button
              onClick={onBranch}
              className="rounded p-0.5 text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-surface-2 transition-colors"
              title="Branch from here"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Assistant turn
  return (
    <div className="space-y-1">
      {turn.image_url && (
        <button onClick={onSelectImage} className="block">
          <img
            src={turn.thumbnail_url ?? turn.image_url}
            alt="Generated"
            className="h-24 w-24 rounded-lg border border-[--border-subtle] object-cover hover:border-[--accent] transition-colors cursor-pointer"
          />
        </button>
      )}
      {turn.text_response && (
        <p className="text-xs text-[--text-secondary] leading-relaxed">{turn.text_response}</p>
      )}
    </div>
  );
}
