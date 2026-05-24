import { STORAGE_KEYS } from './constants.js';

export function getStoredName() {
  return localStorage.getItem(STORAGE_KEYS.PLAYER_NAME) || '';
}

export function setStoredName(name) {
  localStorage.setItem(STORAGE_KEYS.PLAYER_NAME, name);
}

export function getStoredAvatar() {
  return localStorage.getItem(STORAGE_KEYS.AVATAR_COLOR) || '#4ECDC4';
}

export function setStoredAvatar(color) {
  localStorage.setItem(STORAGE_KEYS.AVATAR_COLOR, color);
}

export function saveSession(roomCode, playerId, sessionToken) {
  localStorage.setItem(
    STORAGE_KEYS.SESSION,
    JSON.stringify({ roomCode, playerId, sessionToken })
  );
}

export function getSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export function copyToClipboard(text) {
  return navigator.clipboard?.writeText(text);
}

export function getShareLink(roomCode, gameType = 'scribble') {
  const base = window.location.origin;
  const gt = String(gameType).toLowerCase().replace(/[-_\s]/g, '');
  const mode =
    gt === 'friendvote' || gt === 'fv' || gt === 'vote' ? 'friendVote' : 'scribble';
  return `${base}/join/${roomCode}?game=${mode}`;
}

const API_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export async function fetchRoomInfo(roomCode) {
  const code = roomCode?.toUpperCase()?.trim();
  if (!code) return { exists: false };
  try {
    const res = await fetch(`${API_BASE}/api/rooms/${code}`);
    if (!res.ok) return { exists: false };
    return res.json();
  } catch {
    return { exists: false };
  }
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function throttle(fn, ms) {
  let last = 0;
  let timer = null;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    } else if (!timer) {
      timer = setTimeout(() => {
        last = Date.now();
        timer = null;
        fn(...args);
      }, ms - (now - last));
    }
  };
}
