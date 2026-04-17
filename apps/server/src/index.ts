import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ClientToServerEvents, ServerToClientEvents } from '@collab-editor/shared';
import prisma from './db/prisma';
import roomRoutes from './rooms/roomRoutes';
import { registerRoomHandlers } from './rooms/roomSocket';

const app = express();
const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL ?? 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/rooms', roomRoutes);

io.on('connection', (socket) => {
  console.log(`socket connected: ${socket.id}`);
  registerRoomHandlers(io, socket);
});

async function start() {
  await prisma.$connect();
  const PORT = process.env.PORT ?? 3001;
  httpServer.listen(PORT, () => {
    console.log(`server listening on :${PORT}`);
  });
}

start().catch((err) => {
  console.error('failed to start', err);
  process.exit(1);
});