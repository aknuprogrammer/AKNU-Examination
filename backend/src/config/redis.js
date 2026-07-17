import Redis from 'ioredis';
import logger from '../utils/logger.js';

let redisClient;
let isRedisConnected = false;

// Simple in-memory fallback cache
const memoryCache = new Map();

export function initRedis() {
  const url = process.env.REDIS_URL;
  
  if (!url) {
    logger.info('REDIS_URL not provided. Using in-memory fallback cache.');
    isRedisConnected = false;
    return null;
  }

  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: null, // Required by BullMQ
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 3) {
          logger.warn(`Redis connection failed ${times} times. Falling back to in-memory mode.`);
          isRedisConnected = false;
          return null; // stop retrying
        }
        return Math.min(times * 100, 1000);
      }
    });

    redisClient.on('connect', () => {
      isRedisConnected = true;
      logger.info('Connected to Redis server.');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis connection error', err);
      isRedisConnected = false;
    });

    redisClient.connect().catch(() => {
      logger.warn('Redis failed to connect initially. Using in-memory fallback.');
      isRedisConnected = false;
    });

  } catch (error) {
    logger.error('Error initializing Redis client', error);
    isRedisConnected = false;
  }

  return redisClient;
}

export const cache = {
  async set(key, value, ttlSeconds) {
    if (isRedisConnected && redisClient) {
      if (ttlSeconds) {
        await redisClient.set(key, value, 'EX', ttlSeconds);
      } else {
        await redisClient.set(key, value);
      }
    } else {
      memoryCache.set(key, value);
      if (ttlSeconds) {
        setTimeout(() => {
          memoryCache.delete(key);
        }, ttlSeconds * 1000);
      }
    }
  },

  async get(key) {
    if (isRedisConnected && redisClient) {
      return await redisClient.get(key);
    } else {
      return memoryCache.get(key) || null;
    }
  },

  async del(key) {
    if (isRedisConnected && redisClient) {
      await redisClient.del(key);
    } else {
      memoryCache.delete(key);
    }
  }
};

export { redisClient, isRedisConnected };
