/**
 * Workflow State Machine Tests
 */

import {
  WorkflowStateMachine,
  isValidTransition,
  getNextState,
  getAvailableActions,
  isTerminalState,
  isErrorState,
  isProcessingState,
  getStateDescription,
} from '../../../services/api/src/utils/workflowState';

describe('WorkflowStateMachine', () => {
  describe('State Transitions', () => {
    it('should transition from draft to analyzing', () => {
      const machine = new WorkflowStateMachine('draft');
      const result = machine.transition('START_ANALYSIS');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('analyzing');
      expect(machine.getState()).toBe('analyzing');
    });

    it('should transition from analyzing to analyzed', () => {
      const machine = new WorkflowStateMachine('analyzing');
      const result = machine.transition('ANALYSIS_COMPLETE');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('analyzed');
    });

    it('should transition from analyzed to generating', () => {
      const machine = new WorkflowStateMachine('analyzed');
      const result = machine.transition('START_GENERATION');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('generating');
    });

    it('should transition from generating to generated', () => {
      const machine = new WorkflowStateMachine('generating');
      const result = machine.transition('GENERATION_COMPLETE');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('generated');
    });

    it('should transition from generated to refining', () => {
      const machine = new WorkflowStateMachine('generated');
      const result = machine.transition('START_REFINEMENT');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('refining');
    });

    it('should transition from refining back to generated', () => {
      const machine = new WorkflowStateMachine('refining');
      const result = machine.transition('REFINEMENT_COMPLETE');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('generated');
    });

    it('should transition from generated to complete', () => {
      const machine = new WorkflowStateMachine('generated');
      const result = machine.transition('MARK_COMPLETE');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('complete');
    });

    it('should reject invalid transitions', () => {
      const machine = new WorkflowStateMachine('draft');
      const result = machine.transition('GENERATION_COMPLETE');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid transition');
      expect(machine.getState()).toBe('draft');
    });

    it('should handle error transitions', () => {
      const machine = new WorkflowStateMachine('analyzing');
      const result = machine.transition('ANALYSIS_ERROR');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('error');
    });

    it('should allow recovery from error state', () => {
      const machine = new WorkflowStateMachine('error');
      const result = machine.transition('START_ANALYSIS');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('analyzing');
    });

    it('should allow reset from error state', () => {
      const machine = new WorkflowStateMachine('error');
      const result = machine.transition('RESET');

      expect(result.success).toBe(true);
      expect(result.newState).toBe('draft');
    });
  });

  describe('Available Actions', () => {
    it('should return correct actions for draft state', () => {
      const machine = new WorkflowStateMachine('draft');
      const actions = machine.getAvailableActions();

      expect(actions).toContain('START_ANALYSIS');
    });

    it('should return correct actions for analyzing state', () => {
      const machine = new WorkflowStateMachine('analyzing');
      const actions = machine.getAvailableActions();

      expect(actions).toContain('ANALYSIS_COMPLETE');
      expect(actions).toContain('ANALYSIS_ERROR');
    });

    it('should return correct actions for generated state', () => {
      const machine = new WorkflowStateMachine('generated');
      const actions = machine.getAvailableActions();

      expect(actions).toContain('START_REFINEMENT');
      expect(actions).toContain('MARK_COMPLETE');
    });
  });

  describe('canPerformAction', () => {
    it('should return true for valid actions', () => {
      const machine = new WorkflowStateMachine('draft');

      expect(machine.canPerformAction('START_ANALYSIS')).toBe(true);
    });

    it('should return false for invalid actions', () => {
      const machine = new WorkflowStateMachine('draft');

      expect(machine.canPerformAction('GENERATION_COMPLETE')).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset to draft state', () => {
      const machine = new WorkflowStateMachine('generated');
      machine.reset();

      expect(machine.getState()).toBe('draft');
    });
  });
});

describe('Workflow Utility Functions', () => {
  describe('isValidTransition', () => {
    it('should validate correct transitions', () => {
      expect(isValidTransition('draft', 'START_ANALYSIS')).toBe(true);
      expect(isValidTransition('analyzing', 'ANALYSIS_COMPLETE')).toBe(true);
    });

    it('should reject invalid transitions', () => {
      expect(isValidTransition('draft', 'GENERATION_COMPLETE')).toBe(false);
      expect(isValidTransition('complete', 'START_ANALYSIS')).toBe(false);
    });
  });

  describe('getNextState', () => {
    it('should return next state for valid action', () => {
      expect(getNextState('draft', 'START_ANALYSIS')).toBe('analyzing');
      expect(getNextState('analyzing', 'ANALYSIS_COMPLETE')).toBe('analyzed');
    });

    it('should return null for invalid action', () => {
      expect(getNextState('draft', 'GENERATION_COMPLETE')).toBeNull();
    });
  });

  describe('getAvailableActions', () => {
    it('should return available actions for each state', () => {
      const draftActions = getAvailableActions('draft');
      expect(draftActions).toContain('START_ANALYSIS');

      const analyzedActions = getAvailableActions('analyzed');
      expect(analyzedActions).toContain('START_GENERATION');
    });
  });

  describe('isTerminalState', () => {
    it('should identify terminal states', () => {
      expect(isTerminalState('complete')).toBe(true);
      expect(isTerminalState('draft')).toBe(false);
      expect(isTerminalState('analyzing')).toBe(false);
    });
  });

  describe('isErrorState', () => {
    it('should identify error state', () => {
      expect(isErrorState('error')).toBe(true);
      expect(isErrorState('draft')).toBe(false);
      expect(isErrorState('complete')).toBe(false);
    });
  });

  describe('isProcessingState', () => {
    it('should identify processing states', () => {
      expect(isProcessingState('analyzing')).toBe(true);
      expect(isProcessingState('generating')).toBe(true);
      expect(isProcessingState('refining')).toBe(true);
      expect(isProcessingState('draft')).toBe(false);
      expect(isProcessingState('complete')).toBe(false);
    });
  });

  describe('getStateDescription', () => {
    it('should return human-readable descriptions', () => {
      expect(getStateDescription('draft')).toContain('Draft created');
      expect(getStateDescription('analyzing')).toContain('Analyzing');
      expect(getStateDescription('complete')).toContain('complete');
    });
  });
});
