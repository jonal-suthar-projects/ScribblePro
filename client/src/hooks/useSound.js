import { useCallback, useRef } from 'react';

/**
 * Lightweight Web Audio sound effects — no external assets required
 */
export function useSound() {
  const ctxRef = useRef(null);

  const getCtx = () => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    return ctxRef.current;
  };

  const playTone = useCallback((freq, duration, type = 'sine', volume = 0.1) => {
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      /* Audio not available */
    }
  }, []);

  const playCorrect = useCallback(() => {
    playTone(523, 0.1);
    setTimeout(() => playTone(659, 0.1), 100);
    setTimeout(() => playTone(784, 0.15), 200);
  }, [playTone]);

  const playTick = useCallback(() => playTone(440, 0.05, 'square', 0.05), [playTone]);
  const playStart = useCallback(() => {
    playTone(330, 0.1);
    setTimeout(() => playTone(440, 0.1), 80);
    setTimeout(() => playTone(550, 0.2), 160);
  }, [playTone]);
  const playWin = useCallback(() => {
    [523, 587, 659, 784].forEach((f, i) => {
      setTimeout(() => playTone(f, 0.2), i * 120);
    });
  }, [playTone]);

  const playReveal = useCallback(() => {
    playTone(200, 0.15, 'sawtooth', 0.08);
    setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.1), 150);
    setTimeout(() => playTone(500, 0.3, 'square', 0.12), 350);
  }, [playTone]);

  const playVote = useCallback(() => playTone(660, 0.08, 'triangle', 0.06), [playTone]);

  return { playCorrect, playTick, playStart, playWin, playReveal, playVote };
}
