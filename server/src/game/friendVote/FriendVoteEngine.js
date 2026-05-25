import {
  FV_PHASES,
  FV_DEFAULT_SETTINGS,
  FV_SCORE,
  FV_ANSWER_MAX_LENGTH,
  GAME_TYPES,
} from '../../constants/friendVote.js';
import { GAME_PHASES } from '../../constants/game.js';
import { SOCKET_EVENTS } from '../../constants/events.js';
import { AuthoritativeTimer } from '../../timers/AuthoritativeTimer.js';
import { getRandomPrompt, clearPromptHistory } from './QuestionBank.js';
import { assignAwards } from './AwardTitles.js';
import { createPlayerId } from '../../utils/helpers.js';
import { resolveGameType } from '../createEngine.js';
import { logPhase } from '../../utils/logger.js';

function sortLeaderboard(players) {
  return [...players]
    .filter((p) => !p.isSpectator)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      avatarColor: p.avatarColor,
      rank: i + 1,
    }));
}

/**
 * Friend Vote Mode — server-authoritative Psych-style party game
 */
export class FriendVoteEngine {
  constructor(room, io, { stateManager } = {}) {
    this.room = room;
    this.io = io;
    this.stateManager = stateManager;
    this.timer = new AuthoritativeTimer(
      room,
      room.code,
      (remaining, total) => this.broadcastTimer(remaining, total),
      () => this.onTimerComplete()
    );
    this.timerType = null;
    this.revealTimeouts = [];
  }

  async persist() {
    if (this.stateManager) {
      await this.stateManager.persistRoom(this.room);
    }
  }

  setPhase(phase) {
    const prev = this.room.phase;
    this.room.phase = phase;
    this.room.phaseStartTime = Date.now();
    if (prev !== phase) logPhase(this.room.code, prev, phase);
  }

  get roomCode() {
    return this.room.code;
  }

  emitToRoom(event, data) {
    this.io.to(this.roomCode).emit(event, data);
  }

  emitToPlayer(socketId, event, data) {
    this.io.to(socketId).emit(event, data);
  }

  broadcastState() {
    for (const p of this.room.getAllParticipants()) {
      if (!p.disconnected && p.socketId) {
        this.emitToPlayer(p.socketId, SOCKET_EVENTS.ROOM_UPDATED, {
          room: this.room.toPublicState(p.id),
        });
      }
    }
  }

  broadcastTimer() {
    this.emitToRoom(
      SOCKET_EVENTS.TIMER_UPDATE,
      this.timer.getTimerPayload(GAME_TYPES.FRIEND_VOTE)
    );
  }

  startGame() {
    if (resolveGameType(this.room) !== GAME_TYPES.FRIEND_VOTE) {
      throw new Error('This room is Scribble mode');
    }
    const active = this.room.getActivePlayers();
    const min = this.room.settings.minPlayers || FV_DEFAULT_SETTINGS.minPlayers;
    if (active.length < min) {
      throw new Error(`Friend Vote needs at least ${min} players`);
    }
    if (active.length > (this.room.settings.maxPlayers || 10)) {
      throw new Error('Too many players for Friend Vote (max 10)');
    }

    this.room.resetScribbleState();
    this.room.resetFriendVoteRoundState();
    this.room.fvUsedTargetIds.clear();
    this.room.currentRound = 1;
    this.room.totalRounds = this.room.settings.rounds || FV_DEFAULT_SETTINGS.rounds;
    this.setPhase(FV_PHASES.QUESTION_REVEAL);

    for (const p of this.room.players.values()) {
      p.score = 0;
    }

    clearPromptHistory(this.room.code);

    this.emitToRoom(SOCKET_EVENTS.GAME_STARTED, {
      gameType: 'friendVote',
      totalRounds: this.room.totalRounds,
    });

    this.startRound();
    return this.persist();
  }

  resumeAfterHydrate() {
    if (this.timer.resumeFromPersistedState()) {
      this.timerType = this.room.timer?.type;
      this.broadcastTimer();
    }
  }

  pickTarget() {
    const active = this.room.getActivePlayers();
    let pool = active.filter((p) => !this.room.fvUsedTargetIds.has(p.id));
    if (pool.length === 0) {
      this.room.fvUsedTargetIds.clear();
      pool = active;
    }
    const target = pool[Math.floor(Math.random() * pool.length)];
    this.room.fvUsedTargetIds.add(target.id);
    return target;
  }

  startRound() {
    this.room.resetFriendVoteRoundState();
    const target = this.pickTarget();
    this.room.fvTargetId = target.id;
    this.room.fvPrompt = getRandomPrompt(this.room.code, target.name);
    this.setPhase(FV_PHASES.QUESTION_REVEAL);

    this.emitToRoom(SOCKET_EVENTS.FV_ROUND_START, {
      round: this.room.currentRound,
      totalRounds: this.room.totalRounds,
      targetId: target.id,
      targetName: target.name,
      prompt: this.room.fvPrompt,
    });

    this.timerType = 'question-reveal';
    this.timer.start(
      this.room.settings.questionRevealTime || FV_DEFAULT_SETTINGS.questionRevealTime,
      'question-reveal'
    );
    this.broadcastState();
    return this.persist();
  }

  async beginAnswerSubmission() {
    this.setPhase(FV_PHASES.ANSWER_SUBMISSION);
    this.timerType = 'answer';
    this.timer.start(this.room.settings.answerTime || FV_DEFAULT_SETTINGS.answerTime, 'answer');
    this.emitToRoom(SOCKET_EVENTS.FV_PHASE_CHANGED, { phase: this.room.phase });
    this.broadcastState();
    await this.persist();
  }

  async submitAnswer(playerId, text) {
    if (this.room.phase !== FV_PHASES.ANSWER_SUBMISSION) return { ok: false, error: 'Not accepting answers' };
    if (playerId === this.room.fvTargetId) return { ok: false, error: 'Target cannot submit an answer' };
    if (this.room.fvSubmittedIds.has(playerId)) return { ok: false, error: 'Already submitted' };

    const player = this.room.getPlayerById(playerId);
    if (!player || player.isSpectator || player.disconnected) return { ok: false, error: 'Invalid player' };

    const cleaned = String(text || '')
      .trim()
      .slice(0, FV_ANSWER_MAX_LENGTH);
    if (cleaned.length < 2) return { ok: false, error: 'Answer too short' };

    const answerId = createPlayerId();
    this.room.fvAnswers.set(answerId, {
      id: answerId,
      authorId: playerId,
      text: cleaned,
    });
    this.room.fvSubmittedIds.add(playerId);

    const required = this.getRequiredAnswerCount();
    this.emitToRoom(SOCKET_EVENTS.FV_ANSWER_SUBMITTED, {
      playerId,
      submittedCount: this.room.fvSubmittedIds.size,
      requiredCount: required,
    });

    if (this.room.fvSubmittedIds.size >= required) {
      this.timer.stop();
      const t = setTimeout(() => this.beginVoting(), 800);
      this.revealTimeouts.push(t);
    }

    this.broadcastState();
    await this.persist();
    return { ok: true };
  }

  getRequiredAnswerCount() {
    const active = this.room.getActivePlayers();
    return Math.max(2, active.length - 1);
  }

  async beginVoting() {
    if (this.room.fvAnswers.size < 2) {
      this.emitToRoom(SOCKET_EVENTS.NOTIFICATION, {
        type: 'warning',
        message: 'Not enough answers — skipping round',
      });
      const t = setTimeout(() => this.showLeaderboard(), 2000);
      this.revealTimeouts.push(t);
      return;
    }

    this.setPhase(FV_PHASES.VOTING_PHASE);
    this.room.fvVoteCounts = new Map();
    for (const a of this.room.fvAnswers.values()) {
      this.room.fvVoteCounts.set(a.id, 0);
    }

    this.timerType = 'vote';
    this.timer.start(this.room.settings.voteTime || FV_DEFAULT_SETTINGS.voteTime, 'vote');
    this.emitToRoom(SOCKET_EVENTS.FV_PHASE_CHANGED, {
      phase: this.room.phase,
      answers: this.getAnonymousAnswers(),
    });
    this.broadcastState();
    await this.persist();
  }

  getAnonymousAnswers() {
    return [...this.room.fvAnswers.values()]
      .map((a) => ({ id: a.id, text: a.text }))
      .sort(() => Math.random() - 0.5);
  }

  async castVote(voterId, answerId) {
    if (this.room.phase !== FV_PHASES.VOTING_PHASE) return { ok: false, error: 'Not voting' };
    if (this.room.fvVotes.has(voterId)) return { ok: false, error: 'Already voted' };

    const voter = this.room.getPlayerById(voterId);
    if (!voter || voter.isSpectator || voter.disconnected) return { ok: false, error: 'Invalid voter' };

    const answer = this.room.fvAnswers.get(answerId);
    if (!answer) return { ok: false, error: 'Invalid answer' };
    if (answer.authorId === voterId) return { ok: false, error: 'Cannot vote for your own answer' };

    this.room.fvVotes.set(voterId, answerId);
    const count = (this.room.fvVoteCounts.get(answerId) || 0) + 1;
    this.room.fvVoteCounts.set(answerId, count);

    this.emitToRoom(SOCKET_EVENTS.FV_VOTE_UPDATE, {
      answerId,
      voteCount: count,
      totalVotes: this.room.fvVotes.size,
    });

    const active = this.room.getActivePlayers();
    if (this.room.fvVotes.size >= active.length) {
      this.timer.stop();
      const t = setTimeout(() => this.beginResultReveal(), 600);
      this.revealTimeouts.push(t);
    }

    this.broadcastState();
    await this.persist();
    return { ok: true };
  }

  async beginResultReveal() {
    this.setPhase(FV_PHASES.RESULT_REVEAL);
    this.timer.stop();

    let winnerId = null;
    let maxVotes = -1;
    for (const [aid, count] of this.room.fvVoteCounts.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        winnerId = aid;
      }
    }
    if (maxVotes <= 0 && this.room.fvAnswers.size > 0) {
      const keys = [...this.room.fvAnswers.keys()];
      winnerId = keys[Math.floor(Math.random() * keys.length)];
      maxVotes = 0;
    }

    this.room.fvWinningAnswerId = winnerId;
    const winnerAnswer = winnerId ? this.room.fvAnswers.get(winnerId) : null;

    if (winnerAnswer) {
      const author = this.room.getPlayerById(winnerAnswer.authorId);
      if (author) {
        const votePoints = maxVotes * FV_SCORE.perVote;
        author.score += votePoints + FV_SCORE.roundWinnerBonus;
      }
    }

    const target = this.room.getPlayerById(this.room.fvTargetId);
    if (target) target.score += FV_SCORE.targetParticipationBonus;

    const revealed = [...this.room.fvAnswers.values()].map((a) => {
      const author = this.room.getPlayerById(a.authorId);
      return {
        id: a.id,
        text: a.text,
        authorId: a.authorId,
        authorName: author?.name || 'Unknown',
        authorColor: author?.avatarColor,
        votes: this.room.fvVoteCounts.get(a.id) || 0,
        isWinner: a.id === winnerId,
      };
    });

    this.emitToRoom(SOCKET_EVENTS.FV_RESULTS, {
      winnerAnswerId: winnerId,
      answers: revealed.sort((a, b) => b.votes - a.votes),
      targetId: this.room.fvTargetId,
      targetName: target?.name,
      prompt: this.room.fvPrompt,
    });

    this.emitToRoom(SOCKET_EVENTS.SOUND_EFFECT, { type: 'reveal' });
    this.broadcastState();

    const revealTime = this.room.settings.resultRevealTime || FV_DEFAULT_SETTINGS.resultRevealTime;
    this.revealTimeouts.push(
      setTimeout(() => this.showLeaderboard(), revealTime * 1000)
    );
    await this.persist();
  }

  async showLeaderboard() {
    this.setPhase(FV_PHASES.LEADERBOARD);
    const leaderboard = sortLeaderboard([...this.room.players.values()]);

    this.emitToRoom(SOCKET_EVENTS.FV_LEADERBOARD, {
      round: this.room.currentRound,
      leaderboard,
    });

    this.timerType = 'leaderboard';
    this.timer.start(
      this.room.settings.leaderboardTime || FV_DEFAULT_SETTINGS.leaderboardTime,
      'leaderboard'
    );
    this.broadcastState();
    await this.persist();
  }

  onTimerComplete() {
    switch (this.room.phase) {
      case FV_PHASES.QUESTION_REVEAL:
        this.beginAnswerSubmission();
        break;
      case FV_PHASES.ANSWER_SUBMISSION:
        this.beginVoting();
        break;
      case FV_PHASES.VOTING_PHASE:
        this.beginResultReveal();
        break;
      case FV_PHASES.LEADERBOARD:
        this.advanceRound();
        break;
      default:
        break;
    }
  }

  advanceRound() {
    if (this.room.currentRound >= this.room.totalRounds) {
      this.endGame();
      return;
    }
    this.room.currentRound += 1;
    this.startRound();
  }

  async endGame() {
    this.setPhase(FV_PHASES.GAME_END);
    this.timer.stop();
    const players = [...this.room.players.values()].filter((p) => !p.isSpectator);
    const leaderboard = sortLeaderboard(players);
    const awards = assignAwards(players);

    this.emitToRoom(SOCKET_EVENTS.GAME_END, {
      gameType: 'friendVote',
      leaderboard,
      winner: leaderboard[0],
      awards,
    });
    this.broadcastState();
    return this.persist();
  }

  async returnToLobby() {
    this.clearTimeouts();
    this.timer.stop();
    this.room.resetScribbleState();
    this.room.resetFriendVoteState();
    this.setPhase(GAME_PHASES.LOBBY);
    for (const p of this.room.players.values()) {
      p.isReady = false;
      p.score = 0;
    }
    this.broadcastState();
    await this.persist();
  }

  clearTimeouts() {
    for (const t of this.revealTimeouts) clearTimeout(t);
    this.revealTimeouts = [];
  }

  destroy() {
    this.clearTimeouts();
    this.timer.stop();
    clearPromptHistory(this.room.code);
  }
}
