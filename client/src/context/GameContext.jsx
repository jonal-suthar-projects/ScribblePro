import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { getSocket, connectSocket, waitForSocket, emitWithAck } from '../socket/socket.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import { saveSession, clearSession, getSession } from '../utils/helpers.js';
import { isFriendVoteRoom, shouldAcceptTimerUpdate } from '../utils/gameType.js';

const emptyTimer = { remaining: 0, total: 0, type: null };

function clearGameSessionState(state) {
  return {
    ...state,
    wordChoices: [],
    currentWord: null,
    timer: emptyTimer,
    chatMessages: [],
    typingUsers: [],
    reactions: [],
    notifications: [],
    strokes: [],
    turnInfo: null,
    roundEnd: null,
    gameEnd: null,
    correctGuesses: [],
    fvResults: null,
    fvLeaderboard: null,
    fvRoundInfo: null,
  };
}

const GameContext = createContext(null);

const initialState = {
  connected: false,
  room: null,
  playerId: null,
  sessionToken: null,
  roomCode: null,
  wordChoices: [],
  currentWord: null,
  isDrawer: false,
  hasGuessed: false,
  timer: emptyTimer,
  chatMessages: [],
  typingUsers: [],
  reactions: [],
  notifications: [],
  strokes: [],
  turnInfo: null,
  roundEnd: null,
  gameEnd: null,
  correctGuesses: [],
  fvResults: null,
  fvLeaderboard: null,
  fvRoundInfo: null,
  error: null,
  loading: false,
};

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_CONNECTED':
      return { ...state, connected: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload, error: null };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_ROOM':
      return {
        ...state,
        room: action.payload.room,
        playerId: action.payload.playerId,
        sessionToken: action.payload.sessionToken,
        roomCode: action.payload.roomCode,
        loading: false,
        error: null,
      };
    case 'UPDATE_ROOM':
      return {
        ...state,
        room: action.payload,
      };
    case 'SET_WORD_CHOICES':
      return { ...state, wordChoices: action.payload };
    case 'SET_WORD':
      return { ...state, currentWord: action.payload };
    case 'SET_TIMER':
      return { ...state, timer: action.payload };
    case 'ADD_CHAT':
      return {
        ...state,
        chatMessages: [...state.chatMessages.slice(-99), action.payload],
      };
    case 'SET_TYPING':
      return { ...state, typingUsers: action.payload };
    case 'ADD_REACTION':
      return {
        ...state,
        reactions: [...state.reactions.slice(-20), action.payload],
      };
    case 'ADD_STROKE': {
      const idx = state.strokes.findIndex((s) => s.id === action.payload.id);
      if (idx >= 0) {
        const strokes = [...state.strokes];
        strokes[idx] = action.payload;
        return { ...state, strokes };
      }
      return { ...state, strokes: [...state.strokes, action.payload] };
    }
    case 'SET_STROKES':
      return { ...state, strokes: action.payload };
    case 'CLEAR_STROKES':
      return { ...state, strokes: [] };
    case 'REMOVE_STROKE':
      return {
        ...state,
        strokes: state.strokes.filter((s) => s.id !== action.payload),
      };
    case 'SET_TURN':
      return { ...state, turnInfo: action.payload, strokes: [], correctGuesses: [] };
    case 'ADD_CORRECT_GUESS':
      return {
        ...state,
        correctGuesses: [...state.correctGuesses, action.payload],
      };
    case 'SET_ROUND_END':
      return { ...state, roundEnd: action.payload };
    case 'SET_GAME_END':
      return { ...state, gameEnd: action.payload };
    case 'SET_FV_RESULTS':
      return { ...state, fvResults: action.payload };
    case 'SET_FV_LEADERBOARD':
      return { ...state, fvLeaderboard: action.payload };
    case 'SET_FV_ROUND':
      return { ...state, fvRoundInfo: action.payload, fvResults: null };
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'CLEAR_SESSION':
      return clearGameSessionState(state);
    case 'RESET':
      return { ...initialState, connected: state.connected };
    default:
      return state;
  }
}

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const listenersAttached = useRef(false);
  const roomRef = useRef(null);
  roomRef.current = state.room;

  const setupListeners = useCallback(() => {
    const socket = getSocket();
    if (listenersAttached.current) return;
    listenersAttached.current = true;

    socket.on('connect', () => dispatch({ type: 'SET_CONNECTED', payload: true }));
    socket.on('disconnect', () => dispatch({ type: 'SET_CONNECTED', payload: false }));

    socket.on(SOCKET_EVENTS.ROOM_UPDATED, ({ room }) => {
      if (!room) return;
      dispatch({ type: 'UPDATE_ROOM', payload: room });
      if (room?.phase === 'lobby') {
        dispatch({ type: 'SET_TIMER', payload: emptyTimer });
      }
    });

    socket.on(SOCKET_EVENTS.WORD_CHOICES, ({ words }) => {
      if (isFriendVoteRoom(roomRef.current)) return;
      dispatch({ type: 'SET_WORD_CHOICES', payload: words });
    });

    socket.on(SOCKET_EVENTS.WORD_SELECTED, (data) => {
      if (isFriendVoteRoom(roomRef.current)) return;
      if (data.word) dispatch({ type: 'SET_WORD', payload: data.word });
      dispatch({ type: 'SET_WORD_CHOICES', payload: [] });
    });

    socket.on(SOCKET_EVENTS.TIMER_UPDATE, (timer) => {
      if (!shouldAcceptTimerUpdate(roomRef.current, timer)) return;
      let remaining = timer.remaining;
      if (timer.endsAt != null && timer.serverTime != null) {
        const drift = Date.now() - timer.serverTime;
        remaining = Math.max(0, Math.ceil((timer.endsAt + drift - Date.now()) / 1000));
      }
      dispatch({ type: 'SET_TIMER', payload: { ...timer, remaining } });
    });

    socket.on(SOCKET_EVENTS.CHAT_MESSAGE, (msg) => {
      dispatch({ type: 'ADD_CHAT', payload: { ...msg, id: Date.now() + Math.random() } });
    });

    socket.on(SOCKET_EVENTS.TYPING, ({ playerId, playerName, isTyping }) => {
      dispatch({
        type: 'SET_TYPING',
        payload: isTyping ? [{ playerId, playerName }] : [],
      });
    });

    socket.on(SOCKET_EVENTS.EMOJI_REACTION, (reaction) => {
      dispatch({
        type: 'ADD_REACTION',
        payload: { ...reaction, id: Date.now() },
      });
    });

    socket.on(SOCKET_EVENTS.DRAW, ({ stroke }) => {
      if (isFriendVoteRoom(roomRef.current)) return;
      if (!stroke) return;
      dispatch({ type: 'ADD_STROKE', payload: stroke });
    });

    socket.on(SOCKET_EVENTS.CLEAR_CANVAS, () => {
      if (isFriendVoteRoom(roomRef.current)) return;
      dispatch({ type: 'CLEAR_STROKES' });
    });

    socket.on(SOCKET_EVENTS.UNDO_STROKE, ({ strokeId, strokes }) => {
      if (isFriendVoteRoom(roomRef.current)) return;
      if (Array.isArray(strokes)) {
        dispatch({ type: 'SET_STROKES', payload: strokes });
      } else {
        dispatch({ type: 'REMOVE_STROKE', payload: strokeId });
      }
    });

    socket.on(SOCKET_EVENTS.TURN_START, (turn) => {
      if (isFriendVoteRoom(roomRef.current)) return;
      dispatch({ type: 'SET_TURN', payload: turn });
    });

    socket.on(SOCKET_EVENTS.CORRECT_GUESS, (data) => {
      if (isFriendVoteRoom(roomRef.current)) return;
      dispatch({ type: 'ADD_CORRECT_GUESS', payload: data });
      dispatch({
        type: 'ADD_CHAT',
        payload: {
          id: Date.now(),
          type: 'system',
          message: `${data.playerName} guessed the word! (+${data.points})`,
        },
      });
    });

    socket.on(SOCKET_EVENTS.GUESS_CLOSE, ({ message }) => {
      if (isFriendVoteRoom(roomRef.current)) return;
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: { type: 'info', message },
      });
    });

    socket.on(SOCKET_EVENTS.ROUND_END, (data) => {
      if (isFriendVoteRoom(roomRef.current)) return;
      dispatch({ type: 'SET_ROUND_END', payload: data });
    });

    socket.on(SOCKET_EVENTS.GAME_END, (data) => {
      const fv = isFriendVoteRoom(roomRef.current);
      if (fv && data?.gameType !== 'friendVote') return;
      if (!fv && data?.gameType === 'friendVote') return;
      dispatch({ type: 'SET_GAME_END', payload: data });
    });

    socket.on(SOCKET_EVENTS.NOTIFICATION, (n) => {
      dispatch({ type: 'ADD_NOTIFICATION', payload: n });
    });

    socket.on(SOCKET_EVENTS.ROOM_ERROR, ({ error }) => {
      dispatch({ type: 'SET_ERROR', payload: error });
    });

    socket.on(SOCKET_EVENTS.GAME_STARTED, (data) => {
      dispatch({ type: 'SET_TIMER', payload: emptyTimer });
      dispatch({ type: 'SET_ROUND_END', payload: null });
      dispatch({ type: 'SET_GAME_END', payload: null });
      dispatch({ type: 'SET_FV_RESULTS', payload: null });
      dispatch({ type: 'SET_FV_LEADERBOARD', payload: null });
      dispatch({ type: 'SET_FV_ROUND', payload: null });
      dispatch({ type: 'SET_WORD_CHOICES', payload: [] });
      dispatch({ type: 'SET_WORD', payload: null });
      dispatch({ type: 'SET_TURN', payload: null });
      dispatch({ type: 'CLEAR_STROKES' });
    });

    socket.on(SOCKET_EVENTS.FV_ROUND_START, (data) => {
      if (!isFriendVoteRoom(roomRef.current)) return;
      dispatch({ type: 'SET_FV_ROUND', payload: data });
      dispatch({ type: 'SET_FV_RESULTS', payload: null });
      dispatch({ type: 'SET_WORD_CHOICES', payload: [] });
      dispatch({ type: 'SET_WORD', payload: null });
      dispatch({ type: 'CLEAR_STROKES' });
    });

    socket.on(SOCKET_EVENTS.FV_RESULTS, (data) => {
      if (!isFriendVoteRoom(roomRef.current)) return;
      dispatch({ type: 'SET_FV_RESULTS', payload: data });
    });

    socket.on(SOCKET_EVENTS.FV_LEADERBOARD, (data) => {
      if (!isFriendVoteRoom(roomRef.current)) return;
      dispatch({ type: 'SET_FV_LEADERBOARD', payload: data });
    });

    socket.on(SOCKET_EVENTS.SOUND_EFFECT, ({ type }) => {
      if (type === 'reveal') {
        dispatch({
          type: 'ADD_NOTIFICATION',
          payload: { type: 'info', message: '🎭 Revealing answers...' },
        });
      }
    });

    socket.on(SOCKET_EVENTS.NEXT_TURN, ({ word }) => {
      if (isFriendVoteRoom(roomRef.current)) return;
      dispatch({ type: 'CLEAR_STROKES' });
      if (word) {
        dispatch({
          type: 'ADD_CHAT',
          payload: { id: Date.now(), type: 'system', message: `The word was: ${word}` },
        });
      }
    });
  }, []);

  useEffect(() => {
    connectSocket();
    setupListeners();
    return () => {
      listenersAttached.current = false;
    };
  }, [setupListeners]);

  const createRoom = async (playerName, settings, avatarColor, gameType = 'scribble') => {
    dispatch({ type: 'CLEAR_SESSION' });
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      connectSocket();
      await waitForSocket();
      const res = await emitWithAck(SOCKET_EVENTS.CREATE_ROOM, {
        playerName,
        settings: { ...settings, gameType },
        avatarColor,
        gameType,
      });
      saveSession(res.roomCode, res.playerId, res.sessionToken);
      dispatch({
        type: 'SET_ROOM',
        payload: {
          room: res.room,
          playerId: res.playerId,
          sessionToken: res.sessionToken,
          roomCode: res.roomCode,
        },
      });
      if (res.strokes && !isFriendVoteRoom(res.room)) {
        dispatch({ type: 'SET_STROKES', payload: res.strokes });
      }
      return res;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  };

  /**
   * @param {object} [options]
   * @param {boolean} [options.reconnect] - true only when restoring same player after refresh
   */
  const joinRoom = async (roomCode, playerName, avatarColor, asSpectator = false, options = {}) => {
    const { reconnect = false } = options;
    dispatch({ type: 'CLEAR_SESSION' });
    dispatch({ type: 'SET_LOADING', payload: true });

    // New joins must not reuse host session (fixes second tab / share-link showing count=1)
    if (!reconnect) {
      clearSession();
    }
    const session = reconnect ? getSession() : null;

    try {
      connectSocket();
      await waitForSocket();
      const res = await emitWithAck(SOCKET_EVENTS.JOIN_ROOM, {
        roomCode,
        playerName,
        avatarColor,
        asSpectator,
        sessionToken:
          reconnect && session?.roomCode === roomCode?.toUpperCase()
            ? session.sessionToken
            : undefined,
      });
      saveSession(roomCode, res.playerId, res.sessionToken);
      dispatch({
        type: 'SET_ROOM',
        payload: {
          room: res.room,
          playerId: res.playerId,
          sessionToken: res.sessionToken,
          roomCode,
        },
      });
      if (res.strokes && !isFriendVoteRoom(res.room)) {
        dispatch({ type: 'SET_STROKES', payload: res.strokes });
      }
      if (res.timer?.endsAt != null) {
        const drift = Date.now() - (res.timer.serverTime ?? Date.now());
        const remaining = Math.max(
          0,
          Math.ceil((res.timer.endsAt + drift - Date.now()) / 1000)
        );
        dispatch({
          type: 'SET_TIMER',
          payload: {
            remaining,
            total: res.timer.totalSeconds ?? res.timer.total ?? 0,
            type: res.timer.type,
            gameType: res.room?.gameType,
            endsAt: res.timer.endsAt,
            serverTime: res.timer.serverTime,
          },
        });
      }
      return res;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.message });
      throw err;
    }
  };

  const leaveRoom = () => {
    getSocket().emit(SOCKET_EVENTS.LEAVE_ROOM);
    clearSession();
    dispatch({ type: 'RESET' });
  };

  const setReady = (ready) => {
    getSocket().emit(SOCKET_EVENTS.PLAYER_READY, { ready });
  };

  const startGame = () => emitWithAck(SOCKET_EVENTS.START_GAME, {});

  const selectWord = (word) => {
    if (isFriendVoteRoom(state.room)) return;
    getSocket().emit(SOCKET_EVENTS.SELECT_WORD, { word });
  };

  const sendGuess = (guess) => {
    if (isFriendVoteRoom(state.room)) return;
    getSocket().emit(SOCKET_EVENTS.GUESS_WORD, { guess });
  };

  const sendChat = (message) => {
    getSocket().emit(SOCKET_EVENTS.CHAT_MESSAGE, { message });
  };

  const sendDraw = (stroke) => {
    if (isFriendVoteRoom(state.room)) return;
    if (stroke?.type === 'fill') {
      getSocket().emit(SOCKET_EVENTS.FILL_CANVAS, { fill: stroke });
      dispatch({ type: 'ADD_STROKE', payload: stroke });
      return;
    }
    getSocket().emit(SOCKET_EVENTS.DRAW, { stroke });
    // Only commit to stroke list when stroke is done — avoids redraw wiping live drawing
    if (stroke?.final) {
      dispatch({ type: 'ADD_STROKE', payload: stroke });
    }
  };

  const clearCanvas = () => {
    getSocket().emit(SOCKET_EVENTS.CLEAR_CANVAS);
    dispatch({ type: 'CLEAR_STROKES' });
  };

  const undoStroke = () => {
    getSocket().emit(SOCKET_EVENTS.UNDO_STROKE, {}, (res) => {
      if (res?.strokes) {
        dispatch({ type: 'SET_STROKES', payload: res.strokes });
      }
    });
  };

  const sendReaction = (emoji) => {
    getSocket().emit(SOCKET_EVENTS.EMOJI_REACTION, { emoji });
  };

  const sendTyping = (isTyping) => {
    getSocket().emit(SOCKET_EVENTS.TYPING, { isTyping });
  };

  const updateSettings = (settings) => {
    getSocket().emit(SOCKET_EVENTS.UPDATE_SETTINGS, { settings });
  };

  const kickPlayer = (playerId) => {
    getSocket().emit(SOCKET_EVENTS.KICK_PLAYER, { playerId });
  };

  const submitFvAnswer = (text) =>
    emitWithAck(SOCKET_EVENTS.FV_SUBMIT_ANSWER, { text });

  const castFvVote = (answerId) =>
    emitWithAck(SOCKET_EVENTS.FV_CAST_VOTE, { answerId });

  const returnFvToLobby = () => emitWithAck(SOCKET_EVENTS.FV_RETURN_LOBBY, {});

  const sendFvReaction = (emoji) => {
    getSocket().emit(SOCKET_EVENTS.EMOJI_REACTION, { emoji, context: 'fv-vote' });
  };

  // Always derive from room + playerId — avoids broken state from generic room-updated broadcasts
  const isDrawer = Boolean(
    state.playerId && state.room?.currentDrawerId === state.playerId
  );
  const hasGuessed = Boolean(
    state.playerId &&
      !isDrawer &&
      (state.room?.guessedPlayerIds?.includes(state.playerId) || state.room?.hasGuessed)
  );

  const value = {
    ...state,
    isDrawer,
    hasGuessed,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    selectWord,
    sendGuess,
    sendChat,
    sendDraw,
    clearCanvas,
    undoStroke,
    sendReaction,
    sendTyping,
    updateSettings,
    kickPlayer,
    submitFvAnswer,
    castFvVote,
    returnFvToLobby,
    sendFvReaction,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
