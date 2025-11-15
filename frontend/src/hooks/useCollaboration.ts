/**
 * useCollaboration Hook
 *
 * Main hook for collaborative editing with Yjs
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import {
  createYDoc,
  createWebSocketProvider,
  getSharedText,
  getConnectionStatus,
  cleanupProvider,
  cleanupYDoc,
} from '../lib/collaboration/yjs-provider';
import {
  useLocalAwareness,
  useAwarenessUsers,
  useTypingIndicators,
} from '../lib/collaboration/awareness-hooks';
import type {
  UseCollaborationOptions,
  UseCollaborationResult,
  ConnectionStatus,
} from '../types/collaboration';
import { getUserColor } from '../types/collaboration';

/**
 * Main collaboration hook for real-time collaborative editing
 */
export function useCollaboration(
  options: UseCollaborationOptions
): UseCollaborationResult {
  const {
    letterId,
    userId,
    userName,
    userColor = getUserColor(userId),
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 10,
  } = options;

  // State
  const [ydoc, setYDoc] = useState<Y.Doc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get access token from localStorage (set by auth context)
  const getAccessToken = useCallback((): string => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      throw new Error('No access token available');
    }
    return token;
  }, []);

  // Connect to collaboration server
  const connect = useCallback(() => {
    try {
      // Clean up existing connection
      if (provider) {
        cleanupProvider(provider);
      }
      if (ydoc) {
        cleanupYDoc(ydoc);
      }

      // Create new Yjs document
      const newYDoc = createYDoc(letterId);
      setYDoc(newYDoc);

      // Get access token
      const token = getAccessToken();

      // Create WebSocket provider
      const newProvider = createWebSocketProvider(newYDoc, letterId, token);
      setProvider(newProvider);

      // Reset error state
      setError(null);

      // Update status on connection events
      newProvider.on('status', ({ status: wsStatus }: { status: string }) => {
        const newStatus = getConnectionStatus(newProvider);
        setStatus(newStatus);

        if (wsStatus === 'connected') {
          reconnectAttemptsRef.current = 0;
        }
      });

      newProvider.on('sync', (isSynced: boolean) => {
        if (isSynced) {
          setStatus('synced');
        }
      });

      // Handle connection errors
      newProvider.on('connection-error', (err: Error) => {
        console.error('WebSocket connection error:', err);
        setError(err);

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `Reconnecting... (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
            );
            connect();
          }, reconnectInterval);
        }
      });

      newProvider.on('connection-close', () => {
        setStatus('disconnected');
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('Failed to create collaboration connection:', error);
      setError(error);
      setStatus('disconnected');
    }
  }, [letterId, getAccessToken, provider, ydoc, reconnectInterval, maxReconnectAttempts]);

  // Disconnect from collaboration server
  const disconnect = useCallback(() => {
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Clean up provider and doc
    if (provider) {
      cleanupProvider(provider);
      setProvider(null);
    }
    if (ydoc) {
      cleanupYDoc(ydoc);
      setYDoc(null);
    }

    setStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, [provider, ydoc]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && letterId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, letterId]); // Note: connect/disconnect deliberately excluded to avoid loops

  // Get awareness from provider
  const awareness = provider?.awareness || null;

  // Use awareness hooks
  const { updateCursor, updateSelection, setTyping } = useLocalAwareness(
    awareness,
    userId,
    userName,
    userColor
  );

  const activeUsers = useAwarenessUsers(awareness);
  const isTyping = useTypingIndicators(awareness);

  // Get shared text
  const ytext = ydoc ? getSharedText(ydoc) : null;

  return {
    // State
    status,
    error,
    activeUsers,
    isTyping,

    // Yjs primitives
    ydoc,
    ytext,
    awareness,

    // Actions
    connect,
    disconnect,
    updateCursor,
    updateSelection,
    setTyping,
  };
}
