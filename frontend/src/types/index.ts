export interface Model {
  id: string;
  name: string;
  provider: string;
  type: 'conversational' | 'image_only';
  modalities: string[];
  strengths: string;
  estimated_cost_1k: number | null;
}

export interface GenerationResult {
  image_id: string;
  image_url: string;
  thumbnail_url: string;
  text_response: string | null;
  model_id: string;
  prompt: string;
  timestamp: string;
  usage: Record<string, number> | null;
  aspect_ratio: string | null;
  resolution: string | null;
  style_preset: string | null;
  negative_prompt: string | null;
  // Phase 3
  image_weight: number | null;
  batch_id: string | null;
}

export interface BatchGenerationResult {
  batch_id: string;
  results: GenerationResult[];
  total_requested: number;
  total_completed: number;
}

export interface ModelCapability {
  model_id: string;
  name: string;
  provider: string;
  conversational_editing: boolean;
  multi_image_blending: string;
  identity_preservation: string;
  text_rendering: string;
  max_resolution: string;
  relative_cost: string;
  speed: string;
}

export interface ModelRecommendation {
  recommended_model_id: string;
  reason: string;
  capabilities: ModelCapability[];
}

export interface GenerationError {
  error_type:
    | 'auth'
    | 'credits'
    | 'rate_limit'
    | 'timeout'
    | 'network'
    | 'content_policy'
    | 'server';
  message: string;
  retry_after?: number;
}

export interface HistoryEntry {
  image_id: string;
  image_filename: string;
  thumbnail_filename: string;
  prompt: string;
  model_id: string;
  timestamp: string;
  text_response: string | null;
  usage: Record<string, number> | null;
  aspect_ratio: string | null;
  resolution: string | null;
  style_preset: string | null;
  negative_prompt: string | null;
  // Phase 3
  image_weight: number | null;
  batch_id: string | null;
}

export interface StylePreset {
  id: string;
  name: string;
  suffix: string;
}

export interface CostEstimate {
  estimated_cost: number;
  is_approximate: boolean;
  pricing_type: string;
}

export interface ReferenceImage {
  reference_id: string;
  was_resized: boolean;
  thumbnail_url: string;
}

// Phase 4 types
export interface ConversationTurn {
  turn_id: string;
  role: 'user' | 'assistant';
  prompt: string | null;
  image_id: string | null;
  image_url: string | null;
  thumbnail_url: string | null;
  text_response: string | null;
  timestamp: string;
}

export interface ConversationBranch {
  branch_id: string;
  name: string;
  parent_branch_id: string | null;
  fork_turn_index: number | null;
  turns: ConversationTurn[];
}

export interface ConversationSession {
  session_id: string;
  project: string;
  model_id: string;
  created_at: string;
  updated_at: string;
  branches: ConversationBranch[];
  active_branch_id: string;
  subject_locked: boolean;
  subject_lock_image_id: string | null;
}

export interface ConversationSessionSummary {
  session_id: string;
  model_id: string;
  created_at: string;
  updated_at: string;
  turn_count: number;
  branch_count: number;
  last_image_url: string | null;
}

export interface TokenUsage {
  estimated_tokens: number;
  context_limit: number;
  usage_ratio: number;
  near_limit: boolean;
}

export interface MaskData {
  mask_image_base64: string;
  description?: string;
}

export interface ComposeSource {
  reference_id: string;
  label: string;
}

// Phase 5 types

export interface Project {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectSettings {
  preferred_model_id?: string;
  preferred_resolution?: string;
  preferred_aspect_ratio?: string;
  preferred_style_preset?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  prompt_text: string;
  is_builtin: boolean;
  tags: string[];
  created_at?: string;
}

export interface SpendLogEntry {
  date: string;
  model_id: string;
  model_name: string;
  resolution: string;
  variations: number;
  estimated_cost: number;
}

export interface CostTracking {
  session_total: number;
  all_time_total: number;
  spend_limit: number | null;
  recent_entries: SpendLogEntry[];
  disclaimer: string;
}

export interface StorageUsage {
  total_bytes: number;
  quota_bytes: number;
  percentage: number;
  by_project: { project_id: string; project_name: string; bytes_used: number }[];
}

export interface ConnectivityStatus {
  online: boolean;
  last_checked: string;
}

export interface FallbackSuggestion {
  unavailable_model_id: string;
  suggested_model_id: string;
  suggested_model_name: string;
  reason: string;
}

export interface AppState {
  apiKeyConfigured: boolean | null;
  models: Model[];
  selectedModelId: string | null;
  currentGeneration: GenerationResult | null;
  isGenerating: boolean;
  error: GenerationError | null;
  requestId: string | null;
  showSettings: boolean;
  sidebarCollapsed: boolean;
  controlsCollapsed: boolean;
  activeView: 'workspace' | 'settings' | 'history' | 'compose' | 'templates';
  prompt: string;
  // Phase 2
  aspectRatio: string | null;
  resolution: string;
  stylePreset: string;
  negativePrompt: string;
  referenceImage: ReferenceImage | null;
  costEstimate: CostEstimate | null;
  stylePresets: StylePreset[];
  history: HistoryEntry[];
  // Phase 3
  imageWeight: number;
  styleReference: ReferenceImage | null;
  characterReferences: ReferenceImage[];
  variations: number;
  multiModel: boolean;
  batchResults: GenerationResult[] | null;
  modelRecommendation: ModelRecommendation | null;
  exportFormat: 'png' | 'jpeg' | 'webp';
  exportQuality: number;
  // Phase 4
  conversationSession: ConversationSession | null;
  isMaskMode: boolean;
  subjectLocked: boolean;
  subjectLockImageId: string | null;
  // Phase 5
  projects: Project[];
  currentProjectId: string;
  templates: PromptTemplate[];
  isOnline: boolean;
  fallbackSuggestion: FallbackSuggestion | null;
  storageWarningLevel: null | 'warning' | 'critical';
  spendLimitWarning: boolean;
}
