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
import { TextInImageControl } from './TextInImageControl';
import { ExportOptions } from './ExportOptions';
import { SubjectLockToggle } from './SubjectLockToggle';
import { CostEstimateDisplay } from './CostEstimateDisplay';
import { useGenerate } from '../../hooks/useGenerate';
import { useAppContext } from '../../hooks/useAppContext';

export function ControlsPanel() {
  const { state, dispatch } = useAppContext();
  const prompt = state.prompt;
  const setPrompt = (value: string) => dispatch({ type: 'SET_PROMPT', prompt: value });
  const { generate, cancel, isGenerating } = useGenerate();
  const collapsed = state.controlsCollapsed;

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

  return (
    <div className="flex w-[--controls-width] shrink-0 flex-col border-l border-[--border-default] bg-surface-1 transition-all duration-250 ease-out">
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
        <VariationsControl />
        <ReferenceUpload />
        <StyleReferenceUpload />
        <CharacterReferenceUpload />
        <ImageWeightSlider />
        <TextInImageControl />
        <SubjectLockToggle />
        <NegativePrompt />
        <ExportOptions />
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
      </div>
    </div>
  );
}
