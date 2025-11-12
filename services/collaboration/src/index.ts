/**
 * Lambda handler entry point for WebSocket collaboration service
 * Routes WebSocket events to appropriate handlers
 */

import { WebSocketEvent, WebSocketResponse } from './types';
import { handleConnect } from './handlers/connect';
import { handleDisconnect } from './handlers/disconnect';
import { handleMessage } from './handlers/message';
import { dbClient } from './db/client';

/**
 * Main Lambda handler
 */
export async function handler(event: WebSocketEvent): Promise<WebSocketResponse> {
  const routeKey = event.requestContext.routeKey;

  console.log(`WebSocket event: ${routeKey}`, {
    connectionId: event.requestContext.connectionId,
    timestamp: new Date().toISOString(),
  });

  // Initialize database connection if needed
  if (!dbClient.getPool()) {
    dbClient.initialize();
  }

  try {
    switch (routeKey) {
      case '$connect':
        return await handleConnect(event);

      case '$disconnect':
        return await handleDisconnect(event);

      case '$default':
        return await handleMessage(event);

      default:
        console.warn(`Unknown route: ${routeKey}`);
        return {
          statusCode: 400,
          body: JSON.stringify({ message: `Unknown route: ${routeKey}` }),
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Handler error for ${routeKey}:`, errorMessage, error);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await dbClient.close();
  process.exit(0);
});
