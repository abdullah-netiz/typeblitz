import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

export const redisClient = createClient({
  url: redisUrl || 'redis://localhost:6379',
  socket: {
    connectTimeout: 3000,
    reconnectStrategy: false,
  },
});

// Suppress unhandled error events to avoid uncaught exceptions
redisClient.on('error', (err) => {
  // Silent or debug only
  if (process.env.NODE_ENV !== 'production') {
    // console.debug('Redis error event:', err.message);
  }
});

export const connectRedis = async () => {
  // If no REDIS_URL is configured in environment, skip connection
  if (!redisUrl) {
    console.log('No REDIS_URL environment variable provided. Continuing without Redis...');
    return;
  }

  try {
    await redisClient.connect();
    console.log('Redis Connected successfully.');
  } catch (error) {
    if (error instanceof Error) {
      console.log(`Redis Connection Notice: ${error.message}. Continuing without Redis...`);
    }
  }
};
