export function FriendVoteSettings({ settings, onChange, disabled }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <label className="text-slate-400 text-xs uppercase">Rounds</label>
        <input
          type="range"
          min="3"
          max="10"
          value={settings.rounds}
          disabled={disabled}
          onChange={(e) => onChange({ rounds: Number(e.target.value) })}
          className="w-full accent-neon-pink"
        />
        <span className="text-neon-pink">{settings.rounds}</span>
      </div>
      <div>
        <label className="text-slate-400 text-xs uppercase">Answer Time (sec)</label>
        <input
          type="range"
          min="30"
          max="90"
          step="5"
          value={settings.answerTime}
          disabled={disabled}
          onChange={(e) => onChange({ answerTime: Number(e.target.value) })}
          className="w-full accent-neon-pink"
        />
        <span className="text-neon-pink">{settings.answerTime}s</span>
      </div>
      <div>
        <label className="text-slate-400 text-xs uppercase">Vote Time (sec)</label>
        <input
          type="range"
          min="20"
          max="60"
          step="5"
          value={settings.voteTime}
          disabled={disabled}
          onChange={(e) => onChange({ voteTime: Number(e.target.value) })}
          className="w-full accent-neon-pink"
        />
        <span className="text-neon-pink">{settings.voteTime}s</span>
      </div>
      <p className="text-xs text-slate-500 pt-1">
        Friend Vote needs 3–10 players in a private room.
      </p>
    </div>
  );
}
