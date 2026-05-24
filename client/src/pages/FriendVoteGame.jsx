import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Navbar } from '../components/layout/Navbar.jsx';
import { PlayerList } from '../components/game/PlayerList.jsx';
import { Leaderboard } from '../components/game/Leaderboard.jsx';
import { FriendVoteHeader } from '../components/friendVote/FriendVoteHeader.jsx';
import { RoundPrompt } from '../components/friendVote/RoundPrompt.jsx';
import { AnswerForm } from '../components/friendVote/AnswerForm.jsx';
import { VotingBoard } from '../components/friendVote/VotingBoard.jsx';
import { ResultReveal } from '../components/friendVote/ResultReveal.jsx';
import { AwardsScreen } from '../components/friendVote/AwardsScreen.jsx';
import { FloatingReactions } from '../components/friendVote/FloatingReactions.jsx';
import { useGame } from '../context/GameContext.jsx';
import { useSound } from '../hooks/useSound.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';
import { getStoredName, getStoredAvatar } from '../utils/helpers.js';
import { FV_PHASES } from '../utils/constants.js';
import { isFriendVoteRoom, isFriendVoteTimerType } from '../utils/gameType.js';

const SCRIBBLE_PHASES = ['word-select', 'drawing', 'round-end'];

const PROMPT_PHASES = [
  FV_PHASES.QUESTION_REVEAL,
  FV_PHASES.ANSWER_SUBMISSION,
  FV_PHASES.VOTING_PHASE,
  FV_PHASES.RESULT_REVEAL,
];

export function FriendVoteGame() {
  const { code } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    room,
    roomCode,
    playerId,
    joinRoom,
    timer,
    reactions,
    fvResults,
    fvLeaderboard,
    fvRoundInfo,
    gameEnd,
    submitFvAnswer,
    castFvVote,
    sendFvReaction,
    returnFvToLobby,
    leaveRoom,
  } = useGame();

  const { playTick, playReveal, playVote, playStart } = useSound();
  const [voteError, setVoteError] = useState('');
  const [showAwards, setShowAwards] = useState(false);

  const activeCode = roomCode || code;
  const phase = room?.phase;
  const isHost = room?.hostId === playerId;
  const wrongEnginePhase = SCRIBBLE_PHASES.includes(phase);

  useEffect(() => {
    if (!room && code) {
      const name = getStoredName();
      if (!name) {
        navigate(`/?join=${code}`);
        return;
      }
      joinRoom(code, name, getStoredAvatar()).catch(() => navigate('/'));
    }
  }, [room, code, joinRoom, navigate]);

  useEffect(() => {
    if (room && !isFriendVoteRoom(room)) {
      navigate(`/game/${activeCode}`, { replace: true });
    }
  }, [room, activeCode, navigate]);

  useEffect(() => {
    if (phase === FV_PHASES.LOBBY || phase === 'lobby') {
      navigate(`/lobby/${activeCode}`);
    }
  }, [phase, activeCode, navigate]);

  useEffect(() => {
    if (gameEnd?.gameType === 'friendVote' || room?.phase === FV_PHASES.GAME_END) {
      setShowAwards(true);
    }
  }, [gameEnd, room?.phase]);

  useEffect(() => {
    if (phase === FV_PHASES.QUESTION_REVEAL) playStart();
  }, [phase, fvRoundInfo?.round, playStart]);

  useEffect(() => {
    if (fvResults) playReveal();
  }, [fvResults, playReveal]);

  useEffect(() => {
    if (!isFriendVoteTimerType(timer.type)) return;
    if (timer.remaining <= 5 && timer.remaining > 0) playTick();
  }, [timer.remaining, timer.type, playTick]);

  const handleVote = async (answerId) => {
    setVoteError('');
    try {
      const res = await castFvVote(answerId);
      if (!res?.success) setVoteError(res?.error || 'Could not vote');
      else playVote();
    } catch (err) {
      setVoteError(err.message || 'Vote failed');
    }
  };

  const handleReturnLobby = async () => {
    try {
      await returnFvToLobby();
      setShowAwards(false);
      navigate(`/lobby/${activeCode}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLeave = () => {
    leaveRoom();
    navigate('/');
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-neon-pink/30 border-t-neon-pink rounded-full animate-spin" />
      </div>
    );
  }

  const submissionProgress =
    room.fvRequiredAnswers > 0
      ? `${room.fvSubmittedCount || 0}/${room.fvRequiredAnswers} answers in`
      : null;

  const showRoundPrompt = PROMPT_PHASES.includes(phase);

  return (
    <div className={`flex flex-col ${isMobile ? 'mobile-game-shell' : 'min-h-screen'}`}>
      <Navbar compact={isMobile} />
      <FloatingReactions reactions={reactions} />

      {showAwards && gameEnd && (
        <AwardsScreen
          gameEnd={gameEnd}
          isHost={isHost}
          onReturnLobby={handleReturnLobby}
          onLeave={handleLeave}
        />
      )}

      <main
        className={`flex-1 flex flex-col min-h-0 w-full max-w-5xl mx-auto
          ${isMobile ? 'px-2 pt-1 pb-2 gap-2' : 'p-3 md:p-6 gap-4 overflow-y-auto'}`}
      >
        <FriendVoteHeader room={room} timer={timer} fvRoundInfo={fvRoundInfo} compact={isMobile} />

        {wrongEnginePhase && (
          <div className="glass-card text-center py-8 space-y-3 border border-amber-500/40">
            <p className="text-amber-400 font-display">Syncing game mode…</p>
            <p className="text-slate-400 text-sm">
              The server sent Scribble data for a Friend Vote room. Return to the lobby and tap Start
              again. If it persists, restart the server and create a new Friend Vote room.
            </p>
            <button
              type="button"
              onClick={() => navigate(`/lobby/${activeCode}`)}
              className="btn-secondary text-sm"
            >
              Back to Lobby
            </button>
          </div>
        )}

        {!wrongEnginePhase && (
          <div className={`flex-1 min-h-0 flex flex-col gap-3 ${isMobile ? 'overflow-y-auto' : ''}`}>
            {showRoundPrompt && (
              <RoundPrompt
                room={room}
                fvRoundInfo={fvRoundInfo}
                featured={phase === FV_PHASES.QUESTION_REVEAL}
              />
            )}

            <AnimatePresence mode="wait">
            {phase === FV_PHASES.ANSWER_SUBMISSION && (
              <motion.div key="answer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {submissionProgress && (
                  <p className="text-center text-xs text-slate-500 mb-2">{submissionProgress}</p>
                )}
                <AnswerForm
                  onSubmit={submitFvAnswer}
                  submitted={room.fvHasSubmitted}
                  isTarget={room.fvIsTarget}
                />
              </motion.div>
            )}

            {phase === FV_PHASES.VOTING_PHASE && (
              <motion.div key="vote" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-center text-sm text-slate-400 mb-3">
                  Vote for the funniest answer — not your own!
                </p>
                <VotingBoard
                  answers={room.fvAnswers || []}
                  onVote={handleVote}
                  hasVoted={room.fvHasVoted}
                  myVoteAnswerId={room.fvMyVoteAnswerId}
                  voteError={voteError}
                  onReaction={sendFvReaction}
                />
              </motion.div>
            )}

            {phase === FV_PHASES.RESULT_REVEAL && (
              <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <ResultReveal fvResults={fvResults} room={room} />
              </motion.div>
            )}

            {phase === FV_PHASES.LEADERBOARD && fvLeaderboard && (
              <motion.div key="lb" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Leaderboard
                  players={fvLeaderboard.leaderboard}
                  title={`After Round ${fvLeaderboard.round}`}
                />
                <p className="text-center text-slate-500 text-sm mt-4 animate-pulse">
                  Next round incoming...
                </p>
              </motion.div>
            )}

            {!Object.values(FV_PHASES).includes(phase) && phase !== 'lobby' && (
              <motion.div key="waiting" className="glass-card text-center py-10">
                <div className="w-10 h-10 border-2 border-neon-pink/30 border-t-neon-pink rounded-full animate-spin mx-auto" />
                <p className="text-slate-400 text-sm mt-4">Starting round...</p>
              </motion.div>
            )}
            </AnimatePresence>

            <div className={`glass-card shrink-0 ${isMobile ? 'max-h-[28vh] overflow-y-auto' : ''}`}>
              <PlayerList />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
