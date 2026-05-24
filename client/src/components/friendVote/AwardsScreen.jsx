import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar.jsx';
import { Button } from '../ui/Button.jsx';
import { useSound } from '../../hooks/useSound.js';

export function AwardsScreen({ gameEnd, isHost, onReturnLobby, onLeave }) {
  const { playWin } = useSound();
  const awards = gameEnd?.awards || [];
  const leaderboard = gameEnd?.leaderboard || [];

  useEffect(() => {
    playWin();
    const end = Date.now() + 2500;
    const frame = () => {
      confetti({
        particleCount: 2,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#ff00aa', '#00f5ff', '#a855f7'],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
  }, [playWin]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="glass-card max-w-lg w-full space-y-6 my-4"
      >
        <div className="text-center">
          <span className="text-5xl">🏆</span>
          <h2 className="font-display text-3xl neon-text mt-2">Final Awards</h2>
          <p className="text-slate-400 text-sm mt-1">MVP: {gameEnd?.winner?.name}</p>
        </div>

        <div className="space-y-3">
          {awards.map((a) => {
            const player = leaderboard.find((p) => p.id === a.playerId);
            return (
              <div
                key={a.playerId + a.title}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                {player && <Avatar name={player.name} color={player.avatarColor} size="sm" />}
                <div>
                  <p className="font-bold">{player?.name}</p>
                  <p className="text-neon-pink text-sm font-display">{a.title}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 pt-4 space-y-2">
          {leaderboard.slice(0, 5).map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span>
                #{p.rank} {p.name}
              </span>
              <span className="text-neon-cyan">{p.score} pts</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          {isHost && (
            <Button onClick={onReturnLobby} className="w-full">
              Play Again (Lobby)
            </Button>
          )}
          <Button variant="secondary" onClick={onLeave} className="w-full">
            Leave Room
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
