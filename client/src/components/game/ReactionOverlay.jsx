import { motion, AnimatePresence } from 'framer-motion';

export function ReactionOverlay({ reactions }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <AnimatePresence>
        {reactions.slice(-5).map((r) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 1, y: 0, x: Math.random() * window.innerWidth * 0.6 }}
            animate={{ opacity: 0, y: -200 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute bottom-20 text-4xl"
            style={{ left: `${20 + Math.random() * 60}%` }}
          >
            {r.emoji}
            <span className="text-xs block text-white/50">{r.playerName}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
