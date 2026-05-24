import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar.jsx';

export function QuestionReveal({ room, fvRoundInfo }) {
  const target = room?.players?.find((p) => p.id === (fvRoundInfo?.targetId || room.fvTargetId));
  const prompt = fvRoundInfo?.prompt || room?.fvPrompt;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="glass-card text-center space-y-6 py-10 px-6"
    >
      <motion.p
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="text-xs uppercase tracking-[0.3em] text-neon-pink"
      >
        This round&apos;s target
      </motion.p>
      {target && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <Avatar name={target.name} color={target.avatarColor} size="lg" />
          <p className="font-display text-3xl mt-3 neon-text">{target.name}</p>
        </motion.div>
      )}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="border-t border-white/10 pt-6"
      >
        <p className="text-lg md:text-xl text-slate-200 leading-relaxed">{prompt}</p>
      </motion.div>
    </motion.div>
  );
}
