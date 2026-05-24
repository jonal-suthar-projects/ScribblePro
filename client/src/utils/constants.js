export const SOCKET_EVENTS = {
  CREATE_ROOM: 'create-room',
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ROOM_CREATED: 'room-created',
  ROOM_JOINED: 'room-joined',
  ROOM_UPDATED: 'room-updated',
  ROOM_ERROR: 'room-error',
  PLAYER_READY: 'player-ready',
  START_GAME: 'start-game',
  KICK_PLAYER: 'kick-player',
  UPDATE_SETTINGS: 'update-settings',
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
  PLAYER_DISCONNECTED: 'player-disconnected',
  PLAYER_RECONNECTED: 'player-reconnected',
  RECONNECT_PLAYER: 'reconnect-player',
  NOTIFICATION: 'notification',
  SOUND_EFFECT: 'sound-effect',

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

export const GAME_TYPES = {
  SCRIBBLE: 'scribble',
  FRIEND_VOTE: 'friendVote',
};

/** Timer `type` values emitted by GameEngine (Scribble). */
export const SCRIBBLE_TIMER_TYPES = ['word-select', 'draw'];

/** Timer `type` values emitted by FriendVoteEngine. */
export const FV_TIMER_TYPES = ['question-reveal', 'answer', 'vote', 'leaderboard'];

export const FV_PHASES = {
  LOBBY: 'lobby',
  QUESTION_REVEAL: 'question_reveal',
  ANSWER_SUBMISSION: 'answer_submission',
  VOTING_PHASE: 'voting_phase',
  RESULT_REVEAL: 'result_reveal',
  LEADERBOARD: 'leaderboard',
  GAME_END: 'game_end',
};

export const FV_EMOJI_REACTIONS = ['💀', '😂', '🔥', '👀', '😭', '🗳️', '✨', '😈'];

export const AVATAR_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

export const BRUSH_COLORS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080',
  '#ffc0cb', '#8b4513',
];

export const EMOJI_REACTIONS = ['🔥', '😂', '👏', '🤔', '😮', '💀', '❤️', '👎'];

export const STORAGE_KEYS = {
  PLAYER_NAME: 'scribblepro_name',
  AVATAR_COLOR: 'scribblepro_avatar',
  SESSION: 'scribblepro_session',
  THEME: 'scribblepro_theme',
};
