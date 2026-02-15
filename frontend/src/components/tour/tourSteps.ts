export interface TourStep {
  id: string;
  title: string;
  content: string;
  /** CSS selector for the target element, or null for a centered (no-spotlight) step */
  targetSelector: string | null;
  /** Padding around the spotlight cutout in pixels */
  spotlightPadding: number;
  /** Tooltip placement relative to target */
  placement: 'top' | 'right' | 'bottom' | 'left' | 'center';
}

export const tourSteps: TourStep[] = [
  {
    id: 'sidebar-nav',
    title: 'Navigation',
    content:
      'Switch between Workspace, Compose, Templates, History, and Settings using the sidebar.',
    targetSelector: '[data-tour="sidebar-nav"]',
    spotlightPadding: 8,
    placement: 'right',
  },
  {
    id: 'prompt-input',
    title: 'Describe Your Image',
    content:
      'Type a detailed description of the image you want to create. The more specific you are, the better the result.',
    targetSelector: '[data-tour="prompt-input"]',
    spotlightPadding: 8,
    placement: 'left',
  },
  {
    id: 'model-selector',
    title: 'Choose a Model',
    content:
      'Pick from conversational models that support multi-turn editing, or image-only models for single-shot generation.',
    targetSelector: '[data-tour="model-selector"]',
    spotlightPadding: 8,
    placement: 'left',
  },
  {
    id: 'aspect-resolution',
    title: 'Size & Format',
    content:
      'Set the aspect ratio and resolution for your image. Higher resolutions produce more detail but cost more.',
    targetSelector: '[data-tour="aspect-resolution"]',
    spotlightPadding: 8,
    placement: 'left',
  },
  {
    id: 'style-preset',
    title: 'Style Presets',
    content:
      'Apply a visual style — like cinematic, anime, or watercolor — to influence the generated image.',
    targetSelector: '[data-tour="style-preset"]',
    spotlightPadding: 8,
    placement: 'left',
  },
  {
    id: 'references-section',
    title: 'Reference Images',
    content:
      'Upload reference images to guide composition, style, or character appearance. Use the weight slider to control how much influence they have.',
    targetSelector: '[data-tour="references-section"]',
    spotlightPadding: 8,
    placement: 'left',
  },
  {
    id: 'generate-button',
    title: 'Generate',
    content:
      'When you\'re ready, hit Generate to create your image. You\'ll see a cost estimate just above this button.',
    targetSelector: '[data-tour="generate-button"]',
    spotlightPadding: 12,
    placement: 'top',
  },
  {
    id: 'explore-more',
    title: 'Explore More',
    content:
      'Browse your History to revisit past generations, use Templates for quick prompts, or check Settings to manage costs and storage. You can replay this tour anytime from Settings.',
    targetSelector: null,
    spotlightPadding: 0,
    placement: 'center',
  },
];
