import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar.jsx';

/**
 * Round prompt — stays visible for the whole round (reveal, answers, vote, results).
 */
export function RoundPrompt({ room, fvRoundInfo, featured = false }) {
  const target = room?.players?.find(
    (p) => p.id === (fvRoundInfo?.targetId || room?.fvTargetId)
  );
  const prompt = fvRoundInfo?.prompt || room?.fvPrompt;
  if (!prompt) return null;

  if (featured) {
    return (
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card text-center space-y-4 py-8 px-4 sm:px-6"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-neon-pink">This round&apos;s target</p>
        {target && (
          <div>
            <Avatar name={target.name} color={target.avatarColor} size="lg" />
            <p className="font-display text-2xl sm:text-3xl mt-2 neon-text">{target.name}</p>
          </div>
        )}
        <div className="border-t border-white/10 pt-4">
          <p className="text-base sm:text-lg text-slate-200 leading-relaxed">{prompt}</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className="glass-card shrink-0 py-2.5 px-3 sm:px-4 border border-neon-pink/20"
      role="region"
      aria-label="Round question"
    >
      <div className="flex items-start gap-2 sm:gap-3">
        {target && (
          <Avatar name={target.name} color={target.avatarColor} size="sm" />
        )}
        <div className="min-w-0 flex-1">
          {target && (
            <p className="text-[10px] uppercase tracking-widest text-neon-pink mb-0.5 truncate">
              About {target.name}
            </p>
          )}
          <p className="text-sm sm:text-base text-slate-100 leading-snug">{prompt}</p>
        </div>
      </div>
    </div>
  );
}
