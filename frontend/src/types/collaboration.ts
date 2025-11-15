/**
 * Collaboration Types
 *
 * TypeScript types for real-time collaboration features using Yjs
 */

import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';

/**
 * Connection status for collaborative editing
 */
export type ConnectionStatus =
  | 'disconnected'  // Not connected to WebSocket
  | 'connecting'    // Attempting to connect
  | 'connected'     // Successfully connected
  | 'syncing'       // Connected and syncing changes
  | 'synced';       // Fully synchronized

/**
 * User presence information shared via Awareness
 */
export interface UserPresence {
  userId: string;
  userName: string;
  userColor: string;      // Hex color for cursor/selection
  cursor?: CursorPosition;
  selection?: SelectionRange;
  lastActivity: number;   // Timestamp of last activity
  isTyping?: boolean;     // Whether user is currently typing
}

/**
 * Cursor position in the text editor
 */
export interface CursorPosition {
  line: number;
  column: number;
  position: number;  // Absolute position in text
}

/**
 * Text selection range
 */
export interface SelectionRange {
  start: number;
  end: number;
}

/**
 * Collaborative editing state
 */
export interface CollaborationState {
  ydoc: Y.Doc | null;
  awareness: Awareness | null;
  provider: WebSocketProvider | null;
  status: ConnectionStatus;
  error: Error | null;
  activeUsers: Map<number, UserPresence>;  // client ID → presence
}

/**
 * WebSocket provider interface (matches y-websocket API)
 */
export interface WebSocketProvider {
  wsconnected: boolean;
  wsconnecting: boolean;
  shouldConnect: boolean;
  bcconnected: boolean;
  synced: boolean;
  awareness: Awareness;
  doc: Y.Doc;
  connect(): void;
  disconnect(): void;
  destroy(): void;
  on(event: string, handler: (...args: any[]) => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
}

/**
 * Collaboration hook configuration
 */
export interface UseCollaborationOptions {
  letterId: string;
  userId: string;
  userName: string;
  userColor?: string;
  autoConnect?: boolean;
  reconnectInterval?: number;  // ms between reconnect attempts
  maxReconnectAttempts?: number;
}

/**
 * Collaboration hook return value
 */
export interface UseCollaborationResult {
  // State
  status: ConnectionStatus;
  error: Error | null;
  activeUsers: UserPresence[];
  isTyping: Map<string, boolean>;  // userId → isTyping

  // Yjs primitives
  ydoc: Y.Doc | null;
  ytext: Y.Text | null;
  awareness: Awareness | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  updateCursor: (position: CursorPosition) => void;
  updateSelection: (selection: SelectionRange | null) => void;
  setTyping: (isTyping: boolean) => void;
}

/**
 * Awareness state change event
 */
export interface AwarenessChangeEvent {
  added: number[];    // Client IDs added
  updated: number[];  // Client IDs updated
  removed: number[];  // Client IDs removed
}

/**
 * User color palette for cursors/selections
 */
export const USER_COLORS = [
  '#FF6B6B',  // Red
  '#4ECDC4',  // Teal
  '#FFE66D',  // Yellow
  '#95E1D3',  // Mint
  '#F38181',  // Pink
  '#AA96DA',  // Purple
  '#FCBAD3',  // Light pink
  '#A8D8EA',  // Light blue
  '#FFD93D',  // Gold
  '#6BCB77',  // Green
] as const;

/**
 * Get a consistent color for a user based on their ID
 */
export function getUserColor(userId: string): string {
  const hash = userId.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}
