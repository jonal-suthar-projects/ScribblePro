export const GAME_TYPES = {
  SCRIBBLE: 'scribble',
  FRIEND_VOTE: 'friendVote',
};

export const FV_PHASES = {
  LOBBY: 'lobby',
  QUESTION_REVEAL: 'question_reveal',
  ANSWER_SUBMISSION: 'answer_submission',
  VOTING_PHASE: 'voting_phase',
  RESULT_REVEAL: 'result_reveal',
  LEADERBOARD: 'leaderboard',
  GAME_END: 'game_end',
};

export const FV_DEFAULT_SETTINGS = {
  maxPlayers: 10,
  minPlayers: 3,
  rounds: 5,
  questionRevealTime: 5,
  answerTime: 60,
  voteTime: 45,
  resultRevealTime: 12,
  leaderboardTime: 4,
  privateRoom: true,
};

export const FV_SCORE = {
  perVote: 100,
  roundWinnerBonus: 75,
  targetParticipationBonus: 25,
};

export const FV_ANSWER_MAX_LENGTH = 120;
