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

## Scaling Path

| Phase | Change |
|-------|--------|
| MVP | In-memory `RoomManager` |
| 100+ concurrent rooms | Redis for room state |
| Multi-server | `@socket.io/redis-adapter` |
| Persistence | PostgreSQL + Prisma |
| Analytics | Event queue (Kafka/SQS) |

## Adding a Database Later

1. Add Prisma schema: `User`, `Room`, `GameSession`, `PlayerStats`
2. Replace `RoomManager.rooms` Map with Redis cache + DB persistence
3. Store `sessionToken` → `userId` mapping
4. Persist chat history and leaderboards post-game
