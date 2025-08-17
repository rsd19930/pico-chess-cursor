"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const socket_io_1 = require("socket.io");
const uuid_1 = require("uuid");
const service_1 = require("./matchmaking/service");
const gameService_1 = require("./pico/gameService");
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const ORIGIN = process.env.CLIENT_ORIGIN || true;
const app = (0, express_1.default)();
app.use((0, cors_1.default)({ origin: ORIGIN }));
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, { cors: { origin: ORIGIN } });
const gameService = (0, gameService_1.createGameService)();
const matchmaking = (0, service_1.createMatchmakingService)(io, gameService, {
    botJoinTimeoutMs: Number(process.env.BOT_JOIN_TIMEOUT_MS || 60000)
});
io.on('connection', (socket) => {
    socket.on('request_match', (payload) => {
        matchmaking.requestMatch(socket, payload?.playerName || `Player-${(0, uuid_1.v4)().slice(0, 4)}`);
    });
    socket.on('move', (payload) => {
        matchmaking.handleMove(socket, payload);
    });
    socket.on('resign', (payload) => {
        matchmaking.handleResign(socket, payload);
    });
    socket.on('disconnect', () => {
        matchmaking.handleDisconnect(socket);
    });
});
app.get('/health', (_req, res) => res.json({ ok: true }));
// Serve client build (production)
try {
    const clientDist = path_1.default.resolve(__dirname, '../../client/dist');
    app.use(express_1.default.static(clientDist));
    app.get('*', (_req, res) => {
        res.sendFile(path_1.default.join(clientDist, 'index.html'));
    });
}
catch { }
server.listen(PORT, () => {
    console.log(`Pico Chess server running on :${PORT}`);
});
