import { Server } from 'socket.io';
import { initialBoard, initialHands, applyMove, isLegalMove, computeGameOver, allLegalMoves } from './rules';
import type { Color, GameState, MovePayload } from './types';

export type Bot = {
  name: string;
  decideMove: (state: GameState) => MovePayload | undefined;
};

export type Game = {
  id: string;
  state: GameState;
  bot?: Bot;
};

export type GameService = ReturnType<typeof createGameService>;

export function createGameService() {
  const games = new Map<string, Game>();

  function createGame(id: string, opts: { whiteName: string; blackName: string; bot?: Bot }) {
    const state: GameState = {
      id,
      board: initialBoard(),
      hands: initialHands(),
      turn: 'white',
      players: { whiteName: opts.whiteName, blackName: opts.blackName },
      clocks: { whiteMs: 30_000, blackMs: 30_000 },
      check: false,
      legal: []
    };
    state.legal = allLegalMoves(state, state.turn);
    const game: Game = { id, state, bot: opts.bot };
    games.set(id, game);
    return state;
  }

  function getGame(id: string) { return games.get(id); }

  function playerMove(id: string, color: Color, payload: MovePayload) {
    const game = games.get(id);
    if (!game) return;
    const { state } = game;
    if (state.turn !== color) return;
    let next: GameState | null = null;
    if (payload.drop) {
      const mv = { drop: { piece: payload.drop.piece as any, square: payload.drop.square } } as any;
      if (!isLegalMove(state, mv, color)) return;
      next = applyMove(state, mv, color);
    } else if (payload.from && payload.to) {
      const mv = { from: payload.from, to: payload.to, promotion: (payload as any).promotion } as any;
      if (!isLegalMove(state, mv, color)) return;
      next = applyMove(state, mv, color);
    }
    if (!next) return;
    // Reset next player's turn clock to 30s per-turn
    const key = next.turn === 'white' ? 'whiteMs' : 'blackMs';
    next.clocks[key] = 30_000;
    next.legal = allLegalMoves(next, next.turn);
    const gameOver = computeGameOver(next);
    game.state = next;
    if (gameOver) {
      game.state.winner = gameOver.winner;
      game.state.reason = gameOver.reason;
    }
    return { state: game.state, gameOver: gameOver ? { winner: gameOver.winner, reason: gameOver.reason } : undefined };
  }

  function resign(id: string, color: Color) {
    const game = games.get(id);
    if (!game) return;
    game.state.winner = color === 'white' ? 'black' : 'white';
    game.state.reason = 'resignation';
    return { winner: game.state.winner, reason: game.state.reason };
  }

  function abandon(id: string, winner: Color) {
    const game = games.get(id);
    if (!game) return;
    game.state.winner = winner;
    game.state.reason = 'abandonment';
    return { winner: game.state.winner, reason: game.state.reason };
  }

  return { createGame, getGame, playerMove, resign, abandon };
}


