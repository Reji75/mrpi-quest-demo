// ----- basic setup -----
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const W = canvas.width, H = canvas.height;

// world
const island = { cx: W/2, cy: H/2, waterR: 300, grassR: 240, sandR: 160 };
const player = { x: W/2, y: H/2, r: 22, speed: 3.2 };
let tokens = [];
let score = 0;
const SCORE_EL = document.getElementById('score');

// images (with cache-bust + fallbacks)
const v = '?v=' + Date.now();
const imgPlayer = new Image();
imgPlayer.src = 'mrpi_logo_transparent.png' + v;
const imgToken = new Image();
imgToken.src = 'mrpi_token_transparent.png' + v;

let readyCount = 0;
function ready(){ if(++readyCount >= 2) start(); }
imgPlayer.onload = ready; imgToken.onload = ready;
imgPlayer.onerror = ready; imgToken.onerror = ready; // still start if missing

// ----- helpers -----
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const dist2 = (a,b,x,y) => (a-x)*(a-x)+(b-y)*(b-y);

// keep player within the grass ring
function keepOnIsland(p){
  const dx = p.x - island.cx, dy = p.y - island.cy;
  const d = Math.sqrt(dx*dx+dy*dy);
  const max = island.grassR - p.r;
  if(d > max){
    const k = max / d;
    p.x = island.cx + dx * k;
    p.y = island.cy + dy * k;
  }
}

// spawn tokens not overlapping center
function spawnTokens(n=7){
  tokens.length = 0;
  let tries = 0;
  while(tokens.length < n && tries++ < 500){
    const ang = Math.random()*Math.PI*2;
    const rad = island.sandR + 14 + Math.random()*(island.grassR-36 - (island.sandR+14));
    const x = island.cx + Math.cos(ang)*rad;
    const y = island.cy + Math.sin(ang)*rad;
    // avoid clustering too close
    if(tokens.every(t => dist2(t.x,t.y,x,y) > 60*60)){
      tokens.push({x, y, r: 20, taken:false});
    }
  }
}

// draw concentric island
function drawIsland(){
  // sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#cfefff'); g.addColorStop(1, '#b2e2ff');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  // water
  ctx.fillStyle = '#78c0e3';
  ctx.beginPath(); ctx.arc(island.cx, island.cy, island.waterR, 0, Math.PI*2); ctx.fill();

  // grass
  ctx.fillStyle = '#48a852';
  ctx.beginPath(); ctx.arc(island.cx, island.cy, island.grassR, 0, Math.PI*2); ctx.fill();

  // sand
  const sandGrad = ctx.createRadialGradient(island.cx, island.cy, 10, island.cx, island.cy, island.sandR);
  sandGrad.addColorStop(0, '#f6d78b'); sandGrad.addColorStop(1, '#eec36f');
  ctx.fillStyle = sandGrad; ctx.beginPath(); ctx.arc(island.cx, island.cy, island.sandR, 0, Math.PI*2); ctx.fill();

  // one tree (simple)
  ctx.fillStyle = '#6e4a1f';
  ctx.fillRect(island.cx+110, island.cy-20, 16, 80);
  ctx.fillStyle = '#2e8b57';
  ctx.beginPath(); ctx.arc(island.cx+118, island.cy-30, 70, 0, Math.PI*2); ctx.fill();
}

// draw player/token with fallback
function drawSprite(img, x, y, size){
  if(img.complete && img.naturalWidth){
    const s = size*2;
    ctx.drawImage(img, x - s/2, y - s/2, s, s);
  } else {
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI*2); ctx.fill();
  }
}

// ----- input (keyboard + swipe/tap) -----
const keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };
addEventListener('keydown', e => { if(e.key in keys){ keys[e.key]=true; e.preventDefault(); }});
addEventListener('keyup',   e => { if(e.key in keys){ keys[e.key]=false; }});

// swipe/tap to pathfind a little toward pointer
let target = null;
function setTargetFromEvent(ev){
  const r = canvas.getBoundingClientRect();
  const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
  const y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
  target = { x: x * (canvas.width / r.width), y: y * (canvas.height / r.height) };
}
canvas.addEventListener('pointerdown', setTargetFromEvent, {passive:true});
canvas.addEventListener('touchstart', setTargetFromEvent, {passive:true});

// ----- main loop -----
function update(){
  // keyboard move
  let vx = 0, vy = 0;
  if(keys.ArrowLeft)  vx -= 1;
  if(keys.ArrowRight) vx += 1;
  if(keys.ArrowUp)    vy -= 1;
  if(keys.ArrowDown)  vy += 1;
  if(vx || vy){
    const l = Math.hypot(vx,vy); vx/=l; vy/=l;
    player.x += vx * player.speed; player.y += vy * player.speed;
    target = null;
  }

  // move toward target if set
  if(target){
    const dx = target.x - player.x, dy = target.y - player.y;
    const d = Math.hypot(dx,dy);
    if(d < 2){ target = null; }
    else { player.x += (dx/d) * player.speed; player.y += (dy/d) * player.speed; }
  }

  keepOnIsland(player);

  // collect tokens
  for(const t of tokens){
    if(!t.taken && dist2(player.x, player.y, t.x, t.y) < (player.r + t.r)*(player.r + t.r)){
      t.taken = true; score++; SCORE_EL.textContent = `Score: ${score} / ${tokens.length}`;
    }
  }
}

function draw(){
  drawIsland();
  // tokens
  for(const t of tokens){ if(!t.taken) drawSprite(imgToken, t.x, t.y, t.r); }
  // player
  drawSprite(imgPlayer, player.x, player.y, player.r);

  if(score === tokens.length){
    ctx.fillStyle = '#0a7a31';
    ctx.font = 'bold 34px system-ui, -apple-system, Segoe UI, Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎉 You collected all tokens!', W/2, 48);
  }
}

function loop(){
  update(); draw();
  requestAnimationFrame(loop);
}

function start(){
  score = 0;
  SCORE_EL.textContent = 'Score: 0 / 7';
  spawnTokens(7);
  requestAnimationFrame(loop);
}
