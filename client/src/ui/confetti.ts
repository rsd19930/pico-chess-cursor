// Minimal, build-friendly confetti fallback using DOM canvas
export async function fireConfetti(){
  try {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '9999';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) { document.body.removeChild(canvas); return; }
    const W = canvas.width = window.innerWidth;
    const H = canvas.height = window.innerHeight;
    const particles = Array.from({length: 140}).map(()=>({
      x: Math.random()*W,
      y: Math.random()*H*0.2 + H*0.4,
      r: Math.random()*4+2,
      c: `hsl(${Math.floor(Math.random()*360)},90%,60%)`,
      vy: Math.random()*2+1,
      vx: (Math.random()-0.5)*2
    }));
    let t = 0;
    const tick = ()=>{
      t++; ctx.clearRect(0,0,W,H);
      particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; ctx.fillStyle=p.c; ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill(); });
      if (t<120) requestAnimationFrame(tick); else document.body.removeChild(canvas);
    };
    requestAnimationFrame(tick);
  } catch {}
}


