import { GAME_TYPES } from '../constants/friendVote.js';
import { GameEngine } from './GameEngine.js';
import { FriendVoteEngine } from './friendVote/FriendVoteEngine.js';

export function resolveGameType(settingsOrRoom) {
  const raw =
    settingsOrRoom?.gameType ||
    settingsOrRoom?.settings?.gameType ||
    GAME_TYPES.SCRIBBLE;
  const gt = String(raw).toLowerCase().replace(/[-_\s]/g, '');
  if (gt === 'friendvote' || gt === 'fv' || gt === 'vote') {
    return GAME_TYPES.FRIEND_VOTE;
  }
  return GAME_TYPES.SCRIBBLE;
}

export function createEngine(room, io) {
  if (resolveGameType(room) === GAME_TYPES.FRIEND_VOTE) {
    return new FriendVoteEngine(room, io);
  }
  return new GameEngine(room, io);
}

export function isFriendVoteEngine(engine) {
  return engine instanceof FriendVoteEngine;
}
