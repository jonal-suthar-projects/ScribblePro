import { Room } from '../rooms/Room.js';

const MAX_STROKES = 400;
const MAX_CHAT = 50;
const MAX_PROCESSED_ACTIONS = 100;

/**
 * Serialize room state for Redis — no socket references, bounded canvas history.
 */
export function roomToSnapshot(room) {
  const players = [...room.players.values()].map((p) => ({
    ...p,
    socketId: p.disconnected ? null : p.socketId,
  }));
  const spectators = [...room.spectators.values()].map((s) => ({
    ...s,
    socketId: s.disconnected ? null : s.socketId,
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    gameType: room.gameType,
    settings: room.settings,
    phase: room.phase,
    createdAt: room.createdAt,
    isPrivate: room.isPrivate,
    isPublic: room.isPublic,
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    currentDrawerId: room.currentDrawerId,
    currentWord: room.currentWord,
    wordChoices: room.wordChoices,
    wordDifficulty: room.wordDifficulty,
    guessedPlayerIds: [...room.guessedPlayerIds],
    guessOrder: room.guessOrder,
    strokes: room.strokes.slice(-MAX_STROKES),
    strokeHistory: room.strokeHistory.slice(-MAX_STROKES),
    chatHistory: room.chatHistory.slice(-MAX_CHAT),
    drawerHasGuessed: room.drawerHasGuessed,
    turnEnded: room.turnEnded,
    hintRevealCount: room.hintRevealCount,
    usedDrawerIds: [...room.usedDrawerIds],
    fvTargetId: room.fvTargetId,
    fvPrompt: room.fvPrompt,
    fvAnswers: [...room.fvAnswers.values()],
    fvVotes: Object.fromEntries(room.fvVotes),
    fvVoteCounts: Object.fromEntries(room.fvVoteCounts),
    fvSubmittedIds: [...room.fvSubmittedIds],
    fvUsedTargetIds: [...room.fvUsedTargetIds],
    fvWinningAnswerId: room.fvWinningAnswerId,
    timer: room.timer ? { ...room.timer } : null,
    phaseStartTime: room.phaseStartTime ?? null,
    processedActionIds: [...(room.processedActionIds || [])].slice(-MAX_PROCESSED_ACTIONS),
    stateVersion: room.stateVersion ?? 0,
    lastActivityAt: room.lastActivityAt ?? Date.now(),
    players,
    spectators,
  };
}

export function snapshotToRoom(snapshot) {
  const room = Object.create(Room.prototype);
  Object.assign(room, {
    code: snapshot.code,
    hostId: snapshot.hostId,
    gameType: snapshot.gameType,
    settings: snapshot.settings,
    phase: snapshot.phase,
    createdAt: snapshot.createdAt,
    isPrivate: snapshot.isPrivate,
    isPublic: snapshot.isPublic,
    currentRound: snapshot.currentRound,
    totalRounds: snapshot.totalRounds,
    currentDrawerId: snapshot.currentDrawerId,
    currentWord: snapshot.currentWord,
    wordChoices: snapshot.wordChoices || [],
    wordDifficulty: snapshot.wordDifficulty,
    guessOrder: snapshot.guessOrder ?? 0,
    strokes: snapshot.strokes || [],
    strokeHistory: snapshot.strokeHistory || [],
    chatHistory: snapshot.chatHistory || [],
    drawerHasGuessed: snapshot.drawerHasGuessed ?? false,
    turnEnded: snapshot.turnEnded ?? false,
    hintRevealCount: snapshot.hintRevealCount ?? 0,
    fvTargetId: snapshot.fvTargetId,
    fvPrompt: snapshot.fvPrompt,
    fvWinningAnswerId: snapshot.fvWinningAnswerId,
    timer: snapshot.timer || null,
    phaseStartTime: snapshot.phaseStartTime ?? null,
    processedActionIds: new Set(snapshot.processedActionIds || []),
    stateVersion: snapshot.stateVersion ?? 0,
    lastActivityAt: snapshot.lastActivityAt ?? Date.now(),
    players: new Map(),
    spectators: new Map(),
    guessedPlayerIds: new Set(snapshot.guessedPlayerIds || []),
    usedDrawerIds: new Set(snapshot.usedDrawerIds || []),
    fvAnswers: new Map(),
    fvVotes: new Map(),
    fvVoteCounts: new Map(),
    fvSubmittedIds: new Set(snapshot.fvSubmittedIds || []),
    fvUsedTargetIds: new Set(snapshot.fvUsedTargetIds || []),
  });

  for (const p of snapshot.players || []) {
    room.players.set(p.id, { ...p, disconnected: p.disconnected ?? !p.socketId });
  }
  for (const s of snapshot.spectators || []) {
    room.spectators.set(s.id, { ...s, disconnected: s.disconnected ?? !s.socketId });
  }
  for (const a of snapshot.fvAnswers || []) {
    room.fvAnswers.set(a.id, a);
  }
  for (const [k, v] of Object.entries(snapshot.fvVotes || {})) {
    room.fvVotes.set(k, v);
  }
  for (const [k, v] of Object.entries(snapshot.fvVoteCounts || {})) {
    room.fvVoteCounts.set(k, v);
  }

  return room;
}

export function bumpRoomVersion(room) {
  room.stateVersion = (room.stateVersion ?? 0) + 1;
  room.lastActivityAt = Date.now();
}
