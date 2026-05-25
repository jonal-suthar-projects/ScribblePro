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
import { MobileGameTabs } from '../components/game/MobileGameTabs.jsx';
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
  const [mobileTab, setMobileTab] = useState('play');

  const activeCode = roomCode || code;
  const mobileTabs = isDrawer
    ? [
        { id: 'draw', label: 'Draw', icon: '✏️' },
        { id: 'scores', label: 'Scores', icon: '🏆' },
      ]
    : [
        { id: 'play', label: 'Play', icon: '🎨' },
        { id: 'scores', label: 'Scores', icon: '🏆' },
      ];

  // Drawer vs guesser use different tab ids on mobile
  useEffect(() => {
    if (!isMobile) return;
    setMobileTab(isDrawer ? 'draw' : 'play');
  }, [isMobile, isDrawer, room?.currentDrawerId]);

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
    const onCorrect = () => {
      playCorrect();
      if (isMobile && !isDrawer) setMobileTab('play');
    };
    socket.on(SOCKET_EVENTS.CORRECT_GUESS, onCorrect);
    return () => socket.off(SOCKET_EVENTS.CORRECT_GUESS, onCorrect);
  }, [playCorrect, isMobile]);

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
    <div className="relative h-full min-h-0">
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
    <div className={`flex flex-col ${isMobile ? 'mobile-game-shell' : 'min-h-screen'}`}>
      <Navbar compact={isMobile} />
      <ReactionOverlay reactions={reactions} />

      {showWinner && gameEnd && (
        <WinnerCelebration winner={gameEnd.winner} onClose={handleWinnerClose} />
      )}

      <main
        className={`flex-1 flex flex-col min-h-0 w-full max-w-7xl mx-auto
          ${isMobile ? 'px-2 pt-1 pb-[calc(56px+env(safe-area-inset-bottom))]' : 'p-2 md:p-4 gap-3'}`}
      >
        <GameHeader compact={isMobile} />

        {isMobile ? (
          <div className="flex-1 min-h-0 mt-1 flex flex-col">
            {mobileTab === 'scores' ? (
              <div className="flex-1 min-h-0 overflow-y-auto glass-card p-2" role="tabpanel">
                <PlayerList />
              </div>
            ) : isDrawer ? (
              <div className="flex-1 min-h-0 flex flex-col" role="tabpanel">
                {canvasBlock}
              </div>
            ) : (
              <div className="flex-1 min-h-0 flex flex-col gap-2" role="tabpanel">
                <div className="flex-1 min-h-[180px] flex flex-col">
                  {canvasBlock}
                </div>
                <div className="flex-1 min-h-[130px] flex flex-col border-t border-white/10 pt-2">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1 px-1">
                    Chat & guesses
                  </p>
                  <ChatPanel fullHeight />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_220px] gap-3 flex-1 min-h-0 mt-3">
            <div className="relative min-h-[400px] lg:min-h-[480px]">{canvasBlock}</div>
            <div className="min-h-[320px] lg:min-h-0">
              <ChatPanel fullHeight />
            </div>
            <div className="hidden lg:block">
              <PlayerList />
            </div>
          </div>
        )}
      </main>

      {isMobile && (
        <MobileGameTabs
          active={mobileTab}
          onChange={setMobileTab}
          tabs={mobileTabs}
          chatBadge={room.phase === 'drawing' && !hasGuessed && !isDrawer ? 1 : 0}
        />
      )}

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
