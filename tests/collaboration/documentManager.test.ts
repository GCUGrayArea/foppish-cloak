/**
 * Tests for Yjs document manager
 */

import * as Y from 'yjs';
import { YjsDocumentManager } from '../../services/collaboration/src/yjs/documentManager';
import { yjsPersistence } from '../../services/collaboration/src/yjs/persistence';

// Mock persistence
jest.mock('../../services/collaboration/src/yjs/persistence');

describe('YjsDocumentManager', () => {
  let manager: YjsDocumentManager;

  beforeEach(() => {
    manager = new YjsDocumentManager();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('getDocument', () => {
    it('should create a new document if none exists', async () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';

      (yjsPersistence.loadDocument as jest.Mock).mockResolvedValue(null);

      const doc = await manager.getDocument(letterId, firmId);

      expect(doc).toBeInstanceOf(Y.Doc);
      expect(yjsPersistence.loadDocument).toHaveBeenCalledWith(letterId, firmId);
    });

    it('should load existing document from persistence', async () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';
      const mockState = new Uint8Array([1, 2, 3]);

      (yjsPersistence.loadDocument as jest.Mock).mockResolvedValue(mockState);
      (yjsPersistence.applyPersistedState as jest.Mock).mockImplementation(() => {});

      const doc = await manager.getDocument(letterId, firmId);

      expect(doc).toBeInstanceOf(Y.Doc);
      expect(yjsPersistence.applyPersistedState).toHaveBeenCalledWith(doc, mockState);
    });

    it('should return cached document on subsequent calls', async () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';

      (yjsPersistence.loadDocument as jest.Mock).mockResolvedValue(null);

      const doc1 = await manager.getDocument(letterId, firmId);
      const doc2 = await manager.getDocument(letterId, firmId);

      expect(doc1).toBe(doc2);
      expect(yjsPersistence.loadDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveDocument', () => {
    it('should save document to persistence', async () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';

      (yjsPersistence.loadDocument as jest.Mock).mockResolvedValue(null);
      (yjsPersistence.saveDocument as jest.Mock).mockResolvedValue(undefined);

      await manager.getDocument(letterId, firmId);
      await manager.saveDocument(letterId, firmId);

      expect(yjsPersistence.saveDocument).toHaveBeenCalled();
    });
  });

  describe('closeDocument', () => {
    it('should save and remove document from cache', async () => {
      const letterId = 'letter-123';
      const firmId = 'firm-456';

      (yjsPersistence.loadDocument as jest.Mock).mockResolvedValue(null);
      (yjsPersistence.saveDocument as jest.Mock).mockResolvedValue(undefined);

      await manager.getDocument(letterId, firmId);
      await manager.closeDocument(letterId, firmId);

      expect(yjsPersistence.saveDocument).toHaveBeenCalled();
    });
  });
});
