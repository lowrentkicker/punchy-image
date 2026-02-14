import { useState, useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';

export function ProjectSelector() {
  const { state, dispatch } = useAppContext();
  const { projects, currentProjectId, sidebarCollapsed } = state;
  const [showMenu, setShowMenu] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    api.listProjects().then((data) => {
      dispatch({ type: 'SET_PROJECTS', projects: data.projects });
      dispatch({ type: 'SET_CURRENT_PROJECT', projectId: data.current_project_id });
    }).catch(() => {});
  }, [dispatch]);

  const currentProject = projects.find((p) => p.id === currentProjectId);
  const displayName = currentProject?.name ?? currentProjectId;

  const handleSwitch = async (projectId: string) => {
    setShowMenu(false);
    await api.switchProject(projectId).catch(() => {});
    dispatch({ type: 'SET_CURRENT_PROJECT', projectId });
    // Reload history for the new project
    const history = await api.getHistory().catch(() => ({ entries: [] }));
    dispatch({ type: 'SET_HISTORY', history: history.entries ?? [] });
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const project = await api.createProject(newName.trim());
      dispatch({ type: 'ADD_PROJECT', project });
      await handleSwitch(project.id);
      setNewName('');
      setShowCreate(false);
    } catch { /* handled */ }
  };

  const handleDelete = async (projectId: string) => {
    if (projectId === 'default') return;
    await api.deleteProject(projectId).catch(() => {});
    dispatch({ type: 'DELETE_PROJECT', projectId });
    if (currentProjectId === projectId) {
      await handleSwitch('default');
    }
  };

  if (sidebarCollapsed) {
    return (
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="mx-auto rounded-lg p-1.5 text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary] transition-colors"
        title={displayName}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="relative px-2 pb-2">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[--text-secondary] hover:bg-surface-2 transition-colors"
      >
        <svg className="h-3.5 w-3.5 shrink-0 text-[--text-tertiary]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        <span className="truncate">{displayName}</span>
        <svg className="ml-auto h-3 w-3 shrink-0 text-[--text-tertiary]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
          <div className="absolute left-2 right-2 top-full z-30 mt-1 rounded-lg border border-[--border-default] bg-surface-2 p-1 shadow-xl shadow-black/30">
            {projects.map((project) => (
              <div
                key={project.id}
                className={`group flex items-center rounded-md px-2 py-1.5 text-xs transition-colors ${
                  project.id === currentProjectId
                    ? 'bg-[--accent]/10 text-[--accent]'
                    : 'text-[--text-primary] hover:bg-surface-3'
                }`}
              >
                <button
                  onClick={() => handleSwitch(project.id)}
                  className="flex-1 text-left truncate"
                >
                  {project.name}
                </button>
                {project.id !== 'default' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project.id);
                    }}
                    className="ml-1 opacity-0 group-hover:opacity-100 text-[--text-tertiary] hover:text-red-400 transition-all"
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}

            <div className="mt-1 border-t border-[--border-subtle] pt-1">
              {showCreate ? (
                <div className="flex gap-1 px-1">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    placeholder="Project name"
                    className="flex-1 rounded border border-[--border-subtle] bg-surface-3 px-2 py-1 text-xs text-[--text-primary] focus:border-[--border-focus] focus:outline-none"
                    autoFocus
                  />
                  <button onClick={handleCreate} className="text-xs text-[--accent] hover:text-[--accent]/80">
                    Add
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCreate(true)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-[--text-tertiary] hover:bg-surface-3 hover:text-[--text-secondary] transition-colors"
                >
                  + New Project
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
