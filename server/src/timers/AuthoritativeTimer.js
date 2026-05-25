import { logTimer } from '../utils/logger.js';

/**
 * Timestamp-based timer — survives reconnects and server restarts when
 * room.timer { startedAt, endsAt } is persisted to Redis.
 */
export class AuthoritativeTimer {
  constructor(room, roomCode, onTick, onComplete) {
    this.room = room;
    this.roomCode = roomCode;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this.interval = null;
    this.type = null;
    this.completed = false;
  }

  start(seconds, type) {
    this.stop({ silent: true });
    const now = Date.now();
    const totalMs = seconds * 1000;

    this.type = type;
    this.completed = false;
    this.room.timer = {
      type,
      totalSeconds: seconds,
      startedAt: now,
      endsAt: now + totalMs,
    };
    this.room.phaseStartTime = now;

    this.emitTick();
    this.interval = setInterval(() => this.tick(), 1000);
  }

  tick() {
    const remaining = this.getRemaining();
    this.emitTick();

    if (remaining <= 0 && !this.completed) {
      this.completed = true;
      this.stop({ silent: true });
      this.onComplete?.();
    }
  }

  emitTick() {
    const remaining = this.getRemaining();
    const total = this.room.timer?.totalSeconds ?? 0;
    this.onTick?.(remaining, total);
  }

  getRemaining() {
    const endsAt = this.room.timer?.endsAt;
    if (!endsAt) return 0;
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  }

  getRemainingMs() {
    const endsAt = this.room.timer?.endsAt;
    if (!endsAt) return 0;
    return Math.max(0, endsAt - Date.now());
  }

  /**
   * After Redis hydrate — resume ticking if phase timer should still run.
   */
  resumeFromPersistedState() {
    if (!this.room.timer?.endsAt) return false;

    const remaining = this.getRemaining();
    if (remaining <= 0) {
      if (!this.completed) {
        this.completed = true;
        this.onComplete?.();
      }
      return false;
    }

    this.type = this.room.timer.type;
    this.completed = false;
    this.emitTick();
    this.interval = setInterval(() => this.tick(), 1000);
    logTimer(this.roomCode, this.type, remaining);
    return true;
  }

  stop({ silent = false } = {}) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (!silent) {
      this.room.timer = null;
    }
  }

  getTimerPayload(gameType) {
    const remaining = this.getRemaining();
    const total = this.room.timer?.totalSeconds ?? 0;
    return {
      remaining,
      total,
      type: this.type || this.room.timer?.type,
      gameType,
      endsAt: this.room.timer?.endsAt ?? null,
      serverTime: Date.now(),
    };
  }
}
