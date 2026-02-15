import { useEffect, useRef, useState } from 'react';
import type { TourStep } from './tourSteps';
import type { TargetRect } from '../../hooks/useTour';

interface TourTooltipProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  targetRect: TargetRect | null;
  canGoPrevious: boolean;
  isLastStep: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}

const TOOLTIP_GAP = 16;
const VIEWPORT_MARGIN = 16;
const TOOLTIP_MAX_WIDTH = 340;

export function TourTooltip({
  step,
  currentStep,
  totalSteps,
  targetRect,
  canGoPrevious,
  isLastStep,
  onNext,
  onPrevious,
  onSkip,
}: TourTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState<{
    side: 'top' | 'right' | 'bottom' | 'left';
    offset: number;
  }>({ side: 'left', offset: 20 });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Brief delay for enter animation
    setVisible(false);
    const timer = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(timer);
  }, [currentStep]);

  useEffect(() => {
    const tooltip = tooltipRef.current;
    if (!tooltip) return;

    const tooltipRect = tooltip.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Centered step (no target)
    if (!targetRect || step.placement === 'center') {
      setPosition({
        top: (vh - tooltipRect.height) / 2,
        left: (vw - tooltipRect.width) / 2,
      });
      setArrowPosition({ side: 'top', offset: -100 }); // hidden
      return;
    }

    let top = 0;
    let left = 0;
    let arrowSide: 'top' | 'right' | 'bottom' | 'left' = 'left';
    let arrowOff = 20;

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;

    switch (step.placement) {
      case 'right':
        top = targetCenterY - tooltipRect.height / 2;
        left = targetRect.left + targetRect.width + step.spotlightPadding + TOOLTIP_GAP;
        arrowSide = 'left';
        arrowOff = Math.min(
          Math.max(20, targetCenterY - top),
          tooltipRect.height - 20,
        );
        break;

      case 'left':
        top = targetCenterY - tooltipRect.height / 2;
        left = targetRect.left - step.spotlightPadding - TOOLTIP_GAP - tooltipRect.width;
        arrowSide = 'right';
        arrowOff = Math.min(
          Math.max(20, targetCenterY - top),
          tooltipRect.height - 20,
        );
        break;

      case 'top':
        top = targetRect.top - step.spotlightPadding - TOOLTIP_GAP - tooltipRect.height;
        left = targetCenterX - tooltipRect.width / 2;
        arrowSide = 'bottom';
        arrowOff = tooltipRect.width / 2;
        break;

      case 'bottom':
        top = targetRect.top + targetRect.height + step.spotlightPadding + TOOLTIP_GAP;
        left = targetCenterX - tooltipRect.width / 2;
        arrowSide = 'top';
        arrowOff = tooltipRect.width / 2;
        break;
    }

    // Clamp to viewport
    if (top < VIEWPORT_MARGIN) top = VIEWPORT_MARGIN;
    if (top + tooltipRect.height > vh - VIEWPORT_MARGIN) {
      top = vh - VIEWPORT_MARGIN - tooltipRect.height;
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;
    if (left + tooltipRect.width > vw - VIEWPORT_MARGIN) {
      left = vw - VIEWPORT_MARGIN - tooltipRect.width;
    }

    setPosition({ top, left });
    setArrowPosition({ side: arrowSide, offset: arrowOff });
  }, [targetRect, step, currentStep]);

  const arrowStyle = getArrowStyle(arrowPosition.side, arrowPosition.offset);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[1001] transition-all duration-200 ease-out"
      style={{
        top: position.top,
        left: position.left,
        maxWidth: TOOLTIP_MAX_WIDTH,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-8px)',
      }}
    >
      <div className="rounded-2xl border border-[--border-medium] bg-surface-2 p-5 shadow-2xl shadow-black/60">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[--text-primary]">
            {step.title}
          </h3>
          <span className="text-[11px] font-medium text-accent">
            {currentStep + 1} of {totalSteps}
          </span>
        </div>

        {/* Content */}
        <p className="mb-5 text-sm leading-relaxed text-[--text-secondary]">
          {step.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <button
            onClick={onSkip}
            className="text-xs text-[--text-tertiary] hover:text-[--text-secondary] transition-colors duration-150"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {canGoPrevious && (
              <button
                onClick={onPrevious}
                className="rounded-xl border border-[--border-medium] px-3 py-1.5 text-xs font-medium text-[--text-secondary] hover:bg-surface-3 transition-colors duration-150"
              >
                Previous
              </button>
            )}
            <button
              onClick={onNext}
              className="rounded-xl bg-[--cta-bg] px-4 py-1.5 text-xs font-medium text-[--cta-text] hover:brightness-110 transition-all duration-150"
            >
              {isLastStep ? 'Done' : 'Next'}
            </button>
          </div>
        </div>
      </div>

      {/* Arrow pointer */}
      {arrowPosition.offset >= 0 && (
        <div
          className="absolute h-3 w-3 rotate-45 border border-[--border-medium] bg-surface-2"
          style={arrowStyle}
        />
      )}
    </div>
  );
}

function getArrowStyle(
  side: 'top' | 'right' | 'bottom' | 'left',
  offset: number,
): React.CSSProperties {
  switch (side) {
    case 'left':
      return {
        left: -6,
        top: offset - 6,
        borderRight: 'none',
        borderTop: 'none',
      };
    case 'right':
      return {
        right: -6,
        top: offset - 6,
        borderLeft: 'none',
        borderBottom: 'none',
      };
    case 'top':
      return {
        top: -6,
        left: offset - 6,
        borderBottom: 'none',
        borderRight: 'none',
      };
    case 'bottom':
      return {
        bottom: -6,
        left: offset - 6,
        borderTop: 'none',
        borderLeft: 'none',
      };
  }
}
