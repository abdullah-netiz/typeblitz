import { createClient } from 'redis';

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    connectTimeout: 5000,
    reconnectStrategy: false,
  }
});

// To prevent verbose error loops when Redis isn't running locally during tests
redisClient.on('error', () => {});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('Redis Connected');
  } catch (error) {
    if (error instanceof Error) {
       console.log(`Redis Connection Error: ${error.message}. Continuing without Redis...`);
    }
  }
};
