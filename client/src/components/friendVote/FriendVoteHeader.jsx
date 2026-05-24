import { Timer } from '../ui/Timer.jsx';
import { Avatar } from '../ui/Avatar.jsx';

export function FriendVoteHeader({ room, timer, fvRoundInfo, compact = false }) {
  const target = room?.players?.find((p) => p.id === room.fvTargetId);
  const phaseLabel = {
    question_reveal: 'Get Ready',
    answer_submission: 'Write Answers',
    voting_phase: 'Vote!',
    result_reveal: 'Results',
    leaderboard: 'Scores',
    game_end: 'Game Over',
  }[room?.phase] || '';

  return (
    <div
      className={`glass-card shrink-0 flex flex-wrap items-center justify-between gap-2 sm:gap-3
        ${compact ? 'py-2 px-3' : 'py-3 px-4'}`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {target && (
          <Avatar name={target.name} color={target.avatarColor} size={compact ? 'sm' : 'md'} />
        )}
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-neon-pink">{phaseLabel}</p>
          <p className="font-display text-xs sm:text-sm truncate">
            Round {room?.currentRound}/{room?.totalRounds}
            {target && (
              <span className="text-slate-400 font-normal"> · {target.name}</span>
            )}
          </p>
        </div>
      </div>
      <div className="shrink-0 scale-90 sm:scale-100 origin-right">
        <Timer remaining={timer.remaining} total={timer.total} type={timer.type} />
      </div>
    </div>
  );
}
