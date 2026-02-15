import { useState, useCallback, useEffect, useRef } from 'react';
import { tourSteps } from '../components/tour/tourSteps';

const STORAGE_KEY = 'imagegen-tour-completed';

export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function useTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout>>();

  const step = tourSteps[currentStep];
  const totalSteps = tourSteps.length;
  const isLastStep = currentStep === totalSteps - 1;
  const canGoPrevious = currentStep > 0;

  const isCompleted = useCallback(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }, []);

  const markCompleted = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {}
  }, []);

  // Find and measure the target element
  const measureTarget = useCallback(() => {
    if (!step?.targetSelector) {
      setTargetRect(null);
      return;
    }

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    } else {
      setTargetRect(null);
    }
  }, [step]);

  // Measure on step change, with retries for elements that might not be rendered yet
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 5;

    const tryMeasure = () => {
      if (!step?.targetSelector) {
        setTargetRect(null);
        return;
      }

      const el = document.querySelector(step.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      } else if (attempts < maxAttempts) {
        attempts++;
        retryTimer.current = setTimeout(tryMeasure, 200);
      } else {
        setTargetRect(null);
      }
    };

    tryMeasure();

    return () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [step]);

  // Recalculate on resize & scroll
  useEffect(() => {
    let rafId: number;
    const handleResize = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(measureTarget);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      cancelAnimationFrame(rafId);
    };
  }, [measureTarget]);

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setTargetRect(null);
  }, []);

  return {
    step,
    currentStep,
    totalSteps,
    isLastStep,
    canGoPrevious,
    targetRect,
    nextStep,
    prevStep,
    reset,
    isCompleted,
    markCompleted,
  };
}
