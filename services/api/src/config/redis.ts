import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  // If Redis is not enabled, return null
  if (process.env.RATE_LIMIT_ENABLED === 'false') {
    return null;
  }

  // Return existing client if already initialized
  if (redisClient) {
    return redisClient;
  }

  // Initialize Redis client
  try {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      console.warn(
        'REDIS_URL not configured. Rate limiting will be disabled.'
      );
      return null;
    }

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false,
      retryStrategy(times: number) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError(err: Error) {
        const targetErrors = ['READONLY', 'ECONNRESET'];
        return targetErrors.some((target) =>
          err.message.includes(target)
        );
      },
    });

    redisClient.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis client connected successfully');
    });

    return redisClient;
  } catch (error) {
    console.error('Failed to initialize Redis client:', error);
    return null;
  }
}

export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
