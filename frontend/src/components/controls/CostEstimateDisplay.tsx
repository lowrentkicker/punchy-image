import { useEffect } from 'react';
import { useAppContext } from '../../hooks/useAppContext';
import { api } from '../../services/api';

export function CostEstimateDisplay() {
  const { state, dispatch } = useAppContext();

  useEffect(() => {
    if (!state.selectedModelId) return;

    api
      .getCostEstimate(state.selectedModelId, state.resolution)
      .then((estimate) => {
        dispatch({ type: 'SET_COST_ESTIMATE', costEstimate: estimate });
      })
      .catch(() => {
        dispatch({ type: 'SET_COST_ESTIMATE', costEstimate: null });
      });
  }, [state.selectedModelId, state.resolution, dispatch]);

  if (!state.costEstimate) return null;

  const { estimated_cost, is_approximate } = state.costEstimate;
  const formatted = estimated_cost < 0.01
    ? '<$0.01'
    : `$${estimated_cost.toFixed(3)}`;

  return (
    <div className="flex items-center justify-between text-xs text-[--text-tertiary]">
      <span>Estimated cost</span>
      <span>
        {is_approximate ? '~' : ''}
        {formatted}
      </span>
    </div>
  );
}
