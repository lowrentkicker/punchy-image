# UI Design Direction — ImageGen

**Purpose:** This document defines the visual and interaction design language for ImageGen, derived from reference screenshots in `/UI_examples/`. Add this content to `CLAUDE.md` under a new `## UI Design Direction` section, or keep it as a standalone reference file in the project root.

---

## Design Philosophy

The interface should feel like a **creative tool that gets out of the way of the work.** The generated image is always the most important element on screen. Controls exist to serve the image, not compete with it. The overall aesthetic is dark, quiet, and refined — closer to a professional photo editing environment than a typical web application.

**Three principles govern every UI decision:**

1. **The image is the hero.** The generated image should always be the largest, most visually prominent element. Controls, panels, and chrome recede. The image gets maximum real estate.
2. **Progressive disclosure.** Show only what's needed for the current task. Advanced controls are collapsed or tucked into panels. The default state is clean and minimal. Complexity is available but not imposed.
3. **Quiet until activated.** Borders are subtle. Backgrounds are near-black, not gray. Interactive elements are understated in their resting state and become more visible on hover/focus. The UI should feel calm, not busy.

---

## Color System

### Background Layers
The interface uses multiple dark background tones to create depth through layering, not through shadows or borders.

- **Base background:** Near-black (`#0A0A0A` to `#0D0D0D`). This is the darkest layer — the application shell, the area behind everything.
- **Surface 1 (panels, sidebar):** Very dark gray (`#141414` to `#1A1A1A`). Sidebar navigation, controls panel, history panel.
- **Surface 2 (cards, inputs):** Slightly lighter (`#1E1E1E` to `#242424`). Prompt input field, image cards, settings cards. These "float" above Surface 1.
- **Surface 3 (elevated elements):** (`#2A2A2A` to `#303030`). Dropdowns, tooltips, modal backgrounds.

### Borders
- Thin, low-opacity borders define edges between surfaces: `1px solid rgba(255, 255, 255, 0.06)` to `rgba(255, 255, 255, 0.10)`
- Borders are structural, not decorative. They separate panels and cards, not individual elements within a card.
- No harsh white or gray borders anywhere.

### Text
- **Primary text:** `rgba(255, 255, 255, 0.90)` — Headings, prompt text, active labels
- **Secondary text:** `rgba(255, 255, 255, 0.55)` — Descriptions, metadata, inactive labels, timestamps
- **Tertiary text:** `rgba(255, 255, 255, 0.35)` — Placeholder text, disabled labels, subtle annotations

### Accent Color
- **Primary accent:** A warm amber/gold (`#D4A843` to `#E8B84D`). Used sparingly: active states, selected items, progress indicators, highlighted badges.
- **Do not overuse the accent.** It should draw the eye only to the most important interactive element on screen at any given time (typically the Generate button or an active selection).

### Functional Colors
- **Success:** Muted green (`#4CAF50` at 80% opacity)
- **Warning:** Amber (use the accent color)
- **Error:** Muted red (`#E57373` at 80% opacity)
- **Info/link:** Muted blue (`#64B5F6` at 80% opacity)

---

## Layout — Three-Panel Desktop

The application uses a three-panel layout for desktop:

```
┌──────────────┬──────────────────────────────────────────┬──────────────────┐
│              │                                          │                  │
│   Left       │              Center                      │    Right         │
│   Sidebar    │              Canvas                      │    Controls      │
│              │                                          │    Panel         │
│   Navigation │              (Image display,             │                  │
│   History    │               variations grid,           │    Prompt        │
│   Projects   │               conversation)              │    Model         │
│              │                                          │    Settings      │
│              │                                          │    Parameters    │
│              │                                          │    Generate      │
│              │                                          │                  │
└──────────────┴──────────────────────────────────────────┴──────────────────┘
     ~220px              flexible (remaining)                  ~320px
```

### Left Sidebar (~220px)
- Fixed width, collapsible to icon-only mode (~60px)
- Contains: project selector, navigation (workspace, history, templates, settings), conversation/chat history when in conversational editing mode
- Background: Surface 1
- Navigation items are text labels with optional icons, not icon-only by default
- Active item has a subtle highlight background (Surface 2) with the accent color on the left edge or text

### Center Canvas (flexible)
- Takes all remaining horizontal space
- This is where the generated image lives — it must always feel spacious
- When displaying a single image: the image is centered with generous padding
- When displaying variations: a 2x2 grid of image cards
- When in conversational editing: the canvas shares vertical space with the chat panel (chat below or beside the image, not replacing it)
- Background: Base background (darkest)

### Right Controls Panel (~320px)
- Fixed width, collapsible
- Contains all generation controls in a scrollable vertical layout:
  1. Prompt text area (at the top — this is the primary input)
  2. Model selector dropdown
  3. Style preset selector
  4. Aspect ratio buttons
  5. Resolution selector
  6. Image weight slider (visible only when reference image is uploaded)
  7. Advanced settings (collapsible): negative prompt, text-in-image fields
  8. Number of variations selector
  9. Cost estimate (small, inline)
  10. **Generate button** (pinned to the bottom of the panel, always visible)
- Background: Surface 1
- Each control group is separated by subtle spacing, not divider lines

---

## Component Styling

### Buttons

**Generate (primary CTA):**
- Full width of the right panel
- Pinned to the bottom of the controls panel so it's always visible regardless of scroll position
- White or near-white background (`#F0F0F0`) with dark text (`#0A0A0A`)
- Large size (48px height), rounded corners (24px border-radius — fully rounded pill shape)
- This should be the single most prominent UI element on screen
- Hover: slight brightness increase
- Disabled state (offline or no prompt): reduced opacity (0.4), no hover effect

**Secondary buttons** (Download, Reuse, Use as Reference):
- Transparent background with subtle border (`rgba(255, 255, 255, 0.10)`)
- White text at secondary opacity
- Rounded corners (12px)
- Hover: background fills to Surface 3

**Icon buttons** (delete, expand, close):
- Circular, transparent background
- Icon at secondary text opacity
- Hover: background fills to Surface 2

### Input Fields

**Prompt text area:**
- Surface 2 background
- Large border-radius (16px)
- Subtle border (rgba(255, 255, 255, 0.08))
- Placeholder text at tertiary opacity
- On focus: border brightens slightly (rgba(255, 255, 255, 0.15)), no colored glow
- Generous internal padding (16px)
- Multi-line, auto-expanding to a reasonable max height before scrolling

**Standard inputs** (negative prompt, text-in-image, custom aspect ratio):
- Same styling as prompt but smaller
- Single-line or small multi-line

### Dropdowns / Selectors

**Model selector:**
- Surface 2 background, rounded corners (12px)
- Dropdown content appears as Surface 3 with the same border treatment
- Each option shows model name, provider tag, and strength badges
- The "Recommended" badge uses the accent color

**Segmented controls** (resolution: 1K / 2K / 4K, image quality):
- Horizontal row of options within a Surface 2 container
- Selected option: Surface 3 background with subtle accent indicator
- Unselected: transparent, secondary text opacity
- Rounded corners on the container, individual segments are flush

### Sliders

- Track: thin line (2-3px) at Surface 3
- Filled portion: accent color
- Thumb: small circle (14-16px), white fill, subtle shadow
- Value label appears on hover or while dragging
- Used for: image weight, JPEG/WebP quality

### Cards (Image Cards, History Entries)

- Surface 2 background
- Large border-radius (16px on image cards, 12px on smaller cards)
- Subtle border (rgba(255, 255, 255, 0.06))
- Images within cards have their own border-radius (12px), slightly inset from the card edge
- Hover: border brightens slightly, subtle scale transform (1.01-1.02) for image cards in grids
- No heavy drop shadows. Depth comes from background layering.

### Style Preset Thumbnails

- Small square or rounded-rectangle thumbnails in a horizontal scrollable row
- Selected preset has an accent color border or ring
- Label below or overlaid on each thumbnail
- Unselected: slightly dimmed (opacity 0.7)
- Selected: full opacity with accent indicator

---

## Typography

- **Font family:** System font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`). This respects the MacOS environment and avoids loading external fonts.
- **Heading (page titles):** 24-28px, weight 600-700, primary text color
- **Subheading (section labels, panel titles):** 14-16px, weight 600, primary text color
- **Body (descriptions, prompt text):** 14-15px, weight 400, primary or secondary text color
- **Caption (metadata, timestamps, cost estimates):** 12-13px, weight 400, secondary or tertiary text color
- **Monospace (cost values, technical info):** System monospace, same size as caption

---

## Interaction Details

### Loading / Generating State
- The Generate button changes to a "Generating..." state with a subtle animation (pulse or shimmer)
- The canvas area shows a progress indicator. Options (decide during implementation):
  - A percentage counter if the API provides progress information
  - A smooth indeterminate animation (subtle pulse, rotating ring, or shimmer effect on the canvas placeholder)
- The loading state should feel alive, not static. A simple spinner is insufficient.
- All other controls remain visible but are non-interactive during generation (reduced opacity)

### Image Display
- Generated images should fill the canvas space while maintaining aspect ratio
- Rounded corners on the image itself (12-16px)
- A subtle border or shadow separates the image from the background
- Clicking the image opens a full-resolution lightbox view with a dark overlay

### Variation Grid
- 2x2 grid for 4 variations, 2x1 for 2, 1x1 + empty slots for 3
- Each variation is an image card with subtle hover effects
- Cards can be slightly overlapped or stacked at an angle for visual interest (see reference screenshots) — but a clean grid is also acceptable. Prioritize clarity over flair.
- Each card has action buttons that appear on hover (download, use as reference, delete)
- Version/variation labels ("V1", "V2", etc.) as small badges on each card

### Transitions
- Panel collapse/expand: 200-300ms ease-out
- Image load/appear: fade-in over 300ms
- Button state changes: 150ms
- No jarring transitions. Everything should feel smooth but not slow.

---

## Responsive Behavior

This is a desktop application. The minimum supported viewport width is 1024px. No mobile or tablet layout is needed.

- Below 1280px: The right controls panel collapses to a narrower width (~280px) or becomes an overlay panel
- Below 1024px: Both sidebar and controls panel collapse to icon-only / overlay mode, giving the canvas maximum space
- The canvas area always gets priority for available space

---

## What to Avoid

- **Gray backgrounds.** The app should feel dark/black, not gray. Avoid `#333`, `#444`, `#555` as primary backgrounds.
- **Colored glows or neon effects** on UI elements (inputs, buttons, borders). The accent color is warm and muted, not electric. Glowing effects are reserved for the loading animation only.
- **Dense control layouts.** Do not pack all controls into view at once. Use collapsible sections and progressive disclosure.
- **Small images.** Never shrink the generated image to make room for controls. The image is always the primary element. Controls scroll; the image doesn't shrink.
- **Generic web app aesthetics.** This should not look like a dashboard, a SaaS product, or a CRUD app. It should feel like a creative tool — closer to Lightroom or Figma in tone than to a typical React admin panel.