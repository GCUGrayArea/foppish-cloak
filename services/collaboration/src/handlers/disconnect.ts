/**
 * WebSocket $disconnect handler
 * Handles WebSocket disconnections and cleanup
 */

import { WebSocketEvent, WebSocketResponse } from '../types';
import { connectionManager } from '../utils/connectionManager';
import { yjsDocumentManager } from '../yjs/documentManager';

export async function handleDisconnect(event: WebSocketEvent): Promise<WebSocketResponse> {
  const connectionId = event.requestContext.connectionId;

  try {
    // Get connection data before removing
    const connection = await connectionManager.getConnection(connectionId);

    if (connection) {
      // Save the document state before disconnecting
      await yjsDocumentManager.saveDocument(connection.letterId, connection.firmId);

      console.log(
        `User ${connection.userId} disconnected from letter ${connection.letterId}`
      );
    }

    // Remove connection from DynamoDB
    await connectionManager.removeConnection(connectionId);

    console.log(`WebSocket disconnected: ${connectionId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnected successfully' }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Disconnect error for ${connectionId}:`, errorMessage);

    // Still return 200 for disconnect - don't want to block cleanup
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Disconnect processed' }),
    };
  }
}
