import type { TargetRect } from '../../hooks/useTour';

interface TourSpotlightProps {
  targetRect: TargetRect | null;
  padding: number;
  onClick: () => void;
}

export function TourSpotlight({ targetRect, padding, onClick }: TourSpotlightProps) {
  // No spotlight for centered (no-target) steps
  if (!targetRect) {
    return (
      <div
        className="fixed inset-0 z-[1000] bg-black/85 transition-opacity duration-300"
        onClick={onClick}
      />
    );
  }

  const x = targetRect.left - padding;
  const y = targetRect.top - padding;
  const w = targetRect.width + padding * 2;
  const h = targetRect.height + padding * 2;
  const r = 12; // border-radius for cutout

  return (
    <svg
      className="fixed inset-0 z-[1000] h-full w-full transition-all duration-300"
      onClick={onClick}
      style={{ pointerEvents: 'auto' }}
    >
      <defs>
        <mask id="tour-spotlight-mask">
          {/* White = visible (the dark overlay) */}
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {/* Black = transparent (the cutout hole) */}
          <rect
            x={x}
            y={y}
            width={w}
            height={h}
            rx={r}
            ry={r}
            fill="black"
            className="transition-all duration-300 ease-out"
          />
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(0, 0, 0, 0.85)"
        mask="url(#tour-spotlight-mask)"
      />
      {/* Prevent clicks on the cutout area from dismissing */}
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={r}
        ry={r}
        fill="transparent"
        style={{ pointerEvents: 'none' }}
        className="transition-all duration-300 ease-out"
      />
    </svg>
  );
}
