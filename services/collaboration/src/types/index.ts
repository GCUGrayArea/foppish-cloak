/**
 * Type definitions for collaboration service
 */

export interface WebSocketEvent {
  requestContext: {
    connectionId: string;
    routeKey: string;
    domainName: string;
    stage: string;
  };
  queryStringParameters?: Record<string, string>;
  body?: string;
}

export interface WebSocketResponse {
  statusCode: number;
  body?: string;
}

export interface JWTPayload {
  userId: string;
  firmId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface ConnectionData {
  connectionId: string;
  userId: string;
  firmId: string;
  letterId: string;
  userName: string;
  connectedAt: number;
  ttl: number;
}

export interface YjsDocument {
  letterId: string;
  firmId: string;
  yjsState: Uint8Array;
  lastUpdated: Date;
}

export interface AwarenessState {
  user: {
    id: string;
    name: string;
    color: string;
  };
  cursor?: {
    anchor: number;
    head: number;
  };
}

export interface MessagePayload {
  type: 'sync' | 'awareness' | 'ping' | 'pong';
  data: Uint8Array | string;
}
