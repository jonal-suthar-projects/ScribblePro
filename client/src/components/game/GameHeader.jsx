import { Timer } from '../ui/Timer.jsx';
import { useGame } from '../../context/GameContext.jsx';

export function GameHeader({ compact = false }) {
  const { room, timer, turnInfo, currentWord, isDrawer } = useGame();

  const wordDisplay = isDrawer ? currentWord : room?.wordDisplay;

  if (compact) {
    return (
      <div className="glass rounded-xl px-3 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              R{room?.currentRound}/{room?.totalRounds}
              {turnInfo && (
                <>
                  {' · '}
                  <span className="text-neon-cyan">{turnInfo.drawerName}</span> draws
                </>
              )}
            </p>
          </div>
          <div className="shrink-0 scale-75 origin-right">
            <Timer remaining={timer.remaining} total={timer.total} type={timer.type} />
          </div>
        </div>
        {wordDisplay && (
          <div className="font-display text-base tracking-[0.15em] text-center break-all leading-relaxed">
            {typeof wordDisplay === 'string'
              ? wordDisplay.split('').map((c, i) => (
                  <span key={i} className={c === '_' ? 'text-slate-600' : 'text-neon-cyan'}>
                    {c}
                  </span>
                ))
              : null}
          </div>
        )}
        {room?.phase === 'drawing' && (
          <p className="text-[10px] text-slate-500 text-center">
            {room.guessedCount}/{room.totalGuessers} guessed
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-3 md:p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex-1 min-w-[120px]">
        <p className="text-xs uppercase tracking-widest text-slate-500">
          Round {room?.currentRound}/{room?.totalRounds}
        </p>
        {turnInfo && (
          <p className="font-display text-sm md:text-base">
            <span className="text-neon-cyan">{turnInfo.drawerName}</span> is drawing
          </p>
        )}
      </div>

      <div className="flex-1 text-center min-w-0">
        {wordDisplay && (
          <div className="font-display text-base sm:text-lg md:text-2xl tracking-[0.2em] md:tracking-[0.3em] text-white break-all">
            {typeof wordDisplay === 'string'
              ? wordDisplay.split('').map((c, i) => (
                  <span key={i} className={c === '_' ? 'text-slate-600' : 'text-neon-cyan'}>
                    {c}
                  </span>
                ))
              : null}
          </div>
        )}
        {room?.phase === 'drawing' && (
          <p className="text-xs text-slate-500 mt-1">
            {room.guessedCount}/{room.totalGuessers} guessed
          </p>
        )}
      </div>

      <Timer remaining={timer.remaining} total={timer.total} type={timer.type} />
    </div>
  );
}
