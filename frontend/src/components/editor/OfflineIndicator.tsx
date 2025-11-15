/**
 * OfflineIndicator Component
 *
 * Shows connection status and allows manual reconnection
 */

import React from 'react';
import type { ConnectionStatus } from '../../types/collaboration';
import { Button } from '../ui/Button';
import styles from './OfflineIndicator.module.css';

export interface OfflineIndicatorProps {
  status: ConnectionStatus;
  error?: Error | null;
  onReconnect?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  status,
  error,
  onReconnect,
}) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'disconnected':
        return {
          icon: '🔴',
          text: 'Disconnected',
          className: styles.disconnected,
          showReconnect: true,
        };
      case 'connecting':
        return {
          icon: '🟡',
          text: 'Connecting...',
          className: styles.connecting,
          showReconnect: false,
        };
      case 'connected':
        return {
          icon: '🟢',
          text: 'Connected',
          className: styles.connected,
          showReconnect: false,
        };
      case 'syncing':
        return {
          icon: '🔄',
          text: 'Syncing...',
          className: styles.syncing,
          showReconnect: false,
        };
      case 'synced':
        return {
          icon: '✅',
          text: 'Synced',
          className: styles.synced,
          showReconnect: false,
        };
      default:
        return {
          icon: '🔴',
          text: 'Unknown',
          className: styles.disconnected,
          showReconnect: true,
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`${styles.container} ${statusInfo.className}`}>
      <div className={styles.status}>
        <span className={styles.icon}>{statusInfo.icon}</span>
        <span className={styles.text}>{statusInfo.text}</span>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          Error: {error.message}
        </div>
      )}

      {statusInfo.showReconnect && onReconnect && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReconnect}
          className={styles.reconnectButton}
        >
          Reconnect
        </Button>
      )}
    </div>
  );
};
