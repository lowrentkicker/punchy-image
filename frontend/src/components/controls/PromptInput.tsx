interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled,
}: PromptInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !disabled) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div data-tour="prompt-input">
      <label
        htmlFor="prompt"
        className="mb-1.5 block text-xs font-medium text-[--text-secondary]"
      >
        Prompt
      </label>
      <textarea
        id="prompt"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Describe the image you want to generate..."
        rows={4}
        disabled={disabled}
        className="w-full resize-y rounded-2xl border border-[--border-subtle] bg-surface-2 p-4 text-sm text-[--text-primary] placeholder:text-[--text-tertiary] focus:border-[--border-focus] focus:outline-none disabled:opacity-50 transition-colors duration-150"
      />
      <p className="mt-1 text-xs text-[--text-tertiary]">
        {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter to generate
      </p>
    </div>
  );
}
