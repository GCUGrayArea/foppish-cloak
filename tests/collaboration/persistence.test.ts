/**
 * Tests for Yjs persistence adapter
 */

import * as Y from 'yjs';
import { YjsPersistence } from '../../services/collaboration/src/yjs/persistence';
import { dbClient } from '../../services/collaboration/src/db/client';

// Mock database client
jest.mock('../../services/collaboration/src/db/client');

describe('YjsPersistence', () => {
  let persistence: YjsPersistence;

  beforeEach(() => {
    persistence = new YjsPersistence();
    jest.clearAllMocks();
  });

  describe('loadDocument', () => {
    it('should return null if document does not exist', async () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';

      (dbClient.loadYjsDocument as jest.Mock).mockResolvedValue(null);

      const result = await persistence.loadDocument(letterId, firmId);

      expect(result).toBeNull();
      expect(dbClient.loadYjsDocument).toHaveBeenCalledWith(letterId, firmId);
    });

    it('should return document state if it exists', async () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';
      const mockState = new Uint8Array([1, 2, 3]);

      (dbClient.loadYjsDocument as jest.Mock).mockResolvedValue({
        letterId,
        firmId,
        yjsState: mockState,
        lastUpdated: new Date(),
      });

      const result = await persistence.loadDocument(letterId, firmId);

      expect(result).toEqual(mockState);
    });
  });

  describe('saveDocument', () => {
    it('should encode and save document state', async () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';
      const doc = new Y.Doc();

      // Add some content to the document
      const text = doc.getText('test');
      text.insert(0, 'Hello, world!');

      (dbClient.saveYjsDocument as jest.Mock).mockResolvedValue(undefined);

      await persistence.saveDocument(doc, letterId, firmId);

      expect(dbClient.saveYjsDocument).toHaveBeenCalled();
      const call = (dbClient.saveYjsDocument as jest.Mock).mock.calls[0];
      expect(call[0]).toBe(letterId);
      expect(call[1]).toBe(firmId);
      expect(call[2]).toBeInstanceOf(Uint8Array);
    });
  });

  describe('applyPersistedState', () => {
    it('should apply state to document', () => {
      const doc1 = new Y.Doc();
      const text1 = doc1.getText('test');
      text1.insert(0, 'Hello, world!');

      const state = Y.encodeStateAsUpdate(doc1);

      const doc2 = new Y.Doc();
      persistence.applyPersistedState(doc2, state);

      const text2 = doc2.getText('test');
      expect(text2.toString()).toBe('Hello, world!');
    });
  });
});
