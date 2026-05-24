import { customAlphabet } from 'nanoid';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generateCode = customAlphabet(alphabet, 6);

export function createRoomCode() {
  return generateCode();
}

export function createPlayerId() {
  return customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 12)();
}

export function sanitizeName(name) {
  return (name || 'Player')
    .trim()
    .slice(0, 20)
    .replace(/[<>]/g, '');
}

export function pickRandomDrawer(players, excludeId = null) {
  const eligible = players.filter(
    (p) => !p.isSpectator && !p.disconnected && p.id !== excludeId
  );
  if (eligible.length === 0) return null;
  return eligible[Math.floor(Math.random() * eligible.length)];
}

export function maskWord(word, revealed = false) {
  if (revealed) return word;
  return word
    .split('')
    .map((c) => (c === ' ' ? ' ' : '_'))
    .join(' ');
}

export function getHint(word, revealCount) {
  const chars = word.split('');
  const letterIndices = chars
    .map((c, i) => (c !== ' ' ? i : -1))
    .filter((i) => i >= 0);
  const revealed = new Set();
  while (revealed.size < revealCount && revealed.size < letterIndices.length) {
    const idx = letterIndices[Math.floor(Math.random() * letterIndices.length)];
    revealed.add(idx);
  }
  return chars
    .map((c, i) => (c === ' ' ? ' ' : revealed.has(i) ? c.toUpperCase() : '_'))
    .join(' ');
}
