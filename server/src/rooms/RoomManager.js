import { Room } from './Room.js';
import { RoomStore } from '../state/roomStore.js';
import { SessionStore } from '../state/sessionStore.js';
import { logRoom } from '../utils/logger.js';

/**
 * Room registry — hot cache in memory, Redis as source of truth.
 */
export class RoomManager {
  constructor(maxRooms = 500, roomStore = new RoomStore(), sessionStore = new SessionStore()) {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.maxRooms = maxRooms;
    this.roomStore = roomStore;
    this.sessionStore = sessionStore;
  }

  cacheRoom(room) {
    this.rooms.set(room.code, room);
  }

  /**
   * Load room — Redis/store wins when its stateVersion is newer than the memory cache.
   * Prevents stale in-memory copies from hiding players who joined on another socket.
   */
  async getOrLoadRoom(code, { preferStore = false } = {}) {
    const upper = code?.toUpperCase()?.trim();
    if (!upper) return null;

    const cached = this.rooms.get(upper) || null;
    const fromStore = await this.roomStore.getRoom(upper);

    if (!fromStore) {
      return cached;
    }

    if (!cached || preferStore) {
      this.rooms.set(upper, fromStore);
      return fromStore;
    }

    const cachedV = cached.stateVersion ?? 0;
    const storeV = fromStore.stateVersion ?? 0;

    if (storeV >= cachedV) {
      this.rooms.set(upper, fromStore);
      return fromStore;
    }

    return cached;
  }

  invalidateRoom(code) {
    const upper = code?.toUpperCase()?.trim();
    if (upper) this.rooms.delete(upper);
  }

  getRoom(code) {
    return this.rooms.get(code?.toUpperCase()) || null;
  }

  async createRoom(hostSocketId, hostName, settings, avatarColor) {
    if (this.rooms.size >= this.maxRooms) {
      const codes = await this.roomStore.listActiveRoomCodes();
      if (codes.length >= this.maxRooms) {
        throw new Error('Server is at capacity. Try again later.');
      }
    }

    const tempHostId = 'pending';
    const room = new Room(tempHostId, hostName, settings);
    const player = room.addPlayer(hostSocketId, hostName, avatarColor);
    room.hostId = player.id;
    player.isHost = true;

    this.cacheRoom(room);
    this.socketToRoom.set(hostSocketId, room.code);
    await this.roomStore.saveRoom(room);
    await this.sessionStore.saveSession(player.sessionToken, {
      roomCode: room.code,
      playerId: player.id,
      gameType: room.gameType,
    });

    logRoom('created', room.code, `host=${player.id}`);
    return { room, player };
  }

  getRoomBySocket(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;
    return this.rooms.get(code) || null;
  }

  async getRoomBySocketAsync(socketId) {
    const code = this.socketToRoom.get(socketId);
    if (!code) return null;
    return this.getOrLoadRoom(code);
  }

  bindSocket(socketId, code) {
    this.socketToRoom.set(socketId, code.toUpperCase());
  }

  unbindSocket(socketId) {
    this.socketToRoom.delete(socketId);
  }

  async deleteRoom(code) {
    const upper = code?.toUpperCase();
    const room = this.rooms.get(upper);
    if (room) {
      for (const p of room.getAllParticipants()) {
        if (p.sessionToken) {
          await this.sessionStore.deleteSession(p.sessionToken);
        }
        this.socketToRoom.delete(p.socketId);
      }
      this.rooms.delete(upper);
    }
    await this.roomStore.deleteRoom(upper);
    logRoom('deleted', upper);
  }

  getPublicRooms() {
    return [...this.rooms.values()]
      .filter((r) => r.isPublic && r.phase === 'lobby')
      .map((r) => ({
        code: r.code,
        playerCount: r.getPlayerCount(),
        maxPlayers: r.settings.maxPlayers,
        hostName: [...r.players.values()].find((p) => p.isHost)?.name || 'Host',
      }));
  }

  /**
   * Restore rooms from Redis after deploy — players reconnect via sessionToken.
   */
  async hydrateFromStore() {
    const codes = await this.roomStore.listActiveRoomCodes();
    let loaded = 0;

    for (const code of codes) {
      const room = await this.roomStore.getRoom(code);
      if (!room) continue;

      for (const p of room.getAllParticipants()) {
        p.socketId = null;
        p.disconnected = true;
        p.disconnectedAt = p.disconnectedAt || Date.now();
      }

      this.cacheRoom(room);
      loaded++;
      logRoom('hydrated', code, `phase=${room.phase}`);
    }

    return loaded;
  }
}
