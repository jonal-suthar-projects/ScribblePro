import { redisGet, redisSet, redisDel, isRedisEnabled } from '../services/redis.js';
import { createPlayerId } from '../utils/helpers.js';

const SESSION_PREFIX = 'session:';
const SESSION_TTL_SEC = parseInt(process.env.SESSION_TTL_SECONDS || '86400', 10);

const memorySessions = new Map();

function sessionKey(token) {
  return `${SESSION_PREFIX}${token}`;
}

export function createSessionToken() {
  return createPlayerId();
}

/**
 * Redis-backed player session for reconnect after socket drop or server restart.
 */
export class SessionStore {
  async saveSession(sessionToken, { roomCode, playerId, gameType }) {
    if (!sessionToken || !roomCode || !playerId) return false;

    const payload = JSON.stringify({
      roomCode: roomCode.toUpperCase(),
      playerId,
      gameType,
      updatedAt: Date.now(),
    });

    if (isRedisEnabled()) {
      await redisSet(sessionKey(sessionToken), payload, { EX: SESSION_TTL_SEC });
      return true;
    }

    memorySessions.set(sessionToken, JSON.parse(payload));
    return true;
  }

  async restoreSession(sessionToken) {
    if (!sessionToken) return null;

    let raw;
    if (isRedisEnabled()) {
      raw = await redisGet(sessionKey(sessionToken));
      if (!raw) return null;
    } else {
      const mem = memorySessions.get(sessionToken);
      if (!mem) return null;
      return mem;
    }

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async deleteSession(sessionToken) {
    if (!sessionToken) return;
    if (isRedisEnabled()) {
      await redisDel(sessionKey(sessionToken));
    } else {
      memorySessions.delete(sessionToken);
    }
  }
}
