/**
 * VersionHistory Component
 *
 * Displays template version history with rollback capability
 */

import React from 'react';
import { Button } from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import type { VersionHistoryItem } from '../../types/template';
import styles from './VersionHistory.module.css';

interface VersionHistoryProps {
  versions: VersionHistoryItem[];
  currentVersionId: string;
  onRollback: (versionId: string) => void;
  isRollingBack: boolean;
}

export const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  currentVersionId,
  onRollback,
  isRollingBack,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (versions.length === 0) {
    return (
      <div className={styles.empty}>
        No version history available.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Version History</h3>
      <div className={styles.list}>
        {versions.map((version) => {
          const isCurrent = version.id === currentVersionId;

          return (
            <div
              key={version.id}
              className={`${styles.version} ${
                isCurrent ? styles.current : ''
              }`}
            >
              <div className={styles.versionInfo}>
                <div className={styles.versionHeader}>
                  <span className={styles.versionNumber}>
                    Version {version.versionNumber}
                  </span>
                  {isCurrent && (
                    <span className={styles.currentBadge}>Current</span>
                  )}
                </div>
                <div className={styles.versionMeta}>
                  {formatDate(version.createdAt)}
                </div>
              </div>
              {isAdmin && !isCurrent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRollback(version.id)}
                  disabled={isRollingBack}
                >
                  Rollback
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
