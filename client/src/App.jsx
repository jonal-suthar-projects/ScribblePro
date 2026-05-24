import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Home } from './pages/Home.jsx';
import { Lobby } from './pages/Lobby.jsx';
import { Game } from './pages/Game.jsx';
import { FriendVoteGame } from './pages/FriendVoteGame.jsx';
import { NotFound } from './pages/NotFound.jsx';
import { ToastContainer } from './components/ui/Toast.jsx';
import { useGame } from './context/GameContext.jsx';

function AppRoutes() {
  const { notifications } = useGame();
  return (
    <>
      <ToastContainer notifications={notifications} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join/:code" element={<JoinRedirect />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/game/:code" element={<Game />} />
        <Route path="/friend-vote/:code" element={<FriendVoteGame />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

function JoinRedirect() {
  const { code } = useParams();
  const upper = code?.toUpperCase();
  return <Navigate to={upper ? `/lobby/${upper}` : '/'} replace />;
}

export default function App() {
  return <AppRoutes />;
}
