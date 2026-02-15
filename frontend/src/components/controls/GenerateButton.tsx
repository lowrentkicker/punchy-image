interface GenerateButtonProps {
  isGenerating: boolean;
  onGenerate: () => void;
  onCancel: () => void;
  disabled: boolean;
}

export function GenerateButton({
  isGenerating,
  onGenerate,
  onCancel,
  disabled,
}: GenerateButtonProps) {
  if (isGenerating) {
    return (
      <button
        onClick={onCancel}
        className="relative w-full h-12 rounded-3xl bg-cta-bg text-cta-text text-[1rem] font-semibold overflow-hidden cursor-pointer"
      >
        <div
          className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
          style={{ animation: 'shimmer 2s infinite', backgroundSize: '200% 100%' }}
        />
        <span
          className="relative"
          style={{ animation: 'pulse-gentle 2s infinite' }}
        >
          Generating...
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onGenerate}
      disabled={disabled}
      data-tour="generate-button"
      className="w-full h-12 rounded-3xl bg-cta-bg text-cta-text text-[1rem] font-semibold hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 transition-all duration-150 cursor-pointer"
    >
      Generate
    </button>
  );
}
