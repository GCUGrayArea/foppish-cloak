/**
 * WorkflowStatus Component
 *
 * Displays current workflow state and progress for demand letter processing
 */

import React from 'react';
import type { WorkflowStatus as WorkflowStatusType } from '../../types/demand-letter';
import {
  getWorkflowStateLabel,
  getWorkflowProgress,
  isWorkflowActive,
} from '../../hooks/useWorkflowStatus';
import styles from './WorkflowStatus.module.css';

export interface WorkflowStatusProps {
  status: WorkflowStatusType;
}

export const WorkflowStatus: React.FC<WorkflowStatusProps> = ({ status }) => {
  const progress = getWorkflowProgress(status);
  const stateLabel = getWorkflowStateLabel(status.state);
  const isActive = isWorkflowActive(status.state);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.statusInfo}>
          <span
            className={`${styles.statusBadge} ${
              styles[status.state] || ''
            }`}
          >
            {stateLabel}
          </span>
          {isActive && status.currentOperation && (
            <span className={styles.operation}>
              {status.currentOperation.operation}
            </span>
          )}
        </div>
        <div className={styles.progressText}>{progress}%</div>
      </div>

      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${progress}%` }}
        />
      </div>

      {status.progress && (
        <div className={styles.progressDetails}>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>Documents:</span>
            <span className={styles.progressValue}>
              {status.progress.documentsAnalyzed} /{' '}
              {status.progress.totalDocuments}
            </span>
          </div>
          <div className={styles.progressItem}>
            <span className={styles.progressLabel}>Refinements:</span>
            <span className={styles.progressValue}>
              {status.progress.refinementCount}
            </span>
          </div>
        </div>
      )}

      {status.errors && status.errors.length > 0 && (
        <div className={styles.errors}>
          <h4 className={styles.errorsTitle}>Errors</h4>
          {status.errors.map((error, index) => (
            <div key={index} className={styles.errorItem}>
              <span className={styles.errorStage}>{error.stage}:</span>{' '}
              {error.error}
              {error.recoverable && (
                <span className={styles.recoverable}>(Recoverable)</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
