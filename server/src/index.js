import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.js';
import { RoomStore } from './state/roomStore.js';
import { SessionStore } from './state/sessionStore.js';
import { GameStateManager } from './transitions/GameStateManager.js';
import { registerSocketHandlers } from './sockets/handlers.js';
import { getAllowedOrigins, isOriginAllowed } from './config/corsOrigins.js';
import { initRedis, isRedisEnabled, getRedisStatus, closeRedis } from './services/redis.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const allowedOrigins = getAllowedOrigins();
const isProduction = process.env.NODE_ENV === 'production';

const roomStore = new RoomStore();
const sessionStore = new SessionStore();
const roomManager = new RoomManager(
  parseInt(process.env.MAX_ROOMS || '500', 10),
  roomStore,
  sessionStore
);
const stateManager = new GameStateManager(roomManager, roomStore, sessionStore);

const fastify = Fastify({
  logger: true,
  trustProxy: true,
});

await fastify.register(cors, {
  origin: (origin, cb) => {
    if (isOriginAllowed(origin, allowedOrigins)) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
});

await initRedis();

const hydrated = await roomManager.hydrateFromStore();
if (hydrated > 0) {
  console.log(`[Startup] Hydrated ${hydrated} room(s) from store`);
}

fastify.get('/health', async () => ({
  status: 'ok',
  rooms: roomManager.rooms.size,
  redis: getRedisStatus(),
  uptime: process.uptime(),
}));

fastify.get('/api/rooms/public', async () => ({
  rooms: roomManager.getPublicRooms(),
}));

fastify.get('/api/rooms/:code', async (request) => {
  const code = request.params.code?.toUpperCase()?.trim();
  const room = await roomManager.getOrLoadRoom(code);
  if (!room) {
    return { exists: false };
  }
  return {
    exists: true,
    code: room.code,
    gameType: room.gameType,
    phase: room.phase,
    playerCount: room.getPlayerCount(),
    maxPlayers: room.settings?.maxPlayers,
    minPlayers: room.settings?.minPlayers,
  };
});

await fastify.listen({ port: PORT, host: HOST });

const io = new Server(fastify.server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin, allowedOrigins)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6,
});

const engineRegistry = registerSocketHandlers(io, roomManager, stateManager);

// Resume timers for hydrated active games
for (const room of roomManager.rooms.values()) {
  if (room.phase !== 'lobby' && room.timer?.endsAt) {
    const engine = engineRegistry.get(room, io);
    engine.resumeAfterHydrate?.();
  }
}

const EXPIRE_INTERVAL_MS = parseInt(process.env.ROOM_EXPIRE_INTERVAL_MS || '300000', 10);
setInterval(async () => {
  try {
    await roomStore.expireInactiveRooms();
  } catch (err) {
    console.error('[RoomStore] Expire job failed:', err.message);
  }
}, EXPIRE_INTERVAL_MS);

const shutdown = async () => {
  for (const room of roomManager.rooms.values()) {
    await roomStore.saveRoom(room);
  }
  await closeRedis();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

if (isProduction && !process.env.CLIENT_URL) {
  console.warn(
    '[WARN] CLIENT_URL is not set. Set it to your live frontend URL (e.g. https://your-app.pages.dev).'
  );
}

if (!isProduction) {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   ScribblePro Server Running         ║
  ║   Port: ${PORT}                            ║
  ║   Redis: ${isRedisEnabled() ? 'enabled' : 'disabled (memory)'}           ║
  ║   CORS: ${allowedOrigins.join(', ')}  ║
  ╚══════════════════════════════════════╝
`);
} else {
  console.log(
    `ScribblePro server listening on port ${PORT} (redis=${isRedisEnabled()})`
  );
}

export { fastify, io, roomManager, stateManager };
