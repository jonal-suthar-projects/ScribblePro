import { SOCKET_EVENTS } from '../constants/events.js';
import { logRoom } from '../utils/logger.js';

/**
 * Push authoritative per-player room snapshots to every connected socket in the room.
 */
export async function broadcastAuthoritativeRoom(io, roomManager, engines, roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  if (!code) return null;

  const room = await roomManager.getOrLoadRoom(code, { preferStore: true });
  if (!room) return null;

  const engine = engines.getIfExists(code);
  if (engine) {
    engine.room = room;
  }

  let sent = 0;
  for (const p of room.getAllParticipants()) {
    if (p.disconnected || !p.socketId) continue;
    io.to(p.socketId).emit(SOCKET_EVENTS.ROOM_UPDATED, {
      room: room.toPublicState(p.id),
      stateVersion: room.stateVersion ?? 0,
    });
    sent++;
  }

  logRoom(
    'broadcast',
    code,
    `players=${room.players.size} spectators=${room.spectators.size} recipients=${sent} v=${room.stateVersion ?? 0}`
  );

  return room;
}
