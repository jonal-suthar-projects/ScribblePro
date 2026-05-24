import { motion } from 'framer-motion';

const DEFAULT_TABS = [
  { id: 'play', label: 'Play', icon: '🎨' },
  { id: 'scores', label: 'Scores', icon: '🏆' },
];

export function MobileGameTabs({ active, onChange, chatBadge, tabs = DEFAULT_TABS }) {
  return (
    <nav
      className="mobile-tab-bar lg:hidden fixed bottom-0 left-0 right-0 z-40
                 bg-slate-900/95 backdrop-blur-xl border-t border-white/10
                 flex items-stretch justify-around"
      role="tablist"
      aria-label="Game sections"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5
                        py-2 min-h-[52px] touch-manipulation transition-colors
                        ${isActive ? 'text-neon-cyan' : 'text-slate-500'}`}
          >
            {isActive && (
              <motion.div
                layoutId="mobile-tab-indicator"
                className="absolute top-0 left-1/4 right-1/4 h-0.5 bg-neon-cyan rounded-full"
              />
            )}
            <span className="text-xl leading-none" aria-hidden>
              {tab.icon}
            </span>
            <span className="text-[10px] font-display uppercase tracking-wider">
              {tab.label}
            </span>
            {tab.id === 'play' && chatBadge > 0 && (
              <span className="absolute top-1.5 right-[calc(50%-20px)] w-2 h-2 rounded-full bg-neon-pink" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
