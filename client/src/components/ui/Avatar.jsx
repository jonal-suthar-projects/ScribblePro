import { motion } from 'framer-motion';

export function Avatar({ name, color, size = 'md', isHost, disconnected }) {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };
  const initial = (name || '?')[0].toUpperCase();
  return (
    <motion.div
      className={`relative ${sizes[size]} rounded-full flex items-center justify-center font-bold text-slate-900 shrink-0`}
      style={{ backgroundColor: color }}
      whileHover={{ scale: 1.05 }}
      title={name}
    >
      {initial}
      {isHost && (
        <span className="absolute -top-1 -right-1 text-xs" title="Host">
          👑
        </span>
      )}
      {disconnected && (
        <span className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center text-white text-[10px]">
          DC
        </span>
      )}
    </motion.div>
  );
}
