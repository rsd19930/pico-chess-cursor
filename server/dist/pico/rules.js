"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialBoard = initialBoard;
exports.initialHands = initialHands;
exports.cloneBoard = cloneBoard;
exports.squareToCoord = squareToCoord;
exports.coordToSquare = coordToSquare;
exports.kingSquare = kingSquare;
exports.isSquareAttacked = isSquareAttacked;
exports.isLegalMove = isLegalMove;
exports.applyMove = applyMove;
exports.opposite = opposite;
exports.computeGameOver = computeGameOver;
exports.allLegalMoves = allLegalMoves;
const files = ['a', 'b', 'c', 'd', 'e', 'f'];
const ranks = ['1', '2', '3', '4', '5', '6'];
function initialBoard() {
    const b = {};
    // White setup
    b['a1'] = { type: 'K', color: 'white' };
    b['b1'] = { type: 'R', color: 'white' };
    b['c1'] = { type: 'N', color: 'white' };
    b['d1'] = { type: 'B', color: 'white' };
    b['a2'] = { type: 'P', color: 'white' };
    // Black setup
    b['f6'] = { type: 'K', color: 'black' };
    b['e6'] = { type: 'R', color: 'black' };
    b['d6'] = { type: 'N', color: 'black' };
    b['c6'] = { type: 'B', color: 'black' };
    b['f5'] = { type: 'P', color: 'black' };
    return b;
}
function initialHands() {
    return { white: [], black: [] };
}
function cloneBoard(board) {
    const out = {};
    for (const k of Object.keys(board))
        out[k] = board[k] ? { ...board[k] } : undefined;
    return out;
}
function squareToCoord(s) {
    const f = files.indexOf(s[0]);
    const r = ranks.indexOf(s[1]);
    return [f, r];
}
function coordToSquare(f, r) {
    if (f < 0 || f >= 6 || r < 0 || r >= 6)
        return null;
    return (files[f] + ranks[r]);
}
function isEmpty(board, s) {
    return !board[s];
}
function isEnemy(board, s, color) {
    const p = board[s];
    return !!p && p.color !== color;
}
function rayMoves(board, from, color, deltas) {
    const [f, r] = squareToCoord(from);
    const res = [];
    for (const [df, dr] of deltas) {
        let nf = f + df;
        let nr = r + dr;
        while (true) {
            const sq = coordToSquare(nf, nr);
            if (!sq)
                break;
            if (isEmpty(board, sq)) {
                res.push(sq);
            }
            else {
                if (isEnemy(board, sq, color))
                    res.push(sq);
                break;
            }
            nf += df;
            nr += dr;
        }
    }
    return res;
}
function knightMoves(board, from, color) {
    const [f, r] = squareToCoord(from);
    const deltas = [
        [1, 2], [2, 1], [-1, 2], [-2, 1],
        [1, -2], [2, -1], [-1, -2], [-2, -1]
    ];
    const res = [];
    for (const [df, dr] of deltas) {
        const sq = coordToSquare(f + df, r + dr);
        if (!sq)
            continue;
        if (isEmpty(board, sq) || isEnemy(board, sq, color))
            res.push(sq);
    }
    return res;
}
function kingMoves(board, from, color) {
    const [f, r] = squareToCoord(from);
    const res = [];
    for (let df = -1; df <= 1; df++) {
        for (let dr = -1; dr <= 1; dr++) {
            if (df === 0 && dr === 0)
                continue;
            const sq = coordToSquare(f + df, r + dr);
            if (!sq)
                continue;
            if (isEmpty(board, sq) || isEnemy(board, sq, color))
                res.push(sq);
        }
    }
    return res;
}
function pawnMoves(board, from, color) {
    const [f, r] = squareToCoord(from);
    const dir = color === 'white' ? 1 : -1;
    const quietSq = coordToSquare(f, r + dir);
    const quiet = [];
    if (quietSq && isEmpty(board, quietSq))
        quiet.push(quietSq);
    const captures = [];
    for (const df of [-1, 1]) {
        const sq = coordToSquare(f + df, r + dir);
        if (sq && isEnemy(board, sq, color))
            captures.push(sq);
    }
    return { quiet, captures };
}
function generateMoves(board, color) {
    const moves = [];
    for (const sq of Object.keys(board)) {
        const p = board[sq];
        if (!p || p.color !== color)
            continue;
        if (p.type === 'K') {
            for (const to of kingMoves(board, sq, color))
                moves.push({ from: sq, to });
        }
        else if (p.type === 'R') {
            for (const to of rayMoves(board, sq, color, [[1, 0], [-1, 0], [0, 1], [0, -1]]))
                moves.push({ from: sq, to });
        }
        else if (p.type === 'B') {
            for (const to of rayMoves(board, sq, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]))
                moves.push({ from: sq, to });
        }
        else if (p.type === 'N') {
            for (const to of knightMoves(board, sq, color))
                moves.push({ from: sq, to });
        }
        else if (p.type === 'P') {
            const { quiet, captures } = pawnMoves(board, sq, color);
            for (const to of quiet)
                moves.push({ from: sq, to, promotion: pawnPromotionIfAny(to, color) });
            for (const to of captures)
                moves.push({ from: sq, to, promotion: pawnPromotionIfAny(to, color) });
        }
    }
    return moves;
}
function pawnPromotionIfAny(target, color) {
    const [, r] = squareToCoord(target);
    if (color === 'white' && r === 5)
        return 'Q'; // We'll replace promotion choice later; for engine accept R/N/B only.
    if (color === 'black' && r === 0)
        return 'Q';
    return undefined;
}
function isInBounds(s) {
    const [f, r] = squareToCoord(s);
    return f >= 0 && f < 6 && r >= 0 && r < 6;
}
function kingSquare(board, color) {
    for (const sq of Object.keys(board)) {
        const p = board[sq];
        if (p && p.type === 'K' && p.color === color)
            return sq;
    }
    return null;
}
function isSquareAttacked(board, square, byColor) {
    // Simplistic: check all pseudo-legal moves by byColor and see if any hits square
    for (const move of generateMoves(board, byColor)) {
        if (move.to === square)
            return true;
    }
    return false;
}
function isLegalMove(state, move, color) {
    const board = state.board;
    if ('drop' in move) {
        const { piece, square } = move.drop;
        if (!isInBounds(square) || !isEmpty(board, square))
            return false;
        if (piece === 'P') {
            const [, r] = squareToCoord(square);
            if ((color === 'white' && r === 5) || (color === 'black' && r === 0))
                return false; // cannot drop on promotion rank
        }
        // Cannot drop if it places own king in check? Drops can give check; only illegal if own king is in check and you fail to resolve.
        // We'll validate by applying and checking king safety below.
    }
    else {
        const p = board[move.from];
        if (!p || p.color !== color)
            return false;
        const candidates = generateMoves(board, color).filter(m => m.from === move.from && m.to === move.to);
        if (candidates.length === 0)
            return false;
    }
    const next = applyMove(state, move, color, true);
    const ksq = kingSquare(next.board, color);
    if (!ksq)
        return false;
    if (isSquareAttacked(next.board, ksq, opposite(color)))
        return false;
    return true;
}
function applyMove(state, move, color, simulate = false) {
    const board = cloneBoard(state.board);
    const hands = { white: [...state.hands.white], black: [...state.hands.black] };
    if ('drop' in move) {
        const { piece, square } = move.drop;
        const hand = color === 'white' ? hands.white : hands.black;
        const idx = hand.indexOf(piece);
        if (idx === -1)
            throw new Error('Piece not in hand');
        hand.splice(idx, 1);
        board[square] = { type: piece, color };
    }
    else {
        const { from, to } = move;
        const moving = board[from];
        if (board[to]) {
            const captured = board[to];
            const captureType = captured.type;
            // Add captured piece (as own color) to hand
            const addTo = color === 'white' ? hands.white : hands.black;
            if (captureType !== 'K')
                addTo.push(captureType);
        }
        // Move piece
        board[to] = moving;
        delete board[from];
        // Pawn promotion
        if (moving.type === 'P') {
            const [, r] = squareToCoord(to);
            if ((color === 'white' && r === 5) || (color === 'black' && r === 0)) {
                // auto promote to R by default; client can request specific type among R/N/B
                const promo = move.promotion && ['R', 'N', 'B'].includes(move.promotion) ? move.promotion : 'R';
                board[to] = { type: promo, color };
            }
        }
    }
    const nextTurn = opposite(color);
    const next = { ...state, board, hands, turn: nextTurn };
    // Update check status for next player
    const ksq = kingSquare(board, nextTurn);
    next.check = ksq ? isSquareAttacked(board, ksq, color) : false;
    return next;
}
function opposite(c) { return c === 'white' ? 'black' : 'white'; }
function computeGameOver(state) {
    if (state.winner)
        return { winner: state.winner, reason: state.reason || 'finished' };
    const color = state.turn;
    // Generate all legal moves including drops
    const legal = allLegalMoves(state, color);
    if (legal.length > 0)
        return null;
    // No legal moves
    // If in check -> checkmate; else stalemate (loss for stalemated per rules)
    if (state.check)
        return { winner: opposite(color), reason: 'checkmate' };
    return { winner: opposite(color), reason: 'stalemate' };
}
function allLegalMoves(state, color) {
    const legals = [];
    // Board moves
    for (const m of generateMoves(state.board, color)) {
        if (isLegalMove(state, m, color))
            legals.push({ from: m.from, to: m.to, ...(m.promotion ? { promotion: m.promotion } : {}) });
    }
    // Drops
    const hand = color === 'white' ? state.hands.white : state.hands.black;
    for (const piece of hand) {
        for (const f of files)
            for (const r of ranks) {
                const sq = (f + r);
                const drop = { drop: { piece, square: sq } };
                if (isLegalMove(state, drop, color))
                    legals.push(drop);
            }
    }
    return legals;
}
