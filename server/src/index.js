import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.js';
import { registerSocketHandlers } from './sockets/handlers.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'],
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
    origin: [CLIENT_URL, 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6,
});

registerSocketHandlers(io, roomManager);

console.log(`
  ╔══════════════════════════════════════╗
  ║   ScribblePro Server Running         ║
  ║   HTTP:  http://${HOST}:${PORT}          ║
  ║   Socket: ws://${HOST}:${PORT}           ║
  ╚══════════════════════════════════════╝
`);

export { fastify, io, roomManager };
