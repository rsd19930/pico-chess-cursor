import React from 'react';
import { Game } from './Game';

export function App(){
  return (
    <div className="container">
      <h1 style={{fontSize:24, marginBottom:8}}>Pico Chess</h1>
      <p style={{marginTop:0,color:'var(--muted)'}}>6x6 Crazyhouse. Find a match or play Kodiac if no match in time.</p>
      <Game />
    </div>
  );
}


