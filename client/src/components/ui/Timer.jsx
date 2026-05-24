import { motion } from 'framer-motion';
import { formatTime } from '../../utils/helpers.js';

const TIMER_LABELS = {
  'word-select': 'Pick Word',
  draw: 'Drawing',
  'question-reveal': 'Get Ready',
  answer: 'Write Answers',
  vote: 'Vote!',
  leaderboard: 'Scores',
};

export function Timer({ remaining, total, type }) {
  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const urgent = remaining <= 10;
  const circumference = 2 * Math.PI * 36;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="4"
          />
          <motion.circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke={urgent ? '#ff00aa' : '#00f5ff'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
            transition={{ duration: 0.5 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={remaining}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
            className={`font-display text-xl font-bold ${urgent ? 'text-neon-pink' : 'text-neon-cyan'}`}
          >
            {formatTime(remaining)}
          </motion.span>
        </div>
      </div>
      {type && TIMER_LABELS[type] && (
        <span className="text-[10px] uppercase tracking-widest text-slate-500">
          {TIMER_LABELS[type]}
        </span>
      )}
    </div>
  );
}
