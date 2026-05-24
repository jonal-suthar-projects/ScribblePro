import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext.jsx';

export function Navbar({ compact = false }) {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <nav
      className={`flex items-center justify-between shrink-0 safe-top
        ${compact ? 'px-3 py-2' : 'px-4 md:px-8 py-4'}`}
    >
      <Link to="/">
        <motion.h1
          className={`font-display font-black neon-text ${
            compact ? 'text-lg' : 'text-2xl md:text-3xl'
          }`}
          whileHover={{ scale: 1.02 }}
        >
          ScribblePro
        </motion.h1>
      </Link>
      <button
        type="button"
        onClick={toggleTheme}
        className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors touch-manipulation"
        title="Toggle theme"
        aria-label="Toggle theme"
      >
        {darkMode ? '🌙' : '☀️'}
      </button>
    </nav>
  );
}
