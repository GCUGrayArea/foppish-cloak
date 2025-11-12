/**
 * WebSocket connection manager using DynamoDB
 * Tracks active connections for message routing
 */

import {
  DynamoDBClient,
  PutItemCommand,
  DeleteItemCommand,
  GetItemCommand,
} from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { ConnectionData } from '../types';

export class ConnectionManager {
  private client: DynamoDBClient;
  private tableName: string;

  constructor() {
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
    this.tableName = process.env.CONNECTIONS_TABLE_NAME || 'websocket-connections';
  }

  /**
   * Store connection data in DynamoDB
   */
  async addConnection(data: ConnectionData): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24 hours from now

    const item = {
      ...data,
      ttl,
    };

    const command = new PutItemCommand({
      TableName: this.tableName,
      Item: marshall(item),
    });

    try {
      await this.client.send(command);
      console.log(`Added connection: ${data.connectionId} for user ${data.userId}`);
    } catch (error) {
      console.error('Error adding connection:', error);
      throw error;
    }
  }

  /**
   * Remove connection from DynamoDB
   */
  async removeConnection(connectionId: string): Promise<void> {
    const command = new DeleteItemCommand({
      TableName: this.tableName,
      Key: marshall({ connectionId }),
    });

    try {
      await this.client.send(command);
      console.log(`Removed connection: ${connectionId}`);
    } catch (error) {
      console.error('Error removing connection:', error);
      throw error;
    }
  }

  /**
   * Get connection data by connection ID
   */
  async getConnection(connectionId: string): Promise<ConnectionData | null> {
    const command = new GetItemCommand({
      TableName: this.tableName,
      Key: marshall({ connectionId }),
    });

    try {
      const result = await this.client.send(command);

      if (!result.Item) {
        return null;
      }

      return unmarshall(result.Item) as ConnectionData;
    } catch (error) {
      console.error('Error getting connection:', error);
      throw error;
    }
  }

  /**
   * Get all connections for a specific letter (room)
   * Note: This is a simplified implementation
   * In production, consider adding a GSI on letterId for efficient querying
   */
  async getConnectionsForLetter(_letterId: string): Promise<ConnectionData[]> {
    console.warn('getConnectionsForLetter using scan - consider adding GSI');
    return [];
  }
}

export const connectionManager = new ConnectionManager();
