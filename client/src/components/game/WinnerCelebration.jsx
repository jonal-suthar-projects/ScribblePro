import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { useSound } from '../../hooks/useSound.js';

export function WinnerCelebration({ winner, onClose }) {
  const { playWin } = useSound();

  useEffect(() => {
    playWin();
    const duration = 3000;
    const end = Date.now() + duration;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#00f5ff', '#ff00aa', '#a855f7'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#00f5ff', '#ff00aa', '#a855f7'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [playWin]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.5 }}
        animate={{ scale: 1 }}
        className="glass-card text-center max-w-md w-full space-y-6"
      >
        <div className="text-6xl">🏆</div>
        <h2 className="font-display text-3xl neon-text">Winner!</h2>
        <p className="text-2xl font-bold">{winner?.name}</p>
        <p className="text-neon-cyan font-display text-xl">{winner?.score} points</p>
        <button onClick={onClose} className="btn-primary w-full">
          Back to Lobby
        </button>
      </motion.div>
    </motion.div>
  );
}
