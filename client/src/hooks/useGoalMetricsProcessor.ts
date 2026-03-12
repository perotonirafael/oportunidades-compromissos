import { useMemo } from 'react';
import { GoalMetricByETN, ManualGoal, PedidoCRM } from '@/types/goals';
import { computeGoalMetrics } from '@/utils/goalAggregation';

type GenericAction = Record<string, unknown>;
type GenericOpportunity = Record<string, unknown>;

export function useGoalMetricsProcessor(
  manualGoals: ManualGoal[],
  pedidos: PedidoCRM[],
  selectedPeriod: string,
  actions: GenericAction[],
  opportunities: GenericOpportunity[],
): GoalMetricByETN[] {
  return useMemo(
    () => computeGoalMetrics(manualGoals, pedidos, selectedPeriod, actions, opportunities),
    [manualGoals, pedidos, selectedPeriod, actions, opportunities],
  );
}
