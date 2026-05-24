/** Socket.IO event names — single source of truth for client/server */
export const SOCKET_EVENTS = {
  // Room lifecycle
  CREATE_ROOM: 'create-room',
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ROOM_CREATED: 'room-created',
  ROOM_JOINED: 'room-joined',
  ROOM_UPDATED: 'room-updated',
  ROOM_ERROR: 'room-error',

  // Lobby
  PLAYER_READY: 'player-ready',
  START_GAME: 'start-game',
  KICK_PLAYER: 'kick-player',
  UPDATE_SETTINGS: 'update-settings',

  // Game flow
  GAME_STARTED: 'game-started',
  TURN_START: 'turn-start',
  WORD_CHOICES: 'word-choices',
  SELECT_WORD: 'select-word',
  WORD_SELECTED: 'word-selected',
  DRAW: 'draw',
  CLEAR_CANVAS: 'clear-canvas',
  FILL_CANVAS: 'fill-canvas',
  UNDO_STROKE: 'undo-stroke',
  GUESS_WORD: 'guess-word',
  CORRECT_GUESS: 'correct-guess',
  GUESS_CLOSE: 'guess-close',
  CHAT_MESSAGE: 'chat-message',
  TYPING: 'typing',
  EMOJI_REACTION: 'emoji-reaction',
  TIMER_UPDATE: 'timer-update',
  NEXT_TURN: 'next-turn',
  ROUND_END: 'round-end',
  GAME_END: 'game-end',

  // Player state
  PLAYER_DISCONNECTED: 'player-disconnected',
  PLAYER_RECONNECTED: 'player-reconnected',
  RECONNECT_PLAYER: 'reconnect-player',
  SPECTATOR_MODE: 'spectator-mode',

  // Notifications
  NOTIFICATION: 'notification',
  SOUND_EFFECT: 'sound-effect',

  // Friend Vote Mode
  FV_SUBMIT_ANSWER: 'fv-submit-answer',
  FV_CAST_VOTE: 'fv-cast-vote',
  FV_RETURN_LOBBY: 'fv-return-lobby',
  FV_ROUND_START: 'fv-round-start',
  FV_PHASE_CHANGED: 'fv-phase-changed',
  FV_ANSWER_SUBMITTED: 'fv-answer-submitted',
  FV_VOTE_UPDATE: 'fv-vote-update',
  FV_RESULTS: 'fv-results',
  FV_LEADERBOARD: 'fv-leaderboard',
};
