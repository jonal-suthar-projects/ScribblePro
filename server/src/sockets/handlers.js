import { SOCKET_EVENTS } from '../constants/events.js';
import { GAME_PHASES } from '../constants/game.js';
import { GAME_TYPES } from '../constants/friendVote.js';
import {
  createEngine,
  isFriendVoteEngine,
  resolveGameType,
} from '../game/createEngine.js';

const engines = new Map();

function isScribbleRoom(room) {
  return resolveGameType(room) === GAME_TYPES.SCRIBBLE;
}

function getEngine(room, io) {
  const needsFriendVote = resolveGameType(room) === GAME_TYPES.FRIEND_VOTE;
  let engine = engines.get(room.code);

  if (engine) {
    const engineIsFv = isFriendVoteEngine(engine);
    if (engineIsFv !== needsFriendVote) {
      engine.destroy?.();
      engines.delete(room.code);
      engine = null;
    }
  }

  if (!engine) {
    engine = createEngine(room, io);
    engines.set(room.code, engine);
  }
  engine.io = io;
  return engine;
}

/**
 * Register all Socket.IO event handlers
 */
export function registerSocketHandlers(io, roomManager) {
  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on(SOCKET_EVENTS.CREATE_ROOM, (data, callback) => {
      try {
        const { playerName, settings, avatarColor, gameType } = data || {};
        if (!playerName?.trim()) {
          return callback?.({ success: false, error: 'Name is required' });
        }
        const resolvedGameType = resolveGameType({
          gameType: gameType || settings?.gameType,
          settings,
        });
        const roomSettings = {
          ...settings,
          gameType: resolvedGameType,
        };
        const { room, player } = roomManager.createRoom(
          socket.id,
          playerName,
          roomSettings,
          avatarColor
        );
        room.gameType = resolvedGameType;
        room.settings.gameType = resolvedGameType;
        socket.join(room.code);
        getEngine(room, io);
        callback?.({
          success: true,
          roomCode: room.code,
          playerId: player.id,
          sessionToken: player.sessionToken,
          room: room.toPublicState(player.id),
        });
        socket.emit(SOCKET_EVENTS.ROOM_CREATED, {
          roomCode: room.code,
          playerId: player.id,
          sessionToken: player.sessionToken,
        });
      } catch (err) {
        callback?.({ success: false, error: err.message });
        socket.emit(SOCKET_EVENTS.ROOM_ERROR, { error: err.message });
      }
    });

    socket.on(SOCKET_EVENTS.JOIN_ROOM, (data, callback) => {
      try {
        const { roomCode, playerName, avatarColor, asSpectator, sessionToken } = data || {};
        const code = roomCode?.toUpperCase()?.trim();
        const room = roomManager.getRoom(code);
        if (!room) {
          return callback?.({ success: false, error: 'Room not found' });
        }

        // Reconnect flow
        if (sessionToken) {
          const existing = room.getPlayerBySession(sessionToken);
          if (existing) {
            existing.socketId = socket.id;
            existing.disconnected = false;
            existing.disconnectedAt = null;
            existing.lastActiveAt = Date.now();
            roomManager.bindSocket(socket.id, code);
            socket.join(code);
            const engine = getEngine(room, io);
            callback?.({
              success: true,
              reconnected: true,
              playerId: existing.id,
              sessionToken: existing.sessionToken,
              room: room.toPublicState(existing.id),
              strokes: isScribbleRoom(room) ? room.strokes : undefined,
            });
            io.to(code).emit(SOCKET_EVENTS.PLAYER_RECONNECTED, {
              playerId: existing.id,
              name: existing.name,
            });
            engine.broadcastState();
            return;
          }
        }

        if (!room.canJoin(asSpectator)) {
          return callback?.({ success: false, error: 'Room is full' });
        }
        if (room.phase !== GAME_PHASES.LOBBY && !asSpectator) {
          return callback?.({
            success: false,
            error: 'Game already in progress. Join as spectator.',
          });
        }

        let player;
        if (asSpectator) {
          player = room.addSpectator(socket.id, playerName, avatarColor);
        } else {
          player = room.addPlayer(socket.id, playerName, avatarColor);
        }
        roomManager.bindSocket(socket.id, code);
        socket.join(code);

        getEngine(room, io);

        callback?.({
          success: true,
          playerId: player.id,
          sessionToken: player.sessionToken,
          room: room.toPublicState(player.id),
        });

        io.to(code).emit(SOCKET_EVENTS.ROOM_JOINED, {
          player: {
            id: player.id,
            name: player.name,
            avatarColor: player.avatarColor,
            isSpectator: player.isSpectator,
          },
        });
        getEngine(room, io).broadcastState();
      } catch (err) {
        callback?.({ success: false, error: err.message });
      }
    });

    socket.on(SOCKET_EVENTS.RECONNECT_PLAYER, (data, callback) => {
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { ...data, sessionToken: data.sessionToken }, callback);
    });

    socket.on(SOCKET_EVENTS.PLAYER_READY, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player || player.isSpectator) return;
      room.setReady(player.id, data?.ready ?? true);
      getEngine(room, io)?.broadcastState();
    });

    socket.on(SOCKET_EVENTS.START_GAME, (data, callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return callback?.({ success: false, error: 'Not in a room' });
      const player = room.getPlayerBySocket(socket.id);
      if (!player || player.id !== room.hostId) {
        return callback?.({ success: false, error: 'Only host can start' });
      }
      if (!room.allReady()) {
        return callback?.({ success: false, error: 'All players must be ready' });
      }
      try {
        const resolved = resolveGameType(room);
        room.gameType = resolved;
        room.settings.gameType = resolved;

        const old = engines.get(room.code);
        if (old) {
          old.destroy?.();
          engines.delete(room.code);
        }

        const engine = createEngine(room, io);
        engines.set(room.code, engine);

        if (resolved === GAME_TYPES.FRIEND_VOTE && !isFriendVoteEngine(engine)) {
          throw new Error('Failed to start Friend Vote engine');
        }
        if (resolved === GAME_TYPES.SCRIBBLE && isFriendVoteEngine(engine)) {
          throw new Error('Failed to start Scribble engine');
        }

        engine.startGame();
        callback?.({ success: true, gameType: resolved });
      } catch (err) {
        callback?.({ success: false, error: err.message });
      }
    });

    socket.on(SOCKET_EVENTS.UPDATE_SETTINGS, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player || player.id !== room.hostId) return;
      if (room.phase !== GAME_PHASES.LOBBY) return;
      room.settings = { ...room.settings, ...data.settings, gameType: room.gameType };
      getEngine(room, io)?.broadcastState();
    });

    socket.on(SOCKET_EVENTS.KICK_PLAYER, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const host = room.getPlayerById(room.hostId);
      if (!host || host.socketId !== socket.id) return;
      const target = room.getPlayerById(data?.playerId);
      if (!target || target.isHost) return;
      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.emit(SOCKET_EVENTS.NOTIFICATION, {
          type: 'kicked',
          message: 'You were removed from the room by the host.',
        });
        targetSocket.leave(room.code);
      }
      room.players.delete(target.id);
      getEngine(room, io)?.broadcastState();
    });

    socket.on(SOCKET_EVENTS.SELECT_WORD, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || !isScribbleRoom(room)) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      getEngine(room, io)?.selectWord?.(player.id, data?.word);
    });

    socket.on(SOCKET_EVENTS.DRAW, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || !isScribbleRoom(room)) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      getEngine(room, io)?.handleDraw?.(player.id, data?.stroke);
    });

    socket.on(SOCKET_EVENTS.FILL_CANVAS, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || !isScribbleRoom(room)) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      getEngine(room, io)?.handleFill?.(player.id, data?.fill);
    });

    socket.on(SOCKET_EVENTS.CLEAR_CANVAS, () => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || !isScribbleRoom(room)) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      getEngine(room, io)?.handleClear?.(player.id);
    });

    socket.on(SOCKET_EVENTS.UNDO_STROKE, (data, callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || !isScribbleRoom(room)) return callback?.({ success: false });
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return callback?.({ success: false });
      const payload = getEngine(room, io)?.handleUndo?.(player.id);
      if (payload) callback?.({ success: true, ...payload });
      else callback?.({ success: false });
    });

    socket.on(SOCKET_EVENTS.GUESS_WORD, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || !isScribbleRoom(room)) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      const engine = getEngine(room, io);
      const result = engine?.handleGuess?.(player.id, data?.guess);
      if (result?.correct === false && !result?.close) {
        io.to(room.code).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
          playerId: player.id,
          playerName: player.name,
          message: data?.guess,
          type: 'guess',
        });
      }
    });

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      const msg = (data?.message || '').trim().slice(0, 200);
      if (!msg) return;
      room.chatHistory.push({ playerId: player.id, message: msg, at: Date.now() });
      io.to(room.code).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
        playerId: player.id,
        playerName: player.name,
        message: msg,
        type: 'chat',
      });
    });

    socket.on(SOCKET_EVENTS.TYPING, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      socket.to(room.code).emit(SOCKET_EVENTS.TYPING, {
        playerId: player.id,
        playerName: player.name,
        isTyping: data?.isTyping,
      });
    });

    socket.on(SOCKET_EVENTS.EMOJI_REACTION, (data) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      io.to(room.code).emit(SOCKET_EVENTS.EMOJI_REACTION, {
        playerId: player.id,
        playerName: player.name,
        emoji: data?.emoji,
        context: data?.context || 'general',
      });
    });

    socket.on(SOCKET_EVENTS.FV_SUBMIT_ANSWER, (data, callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.FRIEND_VOTE) {
        return callback?.({ success: false, error: 'Invalid room' });
      }
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return callback?.({ success: false, error: 'Not in room' });
      const engine = getEngine(room, io);
      const result = engine?.submitAnswer?.(player.id, data?.text);
      callback?.({ success: result?.ok ?? false, error: result?.error });
    });

    socket.on(SOCKET_EVENTS.FV_CAST_VOTE, (data, callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.FRIEND_VOTE) {
        return callback?.({ success: false, error: 'Invalid room' });
      }
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return callback?.({ success: false, error: 'Not in room' });
      const engine = getEngine(room, io);
      const result = engine?.castVote?.(player.id, data?.answerId);
      callback?.({ success: result?.ok ?? false, error: result?.error });
    });

    socket.on(SOCKET_EVENTS.FV_RETURN_LOBBY, (data, callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room || room.gameType !== GAME_TYPES.FRIEND_VOTE) {
        return callback?.({ success: false, error: 'Invalid room' });
      }
      const player = room.getPlayerBySocket(socket.id);
      if (!player || player.id !== room.hostId) {
        return callback?.({ success: false, error: 'Only host can return to lobby' });
      }
      const engine = getEngine(room, io);
      engine?.returnToLobby?.();
      engine?.destroy?.();
      engines.delete(room.code);
      callback?.({ success: true });
    });

    socket.on(SOCKET_EVENTS.SPECTATOR_MODE, (data, callback) => {
      const room = roomManager.getRoomBySocket(socket.id);
      if (!room) return;
      const player = room.getPlayerBySocket(socket.id);
      if (!player) return;
      // Toggle spectator — simplified: only in lobby
      callback?.({ success: false, error: 'Use join as spectator from lobby' });
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
      handleDisconnect(socket, roomManager, io, engines, false);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket, roomManager, io, engines, true);
    });
  });
}

function handleDisconnect(socket, roomManager, io, engines, isDisconnect) {
  const room = roomManager.getRoomBySocket(socket.id);
  if (!room) return;

  const player = room.getPlayerBySocket(socket.id);
  if (!player) {
    roomManager.unbindSocket(socket.id);
    return;
  }

  if (isDisconnect && room.phase !== GAME_PHASES.LOBBY) {
    player.disconnected = true;
    player.disconnectedAt = Date.now();
    io.to(room.code).emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, {
      playerId: player.id,
      name: player.name,
    });
    getEngine(room, io)?.broadcastState();
  } else {
    if (player.isSpectator) {
      room.spectators.delete(player.id);
    } else {
      room.players.delete(player.id);
      if (player.id === room.hostId) {
        const next = [...room.players.values()][0];
        if (next) {
          next.isHost = true;
          room.hostId = next.id;
        }
      }
    }
    if (room.players.size === 0 && room.spectators.size === 0) {
      engines.get(room.code)?.destroy();
      engines.delete(room.code);
      roomManager.deleteRoom(room.code);
    } else {
      getEngine(room, io)?.broadcastState();
    }
  }
  roomManager.unbindSocket(socket.id);
  socket.leave(room.code);
}
