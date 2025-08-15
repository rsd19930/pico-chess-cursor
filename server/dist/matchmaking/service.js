"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMatchmakingService = createMatchmakingService;
const uuid_1 = require("uuid");
const simpleBot_1 = require("../pico/simpleBot");
const rules_1 = require("../pico/rules");
function createMatchmakingService(io, gameService, config) {
    const waitingQueue = [];
    const socketIdToRoomId = new Map();
    const rooms = new Map();
    const lastTick = new Map();
    function cleanupWaiting(socketId) {
        const idx = waitingQueue.findIndex(w => w.socketId === socketId);
        if (idx >= 0) {
            const [w] = waitingQueue.splice(idx, 1);
            if (w.timer)
                clearTimeout(w.timer);
        }
    }
    function requestMatch(socket, name) {
        // If someone already waiting, pair them
        const opponent = waitingQueue.shift();
        if (opponent) {
            if (opponent.timer)
                clearTimeout(opponent.timer);
            const gameId = (0, uuid_1.v4)();
            const assignWhite = Math.random() < 0.5;
            const white = assignWhite ? socket.id : opponent.socketId;
            const black = assignWhite ? opponent.socketId : socket.id;
            rooms.set(gameId, { id: gameId, white, black });
            socketIdToRoomId.set(white, gameId);
            socketIdToRoomId.set(black, gameId);
            socket.join(gameId);
            io.sockets.sockets.get(opponent.socketId)?.join(gameId);
            const state = gameService.createGame(gameId, { whiteName: name, blackName: opponent.name });
            lastTick.set(gameId, Date.now());
            // Emit color to each player individually to avoid race/mismatch
            io.to(white).emit('match_found', { gameId, color: 'white', state });
            io.to(black).emit('match_found', { gameId, color: 'black', state });
            return;
        }
        // Otherwise enqueue and set timer for bot
        const waiting = { socketId: socket.id, name };
        waiting.timer = setTimeout(() => {
            const idx = waitingQueue.findIndex(w => w.socketId === socket.id);
            if (idx === -1)
                return; // already matched or removed
            waitingQueue.splice(idx, 1);
            const gameId = (0, uuid_1.v4)();
            // Randomize assigned color for better UX
            const playerIsWhite = Math.random() < 0.5;
            const white = playerIsWhite ? socket.id : 'BOT';
            const black = playerIsWhite ? 'BOT' : socket.id;
            rooms.set(gameId, { id: gameId, white, black });
            socketIdToRoomId.set(white, gameId);
            socket.join(gameId);
            const bot = (0, simpleBot_1.createBot)('Kodiac');
            const state = gameService.createGame(gameId, { whiteName: name, blackName: 'Kodiac', bot });
            lastTick.set(gameId, Date.now());
            const socketColor = playerIsWhite ? 'white' : 'black';
            io.to(socket.id).emit('match_found', { gameId, color: socketColor, state });
            // If bot is white, have it start immediately after a short delay
            if (white === 'BOT') {
                setTimeout(() => {
                    const g = gameService.getGame(gameId);
                    if (!g || g.state.turn !== 'white' || !g.bot)
                        return;
                    const mv = g.bot.decideMove(g.state);
                    if (!mv)
                        return;
                    const r = gameService.playerMove(gameId, 'white', mv);
                    if (r)
                        io.to(gameId).emit('state', r.state);
                }, 500);
            }
            // If bot to move first (black moves second), nothing now. Bot will act on its turn.
        }, config.botJoinTimeoutMs);
        waitingQueue.push(waiting);
        socket.emit('waiting', { queued: true, timeoutMs: config.botJoinTimeoutMs });
    }
    function handleMove(socket, payload) {
        const { gameId } = payload;
        const room = rooms.get(gameId);
        if (!room)
            return;
        const color = socket.id === room.white ? 'white' : socket.id === room.black ? 'black' : undefined;
        if (!color)
            return;
        // Only accept moves if it's the player's turn
        const gameCurrent = gameService.getGame(gameId);
        if (!gameCurrent || gameCurrent.state.turn !== color)
            return;
        if (payload.drop && !(gameCurrent.state.hands[color].includes(payload.drop.piece)))
            return;
        const movePayload = payload.drop ? { drop: { piece: payload.drop.piece, square: payload.drop.square } } : { from: payload.from, to: payload.to };
        const result = gameService.playerMove(gameId, color, movePayload);
        if (!result)
            return;
        io.to(gameId).emit('state', result.state);
        lastTick.set(gameId, Date.now());
        if (result.gameOver) {
            io.to(gameId).emit('game_over', result.gameOver);
            return;
        }
        // If bot present and it's bot's turn, make bot move
        const gameAfter = gameService.getGame(gameId);
        if (gameAfter?.bot && ((gameAfter.state.turn === 'black' && room.black === 'BOT') || (gameAfter.state.turn === 'white' && room.white === 'BOT'))) {
            const botColor = gameAfter.state.turn;
            const delay = 1000 + Math.floor(Math.random() * 4000); // 1s - 5s delay
            setTimeout(() => {
                const gameNow = gameService.getGame(gameId);
                if (!gameNow || gameNow.state.turn !== botColor)
                    return;
                const botMove = gameAfter.bot.decideMove(gameNow.state);
                if (!botMove)
                    return;
                const botResult = gameService.playerMove(gameId, botColor, botMove);
                if (botResult) {
                    io.to(gameId).emit('state', botResult.state);
                    if (botResult.gameOver)
                        io.to(gameId).emit('game_over', botResult.gameOver);
                    else
                        lastTick.set(gameId, Date.now());
                }
            }, delay);
        }
    }
    function handleResign(socket, payload) {
        const room = rooms.get(payload.gameId);
        if (!room)
            return;
        const color = socket.id === room.white ? 'white' : socket.id === room.black ? 'black' : undefined;
        if (!color)
            return;
        const result = gameService.resign(payload.gameId, color);
        if (result)
            io.to(payload.gameId).emit('game_over', result);
    }
    function handleDisconnect(socket) {
        cleanupWaiting(socket.id);
        const gameId = socketIdToRoomId.get(socket.id);
        if (!gameId)
            return;
        const room = rooms.get(gameId);
        if (!room)
            return;
        const winner = socket.id === room.white ? 'black' : 'white';
        const result = gameService.abandon(gameId, winner);
        if (result)
            io.to(gameId).emit('game_over', result);
        rooms.delete(gameId);
        socketIdToRoomId.delete(socket.id);
        lastTick.delete(gameId);
    }
    // Tick timers: 30s per turn; if expires, skip turn; if skip while in check -> opponent wins (per rules).
    setInterval(() => {
        const now = Date.now();
        for (const [gameId, room] of rooms) {
            const game = gameService.getGame(gameId);
            if (!game || game.state.winner)
                continue;
            const lt = lastTick.get(gameId) ?? now;
            const elapsed = now - lt;
            const turn = game.state.turn;
            const clocks = game.state.clocks;
            const key = turn === 'white' ? 'whiteMs' : 'blackMs';
            const remaining = Math.max(0, clocks[key] - elapsed);
            game.state.clocks[key] = remaining;
            // advance last tick so we subtract only deltas next iteration
            lastTick.set(gameId, now);
            if (elapsed >= 200)
                io.to(gameId).emit('state', game.state);
            if (remaining === 0) {
                // timer expired -> skip turn; if in check -> opponent wins
                if (game.state.check) {
                    game.state.winner = turn === 'white' ? 'black' : 'white';
                    game.state.reason = 'flagged while in check';
                    io.to(gameId).emit('game_over', { winner: game.state.winner, reason: game.state.reason });
                    continue;
                }
                // skip: just switch turn and reset timer for new player
                game.state.turn = turn === 'white' ? 'black' : 'white';
                // Recompute check and legal for the new turn
                const ksq = (0, rules_1.kingSquare)(game.state.board, game.state.turn);
                game.state.check = ksq ? (0, rules_1.isSquareAttacked)(game.state.board, ksq, (0, rules_1.opposite)(game.state.turn)) : false;
                game.state.legal = (0, rules_1.allLegalMoves)(game.state, game.state.turn);
                // Reset per-turn clock for the new player
                const newKey = game.state.turn === 'white' ? 'whiteMs' : 'blackMs';
                game.state.clocks[newKey] = 30000;
                // reset the elapsed reference
                lastTick.set(gameId, Date.now());
                // restore current turn's clock if needed
                const otherKey = game.state.turn === 'white' ? 'blackMs' : 'whiteMs';
                if (game.state.clocks[otherKey] < 0)
                    game.state.clocks[otherKey] = 0;
                io.to(gameId).emit('state', game.state);
                // if bot's turn, let bot move immediately
                if (game.bot && ((game.state.turn === 'black' && room.black === 'BOT') || (game.state.turn === 'white' && room.white === 'BOT'))) {
                    const delay = 1000 + Math.floor(Math.random() * 4000);
                    const botTurn = game.state.turn;
                    setTimeout(() => {
                        const g = gameService.getGame(gameId);
                        if (!g || g.state.turn !== botTurn)
                            return;
                        const botMove = g.bot.decideMove(g.state);
                        if (!botMove)
                            return;
                        const botResult = gameService.playerMove(gameId, botTurn, botMove);
                        if (botResult) {
                            // Reset lastTick and emit state after bot moves so next player's timer starts fresh
                            lastTick.set(gameId, Date.now());
                            io.to(gameId).emit('state', botResult.state);
                            if (botResult.gameOver)
                                io.to(gameId).emit('game_over', botResult.gameOver);
                        }
                    }, delay);
                }
            }
        }
    }, 500);
    return { requestMatch, handleMove, handleResign, handleDisconnect };
}
