import React, { useMemo } from 'react';

type Color = 'white' | 'black';
type PieceType = 'K' | 'R' | 'N' | 'B' | 'P';
type Square = string;
type Piece = { type: PieceType; color: Color };
type Board = Record<Square, Piece | undefined>;
type Legal = Array<{ from?: Square; to?: Square; drop?: { piece: PieceType; square: Square } }>; 

const files = ['a','b','c','d','e','f'];
const ranks = ['1','2','3','4','5','6'];

function squareRect(index: number, orientation: 'white'|'black'){
  const col = index % 6; const row = Math.floor(index / 6);
  const unit = 100/6;
  if (orientation === 'white') {
    return { left: `${col * unit}%`, top: `${(5-row) * unit}%`, width: `${unit}%`, height: `${unit}%` };
  }
  // black perspective: rotate 180° without rotating images
  return { left: `${(5-col) * unit}%`, top: `${row * unit}%`, width: `${unit}%`, height: `${unit}%` };
}

function pieceSrc(p: Piece): string{
  const color = p.color === 'white' ? 'White' : 'Black';
  const name = p.type === 'K' ? 'King' : p.type === 'R' ? 'Rook' : p.type === 'B' ? 'Bishop' : p.type === 'N' ? 'Knight' : 'Pawn';
  return `/${name} ${color}.svg`;
}

export function BoardView({ board, turn, myColor, onSquareClick, selected, holdingDrop, legal }:{
  board?: Board; turn?: Color; myColor: Color | undefined; selected?: Square; holdingDrop?: PieceType; legal?: Legal;
  onSquareClick: (sq: Square)=>void;
}){
  const orientation: 'white'|'black' = myColor === 'black' ? 'black' : 'white';

  const squares = useMemo(()=>{
    const arr:{ sq:Square; rect: ReturnType<typeof squareRect> }[] = [];
    for (let r = 0; r < 6; r++){
      for (let f = 0; f < 6; f++){
        const sq = (files[f] + ranks[r]) as Square;
        const index = r * 6 + f; // base grid, orientation handled in squareRect
        arr.push({ sq, rect: squareRect(index, orientation) });
      }
    }
    return arr;
  }, [orientation]);

  const legalTargets = useMemo(()=>{
    if (!legal) return new Set<string>();
    const set = new Set<string>();
    for (const m of legal){
      if (selected && m.from === selected && m.to) set.add(m.to);
    }
    return set;
  }, [legal, selected]);

  const dropTargets = useMemo(()=>{
    if (!legal || !holdingDrop) return new Set<string>();
    const set = new Set<string>();
    for (const m of legal){
      if (m.drop && m.drop.piece === holdingDrop) set.add(m.drop.square);
    }
    return set;
  }, [legal, holdingDrop]);

  return (
    <div className="board-wrap">
      <div className="board">
        <img src="/chessboard_6x6.svg" alt="board" style={{width:'100%', height:'100%'}} />
        {squares.map(({sq, rect})=>{
          const isSel = selected === sq;
          const isTarget = legalTargets.has(sq) || dropTargets.has(sq);
          const className = isSel ? 'square selected' : isTarget ? 'square target' : 'square';
          return (
            <div key={sq} className={className} style={{...rect}} onClick={()=> onSquareClick(sq)} />
          );
        })}
        {board && Object.entries(board).map(([sq,p])=> p && (
          <div className="piece" key={sq} style={{...squares.find(s=>s.sq===sq)!.rect}}>
            <img src={pieceSrc(p)} alt={`${p.color} ${p.type}`} />
          </div>
        ))}
      </div>
      {holdingDrop && <div style={{marginTop:8, color:'var(--muted)'}}>Dropping: {holdingDrop}</div>}
    </div>
  );
}


