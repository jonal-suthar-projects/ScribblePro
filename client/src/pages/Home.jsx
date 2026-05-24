import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Navbar } from '../components/layout/Navbar.jsx';
import { useGame } from '../context/GameContext.jsx';
import {
  getStoredName,
  setStoredName,
  getStoredAvatar,
  setStoredAvatar,
  fetchRoomInfo,
} from '../utils/helpers.js';
import { normalizeGameType, gameLabel } from '../utils/gameType.js';
import { AVATAR_COLORS, GAME_TYPES } from '../utils/constants.js';

export function Home() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { createRoom, joinRoom, loading, error } = useGame();
  const [name, setName] = useState(getStoredName());
  const [roomCode, setRoomCode] = useState('');
  const [avatarColor, setAvatarColor] = useState(getStoredAvatar());
  const [mode, setMode] = useState(null);
  const [selectedGame, setSelectedGame] = useState(GAME_TYPES.SCRIBBLE);
  const [joinRoomInfo, setJoinRoomInfo] = useState(null);
  const [joinInfoLoading, setJoinInfoLoading] = useState(false);

  const joinCodeParam = searchParams.get('join');
  const gameParam = searchParams.get('game');
  const isJoinFlow = Boolean(joinCodeParam);

  useEffect(() => {
    if (!joinCodeParam) return;
    const upper = joinCodeParam.toUpperCase();
    setRoomCode(upper);
    setMode('join');

    if (gameParam) {
      setJoinRoomInfo({
        exists: true,
        code: upper,
        gameType: normalizeGameType(gameParam),
      });
      return;
    }

    setJoinInfoLoading(true);
    fetchRoomInfo(upper)
      .then((info) => {
        if (info.exists) {
          setJoinRoomInfo(info);
        } else {
          setJoinRoomInfo({ exists: false, code: upper });
        }
      })
      .finally(() => setJoinInfoLoading(false));
  }, [joinCodeParam, gameParam]);

  useEffect(() => {
    if (!joinCodeParam || !getStoredName().trim()) return;
    const upper = joinCodeParam.toUpperCase();
    if (joinInfoLoading) return;
    if (gameParam || joinRoomInfo?.exists) {
      navigate(`/lobby/${upper}`);
    }
  }, [joinCodeParam, gameParam, joinRoomInfo, joinInfoLoading, navigate]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setStoredName(name);
    setStoredAvatar(avatarColor);
    const isFv = selectedGame === GAME_TYPES.FRIEND_VOTE;
    const settings = isFv
      ? {
          rounds: 5,
          answerTime: 60,
          voteTime: 45,
          privateRoom: true,
          gameType: GAME_TYPES.FRIEND_VOTE,
          minPlayers: 3,
        }
      : { rounds: 3, drawTime: 80, difficulty: 'medium', gameType: GAME_TYPES.SCRIBBLE };
    try {
      const res = await createRoom(name, settings, avatarColor, selectedGame);
      navigate(`/lobby/${res.roomCode}`);
    } catch {
      /* error in context */
    }
  };

  const handleJoin = async (asSpectator = false) => {
    if (!name.trim() || !roomCode.trim()) return;
    setStoredName(name);
    setStoredAvatar(avatarColor);
    try {
      await joinRoom(roomCode.toUpperCase(), name, avatarColor, asSpectator);
      navigate(`/lobby/${roomCode.toUpperCase()}`);
    } catch {
      /* error in context */
    }
  };

  const joinGameType = joinRoomInfo?.exists
    ? normalizeGameType(joinRoomInfo.gameType)
    : gameParam
      ? normalizeGameType(gameParam)
      : null;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center p-4 pb-8 safe-top">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card max-w-lg w-full space-y-6"
        >
          <div className="text-center">
            {isJoinFlow && joinGameType ? (
              <>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-display uppercase mb-3 ${
                    joinGameType === GAME_TYPES.FRIEND_VOTE
                      ? 'bg-neon-pink/20 text-neon-pink border border-neon-pink/40'
                      : 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/40'
                  }`}
                >
                  {joinGameType === GAME_TYPES.FRIEND_VOTE ? '🗳️' : '🎨'}{' '}
                  {gameLabel(joinGameType)} Room
                </span>
                <h2 className="font-display text-2xl font-bold mb-2">Join {roomCode || joinCodeParam}</h2>
                <p className="text-slate-400 text-sm">
                  {joinGameType === GAME_TYPES.FRIEND_VOTE
                    ? 'You are joining a Friend Vote party — no game mode pick needed.'
                    : 'You are joining a Scribble room — no game mode pick needed.'}
                </p>
              </>
            ) : (
              <>
                <h2 className="font-display text-2xl font-bold mb-2">
                  {selectedGame === GAME_TYPES.FRIEND_VOTE
                    ? 'Roast. Vote. Win.'
                    : 'Draw. Guess. Win.'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {selectedGame === GAME_TYPES.FRIEND_VOTE
                    ? 'Psych-style party game for 3–10 friends'
                    : 'The modern multiplayer drawing game for 2–10 players'}
                </p>
              </>
            )}
          </div>

          {!isJoinFlow && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedGame(GAME_TYPES.SCRIBBLE)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  selectedGame === GAME_TYPES.SCRIBBLE
                    ? 'border-neon-cyan bg-neon-cyan/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-2xl">🎨</span>
                <p className="font-display text-sm mt-1">Scribble</p>
                <p className="text-[10px] text-slate-500">2–10 players</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedGame(GAME_TYPES.FRIEND_VOTE)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  selectedGame === GAME_TYPES.FRIEND_VOTE
                    ? 'border-neon-pink bg-neon-pink/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <span className="text-2xl">🗳️</span>
                <p className="font-display text-sm mt-1">Friend Vote</p>
                <p className="text-[10px] text-slate-500">3–10 friends</p>
              </button>
            </div>
          )}

          {isJoinFlow && joinInfoLoading && (
            <p className="text-center text-slate-500 text-sm">Looking up room...</p>
          )}

          {isJoinFlow && joinRoomInfo && !joinRoomInfo.exists && (
            <p className="text-red-400 text-center text-sm bg-red-500/10 rounded-lg py-2">
              Room not found. Check the code and try again.
            </p>
          )}

          <Input
            label="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter nickname"
            maxLength={20}
          />

          <div>
            <label className="text-sm text-slate-400 uppercase tracking-wide">Avatar Color</label>
            <div className="flex gap-2 mt-2 flex-wrap">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    avatarColor === c ? 'border-neon-cyan scale-125' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-500/10 rounded-lg py-2">{error}</p>
          )}

          {!mode && !isJoinFlow && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button onClick={() => setMode('create')} className="w-full">
                Create Room
              </Button>
              <Button variant="secondary" onClick={() => setMode('join')} className="w-full">
                Join Room
              </Button>
            </div>
          )}

          {mode === 'create' && !isJoinFlow && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <Button onClick={handleCreate} loading={loading} className="w-full">
                Create {gameLabel(selectedGame)} Room
              </Button>
              <Button variant="secondary" onClick={() => setMode(null)} className="w-full">
                Back
              </Button>
            </motion.div>
          )}

          {(mode === 'join' || isJoinFlow) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {!isJoinFlow && (
                <Input
                  label="Room Code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCDEF"
                  maxLength={6}
                />
              )}
              <Button
                onClick={() => handleJoin(false)}
                loading={loading}
                className="w-full"
                disabled={joinInfoLoading || (joinRoomInfo && !joinRoomInfo.exists)}
              >
                Join {joinGameType ? gameLabel(joinGameType) : 'Room'}
              </Button>
              <Button variant="secondary" onClick={() => handleJoin(true)} className="w-full">
                Join as Spectator
              </Button>
              {!isJoinFlow && (
                <Button variant="secondary" onClick={() => setMode(null)} className="w-full">
                  Back
                </Button>
              )}
            </motion.div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
