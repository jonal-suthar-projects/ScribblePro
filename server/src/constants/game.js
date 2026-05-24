export const GAME_PHASES = {
  LOBBY: 'lobby',
  WORD_SELECT: 'word-select',
  DRAWING: 'drawing',
  ROUND_END: 'round-end',
  GAME_END: 'game-end',
};

export const DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
};

export const DIFFICULTY_MULTIPLIER = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

export const DEFAULT_SETTINGS = {
  maxPlayers: 10,
  rounds: 3,
  turnTime: 80,
  wordSelectTime: 15,
  drawTime: 80,
  maxGuesses: 0,
  privateRoom: true,
  spectatorsAllowed: true,
  difficulty: DIFFICULTY.MEDIUM,
  language: 'en',
};

export const SCORE_BASE = {
  firstGuess: 100,
  secondGuess: 80,
  thirdGuess: 60,
  defaultGuess: 40,
  drawerPerGuess: 25,
  wordSelectBonus: 10,
};

export const CLOSE_GUESS_THRESHOLD = 2;
