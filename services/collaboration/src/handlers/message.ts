/**
 * WebSocket $default message handler
 * Handles Yjs synchronization and awareness messages
 */

import { WebSocketEvent, WebSocketResponse } from '../types';
import { connectionManager } from '../utils/connectionManager';
import { yjsDocumentManager } from '../yjs/documentManager';
import { awarenessManager } from '../yjs/awareness';
import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

export async function handleMessage(event: WebSocketEvent): Promise<WebSocketResponse> {
  const connectionId = event.requestContext.connectionId;

  try {
    // Get connection data
    const connection = await connectionManager.getConnection(connectionId);

    if (!connection) {
      console.error(`No connection data found for ${connectionId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Connection not found' }),
      };
    }

    // Parse message body
    const message = parseMessage(event.body);

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Invalid message format' }),
      };
    }

    // Get Yjs document
    const doc = await yjsDocumentManager.getDocument(
      connection.letterId,
      connection.firmId
    );

    // Get awareness instance
    const awareness = awarenessManager.getAwareness(
      connection.letterId,
      connection.firmId,
      doc
    );

    // Process message based on type
    processYjsMessage(message, doc, awareness);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Message processed' }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Message handling error for ${connectionId}:`, errorMessage);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: errorMessage }),
    };
  }
}

/**
 * Parse incoming WebSocket message
 */
function parseMessage(body: string | undefined): Uint8Array | null {
  if (!body) {
    return null;
  }

  try {
    // Check if body is base64 encoded
    const buffer = Buffer.from(body, 'base64');
    return new Uint8Array(buffer);
  } catch (error) {
    console.error('Error parsing message:', error);
    return null;
  }
}

/**
 * Process Yjs protocol message
 */
function processYjsMessage(
  message: Uint8Array,
  doc: Y.Doc,
  awareness: awarenessProtocol.Awareness
): void {
  const decoder = decoding.createDecoder(message);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);

  // Process sync protocol messages
  if (messageType === syncProtocol.messageYjsSyncStep1) {
    // Client sends state vector, we respond with missing updates
    syncProtocol.readSyncStep1(decoder, encoder, doc);
  } else if (messageType === syncProtocol.messageYjsSyncStep2) {
    // Client sends updates
    syncProtocol.readSyncStep2(decoder, doc, null);
  } else if (messageType === syncProtocol.messageYjsUpdate) {
    // Client sends document update
    syncProtocol.readUpdate(decoder, doc, null);
  } else {
    // Try to handle as awareness update
    try {
      awarenessProtocol.applyAwarenessUpdate(awareness, message, null);
    } catch (error) {
      console.warn(`Unknown message type: ${messageType}`, error);
    }
  }
}
