export function getActiveParticipant(room, socketId) {
  const player = room.getPlayerBySocket(socketId);
  if (!player) return { ok: false, error: 'Player not found' };
  if (player.disconnected) return { ok: false, error: 'Player disconnected' };
  return { ok: true, player };
}

export function requireHost(room, player) {
  if (!player || player.id !== room.hostId) {
    return { ok: false, error: 'Only host can perform this action' };
  }
  return { ok: true };
}

export function requireDrawer(room, playerId) {
  if (playerId !== room.currentDrawerId) {
    return { ok: false, error: 'Only drawer can perform this action' };
  }
  return { ok: true };
}

export function isSpectator(player) {
  return Boolean(player?.isSpectator);
}
