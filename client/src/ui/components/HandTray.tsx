import React from 'react';

type Color = 'white' | 'black';
type PieceType = 'K' | 'R' | 'N' | 'B' | 'P';

function pieceSrc(type: PieceType, color: Color){
  const name = type === 'K' ? 'King' : type === 'Q' ? 'Queen' : type === 'R' ? 'Rook' : type === 'B' ? 'Bishop' : type === 'N' ? 'Knight' : 'Pawn';
  const c = color === 'white' ? 'White' : 'Black';
  return `/${name} ${c}.svg`;
}

export function HandTray({pieces, color, onPick, readonly}:{ pieces: PieceType[]; color?: Color; onPick?: (pt: PieceType)=>void; readonly?: boolean }){
  return (
    <div className="tray">
      {pieces.length === 0 && <div style={{color:'var(--muted)'}}>Empty</div>}
      {pieces.map((p, i)=> (
        <div key={i} className="hand-piece" onClick={()=> !readonly && onPick?.(p)}>
          <img src={pieceSrc(p, color || 'white')} alt={p} style={{width:28, height:28}} />
        </div>
      ))}
    </div>
  );
}


