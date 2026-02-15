import { useCallback, useEffect, useRef, useState } from 'react';
import { ModelSelector } from './ModelSelector';
import { ModelRecommendationBadge } from './ModelRecommendationBadge';
import { PromptInput } from './PromptInput';
import { GenerateButton } from './GenerateButton';
import { AspectRatioSelector } from './AspectRatioSelector';
import { ResolutionSelector } from './ResolutionSelector';
import { StylePresetSelector } from './StylePresetSelector';
import { NegativePrompt } from './NegativePrompt';
import { ReferenceUpload } from './ReferenceUpload';
import { StyleReferenceUpload } from './StyleReferenceUpload';
import { CharacterReferenceUpload } from './CharacterReferenceUpload';
import { ImageWeightSlider } from './ImageWeightSlider';
import { VariationsControl } from './VariationsControl';
import { ExportOptions } from './ExportOptions';
import { SubjectLockToggle } from './SubjectLockToggle';
import { CostEstimateDisplay } from './CostEstimateDisplay';
import { CollapsibleSection } from './CollapsibleSection';
import { useGenerate } from '../../hooks/useGenerate';
import { useAppContext } from '../../hooks/useAppContext';

const MIN_WIDTH = 240;
const MAX_WIDTH = 420;
const STORAGE_KEY = 'imagegen-controls-width';

function getStoredWidth(): number | null {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val) {
      const n = parseInt(val, 10);
      if (n >= MIN_WIDTH && n <= MAX_WIDTH) return n;
    }
  } catch {}
  return null;
}

export function ControlsPanel() {
  const { state, dispatch } = useAppContext();
  const prompt = state.prompt;
  const setPrompt = (value: string) => dispatch({ type: 'SET_PROMPT', prompt: value });
  const { generate, cancel, isGenerating } = useGenerate();
  const collapsed = state.controlsCollapsed;

  // References section: auto-expand when images are present, manual toggle otherwise
  const hasReferenceContent = !!(
    state.referenceImage ||
    state.styleReference ||
    state.characterReferences.length > 0
  );
  const referenceCount =
    (state.referenceImage ? 1 : 0) +
    (state.styleReference ? 1 : 0) +
    state.characterReferences.length;
  const [refsManualOpen, setRefsManualOpen] = useState(false);

  const [width, setWidth] = useState<number | null>(getStoredWidth);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width ?? 280;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      // Dragging left edge: moving mouse left = wider, right = narrower
      const delta = startX.current - e.clientX;
      const newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Persist width changes
  useEffect(() => {
    if (width !== null) {
      try { localStorage.setItem(STORAGE_KEY, String(width)); } catch {}
    }
  }, [width]);

  const handleGenerate = () => {
    if (prompt.trim()) {
      generate(prompt);
    }
  };

  if (collapsed) {
    return (
      <div className="flex w-[--sidebar-collapsed] flex-col items-center border-l border-[--border-default] bg-surface-1 py-4">
        <button
          onClick={() => dispatch({ type: 'TOGGLE_CONTROLS' })}
          className="rounded-full p-2 text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary] transition-colors duration-150"
          aria-label="Expand controls"
        >
          <svg className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    );
  }

  const panelStyle = width ? { width: `${width}px` } : {};

  return (
    <div
      className={`relative flex shrink-0 flex-col border-l border-[--border-default] bg-surface-1 ${width ? '' : 'w-[--controls-width]'}`}
      style={panelStyle}
    >
      {/* Resize handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent/30 active:bg-accent/50 transition-colors z-10"
      />

      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-sm font-semibold text-[--text-primary]">Controls</span>
        <button
          onClick={() => dispatch({ type: 'TOGGLE_CONTROLS' })}
          className="rounded-full p-1.5 text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary] transition-colors duration-150"
          aria-label="Collapse controls"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Scrollable controls */}
      <div
        className={`flex-1 overflow-y-auto px-4 pb-4 space-y-5 ${
          isGenerating ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        {/* Always visible — core generation controls */}
        <PromptInput
          value={prompt}
          onChange={setPrompt}
          onSubmit={handleGenerate}
          disabled={isGenerating}
        />
        <ModelSelector />
        <ModelRecommendationBadge />
        <StylePresetSelector />
        <AspectRatioSelector />
        <ResolutionSelector />

        {/* References — collapsed by default, auto-expands when images present */}
        <CollapsibleSection
          title="References"
          data-tour="references-section"
          storageKey="imagegen-section-references"
          expanded={hasReferenceContent || refsManualOpen}
          onToggle={setRefsManualOpen}
          badge={referenceCount || undefined}
        >
          <ReferenceUpload />
          <StyleReferenceUpload />
          <CharacterReferenceUpload />
          <ImageWeightSlider />
        </CollapsibleSection>

        {/* Advanced — collapsed by default */}
        <CollapsibleSection
          title="Advanced"
          data-tour="advanced-section"
          storageKey="imagegen-section-advanced"
        >
          <VariationsControl />
          <SubjectLockToggle />
          <NegativePrompt />
          <ExportOptions />
        </CollapsibleSection>
      </div>

      {/* Pinned footer: cost estimate + generate */}
      <div className="border-t border-[--border-default] p-4 space-y-2">
        <CostEstimateDisplay />
        <GenerateButton
          isGenerating={isGenerating}
          onGenerate={handleGenerate}
          onCancel={cancel}
          disabled={!prompt.trim() || !state.selectedModelId}
        />
        {(prompt.trim() || state.currentGeneration) && !isGenerating && (
          <button
            onClick={() => dispatch({ type: 'RESET_WORKSPACE' })}
            className="w-full py-1.5 text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors duration-150"
          >
            New Image
          </button>
        )}
      </div>
    </div>
  );
}
