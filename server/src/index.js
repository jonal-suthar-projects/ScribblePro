import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.js';
import { registerSocketHandlers } from './sockets/handlers.js';
import { getAllowedOrigins, isOriginAllowed } from './config/corsOrigins.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const allowedOrigins = getAllowedOrigins();
const isProduction = process.env.NODE_ENV === 'production';

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

const roomManager = new RoomManager(
  parseInt(process.env.MAX_ROOMS || '500', 10)
);

fastify.get('/health', async () => ({
  status: 'ok',
  rooms: roomManager.rooms.size,
  uptime: process.uptime(),
}));

fastify.get('/api/rooms/public', async () => ({
  rooms: roomManager.getPublicRooms(),
}));

fastify.get('/api/rooms/:code', async (request) => {
  const code = request.params.code?.toUpperCase()?.trim();
  const room = roomManager.getRoom(code);
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

registerSocketHandlers(io, roomManager);

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
  ║   CORS: ${allowedOrigins.join(', ')}  ║
  ╚══════════════════════════════════════╝
`);
} else {
  console.log(`ScribblePro server listening on port ${PORT}`);
}

export { fastify, io, roomManager };
