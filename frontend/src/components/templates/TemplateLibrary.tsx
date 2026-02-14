import { useState, useEffect, useCallback } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';
import type { PromptTemplate } from '../../types';

interface TemplateLibraryProps {
  onSelectTemplate: (promptText: string) => void;
}

export function TemplateLibrary({ onSelectTemplate }: TemplateLibraryProps) {
  const { dispatch } = useAppContext();
  const [builtin, setBuiltin] = useState<PromptTemplate[]>([]);
  const [user, setUser] = useState<PromptTemplate[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showSave, setShowSave] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveCategory, setSaveCategory] = useState('My Templates');
  const [savePrompt, setSavePrompt] = useState('');

  const loadTemplates = useCallback(async () => {
    try {
      const data = await api.listTemplates();
      setBuiltin(data.builtin);
      setUser(data.user);
      dispatch({ type: 'SET_TEMPLATES', templates: [...data.builtin, ...data.user] });
    } catch { /* handled */ }
  }, [dispatch]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const allTemplates = [...builtin, ...user];
  const categories = ['All', ...new Set(allTemplates.map((t) => t.category))];
  const filtered =
    selectedCategory === 'All'
      ? allTemplates
      : allTemplates.filter((t) => t.category === selectedCategory);

  const handleSelect = (template: PromptTemplate) => {
    onSelectTemplate(template.prompt_text);
  };

  const handleSaveTemplate = async () => {
    if (!saveName.trim() || !savePrompt.trim()) return;
    try {
      const template = await api.createTemplate(saveName.trim(), saveCategory, savePrompt.trim());
      dispatch({ type: 'ADD_TEMPLATE', template });
      setUser((prev) => [...prev, template]);
      setShowSave(false);
      setSaveName('');
      setSavePrompt('');
    } catch { /* handled */ }
  };

  const handleDelete = async (templateId: string) => {
    await api.deleteTemplate(templateId).catch(() => {});
    dispatch({ type: 'DELETE_TEMPLATE', templateId });
    setUser((prev) => prev.filter((t) => t.id !== templateId));
  };

  return (
    <div className="flex flex-1 flex-col bg-base">
      <div className="border-b border-[--border-default] bg-surface-1 px-6 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[--text-primary]">Templates</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSave(!showSave)}
              className="rounded-lg px-3 py-1.5 text-xs text-[--accent] hover:bg-[--accent]/10 transition-colors"
            >
              + Save Template
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_VIEW', view: 'workspace' })}
              className="rounded-lg px-3 py-1.5 text-xs text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary] transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </div>

      {showSave && (
        <div className="border-b border-[--border-default] bg-surface-1 px-6 py-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Template name"
              className="flex-1 rounded-lg border border-[--border-subtle] bg-surface-2 px-3 py-2 text-xs text-[--text-primary] focus:border-[--border-focus] focus:outline-none"
            />
            <input
              type="text"
              value={saveCategory}
              onChange={(e) => setSaveCategory(e.target.value)}
              placeholder="Category"
              className="w-32 rounded-lg border border-[--border-subtle] bg-surface-2 px-3 py-2 text-xs text-[--text-primary] focus:border-[--border-focus] focus:outline-none"
            />
          </div>
          <textarea
            value={savePrompt}
            onChange={(e) => setSavePrompt(e.target.value)}
            placeholder="Prompt text (use [brackets] for placeholders)"
            rows={2}
            className="w-full rounded-lg border border-[--border-subtle] bg-surface-2 px-3 py-2 text-xs text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none resize-none"
          />
          <button
            onClick={handleSaveTemplate}
            disabled={!saveName.trim() || !savePrompt.trim()}
            className="rounded-lg bg-[--cta-bg] px-4 py-2 text-xs font-medium text-[--cta-text] hover:opacity-90 disabled:opacity-30"
          >
            Save
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {/* Category filter */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs transition-colors ${
                selectedCategory === cat
                  ? 'bg-[--accent]/10 text-[--accent]'
                  : 'bg-surface-2 text-[--text-tertiary] hover:text-[--text-secondary]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => (
            <div
              key={template.id}
              className="group rounded-xl border border-[--border-subtle] bg-surface-1 p-4 hover:border-[--border-medium] transition-colors"
            >
              <div className="mb-1 flex items-start justify-between">
                <h3 className="text-xs font-medium text-[--text-primary]">{template.name}</h3>
                {template.is_builtin ? (
                  <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 text-[9px] text-[--text-tertiary]">
                    Built-in
                  </span>
                ) : (
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-[--text-tertiary] hover:text-red-400 transition-all"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <p className="mb-1 text-[10px] text-[--accent]/70">{template.category}</p>
              <p className="mb-3 text-[11px] leading-relaxed text-[--text-tertiary] line-clamp-3">
                {template.prompt_text}
              </p>
              <button
                onClick={() => handleSelect(template)}
                className="rounded-lg bg-surface-3 px-3 py-1.5 text-xs text-[--text-secondary] hover:bg-[--accent]/10 hover:text-[--accent] transition-colors"
              >
                Use Template
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="mt-8 text-center text-sm text-[--text-tertiary]">
            No templates in this category.
          </p>
        )}
      </div>
    </div>
  );
}
