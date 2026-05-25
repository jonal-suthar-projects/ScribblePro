import { EASY_WORDS, MEDIUM_WORDS, HARD_WORDS } from './wordLists.js';

/** Words that are poor for drawing or not family-friendly */
const BLOCKLIST = new Set([
  'gun', 'kill', 'bomb', 'death', 'war', 'blood', 'drug', 'hell', 'damn',
  'sexy', 'nude', 'rape', 'suicide', 'terror', 'nazi', 'slave',
]);

function prepareWordList(words) {
  const seen = new Set();
  const result = [];

  for (const raw of words) {
    const word = String(raw).toLowerCase().trim();
    if (word.length < 2 || word.length > 32) continue;
    if (BLOCKLIST.has(word) || seen.has(word)) continue;
    seen.add(word);
    result.push(word);
  }

  return result;
}

const WORDS = {
  easy: prepareWordList(EASY_WORDS),
  medium: prepareWordList(MEDIUM_WORDS),
  hard: prepareWordList(HARD_WORDS),
};

console.log(
  `[WordBank] Loaded ${WORDS.easy.length} easy, ${WORDS.medium.length} medium, ${WORDS.hard.length} hard words`
);

export function getWordCount(difficulty = 'medium') {
  return (WORDS[difficulty] || WORDS.medium).length;
}

export function getRandomWords(count = 3, difficulty = 'medium') {
  const pool = [...(WORDS[difficulty] || WORDS.medium)];
  const selected = [];
  while (selected.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected;
}

export function getRandomWord(difficulty = 'medium') {
  return getRandomWords(1, difficulty)[0];
}

export function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function normalizeGuess(guess) {
  return guess
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

export function checkGuess(guess, answer) {
  const g = normalizeGuess(guess);
  const a = normalizeGuess(answer);
  if (!g || !a) return { correct: false, close: false };
  if (g === a) return { correct: true, close: false };
  const dist = levenshtein(g, a);
  return { correct: false, close: dist <= 2 && g.length >= 3 };
}
