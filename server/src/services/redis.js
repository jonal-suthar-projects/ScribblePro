import { createClient } from 'redis';

let client = null;
let connectPromise = null;
/** True only when REDIS_URL is valid and connection succeeded */
let redisActive = false;

const REDIS_URL = (process.env.REDIS_URL || '').trim();

function isValidRedisProtocol(url) {
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'redis:' || protocol === 'rediss:';
  } catch {
    return false;
  }
}

function redisUrlHint(url) {
  if (!url) return '';
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return ' You pasted the Upstash REST URL — use the "Redis URL" (rediss://...) instead.';
  }
  return '';
}

/**
 * Upstash / standard Redis URL client with graceful reconnect.
 * Invalid or failed Redis falls back to in-memory (server still starts).
 */
export function isRedisEnabled() {
  return redisActive;
}

export function getRedisStatus() {
  if (redisActive) return 'connected';
  if (REDIS_URL && !isValidRedisProtocol(REDIS_URL)) return 'invalid_url';
  if (REDIS_URL) return 'unavailable';
  return 'not_configured';
}

export async function getRedisClient() {
  if (!redisActive) return null;
  if (client?.isOpen) return client;

  if (!connectPromise) {
    connectPromise = client.connect().then(() => {
      console.log('[Redis] Connected');
      return client;
    }).catch((err) => {
      console.error('[Redis] Connect failed:', err.message);
      redisActive = false;
      connectPromise = null;
      client = null;
      return null;
    });
  }

  return connectPromise;
}

export async function initRedis() {
  if (!REDIS_URL) {
    console.warn(
      '[Startup] REDIS_URL not set — room state is in-memory only (lost on restart).'
    );
    return false;
  }

  if (!isValidRedisProtocol(REDIS_URL)) {
    console.error(
      `[Startup] REDIS_URL has invalid protocol (use redis:// or rediss://).${redisUrlHint(REDIS_URL)} Falling back to in-memory.`
    );
    return false;
  }

  try {
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

    await client.connect();
    redisActive = true;
    console.log('[Redis] Connected');
    return true;
  } catch (err) {
    console.error(
      `[Startup] Redis unavailable: ${err.message}.${redisUrlHint(REDIS_URL)} Using in-memory fallback.`
    );
    redisActive = false;
    client = null;
    connectPromise = null;
    return false;
  }
}

export async function redisGet(key) {
  const c = await getRedisClient();
  if (!c) return null;
  try {
    return await c.get(key);
  } catch (err) {
    console.error('[Redis] GET failed:', err.message);
    return null;
  }
}

export async function redisSet(key, value, options = {}) {
  const c = await getRedisClient();
  if (!c) return false;
  try {
    if (options.EX) {
      await c.set(key, value, { EX: options.EX });
    } else {
      await c.set(key, value);
    }
    return true;
  } catch (err) {
    console.error('[Redis] SET failed:', err.message);
    return false;
  }
}

export async function redisDel(key) {
  const c = await getRedisClient();
  if (!c) return false;
  try {
    await c.del(key);
    return true;
  } catch (err) {
    console.error('[Redis] DEL failed:', err.message);
    return false;
  }
}

export async function redisKeys(pattern) {
  const c = await getRedisClient();
  if (!c) return [];
  try {
    return await c.keys(pattern);
  } catch (err) {
    console.error('[Redis] KEYS failed:', err.message);
    return [];
  }
}

export async function closeRedis() {
  if (client?.isOpen) {
    await client.quit();
  }
  client = null;
  connectPromise = null;
  redisActive = false;
}
