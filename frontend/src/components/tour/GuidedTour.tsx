import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAppContext } from '../../hooks/useAppContext';
import { useTour } from '../../hooks/useTour';
import { TourSpotlight } from './TourSpotlight';
import { TourTooltip } from './TourTooltip';

export function GuidedTour() {
  const { dispatch } = useAppContext();
  const {
    step,
    currentStep,
    totalSteps,
    isLastStep,
    canGoPrevious,
    targetRect,
    nextStep,
    prevStep,
    reset,
    markCompleted,
  } = useTour();

  const endTour = useCallback(
    (completed: boolean) => {
      if (completed) markCompleted();
      reset();
      dispatch({ type: 'END_TOUR' });
    },
    [dispatch, reset, markCompleted],
  );

  const handleNext = useCallback(() => {
    if (isLastStep) {
      endTour(true);
    } else {
      nextStep();
    }
  }, [isLastStep, nextStep, endTour]);

  const handleSkip = useCallback(() => {
    endTour(true);
  }, [endTour]);

  // ESC key to dismiss
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        endTour(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [endTour]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!step) return null;

  return createPortal(
    <>
      <TourSpotlight
        targetRect={targetRect}
        padding={step.spotlightPadding}
        onClick={handleSkip}
      />
      <TourTooltip
        step={step}
        currentStep={currentStep}
        totalSteps={totalSteps}
        targetRect={targetRect}
        canGoPrevious={canGoPrevious}
        isLastStep={isLastStep}
        onNext={handleNext}
        onPrevious={prevStep}
        onSkip={handleSkip}
      />
    </>,
    document.body,
  );
}
