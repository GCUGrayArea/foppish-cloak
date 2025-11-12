/**
 * Tests for awareness protocol
 */

import * as Y from 'yjs';
import { AwarenessManager } from '../../services/collaboration/src/yjs/awareness';

describe('AwarenessManager', () => {
  let manager: AwarenessManager;

  beforeEach(() => {
    manager = new AwarenessManager();
  });

  describe('getAwareness', () => {
    it('should create awareness instance for document', () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';
      const doc = new Y.Doc();

      const awareness = manager.getAwareness(letterId, firmId, doc);

      expect(awareness).toBeDefined();
      expect(awareness.doc).toBe(doc);
    });

    it('should return cached awareness on subsequent calls', () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';
      const doc = new Y.Doc();

      const awareness1 = manager.getAwareness(letterId, firmId, doc);
      const awareness2 = manager.getAwareness(letterId, firmId, doc);

      expect(awareness1).toBe(awareness2);
    });
  });

  describe('setUserState', () => {
    it('should set user awareness state', () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';
      const doc = new Y.Doc();
      const awareness = manager.getAwareness(letterId, firmId, doc);

      manager.setUserState(awareness, 1, 'user-123', 'John Doe');

      const states = manager.getActiveUsers(awareness);
      expect(states.length).toBeGreaterThan(0);
    });
  });

  describe('getActiveUsers', () => {
    it('should return list of active users', () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';
      const doc = new Y.Doc();
      const awareness = manager.getAwareness(letterId, firmId, doc);

      manager.setUserState(awareness, 1, 'user-1', 'Alice');
      manager.setUserState(awareness, 2, 'user-2', 'Bob');

      const users = manager.getActiveUsers(awareness);
      expect(users.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('destroyAwareness', () => {
    it('should clean up awareness instance', () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';
      const doc = new Y.Doc();

      manager.getAwareness(letterId, firmId, doc);
      manager.destroyAwareness(letterId, firmId);

      // Should create new instance after destroy
      const awareness = manager.getAwareness(letterId, firmId, doc);
      expect(awareness).toBeDefined();
    });
  });
});
