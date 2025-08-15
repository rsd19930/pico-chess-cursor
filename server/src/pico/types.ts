export type Color = 'white' | 'black';
export type PieceType = 'K' | 'R' | 'N' | 'B' | 'P';

export type Square = string; // e.g., 'a1'..'f6'

export type Piece = {
  type: PieceType;
  color: Color;
};

export type Board = Record<Square, Piece | undefined>;

export type Hand = {
  white: PieceType[];
  black: PieceType[];
};

export type GameState = {
  id: string;
  board: Board;
  turn: Color;
  hands: Hand;
  winner?: Color;
  reason?: string;
  check?: boolean;
  players: { whiteName: string; blackName: string };
  clocks: { whiteMs: number; blackMs: number };
  legal?: Array<{ from?: Square; to?: Square; drop?: { piece: PieceType; square: Square } }>;
};

export type MovePayload = { from?: Square; to?: Square; drop?: { piece: string; square: Square } };


