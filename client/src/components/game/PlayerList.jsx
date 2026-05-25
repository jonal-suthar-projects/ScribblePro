import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar.jsx';
import { useGame } from '../../context/GameContext.jsx';

/** skribbl-style narrow vertical player rail (mobile) */
export function PlayerList({ onKick, compact = false, sidebar = false }) {
  const { room, playerId } = useGame();
  if (!room) return null;

  const isHost = room.hostId === playerId;
  const players = [...(room.players || [])].sort((a, b) => b.score - a.score);

  if (sidebar) {
    return (
      <div className="flex flex-col h-full min-h-0 w-full bg-slate-900/40 rounded-lg border border-white/10 py-1">
        {players.map((p, i) => (
          <div
            key={p.id}
            title={p.name}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-0.5 border-b border-white/5 last:border-0
              ${p.id === playerId ? 'bg-neon-cyan/10' : ''}`}
          >
            <span className="text-[8px] text-slate-500 font-mono leading-none">{i + 1}</span>
            <Avatar
              name={p.name}
              color={p.avatarColor}
              size="sm"
              isHost={p.isHost}
              disconnected={p.disconnected}
            />
            <span className="text-[9px] font-display text-neon-cyan leading-none tabular-nums">
              {p.score}
            </span>
            {room.phase === 'lobby' && p.isReady && (
              <span className="text-[7px] text-neon-green">✓</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <h3 className="font-display text-[10px] uppercase tracking-widest text-slate-500 mb-2 shrink-0">
          Players · {players.length}
        </h3>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 overscroll-contain">
          {players.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg
                ${p.id === playerId ? 'bg-neon-cyan/10 ring-1 ring-neon-cyan/30' : 'bg-white/5'}`}
            >
              <span className="text-[10px] text-slate-500 w-3 tabular-nums">{i + 1}</span>
              <Avatar
                name={p.name}
                color={p.avatarColor}
                size="sm"
                isHost={p.isHost}
                disconnected={p.disconnected}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{p.name}</p>
                {p.isReady && room.phase === 'lobby' && (
                  <span className="text-[9px] text-neon-green">Ready</span>
                )}
              </div>
              <span className="font-display text-neon-cyan text-xs tabular-nums">{p.score}</span>
              {isHost && !p.isHost && onKick && (
                <button
                  type="button"
                  onClick={() => onKick(p.id)}
                  className="text-[10px] text-red-400 px-1 touch-manipulation"
                  aria-label={`Kick ${p.name}`}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-3 space-y-2 h-full">
      <h3 className="font-display text-xs uppercase tracking-widest text-slate-500 mb-2">
        Players ({players.length})
      </h3>
      {players.map((p, i) => (
        <motion.div
          key={p.id}
          layout
          className="flex items-center gap-2 p-2 rounded-lg bg-white/5"
        >
          <span className="text-xs text-slate-500 w-4">{i + 1}</span>
          <Avatar
            name={p.name}
            color={p.avatarColor}
            size="sm"
            isHost={p.isHost}
            disconnected={p.disconnected}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{p.name}</p>
            {p.isReady && room.phase === 'lobby' && (
              <span className="text-[10px] text-neon-green">Ready</span>
            )}
          </div>
          <span className="font-display text-neon-cyan text-sm">{p.score}</span>
          {isHost && !p.isHost && onKick && (
            <button
              type="button"
              onClick={() => onKick(p.id)}
              className="text-xs text-red-400 hover:text-red-300 px-1"
              title="Kick"
            >
              ✕
            </button>
          )}
        </motion.div>
      ))}
      {room.spectators?.length > 0 && (
        <>
          <h4 className="text-[10px] uppercase text-slate-600 mt-2">Spectators</h4>
          {room.spectators.map((s) => (
            <div key={s.id} className="flex items-center gap-2 opacity-60">
              <Avatar name={s.name} color={s.avatarColor} size="sm" />
              <span className="text-sm">{s.name}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
