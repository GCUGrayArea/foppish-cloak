/**
 * Yjs document manager
 * Manages lifecycle of Yjs documents with caching and persistence
 */

import * as Y from 'yjs';
import { yjsPersistence } from './persistence';

interface DocumentCache {
  doc: Y.Doc;
  lastActivity: number;
  saveTimeout: NodeJS.Timeout | null;
}

export class YjsDocumentManager {
  private documents: Map<string, DocumentCache> = new Map();
  private readonly CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
  private readonly SAVE_DEBOUNCE_MS = 30 * 1000; // 30 seconds
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupTask();
  }

  /**
   * Get or create a Yjs document for a letter
   */
  async getDocument(letterId: string, firmId: string): Promise<Y.Doc> {
    const key = this.getDocumentKey(letterId, firmId);
    let cached = this.documents.get(key);

    if (cached) {
      cached.lastActivity = Date.now();
      return cached.doc;
    }

    const doc = new Y.Doc();
    const persistedState = await yjsPersistence.loadDocument(letterId, firmId);

    if (persistedState) {
      yjsPersistence.applyPersistedState(doc, persistedState);
    }

    this.setupDocumentListeners(doc, letterId, firmId);

    cached = {
      doc,
      lastActivity: Date.now(),
      saveTimeout: null,
    };

    this.documents.set(key, cached);
    return doc;
  }

  /**
   * Setup listeners for document updates
   */
  private setupDocumentListeners(doc: Y.Doc, letterId: string, firmId: string): void {
    doc.on('update', () => {
      this.scheduleSave(letterId, firmId);
    });
  }

  /**
   * Schedule a debounced save operation
   */
  private scheduleSave(letterId: string, firmId: string): void {
    const key = this.getDocumentKey(letterId, firmId);
    const cached = this.documents.get(key);

    if (!cached) {
      return;
    }

    if (cached.saveTimeout) {
      clearTimeout(cached.saveTimeout);
    }

    cached.saveTimeout = setTimeout(async () => {
      await this.saveDocument(letterId, firmId);
    }, this.SAVE_DEBOUNCE_MS);
  }

  /**
   * Save document immediately
   */
  async saveDocument(letterId: string, firmId: string): Promise<void> {
    const key = this.getDocumentKey(letterId, firmId);
    const cached = this.documents.get(key);

    if (!cached) {
      return;
    }

    await yjsPersistence.saveDocument(cached.doc, letterId, firmId);

    if (cached.saveTimeout) {
      clearTimeout(cached.saveTimeout);
      cached.saveTimeout = null;
    }
  }

  /**
   * Close and save a document
   */
  async closeDocument(letterId: string, firmId: string): Promise<void> {
    await this.saveDocument(letterId, firmId);
    const key = this.getDocumentKey(letterId, firmId);
    const cached = this.documents.get(key);

    if (cached) {
      if (cached.saveTimeout) {
        clearTimeout(cached.saveTimeout);
      }
      cached.doc.destroy();
      this.documents.delete(key);
    }
  }

  /**
   * Start periodic cleanup of inactive documents
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveDocuments();
    }, 60 * 1000); // Run every minute
  }

  /**
   * Clean up documents that haven't been accessed recently
   */
  private async cleanupInactiveDocuments(): Promise<void> {
    const now = Date.now();
    const promises: Promise<void>[] = [];

    for (const [key, cached] of this.documents.entries()) {
      if (now - cached.lastActivity > this.CACHE_DURATION_MS) {
        const [letterId, firmId] = key.split(':');
        promises.push(this.closeDocument(letterId, firmId));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Stop cleanup task
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Generate cache key for document
   */
  private getDocumentKey(letterId: string, firmId: string): string {
    return `${letterId}:${firmId}`;
  }

  /**
   * Shutdown and save all documents
   */
  async shutdown(): Promise<void> {
    this.stopCleanup();
    const promises: Promise<void>[] = [];

    for (const [key] of this.documents.entries()) {
      const [letterId, firmId] = key.split(':');
      promises.push(this.closeDocument(letterId, firmId));
    }

    await Promise.all(promises);
  }
}

export const yjsDocumentManager = new YjsDocumentManager();
