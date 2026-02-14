# CLAUDE.md

## Project Overview

ImageGen is a local web application for generating images from natural language using multiple AI models via the OpenRouter API. It runs entirely on the user's local MacOS machine. There is no cloud deployment, no user accounts, and no external database.

**Read `ImageGen_PRD_v1.md` before making any architectural or feature decisions.** The PRD is the source of truth for all requirements, phasing, and acceptance criteria.

---

## Architecture

- **Backend:** Python 3.11+, FastAPI
- **Frontend:** React (TypeScript)
- **Storage:** Local filesystem at `~/.imagegen/`
- **API:** All model access goes through OpenRouter's `/api/v1/chat/completions` endpoint

The backend serves as a thin proxy between the frontend and OpenRouter. The frontend never communicates directly with OpenRouter.

```
[React Frontend] <--REST--> [FastAPI Backend] <--HTTPS--> [OpenRouter API]
                                   |
                                   v
                          [~/.imagegen/ filesystem]
```

### Key Architecture Rules

1. **The OpenRouter API key must never be sent to the frontend.** It is stored in `~/.imagegen/config.json` and used only by the backend. It must not appear in any API response, error message, or log entry.
2. **The backend binds to `localhost` only**, never `0.0.0.0`. This is a single-user local application.
3. **All prompt assembly happens in the backend.** The frontend sends the user's raw prompt, selected parameters, and reference images. The backend constructs the final prompt (appending style presets, negative prompts, subject-consistency instructions, image weight adjustments, etc.) before sending to OpenRouter.
4. **All image processing happens in the backend.** Compression, resizing, thumbnail generation, base64 encoding/decoding, and format conversion are backend responsibilities.
5. **No external dependencies beyond OpenRouter.** No databases, no cloud storage, no CDN, no analytics. Everything is local.

---

## Supported Models

There are exactly five models. Do not add, remove, or substitute models without explicit instruction.

### Conversational Models (Text + Image)
Use `modalities: ["image", "text"]` in API requests.

- `google/gemini-2.5-flash-image`
- `google/gemini-3-pro-image-preview`
- `openai/gpt-5-image`

### Image-Only Models
Use `modalities: ["image"]` in API requests.

- `black-forest-labs/flux.2-max`
- `bytedance-seed/seedream-4.5`

**This distinction matters throughout the codebase.** Many features behave differently depending on whether the selected model is conversational or image-only. See the PRD Sections 4.3, 9.1, 9.2, 9.3 for specifics. When implementing any feature that interacts with models, check whether it needs branching logic for these two categories.

---

## Development Phases

The PRD defines five phases. **All five phases are implemented.**

- **Phase 1 — Foundation:** App scaffolding, API key setup, text-to-image generation, PNG export, basic error handling, local storage scaffolding
- **Phase 2 — Core Controls:** Single-image reference, aspect ratio, resolution, negative prompts, style presets, cost estimate, basic history
- **Phase 3 — Advanced Image Features:** Image weight slider, style reference, character reference, batch variations (with multi-model support), smart model recommendation, full export
- **Phase 4 — Editing and Sessions:** Conversational editing, subject consistency, masking/region editing, multi-image composition, super resolution
- **Phase 5 — Organization and Polish:** Projects, templates, cumulative cost tracking, offline behavior, storage quota management, fallback suggestions

---

## Code Conventions

### Backend (Python / FastAPI)

- Use type hints for all function signatures and return types
- Use Pydantic models for all API request/response schemas
- Use `async` endpoints for all routes that make external API calls (OpenRouter)
- Organize by feature area:
  ```
  backend/
  ├── main.py                  # FastAPI app, startup, CORS
  ├── config.py                # Settings, config file management
  ├── routers/
  │   ├── generate.py          # Image generation, references, export, cost estimate, model recommendation
  │   ├── conversation.py      # Conversational editing, masking, composition, enhancement endpoints
  │   ├── history.py           # History CRUD
  │   ├── projects.py          # Project management
  │   ├── settings.py          # API key, preferences
  │   ├── templates.py         # Prompt templates
  │   └── storage.py           # Storage usage, cost tracking, connectivity, fallbacks
  ├── services/
  │   ├── openrouter.py        # OpenRouter API client
  │   ├── prompt_builder.py    # Prompt assembly (style presets, negative prompts, image weight, subject instructions)
  │   ├── image_processor.py   # Resize, compress, thumbnail, base64, format conversion
  │   ├── cost_estimator.py    # Per-model cost calculation and spend tracking
  │   ├── conversation.py      # Multi-turn conversation state management
  │   ├── mask_processor.py    # Mask decoding, region description, mask-aware prompt building, compositing
  │   └── model_recommender.py # Smart model recommendation and fallback logic
  ├── models/                  # Pydantic schemas (not AI models)
  │   ├── generation.py
  │   ├── history.py
  │   ├── conversation.py      # Sessions, turns, branches, masks, composition, enhancement
  │   ├── project.py
  │   └── config.py
  └── utils/
      ├── storage.py           # Filesystem operations, quota checks
      ├── connectivity.py      # Online/offline detection
      └── logging.py           # Error logging (API key redaction)
  ```
- Error handling: Catch OpenRouter errors in `services/openrouter.py` and translate them into typed exceptions. Routers catch these exceptions and return structured error responses to the frontend. See PRD Appendix C for the full error type mapping.
- Logging: All errors logged to `~/.imagegen/error.log`. The API key must be redacted from all log entries. Use a redaction utility in `utils/logging.py`.
- File writes: Use atomic write patterns (write to temp file, then rename) for `history.json`, `project.json`, `config.json`, and `spend_log.csv` to prevent corruption on crash.

### Frontend (React / TypeScript)

- Use TypeScript strict mode
- Use functional components with hooks
- Organize by feature area matching the backend:
  ```
  frontend/src/
  ├── App.tsx                  # Root component, API key check, model loading
  ├── components/
  │   ├── Workspace.tsx        # Main layout router (workspace, templates, compose, history, settings views)
  │   ├── canvas/
  │   │   ├── ImageCanvas.tsx      # Main image display, batch variation grid
  │   │   ├── EnhanceButton.tsx    # Super resolution trigger (2K/4K)
  │   │   └── Lightbox.tsx         # Full-resolution image viewer
  │   ├── controls/
  │   │   ├── ControlsPanel.tsx             # Main controls container (draggable width)
  │   │   ├── PromptInput.tsx               # Multi-line prompt textarea
  │   │   ├── ModelSelector.tsx             # Model dropdown with provider labels
  │   │   ├── GenerateButton.tsx            # Full-width pill CTA with shimmer animation
  │   │   ├── AspectRatioSelector.tsx       # Aspect ratio presets
  │   │   ├── ResolutionSelector.tsx        # 1K/2K/4K selector
  │   │   ├── StylePresetSelector.tsx       # Style preset buttons
  │   │   ├── NegativePrompt.tsx            # Collapsible negative prompt input
  │   │   ├── ReferenceUpload.tsx           # Single reference image upload
  │   │   ├── StyleReferenceUpload.tsx      # Style reference upload
  │   │   ├── CharacterReferenceUpload.tsx  # Character/subject reference (up to 5)
  │   │   ├── ImageWeightSlider.tsx         # Reference influence slider (0-100)
  │   │   ├── VariationsControl.tsx         # Batch variations (1-4) with multi-model toggle
  │   │   ├── SubjectLockToggle.tsx         # Lock subject identity across edits
  │   │   ├── CostEstimateDisplay.tsx       # Real-time cost estimate
  │   │   ├── ModelRecommendationBadge.tsx  # Smart model suggestion with comparison matrix
  │   │   └── ExportOptions.tsx             # PNG/JPEG/WebP export with quality slider
  │   ├── sidebar/
  │   │   └── Sidebar.tsx                   # Navigation sidebar with project selector
  │   ├── history/
  │   │   └── HistoryPanel.tsx              # History browsing, reuse, download, delete
  │   ├── masking/
  │   │   ├── MaskCanvas.tsx                # Mask drawing overlay (brush, eraser, rectangle, lasso)
  │   │   └── MaskToolbar.tsx               # Mask tool controls and actions
  │   ├── compose/
  │   │   └── ComposePanel.tsx              # Multi-image composition (2-5 sources)
  │   ├── conversation/
  │   │   └── ConversationPanel.tsx         # Chat panel for multi-turn editing
  │   ├── projects/
  │   │   └── ProjectSelector.tsx           # Project switcher in sidebar
  │   ├── templates/
  │   │   └── TemplateLibrary.tsx           # Prompt template browser
  │   ├── settings/
  │   │   ├── SettingsPage.tsx              # Settings page container
  │   │   ├── ApiKeySetup.tsx               # API key configuration (onboarding + settings)
  │   │   ├── CostTrackingSection.tsx       # Spend tracking, limits, CSV export
  │   │   └── StorageSection.tsx            # Storage usage, quota management
  │   └── common/
  │       ├── ErrorBanner.tsx               # Auto-dismissing error notifications
  │       ├── ConnectivityBanner.tsx         # Online/offline status banner
  │       ├── FallbackSuggestionModal.tsx    # Fallback model suggestion modal
  │       ├── LoadingSpinner.tsx             # Shimmer loading animation
  │       └── Modal.tsx                     # Modal dialog
  ├── hooks/
  │   ├── useAppContext.tsx    # App state context (React Context + useReducer)
  │   ├── useGenerate.ts      # Generation logic, cancellation, batch handling
  │   └── useResponsiveLayout.ts  # Responsive sidebar/controls collapse
  ├── services/
  │   └── api.ts              # API client (calls to FastAPI backend, not OpenRouter directly)
  └── types/
      └── index.ts            # TypeScript interfaces and types
  ```
- State management: Use React context and hooks for application state. No Redux unless complexity demands it.
- API calls: All API calls go to the local FastAPI backend (`http://localhost:{port}/api/...`). The frontend never calls OpenRouter directly.
- Loading states: Every generation request must show a loading indicator. The UI must remain responsive during generation (no blocking renders).
- The frontend should load thumbnails (not full-resolution images) in the history panel and anywhere multiple images are displayed.

### Naming

- Python: `snake_case` for variables, functions, files. `PascalCase` for classes.
- TypeScript: `camelCase` for variables and functions. `PascalCase` for components, interfaces, and types.
- API routes: REST conventions. `/api/generate`, `/api/history`, `/api/projects`, `/api/settings`, `/api/templates`, `/api/storage`.

### Testing

- Backend: Write tests for `services/` (OpenRouter client mock, prompt builder logic, cost estimator, image processor). Use pytest.
- Frontend: Test complex components (masking tools, conversation panel). Use React Testing Library.
- Integration: After each phase, verify all acceptance criteria from the PRD manually.

---

## Critical Implementation Notes

### Prompt Assembly

The backend's `prompt_builder.py` assembles the final prompt from multiple optional inputs without them conflicting. The assembly order matters:

1. **Subject-consistency instructions** (if character reference images are present)
2. **Style reference instructions** (if a style reference image is uploaded)
3. **The user's prompt** (unmodified)
4. **Style preset suffix** (if a preset other than "None" is selected)
5. **Negative prompt / exclusion instructions** (if negative prompt is provided)
6. **Image weight adjustment** (modifies the framing of reference image instructions based on slider value)

All of these are optional and must compose cleanly. Each layer is separated so individual components can be tuned without affecting others.

### Image Weight Abstraction

The image weight slider (0–100) does not map to any single API parameter. It is an abstraction that the backend translates into prompt engineering for each model. The mappings should be stored in a configuration file (not hardcoded) so they can be tuned without code changes. Initial mappings will need calibration through testing. See PRD Section 8.1 and Technical Constraint #1.

### Batch Variations with Multi-Model Support

Batch variations (1–4) support per-variation model selection via a `model_ids` array in the generation request. When `multi_model` is enabled, each variation can use a different model. The frontend computes the model IDs array; the backend sends independent requests with staggered delays and retry logic. Partial success is supported — completed results are returned alongside any errors.

### Conversational vs. Image-Only Branching

Any code that sends requests to OpenRouter must check the model category:
- Conversational models: Use `modalities: ["image", "text"]`, support multi-turn conversation history, return text alongside images
- Image-only models: Use `modalities: ["image"]`, single-shot requests only, return image data only

This check should be centralized in `services/openrouter.py`, not scattered across the codebase.

### File Size Handling

Before sending any image to OpenRouter:
1. Check dimensions. If longest side > 4096px, resize to 4096px.
2. Encode as base64.
3. Check base64 payload size. If total request would exceed known model limits, compress (reduce JPEG quality) and re-encode.
4. If the model returns a size-related error (413), compress further and retry once.

This logic belongs in `services/image_processor.py` and is called by `services/openrouter.py` before every request that includes images.

### Atomic Writes

All JSON files that are updated during normal operation (`history.json`, `project.json`, `config.json`, `user.json` for templates) must use atomic writes:
1. Write to a temporary file in the same directory (e.g., `history.json.tmp`)
2. Rename the temp file to the target filename

This prevents data corruption if the process is killed mid-write.

---

## UI Design Direction

**Read `UI_DESIGN_DIRECTION.md` before building any frontend components.** It is the source of truth for all visual and interaction design decisions.

### Summary

- **Dark theme, near-black backgrounds** (`#0A0A0A` base). Not gray — black. Multiple dark layers create depth.
- **Three-panel layout:** Left sidebar (navigation, ~220px) | Center canvas (flexible, image is hero) | Right controls panel (generation settings, ~280px, draggable 240–420px). A conversation panel appears conditionally between canvas and controls for conversational models.
- **The generated image is always the most prominent element.** Controls recede. The image gets maximum space.
- **Progressive disclosure.** Default state is minimal. Advanced controls are collapsed. Complexity is available but not imposed.
- **Warm amber/gold accent color** (`#D4A843`), used sparingly — primarily for the active state and the Generate button highlight.
- **Generate button:** White/near-white, full-width pill shape, pinned to bottom of right panel. The single most prominent UI element.
- **Large border-radius everywhere:** 16px on cards and images, 12px on smaller components, 24px (full pill) on the Generate button.
- **Subtle borders:** `rgba(255, 255, 255, 0.06)` to `rgba(255, 255, 255, 0.10)`. No harsh lines.
- **System font stack.** No external font loading.
- **Loading state should feel alive** — animated progress, not a static spinner.
- **This should feel like a creative tool** (Lightroom, Figma), not a web dashboard or SaaS admin panel.

Reference screenshots are in `/UI_examples/` at the project root. The full design specification with exact color values, component styling, typography, and interaction details is in `UI_DESIGN_DIRECTION.md`.

---

## What Not To Do

- **Do not call OpenRouter from the frontend.** All API calls go through the FastAPI backend.
- **Do not hardcode model IDs in the frontend.** The backend provides the model list, capabilities, and pricing. The frontend renders what the backend tells it.
- **Do not store images in JSON.** Images are stored as files in the filesystem. JSON files (history, projects) store references (filenames) to those images.
- **Do not add models** beyond the five specified without explicit instruction.
- **Do not add external services** (databases, cloud storage, analytics, CDN). This is a fully local application.
- **Do not embed metadata in exported images.** Exported files must be clean — no EXIF, no prompt data, no application data.
- **Do not use gray backgrounds.** The application uses near-black backgrounds (`#0A0A0A` to `#1A1A1A`). Avoid `#333`, `#444`, `#555` as surface colors.
- **Do not shrink the generated image to make room for controls.** The image is the hero. Controls scroll or collapse; the image gets maximum space.
- **Do not use a generic component library theme out of the box.** Follow the design direction in `UI_DESIGN_DIRECTION.md`. If using a component library, override its theme to match the specified color system, border-radius values, and interaction patterns.