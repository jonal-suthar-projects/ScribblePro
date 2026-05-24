import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar.jsx';

export function Leaderboard({ players, title = 'Leaderboard', highlightWinner }) {
  return (
    <div className="glass-card space-y-3">
      <h3 className="font-display text-lg neon-text text-center">{title}</h3>
      {players.map((p, i) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className={`flex items-center gap-3 p-3 rounded-xl ${
            highlightWinner && i === 0
              ? 'bg-gradient-to-r from-neon-cyan/20 to-neon-pink/20 border border-neon-cyan/50'
              : 'bg-white/5'
          }`}
        >
          <span
            className={`font-display text-lg w-8 ${
              i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'
            }`}
          >
            #{p.rank || i + 1}
          </span>
          <Avatar name={p.name} color={p.avatarColor} />
          <span className="flex-1 font-medium">{p.name}</span>
          <span className="font-display text-xl text-neon-cyan">{p.score}</span>
        </motion.div>
      ))}
    </div>
  );
}
