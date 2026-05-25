import { RoomLock } from '../utils/roomLock.js';
import { bumpRoomVersion } from '../state/roomSerializer.js';
import { consumeActionId } from '../utils/idempotency.js';
import { logTransitionFail } from '../utils/logger.js';

const RECONNECT_GRACE_MS = parseInt(process.env.RECONNECT_GRACE_MS || '90000', 10);

/**
 * Single entry point for room mutations: lock → validate → mutate → persist.
 */
export class GameStateManager {
  constructor(roomManager, roomStore, sessionStore) {
    this.roomManager = roomManager;
    this.roomStore = roomStore;
    this.sessionStore = sessionStore;
    this.lock = new RoomLock();
  }

  async withRoom(roomCode, fn, { actionId, persist = true } = {}) {
    return this.lock.run(roomCode, async () => {
      const room = await this.roomManager.getOrLoadRoom(roomCode);
      if (!room) {
        return { ok: false, error: 'Room not found' };
      }

      if (actionId && !consumeActionId(room, actionId)) {
        logTransitionFail(roomCode, 'duplicate', 'action already processed');
        return { ok: false, error: 'Duplicate action', duplicate: true };
      }

      const result = await fn(room);

      if (persist && result !== false) {
        bumpRoomVersion(room);
        await this.roomStore.saveRoom(room);
        this.roomManager.cacheRoom(room);
      }

      return result;
    });
  }

  async persistRoom(room) {
    bumpRoomVersion(room);
    await this.roomStore.saveRoom(room);
    this.roomManager.cacheRoom(room);
  }

  async bindPlayerSession(player, room) {
    await this.sessionStore.saveSession(player.sessionToken, {
      roomCode: room.code,
      playerId: player.id,
      gameType: room.gameType,
    });
  }

  scheduleDisconnectCleanup(roomCode, playerId, onExpire) {
    setTimeout(async () => {
      await this.withRoom(roomCode, async (room) => {
        const player = room.getPlayerById(playerId);
        if (!player || !player.disconnected) return;
        const elapsed = Date.now() - (player.disconnectedAt || 0);
        if (elapsed < RECONNECT_GRACE_MS - 500) return;
        onExpire?.(room, player);
      });
    }, RECONNECT_GRACE_MS);
  }

  getReconnectGraceMs() {
    return RECONNECT_GRACE_MS;
  }
}
