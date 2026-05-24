# ScribblePro

Modern multiplayer drawing & guessing game (Skribbl.io-style) with a Discord/Valorant-inspired UI, glassmorphism, neon accents, and server-authoritative game logic.

## Tech Stack

| Layer | Stack |
|-------|--------|
| Frontend | React 18, Vite, Tailwind CSS, Socket.IO Client, React Router, Framer Motion |
| Backend | Node.js, Fastify, Socket.IO |
| State | React Context + useReducer (no Redux) |
| Storage | In-memory rooms (no DB required for MVP) |

## Project Structure

```
ScribblePro/
├── client/                 # React frontend (Vite)
│   ├── src/
│   │   ├── components/     # UI, game, lobby, layout
│   │   ├── context/        # GameContext, ThemeContext
│   │   ├── hooks/          # useCanvas, useSound
│   │   ├── pages/          # Home, Lobby, Game
│   │   ├── socket/         # Socket.IO singleton
│   │   └── utils/
│   ├── vercel.json
│   └── package.json
├── server/                 # Fastify + Socket.IO backend
│   ├── src/
│   │   ├── constants/      # Events, game config
│   │   ├── game/           # GameEngine, WordBank, Scoring, Timer
│   │   ├── rooms/          # Room, RoomManager
│   │   ├── sockets/        # Event handlers
│   │   └── utils/
│   └── package.json
└── package.json            # Root scripts (concurrently)
```

## Quick Start (Local)

### Prerequisites

- Node.js 18+
- npm 9+

### 1. Install dependencies

```bash
cd ScribblePro
npm run install:all
```

Or manually:

```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
# server/.env (copy from server/.env.example)
PORT=3001
CLIENT_URL=http://localhost:5173

# client/.env (copy from client/.env.example)
VITE_SOCKET_URL=http://localhost:3001
```

### 3. Run both servers

```bash
# From project root
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- Health: http://localhost:3001/health

### 4. Test multiplayer locally

1. Open http://localhost:5173 in **Chrome** (Player 1)
2. Open http://localhost:5173 in **Incognito/Edge/Firefox** (Player 2+)
3. Player 1: **Create Room** → copy room code
4. Player 2: **Join Room** with code
5. Both click **Ready Up** → Host clicks **Start Game**
6. Drawer picks a word → others guess in chat

## How Frontend & Backend Communicate

```
┌─────────────┐     HTTP (health, public rooms)     ┌─────────────┐
│   React     │ ──────────────────────────────────► │   Fastify   │
│   Client    │                                     │   Server    │
└──────┬──────┘                                     └──────┬──────┘
       │                                                   │
       │         WebSocket (Socket.IO)                     │
       └──────────────────────────────────────────────────►│
              Events: create-room, draw, guess-word, etc.
```

- **HTTP**: Health checks, public room listing (`GET /api/rooms/public`)
- **WebSocket**: All realtime game actions via Socket.IO
- **Ack callbacks**: `create-room`, `join-room`, `start-game` use Socket.IO acknowledgements for reliable responses

## Socket Events

| Event | Direction | Purpose |
|-------|-----------|---------|
| `create-room` | C→S | Host creates room |
| `join-room` | C→S | Join by code / reconnect |
| `player-ready` | C→S | Toggle ready in lobby |
| `start-game` | C→S | Host starts (server validates) |
| `select-word` | C→S | Drawer picks word |
| `draw` | C→S→All | Stroke sync (throttled on client) |
| `clear-canvas` | C→S→All | Clear board |
| `undo-stroke` | C→S→All | Remove last stroke |
| `guess-word` | C→S | Submit guess (server validates) |
| `correct-guess` | S→All | Broadcast correct guess + points |
| `timer-update` | S→All | Authoritative countdown |
| `round-end` / `game-end` | S→All | Round/game completion |

## State Management

- **Server**: Single source of truth for scores, timers, words, turns, strokes
- **Client `GameContext`**: Mirrors server state via socket events; never computes final scores
- **Local UI state**: Brush color, modals, form inputs stay in components
- **Persistence**: `localStorage` for name, avatar, session token (reconnect support)

## Realtime Drawing Sync

1. Drawer moves mouse/finger → `useCanvas` builds stroke with points
2. Client throttles emit (~16ms) via `draw` event
3. Server validates drawer identity + game phase
4. Server broadcasts stroke to room
5. All clients append stroke and redraw canvas

## Deployment

### Frontend → Vercel

1. Push repo to GitHub
2. Import project in Vercel, set root directory to `client`
3. Environment variables:
   - `VITE_SOCKET_URL=https://your-api.onrender.com`
4. Build: `npm run build` | Output: `dist`

### Backend → Render

1. New Web Service, root: `server`
2. Build: `npm install` | Start: `npm start`
3. Environment:
   - `CLIENT_URL=https://your-app.vercel.app`
   - `NODE_ENV=production`
4. Use Render's URL as `VITE_SOCKET_URL` in Vercel

## Production Optimizations

- Vite code-splitting (vendor, motion, socket chunks)
- Canvas stroke throttling (16ms)
- Socket.IO ping tuning (25s interval)
- Server controls all game logic (anti-cheat)
- `maxHttpBufferSize` for large stroke payloads

## Common Bugs & Fixes

| Issue | Fix |
|-------|-----|
| Can't connect to server | Check `VITE_SOCKET_URL`, CORS `CLIENT_URL` |
| Stuck on loading lobby | Ensure backend is running; check browser console |
| Drawing not syncing | Only drawer can draw; verify `phase === drawing` |
| "Game already in progress" | Join as spectator or wait for new game |
| Canvas blank after resize | Refresh; resize handler redraws strokes |
| Timer desync | Timers are server-only; don't implement client timers |

## Scaling Later (1000+ users)

1. **Redis adapter** for Socket.IO multi-instance
2. **Redis** for room state instead of in-memory `Map`
3. **PostgreSQL** for users, stats, persistent rooms
4. **Load balancer** with sticky sessions
5. **Rate limiting** on draw/guess events
6. **CDN** for frontend static assets

## Future Upgrades

- User accounts (OAuth)
- Custom word packs
- Ranked matchmaking
- Public room browser UI
- AI moderator / profanity filter
- Database-backed leaderboards
- Mobile native app (React Native)

## License

MIT
