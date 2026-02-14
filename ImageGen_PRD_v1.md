# Product Requirements Document: ImageGen

**Version:** 1.0
**Date:** February 13, 2026
**Author:** [Owner]
**Status:** Draft — Pending Review

---

## Table of Contents

1. [Overview](#1-overview)
2. [Goals and Non-Goals](#2-goals-and-non-goals)
3. [Architecture](#3-architecture)
4. [Supported Models](#4-supported-models)
5. [Phased Delivery Plan](#5-phased-delivery-plan)
6. [Phase 1 — Foundation](#6-phase-1--foundation)
7. [Phase 2 — Core Controls](#7-phase-2--core-controls)
8. [Phase 3 — Advanced Image Features](#8-phase-3--advanced-image-features)
9. [Phase 4 — Editing and Sessions](#9-phase-4--editing-and-sessions)
10. [Phase 5 — Organization and Polish](#10-phase-5--organization-and-polish)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Technical Constraints to Resolve During Development](#12-technical-constraints-to-resolve-during-development)
13. [Appendix A — Model Capability Matrix](#13-appendix-a--model-capability-matrix)
14. [Appendix B — Pricing Reference](#14-appendix-b--pricing-reference)
15. [Appendix C — Error Handling Reference](#15-appendix-c--error-handling-reference)

---

## 1. Overview

ImageGen is a local web application for generating images from natural language descriptions, text prompts, and reference images. It connects to five image generation models through the OpenRouter API, providing a unified workspace for text-to-image generation, image-to-image editing, multi-turn conversational refinement, and multi-image composition.

The application runs entirely on the user's local machine (MacOS). There is no cloud deployment, no user accounts, and no external database. The user provides their own OpenRouter API key.

---

## 2. Goals and Non-Goals

### 2.1 Goals

- Provide a single interface for generating images across five OpenRouter models with model-appropriate behavior for each
- Support iterative image refinement through conversational editing, subject consistency, and region-based masking
- Enable product photography and mockup workflows with style presets, text rendering, and multi-image composition
- Store all generation history, projects, and settings locally with no external dependencies
- Present clear cost estimates before generation and track cumulative spend
- Guide the user toward the best model for each task through smart recommendations

### 2.2 Non-Goals

- Cloud deployment or multi-user support
- Post-generation image editing (crop, rotate, brightness/contrast, filters). The application is for image creation, not image editing.
- Custom font file rendering (removed from scope; text rendering uses native model capabilities)
- Mobile or tablet interface. The application is designed for desktop use in a browser.
- Real-time collaboration or sharing features
- Training, fine-tuning, or customizing models

---

## 3. Architecture

### 3.1 Stack

| Component | Technology | Purpose |
|---|---|---|
| Backend | Python, FastAPI | API proxy to OpenRouter, image processing, local file management, prompt assembly |
| Frontend | React | Workspace UI, canvas, controls, history panel |
| Storage | Local filesystem (`~/.imagegen/`) | Projects, images, history, configuration |
| API | OpenRouter `/api/v1/chat/completions` | All model access |

### 3.2 Data Flow

```
[React Frontend] <--REST--> [FastAPI Backend] <--HTTPS--> [OpenRouter API] <--> [Model Providers]
                                   |
                                   v
                          [~/.imagegen/ filesystem]
```

### 3.3 Launch

The user starts the backend from the terminal (e.g., `python run.py` or `uvicorn main:app`). The backend serves the React frontend and is accessed in the browser at `localhost`. No separate frontend dev server is needed in production mode.

### 3.4 Directory Structure

```
~/.imagegen/
├── config.json              # API key, app settings, spend limit
├── projects/
│   ├── default/
│   │   ├── project.json     # Project metadata, default settings
│   │   ├── history.json     # Generation history entries
│   │   ├── images/          # Generated images (full resolution)
│   │   ├── thumbnails/      # Thumbnail versions for history UI
│   │   ├── references/      # Saved reference images
│   │   └── conversations/   # Saved conversation histories (JSON)
│   └── [other-projects]/
├── templates/
│   ├── built-in.json        # Shipped prompt templates
│   └── user.json            # User-created templates
├── styles/                  # Style preset thumbnail images
├── spend_log.csv            # Cost tracking log
└── error.log                # Error log (API key redacted)
```

---

## 4. Supported Models

### 4.1 Conversational Models (Text + Image Output)

API requests use `modalities: ["image", "text"]`. These models support multi-turn conversation and return both text and images.

| Model ID | Provider | Key Strengths |
|---|---|---|
| `google/gemini-2.5-flash-image` | Google | Fast, cost-effective, multi-image blending, character consistency, natural language editing |
| `google/gemini-3-pro-image-preview` | Google | Highest-fidelity output (2K/4K), identity preservation (up to 5 subjects), product visualization, industry-leading text rendering, localized edits, lighting/focus/camera controls |
| `openai/gpt-5-image` | OpenAI | Strong instruction following, text rendering, detailed image editing, reasoning-driven generation |

### 4.2 Image-Only Models (Non-Conversational)

API requests use `modalities: ["image"]`. These models accept a prompt and optional reference image(s) and return only an image.

| Model ID | Provider | Key Strengths |
|---|---|---|
| `black-forest-labs/flux.2-max` | Black Forest Labs | Top-tier image quality, prompt understanding, editing consistency |
| `bytedance-seed/seedream-4.5` | ByteDance | Subject detail preservation, portrait refinement, small-text rendering, multi-image composition, visual aesthetics |

### 4.3 Architectural Implications

The conversational vs. image-only distinction affects multiple features throughout the application. Any feature specification that behaves differently per model category is explicitly noted. Key differences:

- **Multi-turn editing:** Conversational models only.
- **Subject consistency:** Conversational models maintain it through conversation history. Image-only models require the backend to re-inject the previous output as a reference image.
- **Negative prompts:** Conversational models accept exclusion instructions in natural language. Image-only models receive negative prompt text appended to the main prompt.
- **Masking/region editing:** Conversational models can accept natural language instructions about which region to edit. Image-only models require the backend to composite the mask onto the image before sending.

---

## 5. Phased Delivery Plan

Development is organized into five phases. Each phase builds on the previous and produces a usable application. Phase 1 is the minimum viable product.

| Phase | Name | Summary | Depends On |
|---|---|---|---|
| **1** | Foundation | Text-to-image generation with all 5 models, basic UI, API key setup, PNG export, local storage scaffolding, basic error handling | — |
| **2** | Core Controls | Image-to-image (single reference), aspect ratio, resolution, negative prompts, style presets, inline cost estimate, basic generation history | Phase 1 |
| **3** | Advanced Image Features | Image weight slider, style reference upload, character/subject reference, batch variations, text-in-image controls, smart model recommendation, full export options | Phase 2 |
| **4** | Editing and Sessions | Multi-turn conversational editing, subject consistency across revisions, masking/region editing, multi-image composition, super resolution/enhancement | Phase 3 |
| **5** | Organization and Polish | Project organization, prompt library/templates, cumulative cost tracking, offline behavior, storage quota management, full fallback model suggestions | Phase 4 |

---

## 6. Phase 1 — Foundation

**Goal:** A working end-to-end application that can generate an image from a text prompt using any of the five models, display it, save it to history, and export it.

### 6.1 Application Scaffolding

**Description:** Set up the FastAPI backend and React frontend with the project structure, build pipeline, and launch script.

**Acceptance Criteria:**
- Running `python run.py` (or equivalent) starts the backend and serves the frontend at `localhost` on a configurable port (default 8000)
- The React frontend loads in a browser and displays the main workspace layout
- The backend creates the `~/.imagegen/` directory structure on first launch if it does not exist
- The backend serves static frontend assets in production mode (no separate frontend server required)

### 6.2 API Key Management

**Description:** The user provides their OpenRouter API key. The backend stores it in a local config file and uses it for all API calls.

**Acceptance Criteria:**
- On first launch (no key configured), the UI displays a setup screen prompting for the API key
- The key is stored in `~/.imagegen/config.json`, not in the frontend or browser storage
- The key is never included in any response from the backend to the frontend
- A "Test Connection" button makes a lightweight call to OpenRouter and reports success or failure with a specific error message (invalid key, insufficient credits, network error)
- The key can be updated or removed from a Settings page
- If no valid key is configured, all generation features are disabled with a message directing the user to Settings

### 6.3 Model Selector

**Description:** A dropdown that lets the user choose which model to use for generation.

**Acceptance Criteria:**
- Dropdown lists all five models by display name and provider
- The selected model persists across generations within a session
- The selected model is stored in the session state (not persisted across application restarts in Phase 1; persistence is added in Phase 5 with projects)
- The dropdown is accessible from the main workspace without navigating away

### 6.4 Text-to-Image Generation

**Description:** The user enters a text prompt, selects a model, and generates an image.

**Acceptance Criteria:**
- A multi-line text input field accepts the user's prompt
- Clicking "Generate" sends the prompt to the backend, which forwards it to OpenRouter with the correct model ID and `modalities` parameter
- For conversational models: request uses `modalities: ["image", "text"]`
- For image-only models: request uses `modalities: ["image"]`
- A loading indicator is displayed while the request is in progress
- The generated image is decoded from the base64 response and displayed in the main canvas area
- The prompt text is preserved in the input field after generation
- If the model returns text alongside the image (conversational models), the text is displayed below or beside the image
- Generation can be cancelled by the user while in progress (backend aborts the request)

### 6.5 Image Display Canvas

**Description:** The main area where generated images are displayed.

**Acceptance Criteria:**
- The canvas area displays the most recently generated image at a size that fits the viewport while maintaining aspect ratio
- The user can click to view the image at full resolution (opens in a lightbox or new tab)
- When no image has been generated, the canvas shows a placeholder state (empty canvas with instructional text)

### 6.6 Export — PNG

**Description:** The user can download the generated image as a PNG file.

**Acceptance Criteria:**
- A "Download" button appears on or near any generated image
- Clicking it downloads the full-resolution image as a PNG file
- The downloaded file contains no EXIF metadata, no prompt information, and no application-specific data
- The filename follows the pattern `imagegen_[timestamp].png`

### 6.7 Basic Error Handling

**Description:** The application handles common API errors and displays user-friendly messages.

**Acceptance Criteria:**
- Invalid API key (401): Displays message with link to Settings
- Insufficient credits (402): Displays message with link to OpenRouter dashboard
- Rate limit (429): Displays countdown and auto-retries up to 3 times with exponential backoff (2s, 4s, 8s)
- Timeout (no response in 120s): Displays message with option to wait or cancel
- Network error: Displays connectivity message
- Content policy rejection (400 with safety flag): Displays message suggesting prompt adjustment; does not auto-retry
- All errors are logged to `~/.imagegen/error.log` with full details (API key redacted)

### 6.8 Local Storage — Basic

**Description:** Generated images and minimal history metadata are saved to the local filesystem.

**Acceptance Criteria:**
- Each generated image is saved to `~/.imagegen/projects/default/images/` as a PNG file
- A thumbnail (256px longest side) is generated and saved to `~/.imagegen/projects/default/thumbnails/`
- A history entry is appended to `~/.imagegen/projects/default/history.json` containing: image filename, thumbnail filename, prompt text, model ID, timestamp
- History entries are retrievable via a backend API endpoint

---

## 7. Phase 2 — Core Controls

**Goal:** Add the primary generation controls that users need for most workflows, plus basic history browsing.

**Prerequisite:** Phase 1 complete.

### 7.1 Image-to-Image Generation (Single Reference)

**Description:** The user uploads a single reference image alongside a text prompt. The model uses the image as context.

**Acceptance Criteria:**
- A drag-and-drop zone or file picker accepts a single image upload (PNG, JPEG, or WebP)
- The uploaded image is displayed as a thumbnail in the workspace
- The user can remove the uploaded reference image
- When a reference image is present, the backend includes it in the API request (base64-encoded in the messages array)
- The backend validates file size (max 20MB) and resizes images larger than 4096px on the longest side before encoding
- If the backend compresses or resizes the image, the frontend displays a notification
- The reference image is included in the history entry metadata

### 7.2 Aspect Ratio Controls

**Description:** The user selects the aspect ratio for generated images.

**Acceptance Criteria:**
- Preset aspect ratio buttons are displayed in the controls panel: 1:1, 16:9, 9:16, 4:3, 3:2, 3:4, 21:9
- Each button has a visual thumbnail showing the shape
- A custom aspect ratio input field accepts width:height as integers (e.g., "5:4")
- The selected aspect ratio is sent to the API via `image_config.aspect_ratio`
- The canvas/preview area visually reflects the selected aspect ratio before generation (empty placeholder adjusts shape)
- Default: 1:1
- The selected aspect ratio is stored in the history entry

### 7.3 Output Resolution / Image Size

**Description:** The user selects the resolution tier for generated images.

**Acceptance Criteria:**
- Resolution options are displayed as selectable buttons: 1K, 2K, 4K
- Each option shows a label with pixel dimensions (e.g., "1K — 1024px") and the cost implication for the currently selected model
- The selected resolution is sent to the API via `image_config.image_size`
- If the selected resolution is not supported by the active model, the UI shows a warning and suggests the closest supported resolution
- Default: 1K
- The selected resolution is stored in the history entry

### 7.4 Negative Prompts

**Description:** The user specifies elements to exclude from the generated image.

**Acceptance Criteria:**
- A separate text input labeled "Exclude from image" is available under a collapsible "Advanced" section
- Placeholder text reads: "blurry, distorted, low quality, watermark, text artifacts"
- For conversational models: the backend appends exclusion instructions to the user message (e.g., "Do NOT include the following in the generated image: [negative prompt]")
- For image-only models: the backend appends the negative prompt to the main prompt text using appropriate formatting
- The negative prompt is stored in the history entry
- The negative prompt field is collapsible and collapsed by default

### 7.5 Style Presets

**Description:** Built-in style options that modify the prompt to achieve specific visual aesthetics.

**Acceptance Criteria:**
- A horizontally scrollable row of style preset buttons is displayed in the controls panel
- Each button shows a label and a representative thumbnail image
- Available presets: None (default), Photorealistic, Cinematic, Anime/Manga, Watercolor, Oil Painting, Line Art/Sketch, Flat Illustration, Isometric, Pixel Art, 3D Render, Product Photography
- Selecting a preset is single-select (only one active at a time; selecting a new one deselects the previous)
- The user's text prompt is not modified in the input field. The backend appends the style-specific prompt text at the API call layer.
- Preset prompt suffixes:
  - Photorealistic: "Photorealistic, shot on a professional DSLR camera, natural lighting, sharp focus, high detail"
  - Cinematic: "Cinematic still, dramatic lighting, shallow depth of field, film grain, anamorphic lens"
  - Anime/Manga: "Anime style, cel-shaded, vibrant colors, clean linework"
  - Watercolor: "Watercolor painting, soft edges, visible brush strokes, pigment bleeding"
  - Oil Painting: "Oil painting, textured canvas, visible impasto brushwork, rich color depth"
  - Line Art/Sketch: "Clean line art, black ink on white paper, precise linework, no shading"
  - Flat Illustration: "Flat vector illustration, bold colors, clean shapes, minimal shading"
  - Isometric: "Isometric 3D illustration, clean geometry, consistent lighting, technical precision"
  - Pixel Art: "Pixel art, retro gaming aesthetic, limited color palette, crisp pixels"
  - 3D Render: "3D render, physically-based rendering, studio lighting, smooth surfaces"
  - Product Photography: "Professional product photography, white background, studio lighting, commercial quality"
- The active style preset is stored in the history entry

### 7.6 Inline Cost Estimate

**Description:** A cost estimate displayed near the Generate button before the user clicks it.

**Acceptance Criteria:**
- A small text element near the Generate button displays: "Estimated cost: ~$X.XX"
- The estimate updates dynamically when the user changes: model, resolution, or number of variations (variations added in Phase 3, but the estimate logic should support it from the start)
- Cost calculation uses the pricing data from Appendix B
- For token-based models (Gemini, GPT-5), the estimate is approximate and labeled as such
- For flat-rate models (Seedream), the estimate is exact
- For megapixel-based models (Flux), the estimate is based on the selected resolution

### 7.7 Generation History — Basic

**Description:** A browsable list of previously generated images with the ability to revisit them.

**Acceptance Criteria:**
- A "History" panel is accessible from the sidebar or a dedicated tab
- Each entry shows: thumbnail, prompt (truncated), model name, timestamp
- Clicking an entry loads the full-resolution image into the canvas
- Each entry has a "Download" button and a "Delete" button
- A "Reuse prompt" button copies the prompt and parameters (model, aspect ratio, resolution, style preset, negative prompt) back into the generation controls
- History is loaded from `~/.imagegen/projects/default/history.json` on application start
- History entries are sorted newest-first by default
- History panel loads thumbnails, not full-resolution images, for performance

---

## 8. Phase 3 — Advanced Image Features

**Goal:** Add reference image workflows, batch generation, text-in-image controls, and intelligent model selection.

**Prerequisite:** Phase 2 complete.

### 8.1 Image Weight / Influence Control

**Description:** A slider controlling how much influence an uploaded reference image has on the output versus the text prompt.

**Acceptance Criteria:**
- A slider element with range 0–100 appears when a reference image is uploaded
- The slider is hidden when no reference image is present
- Default position: 50
- The backend translates the slider value into model-appropriate behavior:
  - Gemini and GPT-5: Prompt engineering. Low values emphasize the text prompt. High values emphasize the reference image. The mapping is defined in a backend configuration file (`~/.imagegen/config.json` or a separate `image_weight_mappings.json`).
  - Flux.2 Max: Mapped to available editing parameters.
  - Seedream 4.5: Mapped to editing consistency parameters.
- Changing the slider value and regenerating with the same prompt produces visibly different results (verifiable through manual testing)
- The slider value is stored in the history entry

### 8.2 Style Reference Image

**Description:** The user uploads an image to serve as a stylistic guide, separate from a content reference.

**Acceptance Criteria:**
- A distinct upload zone labeled "Style Reference" is displayed in the workspace, visually separated from the main reference image upload (Phase 2) and the character reference upload (Section 8.3)
- Accepts PNG, JPEG, WebP (same validation as Phase 2 image upload)
- The uploaded style reference is displayed as a labeled thumbnail
- The backend prepends style-specific instructions to the prompt: "Adopt the visual style, color palette, lighting, and artistic technique of the provided style reference image. Do not replicate the subject matter of the reference."
- The style reference works in combination with the Image Weight slider
- Removing the style reference removes it from the prompt context
- The style reference can be used simultaneously with a character reference and a style preset

### 8.3 Character / Subject Reference

**Description:** The user uploads images of a character or subject for identity preservation across generations.

**Acceptance Criteria:**
- A distinct upload zone labeled "Character / Subject Reference" is displayed in the workspace
- Supports uploading 1–5 reference images of the same subject
- Each uploaded reference is displayed as a labeled thumbnail and can be individually removed
- The backend prepends subject-consistency instructions: "Use the provided reference image(s) to maintain consistent appearance for the subject. Preserve facial features, body proportions, clothing details, and distinguishing characteristics."
- For Gemini 3 Pro: reference images are passed directly (native identity preservation)
- For Gemini 2.5 Flash: reference images passed for multi-image blending
- For GPT-5 Image: reference images included in conversation history
- For Flux.2 Max, Seedream 4.5: reference images passed as input images with preservation instructions
- Character references persist across generations within a session unless removed by the user

### 8.4 Batch / Variation Generation

**Description:** Generate multiple variations of the same prompt simultaneously.

**Acceptance Criteria:**
- A "Variations" control (dropdown or stepper) offers options: 1, 2, 3, 4
- Default: 1
- When set to >1, the backend sends that many independent API requests with the same parameters
- Requests are sent in parallel where possible
- Results are displayed in a grid layout within the canvas area
- Each variation can be: expanded to full view, downloaded, deleted, or selected as "Use as reference" for further iteration
- A "Download all" button downloads all variations as separate files
- The inline cost estimate multiplies per-image cost by the number of variations
- All variations are stored as separate history entries linked by a shared batch ID

### 8.5 Text in Image

**Description:** Controls for specifying text that should appear in the generated image.

**Acceptance Criteria:**
- A "Text in Image" section in the controls panel with fields for:
  - Text string (the exact text to render)
  - Placement: dropdown with options Top, Center, Bottom, Custom (freeform description)
  - Size: dropdown with options Headline, Subheading, Body, Fine Print
  - Color: optional color picker or text input
- The backend integrates these specifications into the prompt (e.g., "Include the text '[user text]' rendered as a [size] at the [placement] of the image in [color] color")
- The model recommendation (Section 8.7) highlights Gemini 3 Pro and GPT-5 Image when text fields are populated
- The text specifications are stored in the history entry

### 8.6 Export — Full Options

**Description:** Extend export beyond PNG to include JPEG and WebP with quality controls.

**Acceptance Criteria:**
- The download button offers a format selector: PNG (default), JPEG, WebP
- For JPEG and WebP: a quality slider (1–100, default 90) is displayed
- Exported files contain no EXIF metadata, no prompt data, no application metadata
- Filenames follow the pattern `imagegen_[timestamp].[ext]`
- Batch download (all variations) uses the selected format and quality for all files
- Format selection is available in the history panel for re-downloading past images

### 8.7 Smart Model Recommendation

**Description:** The model dropdown highlights a recommended model based on the user's current configuration.

**Acceptance Criteria:**
- One model in the dropdown is visually highlighted with a "Recommended" badge
- Recommendation logic:
  - Text in Image fields populated → Gemini 3 Pro or GPT-5 Image
  - Product Photography preset selected → Gemini 3 Pro
  - 4K resolution selected → models supporting 4K
  - No distinguishing features active → Gemini 2.5 Flash (best cost/quality)
- Models that do not support a currently-active feature are visually de-emphasized with a tooltip explaining the limitation (e.g., if conversational editing is active, Flux and Seedream show "Does not support conversational editing")
- An expandable "Compare models" section shows a capability matrix (see Appendix A)
- The recommendation is a suggestion only; the user can select any model

---

## 9. Phase 4 — Editing and Sessions

**Goal:** Add iterative editing workflows including conversational sessions, region masking, multi-image composition, and resolution enhancement.

**Prerequisite:** Phase 3 complete.

### 9.1 Multi-Turn Conversational Editing

**Description:** For conversational models, the application maintains conversation history for iterative image refinement through natural language.

**Acceptance Criteria:**
- When a conversational model is selected (Gemini 2.5 Flash, Gemini 3 Pro, GPT-5 Image), a chat panel appears alongside the canvas
- Each conversation turn displays: the user's instruction, the generated image thumbnail, and any text the model returned
- The backend stores the full conversation history and sends it with each API request
- Clicking a turn's thumbnail loads that image into the main canvas
- Session controls:
  - "New Session": Clears conversation, starts fresh. Requires confirmation.
  - "Undo": Removes the most recent turn and output
  - "Revert to step N": Rolls back to a specific earlier point (all subsequent turns are removed)
  - "Branch from here": Creates a fork from a specific turn. The original branch is preserved. The user can switch between branches.
- When switching from a conversational model to an image-only model mid-session:
  - The most recent image is carried forward as a reference image
  - The UI warns that conversational editing is no longer available
  - Conversation history is not sent
- When conversation token usage approaches the model's context limit, the UI warns and offers to start a new session with the current image as reference
- The chat panel is hidden when an image-only model is selected
- Conversation histories are saved to `~/.imagegen/projects/[project]/conversations/`

### 9.2 Subject Consistency Across Revisions

**Description:** The application maintains subject identity when the user iterates on an image with changes to hairstyle, backdrop, clothing, or pose.

**Acceptance Criteria:**
- When modifying a previously generated image, the prior output is automatically included as a reference
- For conversational models: subject consistency is maintained through conversation history (no additional action needed)
- For image-only models: the previous output is re-injected as a reference image with instructions to preserve subject identity
- A "Lock Subject" toggle is available. When locked:
  - The locked reference image persists even when the user enters a new prompt
  - A visual indicator shows that a subject is locked, with a thumbnail of the locked reference
- An "Unlock Subject" button clears the locked reference
- Subject lock state is stored per session

### 9.3 Masking / Region Selection Editing

**Description:** The user selects a specific region of an image to edit while preserving the rest.

**Acceptance Criteria:**
- Mask creation tools available on any generated or uploaded image:
  - Brush: Adjustable size (slider or keyboard shortcuts). Paints a mask area.
  - Eraser: Removes painted mask areas. Same size controls as brush.
  - Rectangle select: Click-and-drag to create a rectangular mask.
  - Lasso / freeform: Click-and-drag to draw a freeform mask boundary.
  - Invert mask: Toggle that swaps masked and unmasked regions.
- The mask is displayed as a semi-transparent colored overlay
- A text prompt input describes what should appear in the masked region
- The backend sends the full image + mask + prompt to the model:
  - For Gemini 3 Pro: Uses native localized edit capabilities
  - For Gemini 2.5 Flash: Describes the edit region in natural language
  - For GPT-5 Image: Includes edit instructions in the conversation
  - For Flux.2 Max, Seedream 4.5: The backend composites the mask onto the image (fills the masked region with a neutral color) and includes instructions to fill/replace the region
- Unmasked areas remain as close to the original as possible
- The mask can be cleared entirely with a "Clear mask" button

### 9.4 Multi-Image Composition / Blending

**Description:** The user combines multiple source images into a single output.

**Acceptance Criteria:**
- A "Compose" mode is accessible from the workspace (toggle or tab)
- Upload slots for 2–5 source images, each with an optional text label (e.g., "Subject," "Background," "Style," "Accent")
- A text prompt describes the desired composition
- The backend sends all images and the prompt to the selected model
- Per-model behavior:
  - Gemini 2.5 Flash: Multi-image blending (native)
  - Gemini 3 Pro: Multi-image blending with fine-grained control (native)
  - Seedream 4.5: Multi-image composition (native)
  - GPT-5 Image: Multiple images in messages array
  - Flux.2 Max: Reference images provided; blending less explicitly controllable
- The Image Weight slider controls overall reference influence
- Results are displayed in the main canvas
- The composition inputs (all source images, labels, prompt) are stored in the history entry

### 9.5 Super Resolution / Image Enhancement

**Description:** Re-generate an image at higher resolution to enhance quality and detail.

**Acceptance Criteria:**
- An "Enhance" button is available on any generated image
- Clicking it shows a submenu with available target resolutions (e.g., if the image was generated at 1K, options are 2K and 4K)
- Each option shows the estimated cost
- Enhancement sends the original image as a reference with instructions to preserve content and enhance detail at the target resolution
- The backend recommends Gemini 3 Pro for enhancement (best 4K output) but allows any model
- The enhanced image is stored as a new history entry linked to the original
- If the image is already at the maximum supported resolution, the Enhance button is disabled with a tooltip

---

## 10. Phase 5 — Organization and Polish

**Goal:** Add project organization, prompt templates, cumulative cost tracking, offline support, and storage management.

**Prerequisite:** Phase 4 complete.

### 10.1 Project Organization

**Description:** Users organize work into named projects with independent history, references, and settings.

**Acceptance Criteria:**
- A project selector in the sidebar or header allows switching between projects
- Users can create a new project (name required), rename an existing project, and delete a project (with confirmation)
- Each project has its own: generation history, saved reference images, conversation histories, default settings (preferred model, resolution, aspect ratio, style preset)
- Switching projects loads that project's history, references, and settings
- A "default" project exists on first launch and cannot be deleted
- Export project: Packages the project directory into a ZIP file (JSON metadata + all images) for backup
- Import project: Accepts a ZIP file and creates a new project from it
- Projects are stored as subdirectories under `~/.imagegen/projects/`

### 10.2 Prompt Library / Templates

**Description:** Pre-built and user-saved prompt templates.

**Acceptance Criteria:**
- A "Templates" panel accessible from the sidebar or controls area
- **Built-in templates** organized by category with the following presets:
  - Product Photography: "Product on white background," "Lifestyle product shot," "Packaging mockup," "Flat lay"
  - Portraits: "Professional headshot," "Environmental portrait"
  - Marketing/Social: "Social media post," "Banner/hero image"
  - Scenes/Environments: "Interior design," "Landscape"
- Each template contains: a name, a category, and prompt text with bracketed placeholders (e.g., `[Product description]`)
- Selecting a template populates the prompt field with the template text
- Bracketed placeholders are visually highlighted in the prompt field
- **User-saved templates:**
  - A "Save as template" button on the prompt field saves the current prompt as a user template
  - User templates appear in a "My Templates" section
  - User templates can be edited, deleted, and tagged
  - User templates are stored in `~/.imagegen/templates/user.json`

### 10.3 Cost Tracking — Cumulative

**Description:** Track cumulative estimated spend over time. Accessible in the Settings/Options menu.

**Acceptance Criteria:**
- A "Cost Tracking" section in Settings shows:
  - Running total of estimated spend for the current session
  - Historical spend log: a table with columns for date, model, resolution, variations, estimated cost
- "Export as CSV" button downloads the spend log
- Optional spend limit: the user sets a dollar threshold. When cumulative spend approaches or exceeds the threshold, the UI shows a warning banner. Generation is not blocked.
- The spend log is stored in `~/.imagegen/spend_log.csv`
- Note displayed: "Estimates are based on published OpenRouter pricing. Actual charges may vary."

### 10.4 Offline Behavior

**Description:** The application remains usable for local operations without internet.

**Acceptance Criteria:**
- Available offline: UI loading, history browsing, project management, settings, prompt editing, template browsing, viewing full-resolution images, exporting images
- Unavailable offline: image generation, API key validation
- The backend checks connectivity to `api.openrouter.ai` via HEAD request (every 30s idle, every 5s on generation attempt)
- When offline, a persistent non-intrusive banner displays: "Offline — image generation unavailable. Your workspace and history are fully accessible."
- The "Generate" button is disabled with a tooltip
- When connectivity restores, the banner disappears and "Generate" re-enables automatically
- Cost estimates use cached pricing data when offline

### 10.5 Storage Quota Management

**Description:** Monitor and manage local storage usage.

**Acceptance Criteria:**
- The backend provides an API endpoint returning current storage usage (total bytes used, breakdown by project)
- Storage quota default: 2GB, configurable in Settings
- At 80% usage: a warning banner appears with current usage (e.g., "Storage: 1.6GB / 2.0GB")
- At 95% usage: the UI prompts the user to clean up before allowing new generations. The prompt shows:
  - Total usage vs. quota
  - Per-project usage breakdown
  - Options to delete specific projects or history entries
  - Option to increase the quota
- The cleanup prompt is a modal that must be addressed (dismiss, clean up, or increase quota) before generation proceeds

### 10.6 Fallback Model Suggestions — Full

**Description:** When a model is unavailable, suggest specific alternatives based on the capability matrix.

**Acceptance Criteria:**
- When a 503 or model-specific unavailability error occurs after retries, the UI shows: "The selected model is temporarily unavailable. Would you like to try [suggested model]?"
- Suggestion logic:
  - Gemini 3 Pro unavailable → Gemini 2.5 Flash or GPT-5 Image
  - GPT-5 Image unavailable → Gemini 3 Pro
  - Gemini 2.5 Flash unavailable → Gemini 3 Pro (note: higher cost) or GPT-5 Image
  - Flux.2 Max unavailable → Seedream 4.5
  - Seedream 4.5 unavailable → Flux.2 Max
- The user can accept the suggestion (switches model and retries) or dismiss it

---

## 11. Non-Functional Requirements

### 11.1 Performance

- Image generation latency is determined by the model provider; the application should not add more than 500ms of overhead (image processing, prompt assembly, network proxy)
- The history panel should load within 2 seconds regardless of history size (achieved through thumbnail loading and pagination)
- The frontend should remain responsive during generation (no UI blocking)

### 11.2 Reliability

- No data loss: if the backend crashes mid-generation, previously saved history and projects are intact on restart
- All writes to history and project files use atomic write patterns (write to temp file, then rename) to prevent corruption
- The application should handle ungraceful shutdown (e.g., terminal closed) without corrupting stored data

### 11.3 Security

- The OpenRouter API key is stored only in the backend's config file, never sent to the frontend
- The backend binds to `localhost` only (not `0.0.0.0`) to prevent network access from other machines
- Error logs redact the API key before writing

### 11.4 Accessibility

- Keyboard navigation for all primary controls (model selector, generate button, history, settings)
- Sufficient color contrast for all UI elements (WCAG AA minimum)
- Screen reader-compatible labels on all interactive elements
- Error states use icons and text, not color alone

---

## 12. Technical Constraints to Resolve During Development

These items have known ambiguity that should be resolved during implementation through testing or documentation review:

1. **Image Weight abstraction calibration.** The mapping from the 0–100 slider to per-model prompt engineering (Phase 3, Section 8.1) requires empirical testing. Plan a calibration phase after the core image-to-image functionality is built. Document the final mappings in the backend configuration.

2. **Model-specific `image_config` support.** Not all models support all `image_config` parameters (`aspect_ratio`, `image_size`). Verify supported parameters per model against OpenRouter's current documentation at development time. Parameters may have changed since this document was authored.

3. **Conversation token tracking.** Multi-turn editing sessions (Phase 4, Section 9.1) require the backend to estimate token usage. Decide during development whether to use a character-count heuristic (simpler, less accurate) or a tokenizer library (more accurate, additional dependency). The chosen method should be accurate enough to warn before hitting context limits with reasonable margin.

4. **Mask-to-prompt translation for image-only models.** Region editing (Phase 4, Section 9.3) for Flux.2 Max and Seedream 4.5 requires the backend to composite the mask onto the image and use prompt instructions. The compositing approach (solid color fill, transparency, blur) and prompt phrasing will need model-specific testing.

---

## 13. Appendix A — Model Capability Matrix

| Capability | Gemini 2.5 Flash | Gemini 3 Pro | GPT-5 Image | Flux.2 Max | Seedream 4.5 |
|---|---|---|---|---|---|
| Conversational editing | Yes | Yes | Yes | No | No |
| Multi-image blending | Yes (native) | Yes (native, fine-grained) | Yes (via messages) | Limited | Yes (native) |
| Identity preservation | Yes | Yes (up to 5 subjects) | Yes (via context) | Via reference | Via reference |
| Text rendering | Good | Industry-leading | Strong | Varies | Improved (small text) |
| Max resolution | Verify at dev time | 4K | Verify at dev time | Per megapixel | Verify at dev time |
| Localized edits | Via natural language | Native support | Via conversation | Via reference editing | Via reference editing |
| Relative cost | Low | Medium-High | High | Medium (per megapixel) | Low (flat rate) |
| Speed | Fast | Medium | Medium | Medium | Medium |

---

## 14. Appendix B — Pricing Reference

All prices are from OpenRouter's published rates as of the authoring date. Verify at development time.

| Model | Pricing Structure | Estimated Cost per 1K Image |
|---|---|---|
| Gemini 2.5 Flash Image | 1,290 output tokens at $30/M output tokens | ~$0.039 |
| Gemini 3 Pro Image Preview | Token-based | Verify at dev time |
| GPT-5 Image | $10/M input, $10/M output, $40/M reasoning | Varies by prompt length |
| Flux.2 Max | $0.03/MP input, $0.07 first output MP | ~$0.07 (1MP output, no input image) |
| Seedream 4.5 | Flat rate | $0.04 |

---

## 15. Appendix C — Error Handling Reference

| HTTP Status | Error Type | Auto-Retry | User Action |
|---|---|---|---|
| 401 | Invalid API key | No | Link to Settings |
| 402 | Insufficient credits | No | Link to OpenRouter dashboard |
| 429 | Rate limit | Yes (3x, exponential backoff) | Wait for countdown |
| 400 (safety) | Content policy | No | Adjust prompt |
| 413 | Request too large | Yes (1x, after compression) | Automatic |
| 500, 502, 503 | Server/model error | Yes (3x, exponential backoff) | Switch model (Phase 5 adds suggestions) |
| Timeout (120s) | No response | No | Wait or cancel |
| Fetch failure | Network error | No | Check connection |