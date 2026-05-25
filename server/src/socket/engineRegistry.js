import {
  createEngine,
  isFriendVoteEngine,
  resolveGameType,
} from '../game/createEngine.js';
import { GAME_TYPES } from '../constants/friendVote.js';

/**
 * In-process game engines (timers, intervals). Room state lives in Redis.
 */
export class EngineRegistry {
  constructor(stateManager) {
    this.engines = new Map();
    this.stateManager = stateManager;
  }

  get(room, io) {
    const needsFriendVote = resolveGameType(room) === GAME_TYPES.FRIEND_VOTE;
    let engine = this.engines.get(room.code);

    if (engine) {
      const engineIsFv = isFriendVoteEngine(engine);
      if (engineIsFv !== needsFriendVote) {
        engine.destroy?.();
        this.engines.delete(room.code);
        engine = null;
      }
    }

    if (!engine) {
      engine = createEngine(room, io, { stateManager: this.stateManager });
      this.engines.set(room.code, engine);
      engine.io = io;
      engine.resumeAfterHydrate?.();
    } else {
      engine.io = io;
      engine.room = room;
    }

    return engine;
  }

  replace(room, io) {
    const old = this.engines.get(room.code);
    if (old) {
      old.destroy?.();
      this.engines.delete(room.code);
    }
    const engine = createEngine(room, io, { stateManager: this.stateManager });
    this.engines.set(room.code, engine);
    return engine;
  }

  remove(roomCode) {
    const engine = this.engines.get(roomCode);
    if (engine) {
      engine.destroy?.();
      this.engines.delete(roomCode);
    }
  }

  getIfExists(roomCode) {
    return this.engines.get(roomCode);
  }
}
