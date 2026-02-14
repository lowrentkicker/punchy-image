import { useEffect } from 'react';
import { useAppContext } from './useAppContext';

export function useResponsiveLayout() {
  const { dispatch } = useAppContext();

  useEffect(() => {
    const narrowQuery = window.matchMedia('(max-width: 1279px)');
    const veryNarrowQuery = window.matchMedia('(max-width: 1023px)');

    const applyBreakpoints = () => {
      const isNarrow = narrowQuery.matches;
      const isVeryNarrow = veryNarrowQuery.matches;

      dispatch({ type: 'SET_SIDEBAR_COLLAPSED', collapsed: isNarrow });
      dispatch({ type: 'SET_CONTROLS_COLLAPSED', collapsed: isVeryNarrow });
    };

    // Apply on mount
    applyBreakpoints();

    // Listen for changes
    const handleChange = () => applyBreakpoints();
    narrowQuery.addEventListener('change', handleChange);
    veryNarrowQuery.addEventListener('change', handleChange);

    return () => {
      narrowQuery.removeEventListener('change', handleChange);
      veryNarrowQuery.removeEventListener('change', handleChange);
    };
  }, [dispatch]);
}
