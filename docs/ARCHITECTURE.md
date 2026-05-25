# ScribblePro Architecture

## Socket.IO Rooms

When a player creates or joins a game, their socket joins a Socket.IO room named after the room code (e.g. `ABCDEF`). Broadcasting uses:

```js
io.to(roomCode).emit('event', data);
```

This delivers events only to players in that room.

## Server-Authoritative Game Loop

```
LOBBY → WORD_SELECT → DRAWING → (next drawer) → ROUND_END → GAME_END
```

All transitions happen in `GameEngine.js`. Clients display state; they never advance the game.

## Anti-Cheat

- Words exist only on the server until revealed
- Guesses validated with `checkGuess()` on server
- Scores computed in `Scoring.js` on server
- Only `currentDrawerId` can emit draw/clear/undo
- Timer ticks only on server `GameTimer`

## Reconnect Flow

1. Session token stored in `localStorage`
2. On reconnect, client sends `join-room` with `sessionToken`
3. Server rebinds `socketId` to existing player
4. Server sends full room state + stroke history

## Redis-backed state (production)

Room snapshots and player sessions are stored in Redis (`REDIS_URL`, Upstash-compatible `rediss://` URL).

| Key | Purpose |
|-----|---------|
| `room:{CODE}` | Serialized room state (phase, scores, timers, FV data) |
| `rooms:active:{CODE}` | Index for hydration on deploy |
| `session:{token}` | Reconnect mapping → room + playerId |

In-memory maps on the server hold **live** `Room` instances and `socketId` routing only. Game engines (timers/intervals) are per-process and resume from persisted `room.timer.endsAt` after restart.

### Transition pipeline

```
Socket event → GameStateManager.withRoom (per-room lock)
  → validate phase/player → engine mutates room
  → bump version → RoomStore.saveRoom → broadcast
```

### Timers

`AuthoritativeTimer` stores `startedAt` / `endsAt` on the room. Clients receive `endsAt` + `serverTime` and compute remaining time locally to reduce desync.

## Scaling Path

| Phase | Change |
|-------|--------|
| Current | Redis room state + single Render instance |
| Multi-server | `@socket.io/redis-adapter` + shared Redis |
| Long-term persistence | PostgreSQL for profiles/stats (optional) |
