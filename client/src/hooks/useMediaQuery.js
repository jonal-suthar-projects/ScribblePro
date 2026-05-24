import { useState, useEffect } from 'react';

/**
 * Match Tailwind breakpoints — returns true when viewport is below `lg` (1024px)
 */
export function useIsMobile(breakpoint = 1024) {
  const query = `(max-width: ${breakpoint - 1}px)`;
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    setMatches(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
