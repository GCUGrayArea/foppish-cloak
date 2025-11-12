/**
 * Workflow State Machine
 *
 * Manages state transitions for demand letter workflow:
 * draft → analyzing → analyzed → generating → generated → refining → complete
 */

import { WorkflowState, WorkflowAction, WorkflowTransition } from '../types/demand-letter';

/**
 * Valid workflow transitions
 */
const WORKFLOW_TRANSITIONS: WorkflowTransition[] = [
  // From draft
  { from: 'draft', action: 'START_ANALYSIS', to: 'analyzing' },

  // From analyzing
  { from: 'analyzing', action: 'ANALYSIS_COMPLETE', to: 'analyzed' },
  { from: 'analyzing', action: 'ANALYSIS_ERROR', to: 'error' },

  // From analyzed
  { from: 'analyzed', action: 'START_GENERATION', to: 'generating' },

  // From generating
  { from: 'generating', action: 'GENERATION_COMPLETE', to: 'generated' },
  { from: 'generating', action: 'GENERATION_ERROR', to: 'error' },

  // From generated
  { from: 'generated', action: 'START_REFINEMENT', to: 'refining' },
  { from: 'generated', action: 'MARK_COMPLETE', to: 'complete' },

  // From refining
  { from: 'refining', action: 'REFINEMENT_COMPLETE', to: 'generated' },
  { from: 'refining', action: 'REFINEMENT_ERROR', to: 'error' },

  // From error (recovery)
  { from: 'error', action: 'START_ANALYSIS', to: 'analyzing' },
  { from: 'error', action: 'START_GENERATION', to: 'generating' },
  { from: 'error', action: 'START_REFINEMENT', to: 'refining' },
  { from: 'error', action: 'RESET', to: 'draft' },

  // From complete (reopen)
  { from: 'complete', action: 'START_REFINEMENT', to: 'refining' },
  { from: 'complete', action: 'RESET', to: 'draft' },
];

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  currentState: WorkflowState,
  action: WorkflowAction
): boolean {
  return WORKFLOW_TRANSITIONS.some(
    (t) => t.from === currentState && t.action === action
  );
}

/**
 * Get next state for a given action
 */
export function getNextState(
  currentState: WorkflowState,
  action: WorkflowAction
): WorkflowState | null {
  const transition = WORKFLOW_TRANSITIONS.find(
    (t) => t.from === currentState && t.action === action
  );

  return transition ? transition.to : null;
}

/**
 * Get available actions for current state
 */
export function getAvailableActions(currentState: WorkflowState): WorkflowAction[] {
  return WORKFLOW_TRANSITIONS.filter((t) => t.from === currentState).map(
    (t) => t.action
  );
}

/**
 * Check if state is terminal (no outgoing transitions except reopen/reset)
 */
export function isTerminalState(state: WorkflowState): boolean {
  const actions = getAvailableActions(state);
  return actions.length === 0 || actions.every((a) => ['RESET', 'START_REFINEMENT'].includes(a));
}

/**
 * Check if state is error state
 */
export function isErrorState(state: WorkflowState): boolean {
  return state === 'error';
}

/**
 * Check if state is processing state (in progress)
 */
export function isProcessingState(state: WorkflowState): boolean {
  return ['analyzing', 'generating', 'refining'].includes(state);
}

/**
 * Get human-readable state description
 */
export function getStateDescription(state: WorkflowState): string {
  const descriptions: Record<WorkflowState, string> = {
    draft: 'Draft created, awaiting document analysis',
    analyzing: 'Analyzing source documents',
    analyzed: 'Document analysis complete',
    generating: 'Generating demand letter draft',
    generated: 'Draft generated, ready for review',
    refining: 'Refining letter based on feedback',
    complete: 'Letter finalized and complete',
    error: 'Error occurred during processing',
  };

  return descriptions[state] || 'Unknown state';
}

/**
 * Workflow state machine class
 */
export class WorkflowStateMachine {
  private currentState: WorkflowState;

  constructor(initialState: WorkflowState = 'draft') {
    this.currentState = initialState;
  }

  /**
   * Get current state
   */
  getState(): WorkflowState {
    return this.currentState;
  }

  /**
   * Attempt to transition to new state
   */
  transition(action: WorkflowAction): { success: boolean; newState?: WorkflowState; error?: string } {
    if (!isValidTransition(this.currentState, action)) {
      return {
        success: false,
        error: `Invalid transition: ${action} from ${this.currentState}`,
      };
    }

    const newState = getNextState(this.currentState, action);

    if (!newState) {
      return {
        success: false,
        error: `No target state found for action: ${action}`,
      };
    }

    this.currentState = newState;

    return {
      success: true,
      newState,
    };
  }

  /**
   * Check if an action is available
   */
  canPerformAction(action: WorkflowAction): boolean {
    return isValidTransition(this.currentState, action);
  }

  /**
   * Get available actions
   */
  getAvailableActions(): WorkflowAction[] {
    return getAvailableActions(this.currentState);
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.currentState = 'draft';
  }
}
