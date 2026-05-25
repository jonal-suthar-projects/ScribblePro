import { redisGet, redisSet, redisDel, redisKeys, isRedisEnabled } from '../services/redis.js';
import { roomToSnapshot, snapshotToRoom } from './roomSerializer.js';
import { logRedis } from '../utils/logger.js';

const ROOM_PREFIX = 'room:';
const ROOM_INDEX_KEY = 'rooms:active';
const DEFAULT_TTL_SEC = parseInt(process.env.ROOM_TTL_SECONDS || '7200', 10);
const INACTIVE_LOBBY_TTL_SEC = parseInt(process.env.LOBBY_TTL_SECONDS || '3600', 10);

const memoryFallback = new Map();

function roomKey(code) {
  return `${ROOM_PREFIX}${code.toUpperCase()}`;
}

export class RoomStore {
  constructor() {
    this.ttlSeconds = DEFAULT_TTL_SEC;
  }

  async getRoom(roomCode) {
    const code = roomCode?.toUpperCase()?.trim();
    if (!code) return null;

    if (isRedisEnabled()) {
      const raw = await redisGet(roomKey(code));
      if (!raw) return null;
      try {
        const room = snapshotToRoom(JSON.parse(raw));
        logRedis('load', code, `players=${room.players.size} v=${room.stateVersion ?? 0}`);
        return room;
      } catch (err) {
        console.error(`[RoomStore] Parse failed for ${code}:`, err.message);
        return null;
      }
    }

    const snap = memoryFallback.get(code);
    return snap ? snapshotToRoom(snap) : null;
  }

  async saveRoom(room) {
    const code = room.code?.toUpperCase();
    if (!code) return false;

    const snapshot = roomToSnapshot(room);
    const payload = JSON.stringify(snapshot);
    const ttl = room.phase === 'lobby' ? INACTIVE_LOBBY_TTL_SEC : this.ttlSeconds;

    if (isRedisEnabled()) {
      await redisSet(roomKey(code), payload, { EX: ttl });
      await redisSet(`${ROOM_INDEX_KEY}:${code}`, '1', { EX: ttl });
      logRedis('save', code, `players=${room.players.size} v=${snapshot.stateVersion ?? 0}`);
      return true;
    }

    memoryFallback.set(code, snapshot);
    logRedis('save(memory)', code, `players=${room.players.size}`);
    return true;
  }

  async deleteRoom(roomCode) {
    const code = roomCode?.toUpperCase()?.trim();
    if (!code) return;

    if (isRedisEnabled()) {
      await redisDel(roomKey(code));
      await redisDel(`${ROOM_INDEX_KEY}:${code}`);
    } else {
      memoryFallback.delete(code);
    }
  }

  async listActiveRoomCodes() {
    if (isRedisEnabled()) {
      const keys = await redisKeys(`${ROOM_INDEX_KEY}:*`);
      return keys.map((k) => k.split(':').pop());
    }
    return [...memoryFallback.keys()];
  }

  /**
   * Remove stale lobby rooms and expired indexes.
   */
  async expireInactiveRooms() {
    const codes = await this.listActiveRoomCodes();
    let removed = 0;

    for (const code of codes) {
      const room = await this.getRoom(code);
      if (!room) continue;

      const idleMs = Date.now() - (room.lastActivityAt || room.createdAt);
      const lobbyIdleLimit = INACTIVE_LOBBY_TTL_SEC * 1000;
      const empty = room.players.size === 0 && room.spectators.size === 0;

      if (empty || (room.phase === 'lobby' && idleMs > lobbyIdleLimit)) {
        await this.deleteRoom(code);
        removed++;
        console.log(`[RoomStore] Expired inactive room ${code}`);
      }
    }

    return removed;
  }
}
