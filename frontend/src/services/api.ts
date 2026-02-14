import type {
  GenerationResult,
  BatchGenerationResult,
  GenerationError,
  Model,
  HistoryEntry,
  StylePreset,
  CostEstimate,
  ReferenceImage,
  ModelRecommendation,
  ConversationSession,
  ConversationSessionSummary,
  TokenUsage,
  MaskData,
  ComposeSource,
  Project,
  PromptTemplate,
  CostTracking,
  StorageUsage,
  ConnectivityStatus,
  FallbackSuggestion,
} from '../types';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({
      detail: { error_type: 'server', message: 'Unknown error' },
    }));
    throw (body.detail ?? { error_type: 'server', message: 'Unknown error' }) as GenerationError;
  }

  return response.json();
}

export interface GenerateParams {
  prompt: string;
  model_id: string;
  request_id: string;
  aspect_ratio?: string | null;
  resolution?: string | null;
  style_preset?: string | null;
  negative_prompt?: string | null;
  reference_image_id?: string | null;
  // Phase 3
  image_weight?: number | null;
  style_reference_id?: string | null;
  character_reference_ids?: string[] | null;
  variations?: number;
  model_ids?: string[] | null;
  batch_id?: string | null;
}

export const api = {
  // Settings
  getApiKeyStatus: () =>
    request<{ configured: boolean }>('/settings/api-key/status'),

  setApiKey: (api_key: string) =>
    request<{ configured: boolean }>('/settings/api-key', {
      method: 'POST',
      body: JSON.stringify({ api_key }),
    }),

  deleteApiKey: () =>
    request<{ configured: boolean }>('/settings/api-key', {
      method: 'DELETE',
    }),

  testConnection: () =>
    request<{ success: boolean; message: string }>('/settings/test-connection', {
      method: 'POST',
    }),

  // Models
  getModels: () => request<{ models: Model[] }>('/models'),

  // Generation — returns single result or batch depending on variations
  generate: (params: GenerateParams, signal?: AbortSignal) =>
    request<GenerationResult | BatchGenerationResult>('/generate', {
      method: 'POST',
      body: JSON.stringify(params),
      signal,
    }),

  cancelGeneration: (request_id: string) =>
    request<{ cancelled: boolean }>(`/generate/cancel/${request_id}`, {
      method: 'POST',
    }),

  // Reference images (shared for content, style, and character references)
  uploadReference: async (file: File): Promise<ReferenceImage> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/reference/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(typeof body.detail === 'string' ? body.detail : 'Upload failed');
    }

    return response.json();
  },

  deleteReference: (reference_id: string) =>
    request<{ deleted: boolean }>(`/reference/${reference_id}`, {
      method: 'DELETE',
    }),

  // Cost estimation
  getCostEstimate: (model_id: string, resolution: string = '1K', variations: number = 1) =>
    request<CostEstimate>('/cost-estimate', {
      method: 'POST',
      body: JSON.stringify({ model_id, resolution, variations }),
    }),

  // Style presets
  getStylePresets: () => request<StylePreset[]>('/style-presets'),

  // Model recommendation
  getModelRecommendation: (params: {
    style_preset?: string | null;
    resolution?: string | null;
    has_character_refs?: boolean;
  }) => {
    const query = new URLSearchParams();
    if (params.style_preset) query.set('style_preset', params.style_preset);
    if (params.resolution) query.set('resolution', params.resolution);
    if (params.has_character_refs) query.set('has_character_refs', 'true');
    return request<ModelRecommendation>(`/model-recommendation?${query}`, {
      method: 'POST',
    });
  },

  // History
  getHistory: () =>
    request<{ entries: HistoryEntry[]; total: number }>('/history'),

  deleteHistoryEntry: (image_id: string) =>
    request<{ deleted: boolean }>(`/history/${image_id}`, {
      method: 'DELETE',
    }),

  // Export — supports format and quality
  getExportUrl: (image_id: string, format: string = 'png', quality: number = 90) => {
    const params = new URLSearchParams({ format });
    if (format !== 'png') params.set('quality', String(quality));
    return `${BASE_URL}/export/${image_id}?${params}`;
  },

  // ── Phase 4: Conversation Sessions ────────────────────────────────

  createConversationSession: (model_id: string, initial_prompt?: string, initial_image_id?: string) =>
    request<ConversationSession>('/conversation/sessions', {
      method: 'POST',
      body: JSON.stringify({ model_id, initial_prompt, initial_image_id }),
    }),

  listConversationSessions: () =>
    request<ConversationSessionSummary[]>('/conversation/sessions'),

  getConversationSession: (session_id: string) =>
    request<ConversationSession>(`/conversation/sessions/${session_id}`),

  deleteConversationSession: (session_id: string) =>
    request<{ deleted: boolean }>(`/conversation/sessions/${session_id}`, {
      method: 'DELETE',
    }),

  conversationEdit: (params: {
    session_id: string;
    prompt: string;
    model_id?: string;
    aspect_ratio?: string | null;
    resolution?: string | null;
    style_preset?: string | null;
    negative_prompt?: string | null;
    image_weight?: number | null;
  }) =>
    request<GenerationResult>('/conversation/edit', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  undoTurn: (session_id: string) =>
    request<{ undone: boolean }>(`/conversation/undo/${session_id}`, {
      method: 'POST',
    }),

  revertToTurn: (session_id: string, turn_index: number) =>
    request<{ reverted: boolean }>('/conversation/revert', {
      method: 'POST',
      body: JSON.stringify({ session_id, turn_index }),
    }),

  branchFromTurn: (session_id: string, turn_index: number) =>
    request<{ branch_id: string; name: string }>('/conversation/branch', {
      method: 'POST',
      body: JSON.stringify({ session_id, turn_index }),
    }),

  switchBranch: (session_id: string, branch_id: string) =>
    request<{ switched: boolean }>(`/conversation/switch-branch/${session_id}/${branch_id}`, {
      method: 'POST',
    }),

  toggleSubjectLock: (session_id: string, locked: boolean, image_id?: string) =>
    request<{ locked: boolean }>('/conversation/subject-lock', {
      method: 'POST',
      body: JSON.stringify({ session_id, locked, image_id }),
    }),

  getTokenUsage: (session_id: string) =>
    request<TokenUsage>(`/conversation/token-usage/${session_id}`),

  // ── Phase 4: Mask Editing ─────────────────────────────────────────

  maskEdit: (params: {
    image_id: string;
    mask: MaskData;
    prompt: string;
    model_id: string;
    session_id?: string;
  }) =>
    request<GenerationResult>('/mask-edit', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // ── Phase 4: Composition ──────────────────────────────────────────

  compose: (params: {
    source_images: ComposeSource[];
    prompt: string;
    model_id: string;
    image_weight?: number | null;
    aspect_ratio?: string | null;
    resolution?: string | null;
  }) =>
    request<GenerationResult>('/compose', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // ── Phase 4: Super Resolution ─────────────────────────────────────

  enhance: (params: {
    image_id: string;
    target_resolution: string;
    model_id?: string;
  }) =>
    request<GenerationResult>('/enhance', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  // ── Phase 5: Projects ───────────────────────────────────────────

  listProjects: () =>
    request<{ projects: Project[]; current_project_id: string }>('/projects'),

  createProject: (name: string) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  renameProject: (projectId: string, new_name: string) =>
    request<Project>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ new_name }),
    }),

  deleteProject: (projectId: string) =>
    request<{ deleted: boolean }>(`/projects/${projectId}`, {
      method: 'DELETE',
    }),

  switchProject: (projectId: string) =>
    request<{ switched: boolean }>(`/projects/${projectId}/switch`, {
      method: 'POST',
    }),

  getProjectExportUrl: (projectId: string) =>
    `${BASE_URL}/projects/${projectId}/export`,

  importProject: async (file: File): Promise<Project> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${BASE_URL}/projects/import`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ detail: 'Import failed' }));
      throw new Error(typeof body.detail === 'string' ? body.detail : 'Import failed');
    }
    return response.json();
  },

  // ── Phase 5: Templates ──────────────────────────────────────────

  listTemplates: () =>
    request<{ builtin: PromptTemplate[]; user: PromptTemplate[] }>('/templates'),

  createTemplate: (name: string, category: string, prompt_text: string, tags: string[] = []) =>
    request<PromptTemplate>('/templates', {
      method: 'POST',
      body: JSON.stringify({ name, category, prompt_text, tags }),
    }),

  updateTemplate: (templateId: string, updates: Partial<PromptTemplate>) =>
    request<PromptTemplate>(`/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  deleteTemplate: (templateId: string) =>
    request<{ deleted: boolean }>(`/templates/${templateId}`, {
      method: 'DELETE',
    }),

  // ── Phase 5: Cost Tracking ──────────────────────────────────────

  getCostTracking: () => request<CostTracking>('/cost-tracking'),

  setSpendLimit: (limit: number | null) =>
    request<{ spend_limit: number | null }>('/cost-tracking/set-limit', {
      method: 'POST',
      body: JSON.stringify({ limit }),
    }),

  getCostExportUrl: () => `${BASE_URL}/cost-tracking/export`,

  // ── Phase 5: Storage ────────────────────────────────────────────

  getStorageUsage: () => request<StorageUsage>('/storage/usage'),

  setStorageQuota: (quota_bytes: number) =>
    request<{ quota_bytes: number }>('/storage/set-quota', {
      method: 'POST',
      body: JSON.stringify({ quota_bytes }),
    }),

  // ── Phase 5: Connectivity ───────────────────────────────────────

  getConnectivity: () => request<ConnectivityStatus>('/connectivity'),

  // ── Phase 5: Fallback Suggestions ───────────────────────────────

  getFallbackSuggestion: (modelId: string) =>
    request<FallbackSuggestion>(`/fallback/${modelId}`),
};
