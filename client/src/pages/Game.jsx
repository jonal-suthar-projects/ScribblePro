import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar.jsx';
import { GameHeader } from '../components/game/GameHeader.jsx';
import { DrawingCanvas } from '../components/game/DrawingCanvas.jsx';
import { ChatPanel } from '../components/game/ChatPanel.jsx';
import { PlayerList } from '../components/game/PlayerList.jsx';
import { WordSelect } from '../components/game/WordSelect.jsx';
import { Leaderboard } from '../components/game/Leaderboard.jsx';
import { WinnerCelebration } from '../components/game/WinnerCelebration.jsx';
import { ReactionOverlay } from '../components/game/ReactionOverlay.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Button } from '../components/ui/Button.jsx';
import { useGame } from '../context/GameContext.jsx';
import { useSound } from '../hooks/useSound.js';
import { useIsMobile } from '../hooks/useMediaQuery.js';
import { getStoredName, getStoredAvatar } from '../utils/helpers.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import { gamePathForRoom, isFriendVoteRoom, isScribbleTimerType } from '../utils/gameType.js';
import { getSocket } from '../socket/socket.js';

export function Game() {
  const { code } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    room,
    roomCode,
    joinRoom,
    wordChoices,
    selectWord,
    roundEnd,
    gameEnd,
    reactions,
    timer,
    leaveRoom,
    isDrawer,
    hasGuessed,
  } = useGame();
  const { playCorrect, playTick } = useSound();
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [showWinner, setShowWinner] = useState(false);

  const activeCode = roomCode || code;

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
    if (isFriendVoteRoom(room)) {
      navigate(gamePathForRoom(room, activeCode), { replace: true });
      return;
    }
    if (room?.phase === 'lobby') {
      navigate(`/lobby/${activeCode}`);
    }
  }, [room, room?.phase, activeCode, navigate]);

  useEffect(() => {
    if (roundEnd) setShowRoundModal(true);
  }, [roundEnd]);

  useEffect(() => {
    if (gameEnd && gameEnd.gameType !== 'friendVote') setShowWinner(true);
  }, [gameEnd]);

  useEffect(() => {
    const socket = getSocket();
    const onCorrect = () => playCorrect();
    socket.on(SOCKET_EVENTS.CORRECT_GUESS, onCorrect);
    return () => socket.off(SOCKET_EVENTS.CORRECT_GUESS, onCorrect);
  }, [playCorrect]);

  useEffect(() => {
    if (!isScribbleTimerType(timer.type)) return;
    if (timer.remaining <= 5 && timer.remaining > 0) playTick();
  }, [timer.remaining, timer.type, playTick]);

  const handleWinnerClose = () => {
    setShowWinner(false);
    leaveRoom();
    navigate('/');
  };

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
      </div>
    );
  }

  const canvasBlock = (
    <div className="relative flex-1 min-h-0 flex flex-col">
      <DrawingCanvas compact={isMobile} fillHeight={isMobile} />
      {isDrawer &&
        !isFriendVoteRoom(room) &&
        wordChoices?.length > 0 &&
        room?.phase === 'word-select' && (
          <WordSelect
            words={wordChoices}
            onSelect={selectWord}
            timeLimit={room.settings?.wordSelectTime || 15}
          />
        )}
    </div>
  );

  return (
    <div
      className={`flex flex-col overflow-hidden ${
        isMobile ? 'mobile-game-shell' : 'min-h-screen max-h-screen h-screen'
      }`}
    >
      <Navbar compact={isMobile} />
      <ReactionOverlay reactions={reactions} />

      {showWinner && gameEnd && (
        <WinnerCelebration winner={gameEnd.winner} onClose={handleWinnerClose} />
      )}

      <main
        className={`flex-1 flex flex-col min-h-0 w-full max-w-7xl mx-auto overflow-hidden
          ${isMobile ? 'px-1 pt-0.5 gap-1' : 'p-2 md:p-3 gap-2'}`}
      >
        <div className="shrink-0">
          <GameHeader compact={isMobile} />
        </div>

        {isMobile ? (
          /* skribbl.io-style mobile: canvas + player rail, chat always at bottom (drawer + guessers) */
          <div className="flex-1 min-h-0 flex flex-col gap-1 overflow-hidden">
            <div className="flex-1 min-h-0 flex flex-row gap-1 overflow-hidden">
              <div className="flex-1 min-w-0 min-h-0 flex flex-col">{canvasBlock}</div>
              <aside className="w-[52px] shrink-0 min-h-0 overflow-hidden">
                <PlayerList sidebar />
              </aside>
            </div>
            <div className="shrink-0 h-[min(34dvh,200px)] min-h-[112px] max-h-[200px]">
              <ChatPanel fullHeight mobile />
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_280px_200px] gap-3 overflow-hidden">
            <div className="min-h-0 overflow-hidden flex flex-col">{canvasBlock}</div>
            <div className="min-h-0 overflow-hidden">
              <ChatPanel fullHeight />
            </div>
            <div className="hidden lg:block min-h-0 overflow-y-auto">
              <PlayerList />
            </div>
          </div>
        )}
      </main>

      <Modal open={showRoundModal} onClose={() => setShowRoundModal(false)} title="Round Over">
        {roundEnd?.leaderboard && (
          <div className="space-y-4">
            <Leaderboard players={roundEnd.leaderboard} title={`Round ${roundEnd.round}`} />
            {roundEnd.word && (
              <p className="text-center text-slate-400">
                The word was: <span className="text-neon-cyan font-bold">{roundEnd.word}</span>
              </p>
            )}
            <Button className="w-full" onClick={() => setShowRoundModal(false)}>
              Continue
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
