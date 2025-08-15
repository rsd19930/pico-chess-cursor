import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

import { createMatchmakingService } from './matchmaking/service';
import { createGameService } from './pico/gameService';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const ORIGIN = process.env.CLIENT_ORIGIN || '*';

const app = express();
app.use(cors({ origin: ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ORIGIN,
    methods: ['GET', 'POST']
  }
});

const gameService = createGameService();
const matchmaking = createMatchmakingService(io, gameService, {
  botJoinTimeoutMs: Number(process.env.BOT_JOIN_TIMEOUT_MS || 60_000)
});

io.on('connection', (socket) => {
  socket.on('request_match', (payload: { playerName?: string }) => {
    matchmaking.requestMatch(socket, payload?.playerName || `Player-${uuidv4().slice(0, 4)}`);
  });

  socket.on('move', (payload: { gameId: string; from?: string; to?: string; drop?: { piece: string; square: string } }) => {
    matchmaking.handleMove(socket, payload);
  });

  socket.on('resign', (payload: { gameId: string }) => {
    matchmaking.handleResign(socket, payload);
  });

  socket.on('disconnect', () => {
    matchmaking.handleDisconnect(socket);
  });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve client build (production)
try {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} catch {}

server.listen(PORT, () => {
  console.log(`Pico Chess server running on :${PORT}`);
});


