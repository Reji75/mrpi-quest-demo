// ===== Utility: error overlay so we see problems on phone =====
window.addEventListener('error', (e) => {
  const box = document.getElementById('errorBox');
  box.textContent = 'Error: ' + (e?.message || e);
  box.hidden = false;
});

// ===== Canvas + sizing =====
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

// Keep a logical square, scale to device width
function fitCanvas() {
  const parent = canvas.parentElement;
  const size = Math.min(parent.clientWidth, 520); // cap so it doesn’t get huge
  canvas.style.width = size + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

// ===== HUD refs =====
const scoreEl = document.getElementById('score');
const goalEl  = document.getElementById('goal');
const livesEl = document.getElementById('lives');
const statusEl= document.getElementById('status');

// ===== Assets (load safe; fall back to shapes) =====
const imgPlayer = new Image();
const imgCoin   = new Image();
let playerImgOk = false, coinImgOk = false;

imgPlayer.onload = () => { playerImgOk = true; };
imgPlayer.onerror= () => { playerImgOk = false; };
imgCoin.onload   = () => { coinImgOk = true; };
imgCoin.onerror  = () => { coinImgOk = false; };

// filenames must exist in repo root:
imgPlayer.src = 'mrpi_logo_transparent.png';
imgCoin.src   = 'mrpi_token_transparent.png';

// ===== Game state =====
const W = canvas.width;
const H = canvas.height;

const island = {
  cx: W/2, cy: H/2,
  sandR: 110, grassR: 160, surfR: 200
};

const player = {
  x: island.cx, y: island.cy,
  r: 14,
  speed: 2.1, // px per frame
};

const tokens = [];
const GOAL = 7;
goalEl.textContent = GOAL;
let score = 0;
let lives = 3;
let statusMsg = 'Explore the island…';

// spawn tokens in a donut around the sand
function spawnTokens(n=GOAL){
  tokens.length = 0;
  for(let i=0;i<n;i++){
    const a = Math.random()*Math.PI*2;
    const r = lerp(island.sandR+16, island.grassR-12, Math.random());
    tokens.push({
      x: island.cx + Math.cos(a)*r,
      y: island.cy + Math.sin(a)*r,
      r: 11,
      alive: true
    });
  }
}
spawnTokens();

// ===== Input: drag / swipe / tap to set a target =====
let target = { x: player.x, y: player.y };
let dragging = false;

function setTargetFromEvent(e){
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches ? e.touches[0] : e;
  target.x = (touch.clientX - rect.left) * (canvas.width / rect.width);
  target.y = (touch.clientY - rect.top ) * (canvas.height/ rect.height);
}

canvas.addEventListener('pointerdown', (e)=>{ dragging = true; setTargetFromEvent(e); });
canvas.addEventListener('pointermove', (e)=>{ if(dragging) setTargetFromEvent(e); });
window.addEventListener('pointerup', ()=> dragging = false);

// keyboard arrows for desktop
const keys = new Set();
window.addEventListener('keydown', e=> keys.add(e.key));
window.addEventListener('keyup',   e=> keys.delete(e.key));

// ===== Helpers =====
function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function dist(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return Math.hypot(dx,dy); }
function lerp(a,b,t){ return a + (b-a)*t; }

// ===== Update loop =====
let last = performance.now();
function tick(now){
  const dt = Math.min(40, now-last); // ms
  last = now;

  // keyboard movement (overrides target)
  let vx = 0, vy = 0;
  if(keys.has('ArrowLeft'))  vx -= 1;
  if(keys.has('ArrowRight')) vx += 1;
  if(keys.has('ArrowUp'))    vy -= 1;
  if(keys.has('ArrowDown'))  vy += 1;

  if(vx || vy){
    const len = Math.hypot(vx,vy) || 1;
    player.x += (vx/len) * player.speed * (dt/16.7);
    player.y += (vy/len) * player.speed * (dt/16.7);
  } else {
    // move toward target
    const dx = target.x - player.x, dy = target.y - player.y;
    const d  = Math.hypot(dx,dy);
    if(d > 0.5){
      player.x += (dx/d) * player.speed * (dt/16.7);
      player.y += (dy/d) * player.speed * (dt/16.7);
    }
  }

  // stay on sand (soft clamp to circle)
  const dx = player.x - island.cx, dy = player.y - island.cy;
  const d  = Math.hypot(dx,dy);
  if(d > island.sandR-8){
    const k = (island.sandR-8) / d;
    player.x = island.cx + dx * k;
    player.y = island.cy + dy * k;
  }

  // collect tokens
  for(const t of tokens){
    if(!t.alive) continue;
    if(dist(player.x,player.y,t.x,t.y) < (player.r + t.r)){
      t.alive = false;
      score++;
      statusMsg = 'Nice! +1 MrPi token';
    }
  }

  // update HUD
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  statusEl.textContent = statusMsg;

  draw();
  requestAnimationFrame(tick);
}

// ===== Draw =====
function draw(){
  // sky
  ctx.fillStyle = '#cbecff';
  ctx.fillRect(0,0,W,H);

  // ocean rings
  radialCircle(island.surfR, '#bfe9ff');
  radialCircle(island.grassR+10, '#8cd0f6');

  // grass ring
  ctx.fillStyle = '#3ca654';
  ctx.beginPath(); ctx.arc(island.cx, island.cy, island.grassR, 0, Math.PI*2); ctx.fill();

  // sand
  const sandGrad = ctx.createRadialGradient(island.cx, island.cy, island.sandR*0.2, island.cx, island.cy, island.sandR);
  sandGrad.addColorStop(0, '#f5d79a');
  sandGrad.addColorStop(1, '#eec87a');
  ctx.fillStyle = sandGrad;
  ctx.beginPath(); ctx.arc(island.cx, island.cy, island.sandR, 0, Math.PI*2); ctx.fill();

  // simple tree
  drawTree(island.cx+58, island.cy-8);

  // tokens
  for(const t of tokens){
    if(!t.alive) continue;
    if(coinImgOk){
      const s = 26;
      ctx.drawImage(imgCoin, t.x - s/2, t.y - s/2, s, s);
    } else {
      ctx.fillStyle = '#f7b500';
      ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#b07800'; ctx.lineWidth = 2; ctx.stroke();
    }
  }

  // player
  if(playerImgOk){
    const s = 28;
    ctx.drawImage(imgPlayer, player.x - s/2, player.y - s/2, s, s);
  } else {
    ctx.fillStyle = '#1f3850';
    ctx.beginPath(); ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }

  // frame vignette (subtle)
  const g = ctx.createRadialGradient(W/2,H/2, W*0.2, W/2,H/2, W*0.65);
  g.addColorStop(0,'rgba(0,0,0,0)');
  g.addColorStop(1,'rgba(0,0,0,.06)');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
}

function radialCircle(r, color){
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(island.cx, island.cy, r, 0, Math.PI*2); ctx.fill();
}

function drawTree(x,y){
  ctx.fillStyle = '#2c7a3e';
  ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#6b3d19';
  ctx.fillRect(x-3, y+20, 6, 18);
}

// start!
requestAnimationFrame(tick);
