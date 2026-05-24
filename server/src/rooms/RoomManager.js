import { Room } from './Room.js';

/**
 * In-memory room registry — replace with Redis/DB for horizontal scaling
 */
export class RoomManager {
  constructor(maxRooms = 500) {
    this.rooms = new Map();
    this.socketToRoom = new Map();
    this.maxRooms = maxRooms;
  }

  createRoom(hostSocketId, hostName, settings, avatarColor) {
    if (this.rooms.size >= this.maxRooms) {
      throw new Error('Server is at capacity. Try again later.');
    }
    const tempHostId = 'pending';
    const room = new Room(tempHostId, hostName, settings);
    const player = room.addPlayer(hostSocketId, hostName, avatarColor);
    room.hostId = player.id;
    player.isHost = true;
    this.rooms.set(room.code, room);
    this.socketToRoom.set(hostSocketId, room.code);
    return { room, player };
  }

  getRoom(code) {
    return this.rooms.get(code?.toUpperCase());
  }

  getRoomBySocket(socketId) {
    const code = this.socketToRoom.get(socketId);
    return code ? this.rooms.get(code) : null;
  }

  bindSocket(socketId, code) {
    this.socketToRoom.set(socketId, code.toUpperCase());
  }

  unbindSocket(socketId) {
    this.socketToRoom.delete(socketId);
  }

  deleteRoom(code) {
    const room = this.rooms.get(code);
    if (room) {
      for (const p of room.getAllParticipants()) {
        this.socketToRoom.delete(p.socketId);
      }
      this.rooms.delete(code);
    }
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
}
