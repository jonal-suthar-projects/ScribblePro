import { motion } from 'framer-motion';

export function Button({
  children,
  variant = 'primary',
  className = '',
  loading = false,
  ...props
}) {
  const base = variant === 'primary' ? 'btn-primary' : 'btn-secondary';
  return (
    <motion.button
      whileHover={{ scale: props.disabled ? 1 : 1.02 }}
      whileTap={{ scale: props.disabled ? 1 : 0.98 }}
      className={`${base} touch-manipulation ${className} inline-flex items-center justify-center gap-2`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  );
}
