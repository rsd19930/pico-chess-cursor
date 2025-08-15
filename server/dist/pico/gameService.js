"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGameService = createGameService;
const rules_1 = require("./rules");
function createGameService() {
    const games = new Map();
    function createGame(id, opts) {
        const state = {
            id,
            board: (0, rules_1.initialBoard)(),
            hands: (0, rules_1.initialHands)(),
            turn: 'white',
            players: { whiteName: opts.whiteName, blackName: opts.blackName },
            clocks: { whiteMs: 30000, blackMs: 30000 },
            check: false,
            legal: []
        };
        state.legal = (0, rules_1.allLegalMoves)(state, state.turn);
        const game = { id, state, bot: opts.bot };
        games.set(id, game);
        return state;
    }
    function getGame(id) { return games.get(id); }
    function playerMove(id, color, payload) {
        const game = games.get(id);
        if (!game)
            return;
        const { state } = game;
        if (state.turn !== color)
            return;
        let next = null;
        if (payload.drop) {
            const mv = { drop: { piece: payload.drop.piece, square: payload.drop.square } };
            if (!(0, rules_1.isLegalMove)(state, mv, color))
                return;
            next = (0, rules_1.applyMove)(state, mv, color);
        }
        else if (payload.from && payload.to) {
            const mv = { from: payload.from, to: payload.to, promotion: payload.promotion };
            if (!(0, rules_1.isLegalMove)(state, mv, color))
                return;
            next = (0, rules_1.applyMove)(state, mv, color);
        }
        if (!next)
            return;
        // Reset next player's turn clock to 30s per-turn
        const key = next.turn === 'white' ? 'whiteMs' : 'blackMs';
        next.clocks[key] = 30000;
        next.legal = (0, rules_1.allLegalMoves)(next, next.turn);
        const gameOver = (0, rules_1.computeGameOver)(next);
        game.state = next;
        if (gameOver) {
            game.state.winner = gameOver.winner;
            game.state.reason = gameOver.reason;
        }
        return { state: game.state, gameOver: gameOver ? { winner: gameOver.winner, reason: gameOver.reason } : undefined };
    }
    function resign(id, color) {
        const game = games.get(id);
        if (!game)
            return;
        game.state.winner = color === 'white' ? 'black' : 'white';
        game.state.reason = 'resignation';
        return { winner: game.state.winner, reason: game.state.reason };
    }
    function abandon(id, winner) {
        const game = games.get(id);
        if (!game)
            return;
        game.state.winner = winner;
        game.state.reason = 'abandonment';
        return { winner: game.state.winner, reason: game.state.reason };
    }
    return { createGame, getGame, playerMove, resign, abandon };
}
