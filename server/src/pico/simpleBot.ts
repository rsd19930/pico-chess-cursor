import type { Bot } from './gameService';
import { allLegalMoves } from './rules';
import type { GameState } from './types';

export function createBot(name: string): Bot {
  return {
    name,
    decideMove(state: GameState) {
      const moves = allLegalMoves(state, state.turn);
      if (moves.length === 0) return undefined;
      // naive: prefer captures/drops near king? For now random
      return moves[Math.floor(Math.random() * moves.length)] as any;
    }
  };
}


