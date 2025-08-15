"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBot = createBot;
const rules_1 = require("./rules");
function createBot(name) {
    return {
        name,
        decideMove(state) {
            const moves = (0, rules_1.allLegalMoves)(state, state.turn);
            if (moves.length === 0)
                return undefined;
            // naive: prefer captures/drops near king? For now random
            return moves[Math.floor(Math.random() * moves.length)];
        }
    };
}
