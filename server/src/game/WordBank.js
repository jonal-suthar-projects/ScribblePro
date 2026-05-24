/** Word bank with difficulty tiers — server-side only (anti-cheat) */
const WORDS = {
  easy: [
    'cat', 'dog', 'sun', 'moon', 'tree', 'fish', 'bird', 'car', 'house', 'apple',
    'book', 'ball', 'hat', 'shoe', 'cake', 'rain', 'snow', 'star', 'boat', 'cake',
    'chair', 'door', 'egg', 'fire', 'gift', 'hand', 'ice', 'juice', 'key', 'lamp',
    'milk', 'nose', 'owl', 'pen', 'queen', 'ring', 'ship', 'toy', 'umbrella', 'van',
    'water', 'box', 'cloud', 'drum', 'eye', 'frog', 'grape', 'heart', 'island', 'jump',
  ],
  medium: [
    'bicycle', 'castle', 'dinosaur', 'elephant', 'firefighter', 'guitar', 'helicopter',
    'internet', 'jungle', 'kangaroo', 'lighthouse', 'mountain', 'notebook', 'octopus',
    'piano', 'rainbow', 'sandwich', 'telescope', 'umbrella', 'volcano', 'waterfall',
    'xylophone', 'yacht', 'zebra', 'astronaut', 'butterfly', 'crocodile', 'dragon',
    'envelope', 'flashlight', 'giraffe', 'hamburger', 'igloo', 'jellyfish', 'knight',
    'laptop', 'mermaid', 'ninja', 'ostrich', 'penguin', 'quilt', 'robot', 'skeleton',
    'tornado', 'unicorn', 'vampire', 'wizard', 'x-ray', 'yogurt', 'zombie',
  ],
  hard: [
    'archaeology', 'bureaucracy', 'choreography', 'democracy', 'encyclopedia',
    'fluorescent', 'gymnastics', 'hippopotamus', 'improvisation', 'juxtaposition',
    'kaleidoscope', 'labyrinth', 'metamorphosis', 'narcissistic', 'onomatopoeia',
    'photosynthesis', 'quintessential', 'rhinoceros', 'sophisticated', 'tranquility',
    'unprecedented', 'ventriloquist', 'whimsical', 'xenophobia', 'yesterday', 'zeppelin',
    'abbreviation', 'benevolent', 'circumference', 'discombobulated', 'exaggerate',
    'flabbergasted', 'grandiloquent', 'hallucination', 'idiosyncrasy', 'juggernaut',
    'knowledgeable', 'lilliputian', 'magnanimous', 'nefarious', 'obfuscation',
    'perspicacious', 'quizzical', 'recalcitrant', 'serendipity', 'triskaidekaphobia',
    'unscrupulous', 'vicissitude', 'wanderlust', 'xenogenesis', 'yesteryear', 'zeitgeist',
  ],
};

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
