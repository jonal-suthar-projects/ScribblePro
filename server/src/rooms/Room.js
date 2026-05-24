import { GAME_PHASES, DEFAULT_SETTINGS } from '../constants/game.js';
import { GAME_TYPES, FV_PHASES, FV_DEFAULT_SETTINGS } from '../constants/friendVote.js';
import { resolveGameType } from '../game/createEngine.js';
import { createRoomCode, createPlayerId, sanitizeName, getHint } from '../utils/helpers.js';

/**
 * Single game room — holds all state for one multiplayer session
 */
export class Room {
  constructor(hostId, hostName, settings = {}) {
    this.code = createRoomCode();
    this.hostId = hostId;
    this.gameType = resolveGameType({ gameType: settings.gameType, settings });
    const baseSettings =
      this.gameType === GAME_TYPES.FRIEND_VOTE
        ? { ...FV_DEFAULT_SETTINGS, ...settings }
        : { ...DEFAULT_SETTINGS, ...settings };
    baseSettings.gameType = this.gameType;
    this.settings = baseSettings;
    this.phase = GAME_PHASES.LOBBY;
    this.players = new Map();
    this.spectators = new Map();
    this.createdAt = Date.now();
    this.isPrivate = settings.privateRoom !== false;
    this.isPublic = !this.isPrivate;

    // Game state
    this.currentRound = 0;
    this.totalRounds = this.settings.rounds;
    this.currentDrawerId = null;
    this.currentWord = null;
    this.wordChoices = [];
    this.wordDifficulty = null;
    this.guessedPlayerIds = new Set();
    this.guessOrder = 0;
    this.strokes = [];
    this.strokeHistory = [];
    this.chatHistory = [];
    this.drawerHasGuessed = false;
    this.turnEnded = false;
    this.hintRevealCount = 0;
    this.usedDrawerIds = new Set();

    this.resetFriendVoteState();
  }

  resetFriendVoteState() {
    this.fvTargetId = null;
    this.fvPrompt = null;
    this.fvAnswers = new Map();
    this.fvVotes = new Map();
    this.fvVoteCounts = new Map();
    this.fvSubmittedIds = new Set();
    this.fvUsedTargetIds = new Set();
    this.fvWinningAnswerId = null;
  }

  resetFriendVoteRoundState() {
    this.fvAnswers = new Map();
    this.fvVotes = new Map();
    this.fvVoteCounts = new Map();
    this.fvSubmittedIds = new Set();
    this.fvWinningAnswerId = null;
  }

  /** Clear scribble-only state (used when starting Friend Vote or returning to lobby) */
  resetScribbleState() {
    this.currentDrawerId = null;
    this.currentWord = null;
    this.wordChoices = [];
    this.wordDifficulty = null;
    this.guessedPlayerIds = new Set();
    this.guessOrder = 0;
    this.strokes = [];
    this.strokeHistory = [];
    this.drawerHasGuessed = false;
    this.turnEnded = false;
    this.hintRevealCount = 0;
    this.usedDrawerIds = new Set();
  }

  addPlayer(socketId, name, avatarColor) {
    const id = createPlayerId();
    const player = {
      id,
      socketId,
      name: sanitizeName(name),
      avatarColor: avatarColor || randomColor(),
      score: 0,
      isReady: false,
      isHost: this.players.size === 0,
      isSpectator: false,
      disconnected: false,
      disconnectedAt: null,
      sessionToken: createPlayerId(),
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    if (player.isHost) {
      this.hostId = id;
      player.isReady = true;
    }
    this.players.set(id, player);
    return player;
  }

  addSpectator(socketId, name, avatarColor) {
    const id = createPlayerId();
    const spectator = {
      id,
      socketId,
      name: sanitizeName(name),
      avatarColor: avatarColor || randomColor(),
      isSpectator: true,
      disconnected: false,
      sessionToken: createPlayerId(),
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    this.spectators.set(id, spectator);
    return spectator;
  }

  getPlayerBySocket(socketId) {
    for (const p of this.players.values()) {
      if (p.socketId === socketId) return p;
    }
    for (const s of this.spectators.values()) {
      if (s.socketId === socketId) return s;
    }
    return null;
  }

  getPlayerById(id) {
    return this.players.get(id) || this.spectators.get(id);
  }

  getPlayerBySession(sessionToken) {
    for (const p of this.players.values()) {
      if (p.sessionToken === sessionToken) return p;
    }
    for (const s of this.spectators.values()) {
      if (s.sessionToken === sessionToken) return s;
    }
    return null;
  }

  getActivePlayers() {
    return [...this.players.values()].filter((p) => !p.disconnected && !p.isSpectator);
  }

  getAllParticipants() {
    return [...this.players.values(), ...this.spectators.values()];
  }

  getPlayerCount() {
    return this.players.size;
  }

  canJoin(asSpectator = false) {
    if (asSpectator && this.settings.spectatorsAllowed) return true;
    return this.getActivePlayers().length < this.settings.maxPlayers;
  }

  setReady(playerId, ready) {
    const p = this.players.get(playerId);
    if (p) p.isReady = ready;
  }

  allReady() {
    const active = this.getActivePlayers();
    const min =
      this.gameType === GAME_TYPES.FRIEND_VOTE
        ? this.settings.minPlayers || FV_DEFAULT_SETTINGS.minPlayers
        : 2;
    return active.length >= min && active.every((p) => p.isReady);
  }

  toPublicState(forPlayerId = null) {
    const player = forPlayerId ? this.getPlayerById(forPlayerId) : null;
    const isDrawer = player && player.id === this.currentDrawerId;
    const hasGuessed =
      player && this.guessedPlayerIds.has(player.id) && !isDrawer;

    let wordDisplay = null;
    if (this.currentWord) {
      if (isDrawer || this.phase === GAME_PHASES.ROUND_END || this.phase === GAME_PHASES.GAME_END) {
        wordDisplay = this.currentWord;
      } else if (hasGuessed) {
        wordDisplay = this.currentWord;
      } else if (this.phase === GAME_PHASES.DRAWING) {
        wordDisplay = getMaskedFromRoom(this);
      }
    }

    const base = {
      code: this.code,
      hostId: this.hostId,
      gameType: this.gameType,
      phase: this.phase,
      settings: this.settings,
      isPrivate: this.isPrivate,
      players: [...this.players.values()].map(publicPlayer),
      spectators: [...this.spectators.values()].map(publicSpectator),
      currentRound: this.currentRound,
      totalRounds: this.totalRounds,
      currentDrawerId: this.currentDrawerId,
      wordDisplay,
      guessedCount: this.guessedPlayerIds.size,
      guessedPlayerIds: [...this.guessedPlayerIds],
      totalGuessers: this.getActivePlayers().length - (this.currentDrawerId ? 1 : 0),
      turnEnded: this.turnEnded,
      isDrawer: isDrawer || false,
      hasGuessed: hasGuessed || false,
    };

    if (this.gameType === GAME_TYPES.FRIEND_VOTE) {
      return {
        ...base,
        ...this.getFriendVotePublicState(forPlayerId),
      };
    }

    return base;
  }

  getFriendVotePublicState(forPlayerId) {
    const isTarget = forPlayerId === this.fvTargetId;
    const hasSubmitted = forPlayerId && this.fvSubmittedIds.has(forPlayerId);
    const hasVoted = forPlayerId && this.fvVotes.has(forPlayerId);
    const myVoteAnswerId = forPlayerId ? this.fvVotes.get(forPlayerId) : null;

    let answers = [];
    if (
      this.phase === FV_PHASES.VOTING_PHASE ||
      this.phase === FV_PHASES.RESULT_REVEAL ||
      this.phase === FV_PHASES.LEADERBOARD ||
      this.phase === FV_PHASES.GAME_END
    ) {
      answers = [...this.fvAnswers.values()]
        .map((a) => ({
          id: a.id,
          text: a.text,
          votes:
            this.phase === FV_PHASES.VOTING_PHASE
              ? this.fvVoteCounts.get(a.id) || 0
              : this.fvVoteCounts.get(a.id) || 0,
          isOwn: a.authorId === forPlayerId,
          ...(this.phase !== FV_PHASES.VOTING_PHASE
            ? {
                authorId: a.authorId,
                authorName: this.getPlayerById(a.authorId)?.name,
                authorColor: this.getPlayerById(a.authorId)?.avatarColor,
                isWinner: a.id === this.fvWinningAnswerId,
              }
            : {}),
        }))
        .sort((a, b) => (b.votes || 0) - (a.votes || 0));
    }

    const revealAuthors =
      this.phase === FV_PHASES.RESULT_REVEAL ||
      this.phase === FV_PHASES.LEADERBOARD ||
      this.phase === FV_PHASES.GAME_END;

    if (this.phase === FV_PHASES.VOTING_PHASE) {
      answers = answers.map(({ id, text, votes, isOwn }) => ({ id, text, votes, isOwn }));
    }

    return {
      fvTargetId: this.fvTargetId,
      fvTargetName: this.fvTargetId ? this.getPlayerById(this.fvTargetId)?.name : null,
      fvPrompt: this.fvPrompt,
      fvIsTarget: isTarget,
      fvHasSubmitted: hasSubmitted,
      fvHasVoted: hasVoted,
      fvMyVoteAnswerId: myVoteAnswerId,
      fvAnswers: answers,
      fvSubmittedCount: this.fvSubmittedIds.size,
      fvRequiredAnswers: Math.max(2, this.getActivePlayers().length - 1),
      fvTotalVotes: this.fvVotes.size,
      fvWinningAnswerId: revealAuthors ? this.fvWinningAnswerId : null,
      fvRevealAuthors: revealAuthors,
    };
  }
}

function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    avatarColor: p.avatarColor,
    score: p.score,
    isReady: p.isReady,
    isHost: p.isHost,
    isSpectator: false,
    disconnected: p.disconnected,
  };
}

function publicSpectator(s) {
  return {
    id: s.id,
    name: s.name,
    avatarColor: s.avatarColor,
    isSpectator: true,
    disconnected: s.disconnected,
  };
}

function randomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getMaskedFromRoom(room) {
  const word = room.currentWord;
  if (!word) return '';
  const reveal = Math.min(
    room.hintRevealCount,
    Math.max(1, Math.floor(word.replace(/ /g, '').length / 4))
  );
  return getHint(word, reveal);
}
