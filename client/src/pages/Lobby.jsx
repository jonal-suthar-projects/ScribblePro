import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Navbar } from '../components/layout/Navbar.jsx';
import { useIsMobile } from '../hooks/useMediaQuery.js';
import { Button } from '../components/ui/Button.jsx';
import { PlayerList } from '../components/game/PlayerList.jsx';
import { RoomSettings } from '../components/lobby/RoomSettings.jsx';
import { FriendVoteSettings } from '../components/lobby/FriendVoteSettings.jsx';
import { gamePathForRoom, isFriendVoteRoom } from '../utils/gameType.js';
import { useGame } from '../context/GameContext.jsx';
import {
  copyToClipboard,
  getShareLink,
  getStoredName,
  getStoredAvatar,
  getSession,
} from '../utils/helpers.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import { getSocket } from '../socket/socket.js';

export function Lobby() {
  const { code } = useParams();
  const navigate = useNavigate();
  const {
    room,
    roomCode,
    playerId,
    setReady,
    startGame,
    updateSettings,
    kickPlayer,
    loading,
    error,
    joinRoom,
  } = useGame();
  const [copied, setCopied] = useState(false);
  const [localSettings, setLocalSettings] = useState(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const joinAttempted = useRef(false);
  const isMobile = useIsMobile();

  const isHost = room?.hostId === playerId;
  const me = room?.players?.find((p) => p.id === playerId);
  const activeCode = roomCode || code;
  const isFriendVote = isFriendVoteRoom(room);
  const minPlayers = isFriendVote ? room?.settings?.minPlayers || 3 : 2;
  const roomRef = useRef(room);
  roomRef.current = room;

  // Auto-join if landed here without room state (share link / refresh)
  useEffect(() => {
    if (room || !code || joinAttempted.current) return;

    const name = getStoredName()?.trim();
    if (!name) {
      navigate(`/?join=${code}`);
      return;
    }

    joinAttempted.current = true;
    setJoining(true);
    setJoinError('');

    const session = getSession();
    const forceFresh = new URLSearchParams(window.location.search).get('fresh') === '1';
    const isReconnect =
      !forceFresh &&
      session?.roomCode === code?.toUpperCase() &&
      Boolean(session?.sessionToken);

    joinRoom(code, name, getStoredAvatar(), false, { reconnect: isReconnect })
      .catch((err) => {
        joinAttempted.current = false;
        setJoinError(err.message || 'Could not join room');
      })
      .finally(() => setJoining(false));
  }, [room, code, joinRoom, navigate]);

  const activePlayers =
    room?.players?.filter((p) => !p.disconnected && !p.isSpectator) ?? [];
  const allActiveReady =
    activePlayers.length > 0 && activePlayers.every((p) => p.isReady);
  const canStart =
    isHost && allActiveReady && activePlayers.length >= minPlayers;
  const startDisabledReason = !isHost
    ? null
    : activePlayers.length < minPlayers
      ? isFriendVote
        ? `Need at least ${minPlayers} players (${activePlayers.length}/${minPlayers})`
        : `Need at least ${minPlayers} players`
      : !allActiveReady
        ? 'Waiting for all players to ready up'
        : null;

  useEffect(() => {
    if (room?.settings) {
      setLocalSettings(room.settings);
    }
  }, [room?.settings]);

  // Navigate to game when phase changes
  useEffect(() => {
    if (room?.phase && room.phase !== 'lobby') {
      navigate(gamePathForRoom(room, activeCode));
    }
  }, [room, room?.phase, activeCode, navigate]);

  useEffect(() => {
    const socket = getSocket();
    const onGameStart = (data) => {
      const currentRoom = roomRef.current;
      const path =
        data?.gameType === 'friendVote' || isFriendVoteRoom(currentRoom)
          ? `/friend-vote/${activeCode}`
          : `/game/${activeCode}`;
      navigate(path);
    };
    socket.on(SOCKET_EVENTS.GAME_STARTED, onGameStart);
    return () => socket.off(SOCKET_EVENTS.GAME_STARTED, onGameStart);
  }, [activeCode, navigate]);

  const handleCopy = async () => {
    await copyToClipboard(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const link = getShareLink(activeCode, room?.gameType || room?.settings?.gameType);
    await copyToClipboard(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSettingsChange = (partial) => {
    const next = { ...localSettings, ...partial };
    setLocalSettings(next);
    updateSettings(next);
  };

  const handleStart = async () => {
    try {
      await startGame();
    } catch (err) {
      console.error(err);
    }
  };

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-4">
        <div className="w-10 h-10 border-2 border-neon-cyan/30 border-t-neon-cyan rounded-full animate-spin" />
        <p className="text-slate-400 text-sm">{joining ? 'Joining room...' : 'Loading...'}</p>
        {joinError && (
          <>
            <p className="text-red-400 text-sm text-center max-w-sm">{joinError}</p>
            <Button variant="secondary" onClick={() => navigate(`/?join=${code}`)}>
              Enter name & join
            </Button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar compact={isMobile} />
      <main
        className={`flex-1 max-w-5xl mx-auto w-full
          ${isMobile ? 'px-2 pt-1 pb-24 overflow-y-auto' : 'p-4 md:p-8'}`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={isMobile ? 'space-y-3' : 'space-y-6'}
        >
          <div className={`glass-card text-center ${isMobile ? 'py-3 px-2' : ''}`}>
            <p className={`uppercase tracking-widest text-slate-500 mb-1 ${isMobile ? 'text-[10px]' : 'text-xs mb-2'}`}>
              Room Code
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <span
                className={`font-display neon-text break-all tracking-[0.15em]
                  ${isMobile ? 'text-2xl' : 'text-3xl sm:text-4xl md:text-5xl sm:tracking-[0.4em]'}`}
              >
                {activeCode}
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-center">
                <Button
                  variant="secondary"
                  onClick={handleCopy}
                  className="text-sm py-3 px-4 flex-1 sm:flex-none min-h-[48px]"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleShare}
                  className="text-sm py-3 px-4 flex-1 sm:flex-none min-h-[48px]"
                >
                  Share
                </Button>
              </div>
            </div>
            <p className="text-slate-500 text-sm mt-3">
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-display uppercase mb-2 ${
                  isFriendVote
                    ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/40'
                    : 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
                }`}
              >
                {isFriendVote ? '🗳️ Friend Vote' : '🎨 Scribble'}
              </span>
              <span className="block">
                {room.players?.length || 0} / {room.settings?.maxPlayers || 10} players
              </span>
              {isFriendVote && (
                <span className="block text-neon-pink/80 text-xs mt-1">
                  Need {minPlayers}+ players ready
                </span>
              )}
            </p>
          </div>

          {(error || joinError) && (
            <p className="text-red-400 text-center bg-red-500/10 rounded-lg py-2">
              {error || joinError}
            </p>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <PlayerList onKick={isHost ? kickPlayer : undefined} />
              {!isMobile && (
                <>
                  <div className="flex gap-3">
                    <Button
                      className="flex-1 min-h-[48px]"
                      variant={me?.isReady ? 'secondary' : 'primary'}
                      onClick={() => setReady(!me?.isReady)}
                    >
                      {me?.isReady ? 'Not Ready' : 'Ready Up'}
                    </Button>
                    {isHost && (
                      <Button
                        className="flex-1 min-h-[48px]"
                        onClick={handleStart}
                        loading={loading}
                        disabled={!canStart}
                      >
                        Start Game
                      </Button>
                    )}
                  </div>
                  {isHost && startDisabledReason && (
                    <p className="text-xs text-amber-400/90 text-center">{startDisabledReason}</p>
                  )}
                  {!isHost && (
                    <p className="text-xs text-slate-500 text-center">Waiting for host to start...</p>
                  )}
                </>
              )}
            </div>

            <div className="glass-card">
              <h3 className="font-display text-sm uppercase tracking-widest text-slate-400 mb-4">
                Room Settings {isHost ? '' : '(Host only)'}
              </h3>
              {localSettings &&
                (isFriendVote ? (
                  <FriendVoteSettings
                    settings={localSettings}
                    onChange={handleSettingsChange}
                    disabled={!isHost}
                  />
                ) : (
                  <RoomSettings
                    settings={localSettings}
                    onChange={handleSettingsChange}
                    disabled={!isHost}
                  />
                ))}
            </div>
          </div>
        </motion.div>
      </main>

      {isMobile && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 p-3 pt-2
                     bg-slate-900/95 backdrop-blur-xl border-t border-white/10
                     mobile-tab-bar space-y-2"
        >
          <div className="flex gap-2">
            <Button
              className="flex-1 min-h-[52px]"
              variant={me?.isReady ? 'secondary' : 'primary'}
              onClick={() => setReady(!me?.isReady)}
            >
              {me?.isReady ? 'Not Ready' : 'Ready Up'}
            </Button>
            {isHost && (
              <Button
                className="flex-1 min-h-[52px]"
                onClick={handleStart}
                loading={loading}
                disabled={!canStart}
              >
                Start
              </Button>
            )}
          </div>
          {isHost && startDisabledReason && (
            <p className="text-[10px] text-amber-400/90 text-center">{startDisabledReason}</p>
          )}
          {!isHost && (
            <p className="text-[10px] text-slate-500 text-center">Waiting for host...</p>
          )}
        </div>
      )}
    </div>
  );
}
