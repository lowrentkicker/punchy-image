type Tool = 'brush' | 'eraser' | 'rectangle' | 'lasso';

interface MaskToolbarProps {
  tool: Tool;
  onToolChange: (tool: Tool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onClear: () => void;
  onInvert: () => void;
  onClose: () => void;
}

const TOOLS: { value: Tool; label: string; icon: string }[] = [
  { value: 'brush', label: 'Brush', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
  { value: 'eraser', label: 'Eraser', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' },
  { value: 'rectangle', label: 'Rectangle', icon: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z' },
  { value: 'lasso', label: 'Lasso', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4M13 3v4m-2-2h4m-2 14v4m-2-2h4M21 3v4m-2-2h4m-4 14v4m-2-2h4' },
];

export function MaskToolbar({
  tool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  onClear,
  onInvert,
  onClose,
}: MaskToolbarProps) {
  return (
    <div className="flex items-center gap-4 border-b border-[--border-default] bg-surface-1 px-4 py-2">
      {/* Tools */}
      <div className="flex gap-1">
        {TOOLS.map((t) => (
          <button
            key={t.value}
            onClick={() => onToolChange(t.value)}
            className={`rounded-lg p-2 transition-colors ${
              tool === t.value
                ? 'bg-[--accent]/10 text-[--accent]'
                : 'text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary]'
            }`}
            title={t.label}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={t.icon} />
            </svg>
          </button>
        ))}
      </div>

      {/* Brush size */}
      {(tool === 'brush' || tool === 'eraser') && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[--text-tertiary]">Size</span>
          <input
            type="range"
            min={5}
            max={100}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            className="w-20 accent-[--accent] h-1 rounded-full appearance-none bg-surface-3 cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[--accent]"
          />
          <span className="w-6 text-[10px] text-[--text-tertiary]">{brushSize}</span>
        </div>
      )}

      {/* Actions */}
      <div className="ml-auto flex gap-1">
        <button
          onClick={onInvert}
          className="rounded-lg px-2.5 py-1.5 text-xs text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary] transition-colors"
        >
          Invert
        </button>
        <button
          onClick={onClear}
          className="rounded-lg px-2.5 py-1.5 text-xs text-[--text-tertiary] hover:bg-surface-2 hover:text-[--text-secondary] transition-colors"
        >
          Clear
        </button>
        <button
          onClick={onClose}
          className="rounded-lg px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
