import { motion } from 'framer-motion';
import { Button } from '../ui/Button.jsx';

export function WordSelect({ words, onSelect, timeLimit }) {
  if (!words?.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl p-3"
    >
      <div className="glass-card text-center space-y-4 max-w-md w-full">
        <h3 className="font-display text-lg neon-text">Choose a word</h3>
        <p className="text-sm text-slate-400">You have {timeLimit}s to pick</p>
        <div className="flex flex-col gap-2">
          {words.map((word) => (
            <Button key={word} onClick={() => onSelect(word)} className="w-full min-h-[52px] text-lg">
              {word}
            </Button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
