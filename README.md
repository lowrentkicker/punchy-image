# Punchy Image

A local desktop web application for generating images from natural language using multiple AI models via the [OpenRouter](https://openrouter.ai/) API. Runs entirely on your machine — no cloud services, no accounts, no external databases.

![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-19-61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6)
![Platform](https://img.shields.io/badge/Platform-macOS-lightgrey)

---

## Features

### Image Generation
- **Text-to-image generation** across six AI models from Google, OpenAI, Black Forest Labs, ByteDance, and Sourceful
- **Image-to-image generation** with single reference image upload
- **Style references** — upload a style image to guide the aesthetic
- **Character/subject references** — upload up to 5 images to preserve identity across generations
- **Image weight slider** (0–100) to control how much influence reference images have
- **Batch variations** — generate 1–4 variations per prompt, with optional multi-model support

### Controls & Presets
- **Aspect ratio presets** — 1:1, 16:9, 9:16, 4:3, 3:2, 3:4, 21:9, and custom
- **Resolution selector** — 1K, 2K, 4K output
- **12 style presets** — Photorealistic, Cinematic, Anime/Manga, Watercolor, Oil Painting, Line Art, Flat Illustration, Isometric, Pixel Art, 3D Render, Product Photography, and None
- **Negative prompts** — specify what to exclude from generated images
- **Smart model recommendation** with comparison matrix based on your prompt and settings

### Editing & Refinement
- **Conversational editing** — multi-turn chat-based refinement with supported models
- **Masking/region editing** — brush, eraser, rectangle, and lasso tools for targeted edits
- **Multi-image composition** — combine 2–5 source images into a single output
- **Subject consistency** — lock subject identity across editing rounds
- **Super resolution** — enhance images to 2K or 4K

### Organization
- **Projects** — organize generations into separate workspaces
- **Prompt templates** — built-in and user-created templates for common workflows
- **Generation history** — browse, reuse, download, or delete past generations
- **Export** — PNG, JPEG, or WebP with adjustable quality (clean files, no embedded metadata)
- **Guided feature tour** — spotlight-based onboarding walkthrough with 11 interactive steps

### Cost Management
- **Real-time cost estimates** before generation
- **Cumulative spend tracking** with CSV export
- **Configurable spend limits** with alerts
- **Fallback model suggestions** when a model is unavailable or over budget

---

## Supported Models

| Model | Provider | Type | Strengths |
|-------|----------|------|-----------|
| `gemini-2.5-flash-image` | Google | Conversational | Fast, cost-effective |
| `gemini-3-pro-image-preview` | Google | Conversational | Highest-fidelity 4K, identity preservation |
| `gpt-5-image` | OpenAI | Conversational | Strong instruction following, text rendering |
| `flux.2-max` | Black Forest Labs | Image-only | Top-tier quality |
| `seedream-4.5` | ByteDance | Image-only | Detail preservation, portraits |
| `riverflow-v2-pro` | Sourceful | Image-only | Top-tier control, perfect text rendering, integrated reasoning |

**Conversational models** support multi-turn editing and return text alongside images. **Image-only models** are single-shot and return image data only.

---

## Prerequisites

- **Python 3.11+**
- **Node.js** (LTS recommended)
- **OpenRouter API key** — get one at [openrouter.ai/keys](https://openrouter.ai/keys)

---

## Installation

```bash
# Clone the repository
git clone https://github.com/lowrentkicker/punchy-image.git
cd punchy-image

# Install Python dependencies
pip install -r requirements.txt
```

The frontend is built automatically on first launch. To build it manually:

```bash
cd frontend
npm install
npm run build
```

---

## Usage

### Quick Start

```bash
python run.py
```

This will:
1. Create the `~/.imagegen/` data directory (if it doesn't exist)
2. Build the frontend (if not already built)
3. Start the server at `http://localhost:8000`

On first launch, you'll be prompted to enter your OpenRouter API key in the Settings page.

### Development Mode

```bash
# Terminal 1 — Start the backend with hot reload
python run.py --dev

# Terminal 2 — Start the frontend dev server
cd frontend
npm run dev
```

- Backend API: `http://localhost:8000`
- Frontend dev server: `http://localhost:5173`

### Options

| Option | Description |
|--------|-------------|
| `--dev` | Enable hot reload for the backend |
| `--port PORT` | Set the server port (default: 8000) |

The port can also be set with the `IMAGEGEN_PORT` environment variable.

---

## Architecture

```
[React Frontend] <── REST ──> [FastAPI Backend] <── HTTPS ──> [OpenRouter API]
                                      │
                                      ▼
                             [~/.imagegen/ filesystem]
```

- The **frontend** never communicates directly with OpenRouter
- The **API key** is stored server-side only and never exposed to the browser
- All **prompt assembly**, **image processing**, and **cost calculation** happen in the backend
- All data is stored locally in `~/.imagegen/` — no external services

### Project Structure

```
├── run.py                    # Application launcher
├── requirements.txt          # Python dependencies
├── backend/
│   ├── main.py               # FastAPI app entry point
│   ├── config.py             # Model definitions and configuration
│   ├── routers/              # API route handlers
│   ├── services/             # Business logic (OpenRouter client, prompt builder, image processing)
│   ├── models/               # Pydantic request/response schemas
│   └── utils/                # Storage, connectivity, logging utilities
├── frontend/
│   ├── package.json
│   ├── vite.config.ts        # Vite + React + Tailwind
│   └── src/
│       ├── App.tsx           # Root component
│       ├── components/       # UI components organized by feature
│       ├── hooks/            # React hooks (state, generation, layout)
│       ├── services/         # API client
│       └── types/            # TypeScript interfaces
└── UI_examples/              # Design reference screenshots
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python 3.11+, FastAPI, Uvicorn, Pydantic |
| Frontend | React 19, TypeScript 5.9, Vite, Tailwind CSS |
| HTTP Client | httpx (async) |
| Image Processing | Pillow |
| API Provider | OpenRouter |
| Storage | Local filesystem (`~/.imagegen/`) |

---

## Local Data

All application data is stored in `~/.imagegen/`:

```
~/.imagegen/
├── config.json               # API key and preferences
├── spend_log.csv             # Cost tracking history
├── error.log                 # Error logs (API key redacted)
├── projects/
│   └── default/
│       ├── project.json      # Project metadata
│       ├── history.json      # Generation history
│       ├── images/           # Full-resolution generated images
│       ├── thumbnails/       # 256px thumbnails
│       ├── references/       # Uploaded reference images
│       └── conversations/    # Conversation state
├── templates/                # Prompt templates
└── styles/                   # Style preset thumbnails
```

All JSON files use atomic writes (write to temp file, then rename) to prevent corruption.

---

## Security

- The OpenRouter API key is stored only in `~/.imagegen/config.json` and is never sent to the frontend, included in API responses, or logged
- The server binds to `localhost` only — it is not accessible from other machines on the network
- Exported images contain no metadata (no EXIF, no prompt data)
- All error logs automatically redact the API key

---

## License

All rights reserved. This software may not be reproduced, distributed, or modified without explicit permission.
