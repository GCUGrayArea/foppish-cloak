/**
 * Yjs PostgreSQL persistence adapter
 * Handles loading and saving Yjs document state to/from PostgreSQL
 */

import * as Y from 'yjs';
import { dbClient } from '../db/client';

export class YjsPersistence {
  /**
   * Load Yjs document from PostgreSQL
   * Returns null if document doesn't exist
   */
  async loadDocument(letterId: string, firmId: string): Promise<Uint8Array | null> {
    try {
      const doc = await dbClient.loadYjsDocument(letterId, firmId);

      if (!doc) {
        console.log(`No existing Yjs document found for letter ${letterId}`);
        return null;
      }

      console.log(`Loaded Yjs document for letter ${letterId}, size: ${doc.yjsState.length} bytes`);
      return doc.yjsState;
    } catch (error) {
      console.error(`Error loading Yjs document for letter ${letterId}:`, error);
      throw error;
    }
  }

  /**
   * Save Yjs document to PostgreSQL
   * Encodes current document state and persists it
   */
  async saveDocument(doc: Y.Doc, letterId: string, firmId: string): Promise<void> {
    try {
      const state = Y.encodeStateAsUpdate(doc);
      await dbClient.saveYjsDocument(letterId, firmId, state);

      console.log(`Saved Yjs document for letter ${letterId}, size: ${state.length} bytes`);
    } catch (error) {
      console.error(`Error saving Yjs document for letter ${letterId}:`, error);
      throw error;
    }
  }

  /**
   * Apply persisted state to a Yjs document
   */
  applyPersistedState(doc: Y.Doc, state: Uint8Array): void {
    try {
      Y.applyUpdate(doc, state);
      console.log(`Applied persisted state to document, size: ${state.length} bytes`);
    } catch (error) {
      console.error('Error applying persisted state:', error);
      throw error;
    }
  }
}

export const yjsPersistence = new YjsPersistence();
