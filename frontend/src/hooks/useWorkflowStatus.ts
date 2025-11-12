/**
 * useWorkflowStatus Hook
 *
 * Manages demand letter workflow state and real-time updates
 */

import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';
import type { WorkflowStatus } from '../types/demand-letter';

/**
 * Query key factory for workflow status
 */
export const workflowStatusKeys = {
  all: ['workflow-status'] as const,
  detail: (letterId: string) =>
    [...workflowStatusKeys.all, letterId] as const,
};

/**
 * Hook to fetch workflow status for a demand letter
 *
 * @param letterId - The demand letter ID
 * @param options - Query options
 * @param options.refetchInterval - Interval in ms to refetch (for polling). Default: 5000ms
 * @param options.enabled - Whether the query is enabled
 */
export function useWorkflowStatus(
  letterId: string | undefined,
  options: {
    refetchInterval?: number;
    enabled?: boolean;
  } = {}
) {
  const api = useApi();
  const { refetchInterval = 5000, enabled = true } = options;

  return useQuery({
    queryKey: workflowStatusKeys.detail(letterId || ''),
    queryFn: async () => {
      if (!letterId) throw new Error('Letter ID is required');
      return api.get<WorkflowStatus>(
        `/demand-letters/${letterId}/workflow-status`
      );
    },
    enabled: Boolean(letterId) && enabled,
    refetchInterval: (query) => {
      // Only poll if workflow is in an active state
      const activeStates = ['analyzing', 'generating', 'refining'];
      const data = query.state.data;
      return data && activeStates.includes(data.state)
        ? refetchInterval
        : false;
    },
  });
}

/**
 * Helper to check if workflow is in an active/processing state
 */
export function isWorkflowActive(state: string | undefined): boolean {
  if (!state) return false;
  return ['analyzing', 'generating', 'refining'].includes(state);
}

/**
 * Helper to get workflow state display label
 */
export function getWorkflowStateLabel(state: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    analyzing: 'Analyzing Documents',
    analyzed: 'Analysis Complete',
    generating: 'Generating Letter',
    generated: 'Letter Generated',
    refining: 'Refining Letter',
    complete: 'Complete',
    error: 'Error',
  };
  return labels[state] || state;
}

/**
 * Helper to get workflow progress percentage
 */
export function getWorkflowProgress(status: WorkflowStatus): number {
  const stateProgress: Record<string, number> = {
    draft: 0,
    analyzing: 20,
    analyzed: 40,
    generating: 60,
    generated: 80,
    refining: 85,
    complete: 100,
    error: 0,
  };
  return stateProgress[status.state] || 0;
}
