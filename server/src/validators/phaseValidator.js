import { GAME_PHASES } from '../constants/game.js';
import { GAME_TYPES, FV_PHASES } from '../constants/friendVote.js';
import { resolveGameType } from '../game/createEngine.js';

export function isLobbyPhase(room) {
  return room.phase === GAME_PHASES.LOBBY;
}

export function isScribblePhase(room, ...phases) {
  if (resolveGameType(room) !== GAME_TYPES.SCRIBBLE) return false;
  return phases.length === 0 || phases.includes(room.phase);
}

export function isFriendVotePhase(room, ...phases) {
  if (resolveGameType(room) !== GAME_TYPES.FRIEND_VOTE) return false;
  return phases.length === 0 || phases.includes(room.phase);
}

export function canAcceptScribbleGuess(room) {
  return (
    isScribblePhase(room, GAME_PHASES.DRAWING) &&
    room.currentWord &&
    !room.turnEnded
  );
}

export function canAcceptFvAnswer(room) {
  return isFriendVotePhase(room, FV_PHASES.ANSWER_SUBMISSION);
}

export function canAcceptFvVote(room) {
  return isFriendVotePhase(room, FV_PHASES.VOTING_PHASE);
}

export function canHostStartGame(room) {
  return isLobbyPhase(room);
}
