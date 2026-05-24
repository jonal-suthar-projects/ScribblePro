import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar.jsx';

export function ResultReveal({ fvResults, room }) {
  const answers = fvResults?.answers || room?.fvAnswers || [];
  const winner = answers.find((a) => a.isWinner) || answers[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="glass-card text-center py-6 space-y-2">
        <p className="text-xs uppercase tracking-widest text-neon-pink">The people have spoken</p>
        <p className="text-slate-400 text-sm">{fvResults?.prompt || room?.fvPrompt}</p>
      </div>

      {winner && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="glass-card border-2 border-neon-cyan/50 p-6 text-center space-y-4"
        >
          <span className="text-4xl">👑</span>
          <p className="font-display text-2xl text-neon-cyan">{winner.text}</p>
          <div className="flex items-center justify-center gap-2">
            <Avatar name={winner.authorName} color={winner.authorColor} size="sm" />
            <p className="text-slate-300">
              by <span className="font-bold text-white">{winner.authorName}</span>
            </p>
          </div>
          <p className="text-neon-pink font-display">{winner.votes} votes</p>
        </motion.div>
      )}

      <div className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-slate-500 text-center">All answers</p>
        {answers.map((a, i) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass-card flex items-center gap-3 p-3 ${a.isWinner ? 'ring-1 ring-neon-cyan/30' : ''}`}
          >
            <Avatar name={a.authorName} color={a.authorColor} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{a.text}</p>
              <p className="text-xs text-slate-500">{a.authorName}</p>
            </div>
            <span className="font-display text-neon-pink">{a.votes}🗳️</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
