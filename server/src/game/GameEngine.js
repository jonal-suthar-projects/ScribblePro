import { GAME_PHASES } from '../constants/game.js';
import { GAME_TYPES } from '../constants/friendVote.js';
import { resolveGameType } from './createEngine.js';
import { SOCKET_EVENTS } from '../constants/events.js';
import { getRandomWords, checkGuess } from './WordBank.js';
import {
  calculateGuessScore,
  calculateDrawerScore,
  sortLeaderboard,
} from './Scoring.js';
import { GameTimer } from './Timer.js';
import { pickRandomDrawer } from '../utils/helpers.js';

/**
 * Core game loop — all state transitions and scoring happen here (server-authoritative)
 */
export class GameEngine {
  constructor(room, io, namespace) {
    this.room = room;
    this.io = io;
    this.namespace = namespace;
    this.timer = new GameTimer(
      (remaining, total) => this.broadcastTimer(remaining, total),
      () => this.onTimerComplete()
    );
    this.timerType = null;
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

  broadcastTimer(remaining, total) {
    this.emitToRoom(SOCKET_EVENTS.TIMER_UPDATE, {
      remaining,
      total,
      type: this.timerType,
      gameType: GAME_TYPES.SCRIBBLE,
    });
  }

  startGame() {
    if (resolveGameType(this.room) === GAME_TYPES.FRIEND_VOTE) {
      throw new Error('This room is Friend Vote mode');
    }
    const active = this.room.getActivePlayers();
    if (active.length < 2) {
      throw new Error('Need at least 2 players to start');
    }
    this.room.currentRound = 1;
    this.room.usedDrawerIds.clear();
    for (const p of this.room.players.values()) {
      p.score = 0;
    }
    this.emitToRoom(SOCKET_EVENTS.GAME_STARTED, {
      gameType: this.room.gameType || 'scribble',
      totalRounds: this.room.totalRounds,
    });
    this.startRound();
  }

  startRound() {
    this.room.guessedPlayerIds.clear();
    this.room.guessOrder = 0;
    this.room.strokes = [];
    this.room.strokeHistory = [];
    this.room.turnEnded = false;
    this.room.hintRevealCount = 0;
    this.selectNextDrawer();
  }

  selectNextDrawer() {
    const active = this.room.getActivePlayers();
    const undrawn = active.filter((p) => !this.room.usedDrawerIds.has(p.id));

    if (undrawn.length === 0) {
      this.endRound();
      return;
    }

    const drawer = undrawn[Math.floor(Math.random() * undrawn.length)];
    this.room.usedDrawerIds.add(drawer.id);
    this.room.currentDrawerId = drawer.id;
    this.room.currentWord = null;
    this.room.wordChoices = [];
    this.room.guessedPlayerIds.clear();
    this.room.guessOrder = 0;
    this.room.strokes = [];
    this.room.strokeHistory = [];
    this.room.turnEnded = false;
    this.room.phase = GAME_PHASES.WORD_SELECT;

    const choices = getRandomWords(3, this.room.settings.difficulty);
    this.room.wordChoices = choices;

    this.emitToRoom(SOCKET_EVENTS.TURN_START, {
      drawerId: drawer.id,
      drawerName: drawer.name,
      round: this.room.currentRound,
      totalRounds: this.room.totalRounds,
    });

    this.emitToPlayer(drawer.socketId, SOCKET_EVENTS.WORD_CHOICES, {
      words: choices,
      timeLimit: this.room.settings.wordSelectTime || 15,
    });

    this.timerType = 'word-select';
    this.timer.start(this.room.settings.wordSelectTime || 15);
    this.broadcastState();
  }

  selectWord(playerId, word) {
    if (playerId !== this.room.currentDrawerId) return false;
    if (!this.room.wordChoices.includes(word)) {
      word = this.room.wordChoices[0];
    }
    this.timer.stop();
    this.room.currentWord = word;
    this.room.phase = GAME_PHASES.DRAWING;
    this.room.hintRevealCount = 0;

    this.emitToRoom(SOCKET_EVENTS.WORD_SELECTED, {
      drawerId: playerId,
      wordLength: word.length,
      hint: this.getMaskedWord(),
    });

    this.emitToPlayer(
      this.room.getPlayerById(playerId).socketId,
      SOCKET_EVENTS.WORD_SELECTED,
      { drawerId: playerId, word, isDrawer: true }
    );

    this.timerType = 'draw';
    this.timer.start(this.room.settings.drawTime || 80);

    // Progressive hints every 25% of time
    const drawTime = this.room.settings.drawTime || 80;
    this.hintInterval = setInterval(() => {
      if (this.room.phase === GAME_PHASES.DRAWING && !this.room.turnEnded) {
        this.room.hintRevealCount += 1;
        // Must use per-player broadcast — toPublicState() without id sets isDrawer=false for all
        this.broadcastState();
      }
    }, Math.floor((drawTime * 1000) / 4));

    this.broadcastState();
    return true;
  }

  getMaskedWord() {
    const word = this.room.currentWord;
    if (!word) return '';
    const chars = word.split('');
    const letterCount = chars.filter((c) => c !== ' ').length;
    const reveal = Math.min(
      this.room.hintRevealCount,
      Math.max(0, Math.floor(letterCount / 4))
    );
    if (reveal === 0) {
      return chars.map((c) => (c === ' ' ? '   ' : '_ ')).join('').trim();
    }
    const letterIndices = chars.map((c, i) => (c !== ' ' ? i : -1)).filter((i) => i >= 0);
    const revealed = new Set();
    let n = 0;
    while (n < reveal && revealed.size < letterIndices.length) {
      const idx = letterIndices[Math.floor(Math.random() * letterIndices.length)];
      if (!revealed.has(idx)) {
        revealed.add(idx);
        n++;
      }
    }
    return chars.map((c, i) => (c === ' ' ? '   ' : revealed.has(i) ? `${c.toUpperCase()} ` : '_ ')).join('').trim();
  }

  onTimerComplete() {
    if (this.hintInterval) {
      clearInterval(this.hintInterval);
      this.hintInterval = null;
    }
    if (this.room.phase === GAME_PHASES.WORD_SELECT) {
      const word = this.room.wordChoices[0];
      if (word) this.selectWord(this.room.currentDrawerId, word);
      else this.endTurn();
    } else if (this.room.phase === GAME_PHASES.DRAWING) {
      this.endTurn();
    }
  }

  endTurn() {
    if (this.room.turnEnded) return;
    this.room.turnEnded = true;
    this.timer.stop();
    if (this.hintInterval) {
      clearInterval(this.hintInterval);
      this.hintInterval = null;
    }

    const drawer = this.room.getPlayerById(this.room.currentDrawerId);
    const drawerBonus = calculateDrawerScore(this.room.guessedPlayerIds.size);
    if (drawer) drawer.score += drawerBonus;

    this.emitToRoom(SOCKET_EVENTS.NEXT_TURN, {
      word: this.room.currentWord,
      drawerId: this.room.currentDrawerId,
      scores: this.getScores(),
    });

    setTimeout(() => this.selectNextDrawer(), 3000);
  }

  endRound() {
    this.room.phase = GAME_PHASES.ROUND_END;
    this.timer.stop();
    const leaderboard = sortLeaderboard([...this.room.players.values()]);

    this.emitToRoom(SOCKET_EVENTS.ROUND_END, {
      round: this.room.currentRound,
      leaderboard,
      word: this.room.currentWord,
    });

    if (this.room.currentRound >= this.room.totalRounds) {
      setTimeout(() => this.endGame(), 5000);
    } else {
      this.room.currentRound += 1;
      this.room.usedDrawerIds.clear();
      setTimeout(() => this.startRound(), 5000);
    }
    this.broadcastState();
  }

  endGame() {
    this.room.phase = GAME_PHASES.GAME_END;
    const leaderboard = sortLeaderboard([...this.room.players.values()]);
    const winner = leaderboard[0];

    this.emitToRoom(SOCKET_EVENTS.GAME_END, {
      leaderboard,
      winner,
    });
    this.broadcastState();
  }

  handleGuess(playerId, guess) {
    const player = this.room.getPlayerById(playerId);
    if (!player || player.isSpectator) return null;
    if (playerId === this.room.currentDrawerId) return null;
    if (this.room.guessedPlayerIds.has(playerId)) return null;
    if (this.room.phase !== GAME_PHASES.DRAWING) return null;
    if (!this.room.currentWord) return null;

    const result = checkGuess(guess, this.room.currentWord);
    if (result.correct) {
      this.room.guessOrder += 1;
      this.room.guessedPlayerIds.add(playerId);
      const timeRemaining = this.timer.getRemaining();
      const maxTime = this.room.settings.drawTime || 80;
      const points = calculateGuessScore(
        this.room.guessOrder,
        timeRemaining,
        maxTime,
        this.room.settings.difficulty
      );
      player.score += points;

      this.emitToRoom(SOCKET_EVENTS.CORRECT_GUESS, {
        playerId,
        playerName: player.name,
        guess: guess.trim(),
        points,
        order: this.room.guessOrder,
        word: this.room.currentWord,
      });

      this.emitToPlayer(player.socketId, SOCKET_EVENTS.SOUND_EFFECT, { type: 'correct' });

      const active = this.room.getActivePlayers();
      const guessers = active.length - 1;
      if (this.room.guessedPlayerIds.size >= guessers) {
        setTimeout(() => this.endTurn(), 1500);
      }
      this.broadcastState();
      return { correct: true, points };
    }

    if (result.close) {
      this.emitToPlayer(player.socketId, SOCKET_EVENTS.GUESS_CLOSE, {
        message: 'So close!',
      });
      return { close: true };
    }
    return { correct: false };
  }

  handleDraw(playerId, stroke) {
    if (playerId !== this.room.currentDrawerId) return false;
    if (this.room.phase !== GAME_PHASES.DRAWING) return false;
    if (!stroke?.id) return false;

    const drawer = this.room.getPlayerById(playerId);
    if (drawer?.socketId) {
      this.io.to(this.roomCode).except(drawer.socketId).emit(SOCKET_EVENTS.DRAW, {
        stroke,
        playerId,
      });
    }

    // Only commit finished strokes — live previews stay on the wire only
    if (!stroke.final) return true;

    const idx = this.room.strokes.findIndex((s) => s.id === stroke.id);
    if (idx >= 0) {
      this.room.strokes[idx] = stroke;
    } else {
      this.room.strokes.push(stroke);
    }
    this.room.strokeHistory = this.room.strokeHistory.filter((s) => s.id !== stroke.id);
    this.room.strokeHistory.push(stroke);
    return true;
  }

  handleFill(playerId, fill) {
    if (playerId !== this.room.currentDrawerId) return false;
    if (this.room.phase !== GAME_PHASES.DRAWING) return false;
    if (!fill || fill.type !== 'fill') return false;

    const stroke = {
      id: fill.id || `fill-${Date.now()}`,
      type: 'fill',
      color: fill.color,
      x: fill.x,
      y: fill.y,
    };
    this.room.strokes.push(stroke);
    this.room.strokeHistory.push(stroke);

    const drawer = this.room.getPlayerById(playerId);
    if (drawer?.socketId) {
      this.io.to(this.roomCode).except(drawer.socketId).emit(SOCKET_EVENTS.DRAW, {
        stroke,
        playerId,
      });
    }
    return true;
  }

  handleClear(playerId) {
    if (playerId !== this.room.currentDrawerId) return false;
    this.room.strokes = [];
    this.room.strokeHistory = [];
    this.emitToRoom(SOCKET_EVENTS.CLEAR_CANVAS, { playerId });
    return true;
  }

  handleUndo(playerId) {
    if (playerId !== this.room.currentDrawerId) return null;
    if (this.room.strokeHistory.length === 0) return null;
    this.room.strokeHistory.pop();
    // Keep strokes in sync with undo stack (drops orphaned in-progress entries)
    this.room.strokes = this.room.strokeHistory.map((s) => ({ ...s }));
    const payload = {
      strokes: [...this.room.strokes],
    };
    this.emitToRoom(SOCKET_EVENTS.UNDO_STROKE, payload);
    return payload;
  }

  getScores() {
    return [...this.room.players.values()]
      .filter((p) => !p.isSpectator)
      .map((p) => ({ id: p.id, name: p.name, score: p.score }));
  }

  destroy() {
    this.timer.stop();
    if (this.hintInterval) clearInterval(this.hintInterval);
  }
}
