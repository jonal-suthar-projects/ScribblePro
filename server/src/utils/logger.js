const PREFIX = '[Multiplayer]';

export function logRoom(event, roomCode, detail = '') {
  console.log(`${PREFIX} [Room:${roomCode}] ${event}${detail ? ` — ${detail}` : ''}`);
}

export function logPhase(roomCode, from, to) {
  console.log(`${PREFIX} [Room:${roomCode}] Phase ${from} → ${to}`);
}

export function logReconnect(roomCode, playerId) {
  console.log(`${PREFIX} [Room:${roomCode}] Reconnect player=${playerId}`);
}

export function logDisconnect(roomCode, playerId, grace) {
  console.log(
    `${PREFIX} [Room:${roomCode}] Disconnect player=${playerId}${grace ? ' (grace period)' : ''}`
  );
}

export function logTransitionFail(roomCode, action, reason) {
  console.warn(`${PREFIX} [Room:${roomCode}] Transition rejected: ${action} — ${reason}`);
}

export function logTimer(roomCode, type, remaining) {
  console.log(`${PREFIX} [Room:${roomCode}] Timer ${type} remaining=${remaining}s`);
}

export function logJoin(roomCode, playerId, name, isReconnect = false) {
  console.log(
    `${PREFIX} [Room:${roomCode}] ${isReconnect ? 'Reconnect' : 'Join'} player=${playerId} name=${name}`
  );
}

export function logRedis(op, roomCode, detail = '') {
  console.log(`${PREFIX} [Redis] ${op} room=${roomCode}${detail ? ` — ${detail}` : ''}`);
}
