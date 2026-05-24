import { motion } from 'framer-motion';
import { Avatar } from '../ui/Avatar.jsx';
import { useGame } from '../../context/GameContext.jsx';

export function PlayerList({ onKick }) {
  const { room, playerId } = useGame();
  if (!room) return null;

  const isHost = room.hostId === playerId;
  const players = [...(room.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="glass rounded-xl p-3 space-y-2">
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
