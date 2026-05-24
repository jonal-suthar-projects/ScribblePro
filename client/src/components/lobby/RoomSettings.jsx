import { useGame } from '../../context/GameContext.jsx';

export function RoomSettings({ settings, onChange, disabled }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="text-slate-400 text-xs uppercase">Rounds</label>
        <input
          type="range"
          min="1"
          max="10"
          value={settings.rounds}
          disabled={disabled}
          onChange={(e) => onChange({ rounds: Number(e.target.value) })}
          className="w-full accent-neon-cyan"
        />
        <span className="text-neon-cyan">{settings.rounds}</span>
      </div>
      <div>
        <label className="text-slate-400 text-xs uppercase">Draw Time (sec)</label>
        <input
          type="range"
          min="30"
          max="180"
          step="10"
          value={settings.drawTime}
          disabled={disabled}
          onChange={(e) => onChange({ drawTime: Number(e.target.value) })}
          className="w-full accent-neon-cyan"
        />
        <span className="text-neon-cyan">{settings.drawTime}s</span>
      </div>
      <div>
        <label className="text-slate-400 text-xs uppercase">Difficulty</label>
        <select
          value={settings.difficulty}
          disabled={disabled}
          onChange={(e) => onChange({ difficulty: e.target.value })}
          className="input-glow w-full mt-1"
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={settings.privateRoom}
          disabled={disabled}
          onChange={(e) => onChange({ privateRoom: e.target.checked })}
          className="accent-neon-cyan"
        />
        <span>Private Room</span>
      </label>
    </div>
  );
}
