import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';

export function SubjectLockToggle() {
  const { state, dispatch } = useAppContext();
  const { conversationSession, currentGeneration, subjectLocked, subjectLockImageId } = state;

  // Only show when in a conversation session
  if (!conversationSession) return null;

  const handleToggle = async () => {
    if (subjectLocked) {
      // Unlock
      await api.toggleSubjectLock(conversationSession.session_id, false).catch(() => {});
      dispatch({ type: 'SET_SUBJECT_LOCK', locked: false, imageId: null });
    } else if (currentGeneration) {
      // Lock to current image
      await api
        .toggleSubjectLock(conversationSession.session_id, true, currentGeneration.image_id)
        .catch(() => {});
      dispatch({
        type: 'SET_SUBJECT_LOCK',
        locked: true,
        imageId: currentGeneration.image_id,
      });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-[--text-secondary]">Lock Subject</label>
        <button
          onClick={handleToggle}
          disabled={!currentGeneration && !subjectLocked}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ${
            subjectLocked ? 'bg-[--accent]' : 'bg-surface-3'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform duration-200 ${
              subjectLocked ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {subjectLocked && subjectLockImageId && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-8 w-8 rounded border border-[--accent]/30 bg-[--accent]/5 flex items-center justify-center">
            <svg className="h-4 w-4 text-[--accent]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="text-[10px] text-[--text-tertiary]">Subject identity preserved</span>
        </div>
      )}
    </div>
  );
}
