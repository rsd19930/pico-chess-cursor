import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { BoardView } from './components/BoardView';
import { HandTray } from './components/HandTray';
import { clsx } from 'clsx';

type Color = 'white' | 'black';
type PieceType = 'K' | 'R' | 'N' | 'B' | 'P';
type Square = string;

type Piece = { type: PieceType; color: Color };
type Board = Record<Square, Piece | undefined>;

type GameState = {
  id: string;
  board: Board;
  turn: Color;
  hands: { white: PieceType[]; black: PieceType[] };
  winner?: Color;
  reason?: string;
  check?: boolean;
  players: { whiteName: string; blackName: string };
  clocks: { whiteMs: number; blackMs: number };
};

const SERVER_URL = (import.meta as any).env.VITE_SERVER_URL || 'http://localhost:4000';

export function Game(){
  const [socket, setSocket] = useState<Socket|undefined>();
  const [connected, setConnected] = useState(false);
  const [waiting, setWaiting] = useState<{queued:boolean, timeoutMs:number}|null>(null);
  const [gameId, setGameId] = useState<string|undefined>();
  const [state, setState] = useState<GameState|undefined>();
  const [myColor, setMyColor] = useState<Color|undefined>();
  const [status, setStatus] = useState<string>('');
  const [selected, setSelected] = useState<Square|undefined>();
  const [holdingDrop, setHoldingDrop] = useState<PieceType|undefined>();
  const playerNameRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<'enter-name'|'matching'|'playing'>('enter-name');
  const waitingStartRef = useRef<number>(0);
  const [waitingLeftMs, setWaitingLeftMs] = useState<number>(0);
  const [nameInput, setNameInput] = useState<string>('');

  useEffect(() => {
    const s = io(SERVER_URL, { transports:['websocket'] });
    setSocket(s);
    s.on('connect', ()=> setConnected(true));
    s.on('disconnect', ()=> setConnected(false));
    s.on('waiting', (w)=> { setWaiting(w); waitingStartRef.current = Date.now(); setWaitingLeftMs(w.timeoutMs); setPhase('matching'); });
    s.on('match_found', (p: { gameId:string; color: Color; state: GameState })=>{
      setGameId(p.gameId);
      setMyColor(p.color);
      setState(p.state);
      setWaiting(null);
      setPhase('playing');
      setStatus('Match found');
    });
    s.on('state', (st: GameState)=> {
      // Play audio cues: turn change and check
      const prev = state;
      setState(st);
      try {
        if (prev && prev.turn !== st.turn) {
          const audio = new Audio('/turn.mp3');
          audio.volume = 0.3; audio.play().catch(()=>{});
        }
        if (st.check && (!prev || !prev.check)) {
          const audio = new Audio('/check.mp3');
          audio.volume = 0.4; audio.play().catch(()=>{});
        }
      } catch {}
    });
    s.on('game_over', (res: { winner: Color; reason: string })=>{
      setStatus(`Game over: ${res.reason}. Winner: ${res.winner}`);
      // fire confetti on the winner's system only
      try {
        if (myColor && myColor === res.winner) {
          // lazy-load local helper
          import('./confetti').then(m => m.fireConfetti()).catch(()=>{});
        }
      } catch {}
    })
    return () => { s.disconnect(); };
  }, []);

  function requestMatch(){
    const name = (playerNameRef.current?.value ?? nameInput).trim();
    socket?.emit('request_match', { playerName: name });
    setStatus('Searching for opponent...');
    setPhase('matching');
  }

  // Matchmaking countdown
  useEffect(()=>{
    if (phase !== 'matching' || !waiting) return;
    let raf: number;
    const tick = () => {
      const elapsed = Date.now() - waitingStartRef.current;
      const left = Math.max(0, waiting.timeoutMs - elapsed);
      setWaitingLeftMs(left);
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return ()=> { if (raf) cancelAnimationFrame(raf); };
  }, [phase, waiting]);

  function onSquareClick(sq: Square){
    if (!state || !myColor) return;
    if (holdingDrop){
      socket?.emit('move', { gameId, drop: { piece: holdingDrop, square: sq } });
      setHoldingDrop(undefined);
      return;
    }
    if (!selected){
      setSelected(sq);
      return;
    }
    if (selected === sq){ setSelected(undefined); return; }
    socket?.emit('move', { gameId, from: selected, to: sq });
    setSelected(undefined);
  }

  function onPickFromHand(pt: PieceType){
    if (!state) return;
    setHoldingDrop(pt);
  }

  function resign(){
    if (!gameId) return;
    socket?.emit('resign', { gameId });
  }

  const myHand = useMemo(()=> myColor ? state?.hands[myColor] || [] : [], [state, myColor]);
  const oppHand = useMemo(()=> myColor ? state?.hands[myColor==='white'?'black':'white'] || [] : [], [state, myColor]);

  if (phase === 'enter-name') {
    return (
      <div className="section-card" style={{maxWidth:480, margin:'40px auto'}}>
        <div style={{display:'flex', gap:10, flexDirection:'column'}}>
          <h2 style={{margin:'0 0 6px 0'}}>Pico Chess</h2>
          <input ref={playerNameRef} value={nameInput} onChange={(e)=>setNameInput(e.target.value)} placeholder="Enter your name" className="card" style={{padding:10, background:'var(--panel)', color:'var(--text)', border:'1px solid #2a3147', borderRadius:10}} />
          <button onClick={requestMatch} disabled={nameInput.trim().length===0}>Find Match</button>
        </div>
      </div>
    );
  }

  if (phase === 'matching') {
    return (
      <div className="section-card" style={{maxWidth:520, margin:'40px auto', textAlign:'center'}}>
        <h3 style={{marginTop:0}}>Matchmaking…</h3>
        <div style={{color:'var(--muted)', marginBottom:8}}>{status}</div>
        {waiting && <div style={{fontSize:24, fontWeight:800}}>{Math.ceil(waitingLeftMs/1000)}s</div>}
        <div style={{marginTop:12}}>If no opponent is found, Kodiac will join.</div>
      </div>
    );
  }

  // playing phase mapping (wait until state & myColor are ready to avoid orientation mismatch)
  if (!state || !myColor) {
    return <div className="board-section" />;
  }
  const oppName = myColor==='white' ? (state.players.blackName || 'Black') : (state.players.whiteName || 'White');
  const myNameLabel = myColor==='white' ? (state.players.whiteName || 'White') : (state.players.blackName || 'Black');
  const oppTimerMs = myColor==='white'? state.clocks.blackMs : state.clocks.whiteMs;
  const myTimerMs = myColor==='white'? state.clocks.whiteMs : state.clocks.blackMs;
  const oppColor: Color = myColor==='white' ? 'black' : 'white';
  const myTurn = state.turn === myColor;
  const oppTurn = state.turn === oppColor;

  return (
    <div className="board-section">
      {/* Top (opponent) */}
      <div className="player-row">
        <div className="left">
          <div className="name">{oppName}</div>
        </div>
        <div className="right">
          <div className={"timer "+(oppTurn ? 'their-turn':'')}>{Math.ceil(oppTimerMs/1000)}s</div>
        </div>
      </div>

      {/* Opponent hand (top) */}
      <div className="section-card" style={{marginBottom:10}}>
        <HandTray pieces={oppHand} color={oppColor} readonly />
      </div>

      <div className="section-card">
        <BoardView board={state?.board} turn={state?.turn} myColor={myColor} onSquareClick={onSquareClick} selected={selected} holdingDrop={holdingDrop} legal={state as any && (state as any).legal} />
      </div>

      {/* My hand (bottom) */}
      <div className="section-card" style={{marginTop:10}}>
        <HandTray pieces={myHand} color={myColor} onPick={onPickFromHand} />
      </div>

      {/* Bottom (me) */}
      <div className="player-row" style={{marginBottom:20}}>
        <div className="left">
          <div className="name">{myNameLabel}</div>
        </div>
        <div className="right">
          <div className={"timer "+(myTurn ? 'my-turn':'')}>{Math.ceil(myTimerMs/1000)}s</div>
          {gameId && <button className="danger" onClick={resign} disabled={!!state?.winner}>Resign</button>}
        </div>
      </div>
      <div className="status" style={{textAlign:'center'}}>
        {status} {state?.check && <span className="check-banner">Check!</span>}
      </div>
    </div>
  );
}


