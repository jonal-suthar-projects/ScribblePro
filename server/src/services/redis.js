import { createClient } from 'redis';

let client = null;
let connectPromise = null;

// Use the Redis protocol URL from Upstash (rediss://...), not the REST URL.
const REDIS_URL = process.env.REDIS_URL;
const REDIS_ENABLED = Boolean(REDIS_URL);

/**
 * Upstash / standard Redis URL client with graceful reconnect.
 * When REDIS_URL is unset, persistence falls back to in-memory only.
 */
export function isRedisEnabled() {
  return REDIS_ENABLED;
}

export async function getRedisClient() {
  if (!REDIS_ENABLED) return null;
  if (client?.isOpen) return client;

  if (!connectPromise) {
    client = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy(retries) {
          if (retries > 20) {
            console.error('[Redis] Max reconnect attempts reached');
            return new Error('Redis reconnect failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    client.on('error', (err) => {
      console.error('[Redis] Client error:', err.message);
    });

    client.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });

    connectPromise = client.connect().then(() => {
      console.log('[Redis] Connected');
      return client;
    }).catch((err) => {
      console.error('[Redis] Connect failed:', err.message);
      connectPromise = null;
      throw err;
    });
  }

  return connectPromise;
}

export async function redisGet(key) {
  const c = await getRedisClient();
  if (!c) return null;
  return c.get(key);
}

export async function redisSet(key, value, options = {}) {
  const c = await getRedisClient();
  if (!c) return false;
  if (options.EX) {
    await c.set(key, value, { EX: options.EX });
  } else {
    await c.set(key, value);
  }
  return true;
}

export async function redisDel(key) {
  const c = await getRedisClient();
  if (!c) return false;
  await c.del(key);
  return true;
}

export async function redisKeys(pattern) {
  const c = await getRedisClient();
  if (!c) return [];
  return c.keys(pattern);
}

export async function closeRedis() {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
  connectPromise = null;
}
