import { SOCKET_EVENTS } from '../constants/events.js';
import { GAME_PHASES } from '../constants/game.js';
import { GAME_TYPES } from '../constants/friendVote.js';
import { isFriendVoteEngine, resolveGameType } from '../game/createEngine.js';
import { GameStateManager } from '../transitions/GameStateManager.js';
import { EngineRegistry } from '../socket/engineRegistry.js';
import { consumeActionId } from '../utils/idempotency.js';
import { getActiveParticipant, requireHost } from '../validators/playerValidator.js';
import { canHostStartGame } from '../validators/phaseValidator.js';
import { logReconnect, logDisconnect } from '../utils/logger.js';

function isScribbleRoom(room) {
  return resolveGameType(room) === GAME_TYPES.SCRIBBLE;
}

/**
 * Register Socket.IO handlers — validate → transition (locked) → persist → broadcast
 */
export function registerSocketHandlers(io, roomManager, stateManager) {
  const engines = new EngineRegistry(stateManager);

  function getEngine(room) {
    return engines.get(room, io);
  }

  async function withSocketRoom(socket, fn, opts = {}) {
    const code = roomManager.socketToRoom.get(socket.id);
    if (!code) return { ok: false, error: 'Not in a room' };
    return stateManager.withRoom(code, fn, opts);
  }

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on(SOCKET_EVENTS.CREATE_ROOM, async (data, callback) => {
      try {
        const { playerName, settings, avatarColor, gameType } = data || {};
        if (!playerName?.trim()) {
          return callback?.({ success: false, error: 'Name is required' });
        }
        const resolvedGameType = resolveGameType({
          gameType: gameType || settings?.gameType,
          settings,
        });
        const roomSettings = { ...settings, gameType: resolvedGameType };

        const { room, player } = await roomManager.createRoom(
          socket.id,
          playerName,
          roomSettings,
          avatarColor
        );
        room.gameType = resolvedGameType;
        room.settings.gameType = resolvedGameType;

        socket.join(room.code);
        getEngine(room);

        const payload = {
          success: true,
          roomCode: room.code,
          playerId: player.id,
          sessionToken: player.sessionToken,
          room: room.toPublicState(player.id),
          serverTime: Date.now(),
        };
        callback?.(payload);
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

    socket.on(SOCKET_EVENTS.JOIN_ROOM, async (data, callback) => {
      try {
        const { roomCode, playerName, avatarColor, asSpectator, sessionToken, actionId } =
          data || {};
        const code = roomCode?.toUpperCase()?.trim();

        if (sessionToken) {
          const session = await stateManager.sessionStore.restoreSession(sessionToken);
          const lookupCode = session?.roomCode || code;
          if (!lookupCode) {
            return callback?.({ success: false, error: 'Room code required for reconnect' });
          }
          const result = await stateManager.withRoom(
            lookupCode,
            async (room) => {
              if (!room) return { ok: false, error: 'Room not found' };

              if (actionId && !consumeActionId(room, actionId)) {
                return { ok: false, error: 'Duplicate action', duplicate: true };
              }

              let existing = room.getPlayerBySession(sessionToken);
              if (!existing && session?.playerId) {
                existing = room.getPlayerById(session.playerId);
              }
              if (!existing) {
                return { ok: false, error: 'Session expired — join as new player' };
              }

              existing.socketId = socket.id;
              existing.disconnected = false;
              existing.disconnectedAt = null;
              existing.lastActiveAt = Date.now();

              roomManager.bindSocket(socket.id, room.code);
              await stateManager.bindPlayerSession(existing, room);

              return {
                ok: true,
                reconnected: true,
                playerId: existing.id,
                sessionToken: existing.sessionToken,
                room: room.toPublicState(existing.id),
                strokes: isScribbleRoom(room) ? room.strokes : undefined,
                timer: room.timer
                  ? {
                      ...room.timer,
                      remaining: Math.max(
                        0,
                        Math.ceil((room.timer.endsAt - Date.now()) / 1000)
                      ),
                      serverTime: Date.now(),
                    }
                  : undefined,
                serverTime: Date.now(),
                stateVersion: room.stateVersion,
              };
            },
            { persist: true, actionId }
          );

          if (result?.ok && result.reconnected) {
            socket.join(lookupCode);
            const room = await roomManager.getOrLoadRoom(lookupCode);
            const engine = getEngine(room);
            logReconnect(lookupCode, result.playerId);
            callback?.({ success: true, ...result });
            io.to(lookupCode).emit(SOCKET_EVENTS.PLAYER_RECONNECTED, {
              playerId: result.playerId,
              name: room.getPlayerById(result.playerId)?.name,
            });
            engine.broadcastState();
            if (room.timer) {
              engine.broadcastTimer?.();
            }
            return;
          }
          if (result?.error && !code) {
            return callback?.({ success: false, error: result.error });
          }
        }

        const joinResult = await stateManager.withRoom(
          code,
          async (room) => {
            if (!room) return { ok: false, error: 'Room not found' };

            if (!room.canJoin(asSpectator)) {
              return { ok: false, error: 'Room is full' };
            }
            if (room.phase !== GAME_PHASES.LOBBY && !asSpectator) {
              return {
                ok: false,
                error: 'Game already in progress. Join as spectator.',
              };
            }

            let player;
            if (asSpectator) {
              player = room.addSpectator(socket.id, playerName, avatarColor);
            } else {
              player = room.addPlayer(socket.id, playerName, avatarColor);
            }

            roomManager.bindSocket(socket.id, code);
            await stateManager.bindPlayerSession(player, room);

            return {
              ok: true,
              playerId: player.id,
              sessionToken: player.sessionToken,
              room: room.toPublicState(player.id),
            };
          },
          { actionId }
        );

        if (!joinResult?.ok) {
          return callback?.({ success: false, error: joinResult?.error || 'Join failed' });
        }

        socket.join(code);
        getEngine(await roomManager.getOrLoadRoom(code));

        callback?.({
          success: true,
          playerId: joinResult.playerId,
          sessionToken: joinResult.sessionToken,
          room: joinResult.room,
          serverTime: Date.now(),
        });

        const joinedRoom = await roomManager.getOrLoadRoom(code);
        const joinedPlayer = joinedRoom?.getPlayerById(joinResult.playerId);

        io.to(code).emit(SOCKET_EVENTS.ROOM_JOINED, {
          player: {
            id: joinResult.playerId,
            name: joinedPlayer?.name,
            avatarColor: joinedPlayer?.avatarColor,
            isSpectator: joinedPlayer?.isSpectator,
          },
        });

        getEngine(joinedRoom).broadcastState();
      } catch (err) {
        callback?.({ success: false, error: err.message });
      }
    });

    socket.on(SOCKET_EVENTS.RECONNECT_PLAYER, (data, callback) => {
      socket.emit(
        SOCKET_EVENTS.JOIN_ROOM,
        { ...data, sessionToken: data.sessionToken },
        callback
      );
    });

    socket.on(SOCKET_EVENTS.PLAYER_READY, async (data) => {
      await withSocketRoom(socket, async (room) => {
        const check = getActiveParticipant(room, socket.id);
        if (!check.ok || check.player.isSpectator) return;
        room.setReady(check.player.id, data?.ready ?? true);
        getEngine(room).broadcastState();
      });
    });

    socket.on(SOCKET_EVENTS.START_GAME, async (data, callback) => {
      const result = await withSocketRoom(
        socket,
        async (room) => {
          const check = getActiveParticipant(room, socket.id);
          if (!check.ok) return { ok: false, error: check.error };
          const hostCheck = requireHost(room, check.player);
          if (!hostCheck.ok) return { ok: false, error: hostCheck.error };
          if (!canHostStartGame(room)) {
            return { ok: false, error: 'Game already started' };
          }
          if (!room.allReady()) {
            return { ok: false, error: 'All players must be ready' };
          }

          const resolved = resolveGameType(room);
          room.gameType = resolved;
          room.settings.gameType = resolved;

          const engine = engines.replace(room, io);

          if (resolved === GAME_TYPES.FRIEND_VOTE && !isFriendVoteEngine(engine)) {
            throw new Error('Failed to start Friend Vote engine');
          }
          if (resolved === GAME_TYPES.SCRIBBLE && isFriendVoteEngine(engine)) {
            throw new Error('Failed to start Scribble engine');
          }

          await engine.startGame();
          return { ok: true, gameType: resolved };
        },
        { actionId: data?.actionId }
      );

      if (result?.ok) callback?.({ success: true, gameType: result.gameType });
      else callback?.({ success: false, error: result?.error || 'Not in a room' });
    });

    socket.on(SOCKET_EVENTS.UPDATE_SETTINGS, async (data) => {
      await withSocketRoom(socket, async (room) => {
        const check = getActiveParticipant(room, socket.id);
        if (!check.ok) return;
        const hostCheck = requireHost(room, check.player);
        if (!hostCheck.ok) return;
        if (room.phase !== GAME_PHASES.LOBBY) return;
        room.settings = { ...room.settings, ...data.settings, gameType: room.gameType };
        getEngine(room).broadcastState();
      });
    });

    socket.on(SOCKET_EVENTS.KICK_PLAYER, async (data) => {
      await withSocketRoom(socket, async (room) => {
        const check = getActiveParticipant(room, socket.id);
        if (!check.ok) return;
        const hostCheck = requireHost(room, check.player);
        if (!hostCheck.ok) return;
        const target = room.getPlayerById(data?.playerId);
        if (!target || target.isHost) return;
        const targetSocket = io.sockets.sockets.get(target.socketId);
        if (targetSocket) {
          targetSocket.emit(SOCKET_EVENTS.NOTIFICATION, {
            type: 'kicked',
            message: 'You were removed from the room by the host.',
          });
          targetSocket.leave(room.code);
          roomManager.unbindSocket(target.socketId);
        }
        if (target.sessionToken) {
          await stateManager.sessionStore.deleteSession(target.sessionToken);
        }
        room.players.delete(target.id);
        getEngine(room).broadcastState();
      });
    });

    socket.on(SOCKET_EVENTS.SELECT_WORD, async (data) => {
      await withSocketRoom(
        socket,
        async (room) => {
          if (!isScribbleRoom(room)) return;
          const check = getActiveParticipant(room, socket.id);
          if (!check.ok) return;
          await getEngine(room).selectWord?.(check.player.id, data?.word);
        },
        { actionId: data?.actionId }
      );
    });

    socket.on(SOCKET_EVENTS.DRAW, async (data) => {
      await withSocketRoom(
        socket,
        async (room) => {
          if (!isScribbleRoom(room)) return false;
          const check = getActiveParticipant(room, socket.id);
          if (!check.ok) return false;
          getEngine(room).handleDraw?.(check.player.id, data?.stroke);
          return true;
        },
        { persist: false }
      );
    });

    socket.on(SOCKET_EVENTS.FILL_CANVAS, async (data) => {
      await withSocketRoom(socket, async (room) => {
        if (!isScribbleRoom(room)) return;
        const check = getActiveParticipant(room, socket.id);
        if (!check.ok) return;
        getEngine(room).handleFill?.(check.player.id, data?.fill);
        await stateManager.persistRoom(room);
      });
    });

    socket.on(SOCKET_EVENTS.CLEAR_CANVAS, async () => {
      await withSocketRoom(socket, async (room) => {
        if (!isScribbleRoom(room)) return;
        const check = getActiveParticipant(room, socket.id);
        if (!check.ok) return;
        getEngine(room).handleClear?.(check.player.id);
        await stateManager.persistRoom(room);
      });
    });

    socket.on(SOCKET_EVENTS.UNDO_STROKE, async (data, callback) => {
      const result = await withSocketRoom(socket, async (room) => {
        if (!isScribbleRoom(room)) return { ok: false };
        const check = getActiveParticipant(room, socket.id);
        if (!check.ok) return { ok: false };
        const payload = getEngine(room).handleUndo?.(check.player.id);
        if (payload) {
          await stateManager.persistRoom(room);
          return { ok: true, ...payload };
        }
        return { ok: false };
      });
      if (result?.ok) callback?.({ success: true, ...result });
      else callback?.({ success: false });
    });

    socket.on(SOCKET_EVENTS.GUESS_WORD, async (data) => {
      await withSocketRoom(
        socket,
        async (room) => {
          if (!isScribbleRoom(room)) return;
          const check = getActiveParticipant(room, socket.id);
          if (!check.ok) return;
          const engine = getEngine(room);
          const result = await engine.handleGuess?.(check.player.id, data?.guess);
          if (result?.correct === false && !result?.close) {
            io.to(room.code).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
              playerId: check.player.id,
              playerName: check.player.name,
              message: data?.guess,
              type: 'guess',
            });
          }
        },
        { actionId: data?.actionId }
      );
    });

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, async (data) => {
      await withSocketRoom(socket, async (room) => {
        const check = getActiveParticipant(room, socket.id);
        if (!check.ok) return;
        const msg = (data?.message || '').trim().slice(0, 200);
        if (!msg) return;
        room.chatHistory.push({ playerId: check.player.id, message: msg, at: Date.now() });
        io.to(room.code).emit(SOCKET_EVENTS.CHAT_MESSAGE, {
          playerId: check.player.id,
          playerName: check.player.name,
          message: msg,
          type: 'chat',
        });
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

    socket.on(SOCKET_EVENTS.FV_SUBMIT_ANSWER, async (data, callback) => {
      const result = await withSocketRoom(
        socket,
        async (room) => {
          if (room.gameType !== GAME_TYPES.FRIEND_VOTE) {
            return { ok: false, error: 'Invalid room' };
          }
          const check = getActiveParticipant(room, socket.id);
          if (!check.ok) return { ok: false, error: check.error };
          return getEngine(room).submitAnswer?.(check.player.id, data?.text);
        },
        { actionId: data?.actionId }
      );
      callback?.({ success: result?.ok ?? false, error: result?.error });
    });

    socket.on(SOCKET_EVENTS.FV_CAST_VOTE, async (data, callback) => {
      const result = await withSocketRoom(
        socket,
        async (room) => {
          if (room.gameType !== GAME_TYPES.FRIEND_VOTE) {
            return { ok: false, error: 'Invalid room' };
          }
          const check = getActiveParticipant(room, socket.id);
          if (!check.ok) return { ok: false, error: check.error };
          return getEngine(room).castVote?.(check.player.id, data?.answerId);
        },
        { actionId: data?.actionId }
      );
      callback?.({ success: result?.ok ?? false, error: result?.error });
    });

    socket.on(SOCKET_EVENTS.FV_RETURN_LOBBY, async (data, callback) => {
      const result = await withSocketRoom(socket, async (room) => {
        if (room.gameType !== GAME_TYPES.FRIEND_VOTE) {
          return { ok: false, error: 'Invalid room' };
        }
        const check = getActiveParticipant(room, socket.id);
        if (!check.ok) return { ok: false, error: check.error };
        const hostCheck = requireHost(room, check.player);
        if (!hostCheck.ok) return { ok: false, error: hostCheck.error };
        const engine = getEngine(room);
        await engine.returnToLobby?.();
        engines.remove(room.code);
        return { ok: true };
      });
      callback?.({ success: result?.ok ?? false, error: result?.error });
    });

    socket.on(SOCKET_EVENTS.SPECTATOR_MODE, (data, callback) => {
      callback?.({ success: false, error: 'Use join as spectator from lobby' });
    });

    socket.on(SOCKET_EVENTS.LEAVE_ROOM, () => {
      handleDisconnect(socket, roomManager, io, engines, stateManager, false);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket, roomManager, io, engines, stateManager, true);
    });
  });

  return engines;
}

function handleDisconnect(socket, roomManager, io, engines, stateManager, isDisconnect) {
  const code = roomManager.socketToRoom.get(socket.id);
  if (!code) return;

  stateManager
    .withRoom(code, async (room) => {
      const player = room.getPlayerBySocket(socket.id);
      if (!player) {
        roomManager.unbindSocket(socket.id);
        return;
      }

      if (isDisconnect && room.phase !== GAME_PHASES.LOBBY) {
        player.disconnected = true;
        player.disconnectedAt = Date.now();
        player.socketId = null;
        logDisconnect(room.code, player.id, true);

        io.to(room.code).emit(SOCKET_EVENTS.PLAYER_DISCONNECTED, {
          playerId: player.id,
          name: player.name,
        });
        engines.get(room, io)?.broadcastState();

        stateManager.scheduleDisconnectCleanup(room.code, player.id, async (r, p) => {
          await stateManager.withRoom(r.code, async (lockedRoom) => {
            const still = lockedRoom.getPlayerById(p.id);
            if (!still || !still.disconnected) return;

            if (still.isSpectator) {
              lockedRoom.spectators.delete(still.id);
            } else {
              lockedRoom.players.delete(still.id);
              if (still.id === lockedRoom.hostId) {
                const next = [...lockedRoom.players.values()][0];
                if (next) {
                  next.isHost = true;
                  lockedRoom.hostId = next.id;
                }
              }
            }
            await stateManager.sessionStore.deleteSession(still.sessionToken);

            if (lockedRoom.players.size === 0 && lockedRoom.spectators.size === 0) {
              engines.remove(lockedRoom.code);
              await roomManager.deleteRoom(lockedRoom.code);
            } else {
              engines.get(lockedRoom, io)?.broadcastState();
            }
          });
        });
      } else {
        logDisconnect(room.code, player.id, false);
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
        await stateManager.sessionStore.deleteSession(player.sessionToken);

        if (room.players.size === 0 && room.spectators.size === 0) {
          engines.remove(room.code);
          await roomManager.deleteRoom(room.code);
        } else {
          engines.get(room, io)?.broadcastState();
        }
      }

      roomManager.unbindSocket(socket.id);
      socket.leave(room.code);
    })
    .catch((err) => console.error('[Disconnect] Error:', err.message));
}
