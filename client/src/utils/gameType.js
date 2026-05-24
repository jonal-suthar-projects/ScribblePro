import { GAME_TYPES, FV_PHASES, SCRIBBLE_TIMER_TYPES, FV_TIMER_TYPES } from './constants.js';

const FV_PHASE_LIST = Object.values(FV_PHASES).filter((p) => p !== FV_PHASES.LOBBY);

export function normalizeGameType(value) {
  const gt = String(value || '')
    .toLowerCase()
    .replace(/[-_\s]/g, '');
  if (gt === 'friendvote' || gt === 'fv' || gt === 'vote') {
    return GAME_TYPES.FRIEND_VOTE;
  }
  return GAME_TYPES.SCRIBBLE;
}

/** True when room is Friend Vote (by flag, settings, or active FV phase). */
export function isFriendVoteRoom(room) {
  if (!room) return false;
  if (normalizeGameType(room.gameType) === GAME_TYPES.FRIEND_VOTE) return true;
  if (normalizeGameType(room.settings?.gameType) === GAME_TYPES.FRIEND_VOTE) return true;
  return FV_PHASE_LIST.includes(room.phase);
}

export function gamePathForRoom(room, code) {
  return isFriendVoteRoom(room) ? `/friend-vote/${code}` : `/game/${code}`;
}

export function gameLabel(gameType) {
  return normalizeGameType(gameType) === GAME_TYPES.FRIEND_VOTE
    ? 'Friend Vote'
    : 'Scribble';
}

export function isScribbleTimerType(type) {
  return SCRIBBLE_TIMER_TYPES.includes(type);
}

export function isFriendVoteTimerType(type) {
  return FV_TIMER_TYPES.includes(type);
}

/** Ignore timer-update payloads from the wrong game engine. */
export function shouldAcceptTimerUpdate(room, timer) {
  if (!timer) return false;
  const fv = isFriendVoteRoom(room);
  if (timer.gameType) {
    const timerFv = normalizeGameType(timer.gameType) === GAME_TYPES.FRIEND_VOTE;
    if (timerFv !== fv) return false;
  }
  if (fv) return isFriendVoteTimerType(timer.type);
  return isScribbleTimerType(timer.type);
}
