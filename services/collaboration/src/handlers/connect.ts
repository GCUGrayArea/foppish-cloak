/**
 * WebSocket $connect handler
 * Handles new WebSocket connections with JWT authentication
 */

import { WebSocketEvent, WebSocketResponse } from '../types';
import { authMiddleware } from '../middleware/auth';
import { connectionManager } from '../utils/connectionManager';
import { yjsDocumentManager } from '../yjs/documentManager';

export async function handleConnect(event: WebSocketEvent): Promise<WebSocketResponse> {
  const connectionId = event.requestContext.connectionId;

  try {
    // Verify JWT token
    const tokenPayload = authMiddleware.verifyToken(event);

    // Get letter ID from query parameters
    const letterId = authMiddleware.getLetterIdFromEvent(event);

    // Validate access
    const hasAccess = await authMiddleware.validateLetterAccess(
      letterId,
      tokenPayload.firmId
    );

    if (!hasAccess) {
      console.error(`Access denied for user ${tokenPayload.userId} to letter ${letterId}`);
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Access denied' }),
      };
    }

    // Store connection data
    await connectionManager.addConnection({
      connectionId,
      userId: tokenPayload.userId,
      firmId: tokenPayload.firmId,
      letterId,
      userName: tokenPayload.email.split('@')[0],
      connectedAt: Date.now(),
      ttl: 0, // Will be set by connectionManager
    });

    // Initialize Yjs document
    await yjsDocumentManager.getDocument(letterId, tokenPayload.firmId);

    console.log(
      `WebSocket connected: ${connectionId}, user: ${tokenPayload.userId}, letter: ${letterId}`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Connected successfully' }),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Connection error for ${connectionId}:`, errorMessage);

    return {
      statusCode: 401,
      body: JSON.stringify({ message: errorMessage }),
    };
  }
}
