import { motion } from 'framer-motion';
import { FV_EMOJI_REACTIONS } from '../../utils/constants.js';

export function VotingBoard({
  answers,
  onVote,
  hasVoted,
  myVoteAnswerId,
  voteError,
  onReaction,
}) {
  const maxVotes = Math.max(1, ...answers.map((a) => a.votes || 0));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {FV_EMOJI_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onReaction?.(emoji)}
            className="text-2xl p-2 rounded-lg bg-white/5 hover:bg-white/10 hover:scale-110 transition-transform"
          >
            {emoji}
          </button>
        ))}
      </div>

      {voteError && (
        <p className="text-red-400 text-center text-sm bg-red-500/10 rounded-lg py-2">{voteError}</p>
      )}

      {hasVoted && (
        <p className="text-center text-neon-cyan text-sm">Vote locked! Watch the chaos unfold.</p>
      )}

      <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 md:items-start">
        {answers.map((answer, i) => {
          const isSelected = myVoteAnswerId === answer.id;
          const isOwn = answer.isOwn;
          const pct = maxVotes > 0 ? ((answer.votes || 0) / maxVotes) * 100 : 0;

          return (
            <motion.button
              key={answer.id}
              type="button"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              disabled={hasVoted || isOwn}
              onClick={() => onVote(answer.id)}
              className={`relative w-full text-left rounded-xl border-2 p-3 sm:p-4 overflow-hidden transition-all touch-manipulation
                ${isSelected ? 'border-neon-cyan bg-neon-cyan/10' : 'border-white/10 bg-white/5'}
                ${isOwn ? 'opacity-50 cursor-not-allowed' : hasVoted ? 'cursor-default' : 'hover:border-neon-pink/50 hover:bg-white/10'}
              `}
            >
              <div
                className="absolute inset-y-0 left-0 bg-neon-pink/20 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex justify-between items-start gap-2">
                <p className="text-slate-100 font-medium">{answer.text}</p>
                <span className="text-neon-pink font-display text-sm shrink-0">
                  {answer.votes || 0} 🗳️
                </span>
              </div>
              {isOwn && (
                <p className="relative text-[10px] text-slate-500 mt-1">Your answer — can&apos;t vote</p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
