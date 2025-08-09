// game.js — MrPi Island Quest (Crab guide kept, Rugpul enemy added)

// --------- assets ---------
const ASSETS = {
  player: 'mrpi_logo_transparent.png',
  token:  'mrpi_token_transparent.png',
  rugpul: 'rugpul.png' // optional; will fallback to red circle if missing
};

// --------- canvas / sizing ---------
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  // keep square play area that fits container
  const bounds = canvas.parentElement.getBoundingClientRect();
  const s = Math.min(bounds.width, 520);
  canvas.width = s;
  canvas.height = s;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// --------- helpers ---------
const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// --------- images (with fallback) ---------
function loadImage(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// --------- game state ---------
const state = {
  started: true,          // crab intro is handled in UI copy; gameplay ready
  status: 'Collect tokens, avoid Rugpul!',
  score: 0,
  targetScore: 7,
  lives: 3,
  invulnUntil: 0,
  player: { x: 0, y: 0, r: 18, speed: 2.3 },
  tokens: [],
  // Rugpul orbits around center at a ring radius
  rugpul: { angle: Math.random() * Math.PI * 2, speed: 0.015, r: 16, orbitR: 0 }
};

// island rings for visuals & scattering
let center, islandInnerR, islandMiddleR, islandOuterR;

// input
const input = { up:0, down:0, left:0, right:0, touch:null };

// --------- init ---------
let imgPlayer, imgToken, imgRugpul;
(async function init(){
  [imgPlayer, imgToken, imgRugpul] = await Promise.all([
    loadImage(ASSETS.player),
    loadImage(ASSETS.token),
    loadImage(ASSETS.rugpul)
  ]);
  layout();
  spawnTokens(state.targetScore);
  requestAnimationFrame(loop);
})();

function layout() {
  center = { x: canvas.width/2, y: canvas.height/2 };
  islandOuterR  = canvas.width * 0.42;
  islandMiddleR = canvas.width * 0.32;
  islandInnerR  = canvas.width * 0.22;

  // place player on inner sand
  state.player.x = center.x;
  state.player.y = center.y;

  // Rugpul orbits near the outer ring
  state.rugpul.orbitR = (islandOuterR + islandMiddleR) * 0.5;
}

// spawn tokens around the green ring
function spawnTokens(n){
  state.tokens = [];
  for (let i=0;i<n;i++){
    const angle = (i/n) * Math.PI*2 + rand(-0.3,0.3);
    const radius = rand(islandInnerR*1.05, islandMiddleR*0.95);
    const x = center.x + Math.cos(angle)*radius;
    const y = center.y + Math.sin(angle)*radius;
    state.tokens.push({ x, y, r: 14, alive: true });
  }
}

// --------- input handlers ---------
document.addEventListener('keydown', e=>{
  if (e.key === 'ArrowUp') input.up=1;
  if (e.key === 'ArrowDown') input.down=1;
  if (e.key === 'ArrowLeft') input.left=1;
  if (e.key === 'ArrowRight') input.right=1;
});
document.addEventListener('keyup', e=>{
  if (e.key === 'ArrowUp') input.up=0;
  if (e.key === 'ArrowDown') input.down=0;
  if (e.key === 'ArrowLeft') input.left=0;
  if (e.key === 'ArrowRight') input.right=0;
});

// touch / swipe inside canvas
let touchStart = null;
canvas.addEventListener('touchstart', e=>{
  const t = e.touches[0];
  touchStart = { x: t.clientX, y: t.clientY };
});
canvas.addEventListener('touchmove', e=>{
  const t = e.touches[0];
  if (!touchStart) return;
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const TH = 8;
  input.left  = dx < -TH ? 1 : 0;
  input.right = dx >  TH ? 1 : 0;
  input.up    = dy < -TH ? 1 : 0;
  input.down  = dy >  TH ? 1 : 0;
});
canvas.addEventListener('touchend', ()=>{
  touchStart = null;
  input.up=input.down=input.left=input.right=0;
});

// on-screen arrows (if you kept them)
['btnUp','btnDown','btnLeft','btnRight'].forEach(id=>{
  const el = document.getElementById(id);
  if (!el) return;
  const map = { btnUp:'up', btnDown:'down', btnLeft:'left', btnRight:'right' }[id];
  el.addEventListener('touchstart', e=>{ e.preventDefault(); input[map]=1; }, {passive:false});
  el.addEventListener('touchend',   e=>{ e.preventDefault(); input[map]=0; }, {passive:false});
});

// --------- update / collisions ---------
function update(dt){
  // player movement
  const p = state.player;
  let vx = (input.right - input.left) * p.speed * (dt/16);
  let vy = (input.down  - input.up)   * p.speed * (dt/16);

  p.x = clamp(p.x + vx, center.x - islandInnerR + p.r, center.x + islandInnerR - p.r);
  p.y = clamp(p.y + vy, center.y - islandInnerR + p.r, center.y + islandInnerR - p.r);

  // collect tokens
  for (const t of state.tokens){
    if (!t.alive) continue;
    const dx = t.x - p.x, dy = t.y - p.y;
    const d2 = dx*dx + dy*dy;
    const rad = t.r + p.r*0.8;
    if (d2 < rad*rad){
      t.alive = false;
      state.score++;
      state.status = 'Nice! +1 MrPi token';
    }
  }

  // Rugpul orbit
  const rp = state.rugpul;
  rp.angle += rp.speed * (dt/16);
  rp.x = center.x + Math.cos(rp.angle)*rp.orbitR;
  rp.y = center.y + Math.sin(rp.angle)*rp.orbitR;

  // Rugpul collision (with brief invulnerability)
  const now = performance.now();
  const invuln = now < state.invulnUntil;
  if (!invuln){
    const dx = rp.x - p.x, dy = rp.y - p.y;
    if (dx*dx + dy*dy < (rp.r + p.r*0.8)**2){
      state.lives = Math.max(0, state.lives - 1);
      state.status = 'Rugpul! −1 life';
      state.invulnUntil = now + 1200;

      // scatter a couple of collected tokens back to the ring (if you have any)
      let giveBack = Math.min(2, state.score);
      while (giveBack-- > 0){
        const ang = rand(0, Math.PI*2);
        const rad = rand(islandInnerR*1.05, islandMiddleR*0.95);
        state.tokens.push({
          x: center.x + Math.cos(ang)*rad,
          y: center.y + Math.sin(ang)*rad,
          r: 14, alive: true
        });
        state.score = Math.max(0, state.score - 1);
      }
    }
  }
}

// --------- draw ---------
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);

  // ocean bg
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#dff3ff');
  grad.addColorStop(1, '#c7e6ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // rings
  drawRing(islandOuterR, '#a8d5f2');
  drawRing(islandMiddleR, '#4aa96c');
  drawRing(islandInnerR, '#ebc37a');

  // little palm
  drawPalm(center.x + islandInnerR*0.45, center.y + islandInnerR*0.05, islandInnerR*0.22);

  // tokens
  for (const t of state.tokens){
    if (!t.alive) continue;
    if (imgToken) ctx.drawImage(imgToken, t.x - t.r, t.y - t.r, t.r*2, t.r*2);
    else { ctx.fillStyle = '#ffcc33'; ctx.beginPath(); ctx.arc(t.x,t.y,t.r,0,Math.PI*2); ctx.fill(); }
  }

  // player
  const p = state.player;
  const pr = p.r*1.2;
  if (imgPlayer) ctx.drawImage(imgPlayer, p.x - pr, p.y - pr, pr*2, pr*2);
  else { ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(p.x,p.y,pr,0,Math.PI*2); ctx.fill(); }

  // Rugpul
  const rp = state.rugpul;
  if (imgRugpul) {
    ctx.drawImage(imgRugpul, rp.x - rp.r*1.2, rp.y - rp.r*1.2, rp.r*2.4, rp.r*2.4);
  } else {
    ctx.fillStyle = '#e03a3a';
    ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI*2); ctx.fill();
  }

  // HUD (score/lives/status) — expects elements in index.html
  const scoreEl = document.getElementById('scoreText');
  const livesEl = document.getElementById('livesText');
  const statusEl = document.getElementById('statusText');
  if (scoreEl) scoreEl.textContent = `${state.score} / ${state.targetScore}`;
  if (livesEl) livesEl.textContent = `${state.lives}`;
  if (statusEl) statusEl.textContent = state.status;
}

function drawRing(r, color){
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, r, 0, Math.PI*2);
  ctx.fill();
}

function drawPalm(x, y, s){
  // trunk
  ctx.fillStyle = '#5a3b22';
  ctx.fillRect(x-4, y - s*0.15, 8, s*0.3);
  // leaves
  ctx.fillStyle = '#2fa05a';
  for (let i=0;i<6;i++){
    const a = i*(Math.PI/3);
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a)*s*0.35, y - s*0.15 + Math.sin(a)*s*0.2, s*0.22, s*0.08, a, 0, Math.PI*2);
    ctx.fill();
  }
}

// --------- loop ---------
let last = performance.now();
function loop(now){
  const dt = now - last; last = now;
  update(dt);
  draw();

  // win/lose simple gating
  if (state.lives <= 0){
    state.status = 'Rugpul got you! Tap to restart';
    canvas.onclick = ()=>{ canvas.onclick=null; restart(); };
  } else if (state.score >= state.targetScore){
    state.status = 'All tokens collected! Tap to play again';
    canvas.onclick = ()=>{ canvas.onclick=null; restart(); };
  }

  requestAnimationFrame(loop);
}

function restart(){
  state.score = 0;
  state.lives = 3;
  state.invulnUntil = 0;
  layout();
  spawnTokens(state.targetScore);
  state.status = 'Collect tokens, avoid Rugpul!';
}
