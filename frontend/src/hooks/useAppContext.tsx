import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react';
import type {
  AppState,
  GenerationResult,
  GenerationError,
  Model,
  ReferenceImage,
  CostEstimate,
  StylePreset,
  HistoryEntry,
  ModelRecommendation,
  ConversationSession,
  Project,
  PromptTemplate,
  FallbackSuggestion,
} from '../types';

export type Action =
  | { type: 'SET_API_KEY_STATUS'; configured: boolean }
  | { type: 'SET_MODELS'; models: Model[] }
  | { type: 'SELECT_MODEL'; modelId: string }
  | { type: 'START_GENERATION'; requestId: string }
  | { type: 'GENERATION_SUCCESS'; result: GenerationResult }
  | { type: 'GENERATION_ERROR'; error: GenerationError }
  | { type: 'CANCEL_GENERATION' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'TOGGLE_SETTINGS'; show: boolean }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'TOGGLE_CONTROLS' }
  | { type: 'SET_SIDEBAR_COLLAPSED'; collapsed: boolean }
  | { type: 'SET_CONTROLS_COLLAPSED'; collapsed: boolean }
  | { type: 'SET_VIEW'; view: 'workspace' | 'settings' | 'history' | 'compose' | 'templates' }
  | { type: 'SET_PROMPT'; prompt: string }
  // Phase 2
  | { type: 'SET_ASPECT_RATIO'; aspectRatio: string | null }
  | { type: 'SET_RESOLUTION'; resolution: string }
  | { type: 'SET_STYLE_PRESET'; stylePreset: string }
  | { type: 'SET_NEGATIVE_PROMPT'; negativePrompt: string }
  | { type: 'SET_REFERENCE_IMAGE'; referenceImage: ReferenceImage | null }
  | { type: 'SET_COST_ESTIMATE'; costEstimate: CostEstimate | null }
  | { type: 'SET_STYLE_PRESETS'; stylePresets: StylePreset[] }
  | { type: 'SET_HISTORY'; history: HistoryEntry[] }
  | { type: 'REMOVE_HISTORY_ENTRY'; imageId: string }
  // Phase 3
  | { type: 'SET_IMAGE_WEIGHT'; imageWeight: number }
  | { type: 'SET_STYLE_REFERENCE'; styleReference: ReferenceImage | null }
  | { type: 'ADD_CHARACTER_REFERENCE'; reference: ReferenceImage }
  | { type: 'REMOVE_CHARACTER_REFERENCE'; referenceId: string }
  | { type: 'SET_VARIATIONS'; variations: number }
  | { type: 'SET_MULTI_MODEL'; multiModel: boolean }
  | { type: 'BATCH_GENERATION_SUCCESS'; results: GenerationResult[]; batchId: string }
  | { type: 'SET_MODEL_RECOMMENDATION'; recommendation: ModelRecommendation | null }
  | { type: 'SET_EXPORT_FORMAT'; format: 'png' | 'jpeg' | 'webp' }
  | { type: 'SET_EXPORT_QUALITY'; quality: number }
  // Phase 4
  | { type: 'SET_CONVERSATION_SESSION'; session: ConversationSession | null }
  | { type: 'SET_MASK_MODE'; enabled: boolean }
  | { type: 'SET_SUBJECT_LOCK'; locked: boolean; imageId: string | null }
  // Phase 5
  | { type: 'SET_PROJECTS'; projects: Project[] }
  | { type: 'SET_CURRENT_PROJECT'; projectId: string }
  | { type: 'ADD_PROJECT'; project: Project }
  | { type: 'DELETE_PROJECT'; projectId: string }
  | { type: 'SET_TEMPLATES'; templates: PromptTemplate[] }
  | { type: 'ADD_TEMPLATE'; template: PromptTemplate }
  | { type: 'DELETE_TEMPLATE'; templateId: string }
  | { type: 'SET_ONLINE_STATUS'; online: boolean }
  | { type: 'SET_FALLBACK_SUGGESTION'; suggestion: FallbackSuggestion | null }
  | { type: 'SET_STORAGE_WARNING'; level: null | 'warning' | 'critical' }
  | { type: 'SET_SPEND_LIMIT_WARNING'; warning: boolean };

const initialState: AppState = {
  apiKeyConfigured: null,
  models: [],
  selectedModelId: null,
  currentGeneration: null,
  isGenerating: false,
  error: null,
  requestId: null,
  showSettings: false,
  sidebarCollapsed: false,
  controlsCollapsed: false,
  activeView: 'workspace',
  prompt: '',
  // Phase 2
  aspectRatio: null,
  resolution: '1K',
  stylePreset: 'none',
  negativePrompt: '',
  referenceImage: null,
  costEstimate: null,
  stylePresets: [],
  history: [],
  // Phase 3
  imageWeight: 50,
  styleReference: null,
  characterReferences: [],
  variations: 1,
  multiModel: false,
  batchResults: null,
  modelRecommendation: null,
  exportFormat: 'png',
  exportQuality: 90,
  // Phase 4
  conversationSession: null,
  isMaskMode: false,
  subjectLocked: false,
  subjectLockImageId: null,
  // Phase 5
  projects: [],
  currentProjectId: 'default',
  templates: [],
  isOnline: true,
  fallbackSuggestion: null,
  storageWarningLevel: null,
  spendLimitWarning: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_API_KEY_STATUS':
      return { ...state, apiKeyConfigured: action.configured };
    case 'SET_MODELS':
      return {
        ...state,
        models: action.models,
        selectedModelId: state.selectedModelId ?? action.models[0]?.id ?? null,
      };
    case 'SELECT_MODEL':
      return { ...state, selectedModelId: action.modelId };
    case 'START_GENERATION':
      return { ...state, isGenerating: true, error: null, requestId: action.requestId, batchResults: null };
    case 'GENERATION_SUCCESS':
      return {
        ...state,
        isGenerating: false,
        currentGeneration: action.result,
        batchResults: null,
        requestId: null,
      };
    case 'GENERATION_ERROR':
      return { ...state, isGenerating: false, error: action.error, requestId: null };
    case 'CANCEL_GENERATION':
      return { ...state, isGenerating: false, requestId: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'TOGGLE_SETTINGS':
      return { ...state, showSettings: action.show, activeView: action.show ? 'settings' : 'workspace' };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed };
    case 'TOGGLE_CONTROLS':
      return { ...state, controlsCollapsed: !state.controlsCollapsed };
    case 'SET_SIDEBAR_COLLAPSED':
      return { ...state, sidebarCollapsed: action.collapsed };
    case 'SET_CONTROLS_COLLAPSED':
      return { ...state, controlsCollapsed: action.collapsed };
    case 'SET_VIEW':
      return { ...state, activeView: action.view, showSettings: action.view === 'settings' };
    case 'SET_PROMPT':
      return { ...state, prompt: action.prompt };
    // Phase 2
    case 'SET_ASPECT_RATIO':
      return { ...state, aspectRatio: action.aspectRatio };
    case 'SET_RESOLUTION':
      return { ...state, resolution: action.resolution };
    case 'SET_STYLE_PRESET':
      return { ...state, stylePreset: action.stylePreset };
    case 'SET_NEGATIVE_PROMPT':
      return { ...state, negativePrompt: action.negativePrompt };
    case 'SET_REFERENCE_IMAGE':
      return { ...state, referenceImage: action.referenceImage };
    case 'SET_COST_ESTIMATE':
      return { ...state, costEstimate: action.costEstimate };
    case 'SET_STYLE_PRESETS':
      return { ...state, stylePresets: action.stylePresets };
    case 'SET_HISTORY':
      return { ...state, history: action.history };
    case 'REMOVE_HISTORY_ENTRY':
      return { ...state, history: state.history.filter((e) => e.image_id !== action.imageId) };
    // Phase 3
    case 'SET_IMAGE_WEIGHT':
      return { ...state, imageWeight: action.imageWeight };
    case 'SET_STYLE_REFERENCE':
      return { ...state, styleReference: action.styleReference };
    case 'ADD_CHARACTER_REFERENCE':
      if (state.characterReferences.length >= 5) return state;
      return { ...state, characterReferences: [...state.characterReferences, action.reference] };
    case 'REMOVE_CHARACTER_REFERENCE':
      return {
        ...state,
        characterReferences: state.characterReferences.filter(
          (r) => r.reference_id !== action.referenceId,
        ),
      };
    case 'SET_VARIATIONS':
      return { ...state, variations: Math.max(1, Math.min(4, action.variations)) };
    case 'SET_MULTI_MODEL':
      return { ...state, multiModel: action.multiModel };
    case 'BATCH_GENERATION_SUCCESS':
      return {
        ...state,
        isGenerating: false,
        batchResults: action.results,
        currentGeneration: action.results[0] ?? null,
        requestId: null,
      };
    case 'SET_MODEL_RECOMMENDATION':
      return { ...state, modelRecommendation: action.recommendation };
    case 'SET_EXPORT_FORMAT':
      return { ...state, exportFormat: action.format };
    case 'SET_EXPORT_QUALITY':
      return { ...state, exportQuality: action.quality };
    // Phase 4
    case 'SET_CONVERSATION_SESSION':
      return { ...state, conversationSession: action.session };
    case 'SET_MASK_MODE':
      return { ...state, isMaskMode: action.enabled };
    case 'SET_SUBJECT_LOCK':
      return { ...state, subjectLocked: action.locked, subjectLockImageId: action.imageId };
    // Phase 5
    case 'SET_PROJECTS':
      return { ...state, projects: action.projects };
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProjectId: action.projectId };
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.project] };
    case 'DELETE_PROJECT':
      return { ...state, projects: state.projects.filter((p) => p.id !== action.projectId) };
    case 'SET_TEMPLATES':
      return { ...state, templates: action.templates };
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.template] };
    case 'DELETE_TEMPLATE':
      return { ...state, templates: state.templates.filter((t) => t.id !== action.templateId) };
    case 'SET_ONLINE_STATUS':
      return { ...state, isOnline: action.online };
    case 'SET_FALLBACK_SUGGESTION':
      return { ...state, fallbackSuggestion: action.suggestion };
    case 'SET_STORAGE_WARNING':
      return { ...state, storageWarningLevel: action.level };
    case 'SET_SPEND_LIMIT_WARNING':
      return { ...state, spendLimitWarning: action.warning };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: Dispatch<Action>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
