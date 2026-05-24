import { AnimatePresence, motion } from 'framer-motion';

export function FloatingReactions({ reactions }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <AnimatePresence>
        {reactions.map((r) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 1, y: 0, x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth * 0.8 : 300) }}
            animate={{ opacity: 0, y: -200 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute bottom-24 text-4xl"
            style={{ left: `${10 + Math.random() * 80}%` }}
          >
            {r.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
