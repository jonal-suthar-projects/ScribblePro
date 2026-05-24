import { DIFFICULTY_MULTIPLIER, SCORE_BASE } from '../constants/game.js';

/**
 * Server-authoritative scoring — clients never compute final scores
 */
export function calculateGuessScore(guessOrder, timeRemaining, maxTime, difficulty) {
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] || 1;
  let base;
  if (guessOrder === 1) base = SCORE_BASE.firstGuess;
  else if (guessOrder === 2) base = SCORE_BASE.secondGuess;
  else if (guessOrder === 3) base = SCORE_BASE.thirdGuess;
  else base = SCORE_BASE.defaultGuess;

  const timeBonus = Math.floor((timeRemaining / maxTime) * 30);
  return Math.round((base + timeBonus) * multiplier);
}

export function calculateDrawerScore(guessCount) {
  return guessCount * SCORE_BASE.drawerPerGuess;
}

export function sortLeaderboard(players) {
  return [...players]
    .filter((p) => !p.isSpectator)
    .sort((a, b) => b.score - a.score)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}
