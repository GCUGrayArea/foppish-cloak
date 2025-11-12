/**
 * Yjs awareness protocol for user presence
 * Tracks which users are actively editing a document
 */

import { Awareness } from 'y-protocols/awareness';
import * as Y from 'yjs';
import { AwarenessState } from '../types';

interface AwarenessCache {
  awareness: Awareness;
  lastActivity: number;
}

export class AwarenessManager {
  private awarenessInstances: Map<string, AwarenessCache> = new Map();
  private readonly CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes

  /**
   * Get or create awareness instance for a document
   */
  getAwareness(letterId: string, firmId: string, doc: Y.Doc): Awareness {
    const key = this.getKey(letterId, firmId);
    let cached = this.awarenessInstances.get(key);

    if (cached) {
      cached.lastActivity = Date.now();
      return cached.awareness;
    }

    const awareness = new Awareness(doc);

    cached = {
      awareness,
      lastActivity: Date.now(),
    };

    this.awarenessInstances.set(key, cached);
    return awareness;
  }

  /**
   * Set user awareness state
   */
  setUserState(
    awareness: Awareness,
    _clientId: number,
    userId: string,
    userName: string
  ): void {
    const state: AwarenessState = {
      user: {
        id: userId,
        name: userName,
        color: this.generateUserColor(userId),
      },
    };

    awareness.setLocalStateField('user', state.user);
  }

  /**
   * Update user cursor position
   */
  updateCursor(
    awareness: Awareness,
    _clientId: number,
    anchor: number,
    head: number
  ): void {
    awareness.setLocalStateField('cursor', { anchor, head });
  }

  /**
   * Remove user from awareness
   */
  removeUser(awareness: Awareness, _clientId: number): void {
    awareness.setLocalState(null);
  }

  /**
   * Get all active users for a document
   */
  getActiveUsers(awareness: Awareness): AwarenessState[] {
    const states: AwarenessState[] = [];

    awareness.getStates().forEach((state) => {
      if (state.user) {
        states.push(state as AwarenessState);
      }
    });

    return states;
  }

  /**
   * Clean up awareness instance
   */
  destroyAwareness(letterId: string, firmId: string): void {
    const key = this.getKey(letterId, firmId);
    const cached = this.awarenessInstances.get(key);

    if (cached) {
      cached.awareness.destroy();
      this.awarenessInstances.delete(key);
    }
  }

  /**
   * Generate consistent color for user based on their ID
   */
  private generateUserColor(userId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
      '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
      '#F8B88B', '#A8E6CF', '#FFD3B6', '#FFAAA5',
    ];

    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
  }

  /**
   * Generate cache key
   */
  private getKey(letterId: string, firmId: string): string {
    return `${letterId}:${firmId}`;
  }

  /**
   * Cleanup inactive awareness instances
   */
  cleanupInactive(): void {
    const now = Date.now();

    for (const [key, cached] of this.awarenessInstances.entries()) {
      if (now - cached.lastActivity > this.CACHE_DURATION_MS) {
        const [letterId, firmId] = key.split(':');
        this.destroyAwareness(letterId, firmId);
      }
    }
  }
}

export const awarenessManager = new AwarenessManager();
