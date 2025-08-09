/* MrPi Island Quest – single-file game logic
   Requires:
     - mrpi_logo_transparent.png
     - mrpi_token_transparent.png
*/

/* ---------- Canvas setup (HiDPI safe) ---------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });

function fitCanvas() {
  // logical canvas size
  const logical = Math.min(520, Math.max(320, Math.floor(window.innerWidth * 0.85)));
  canvas.width = logical;
  canvas.height = logical;
  // boost for device pixel ratio
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.style.width = logical + 'px';
  canvas.style.height = logical + 'px';
  if (dpr !== 1) {
    const w = canvas.width, h = canvas.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
}
fitCanvas();
window.addEventListener('resize', fitCanvas);

/* ---------- Assets ---------- */
const playerImg = new Image();
playerImg.src = 'mrpi_logo_transparent.png';

const coinImg = new Image();
coinImg.src = 'mrpi_token_transparent.png';

/* ---------- Game state ---------- */
const state = {
  started: false,
  size: () => Math.min(canvas.clientWidth, canvas.clientHeight),
  player: { x: 0, y: 0, spd: 3.1, w: 42, h: 42 },
  coins: [],
  total: 5,
  scoreEl: document.getElementById('score'),
};

/* ---------- Intro / cutscene ---------- */
const introEl = document.getElementById('intro');
const introTextEl = document.getElementById('introText');
const introBtn = document.getElementById('introBtn');

const introLines = [
  "A gentle breeze… MrPi wakes up on a tiny island.",
  "“Where am I?”",
  'A friendly crab scuttles by: "Our golden MrPi tokens blew across the beach! Can you help collect them?"'
];

function typeWriter(lines, el, i = 0, j = 0) {
  if (!el) return;
  if (i >= lines.length) return;
  const line = lines[i];
  el.textContent = line.slice(0, j);
  const delay = 26 + Math.random() * 20;
  setTimeout(() => {
    if (j < line.length) typeWriter(lines, el, i, j + 1);
    else setTimeout(() => typeWriter(lines, el, i + 1, 0), 450);
  }, delay);
}

function showIntro() {
  introEl.classList.add('show');
  introTextEl.textContent = '';
  typeWriter(introLines, introTextEl);
}
function hideIntro() {
  introEl.classList.remove('show');
}
function startFromIntro() {
  if (state.started) return;
  hideIntro();
  startGame();
}
introBtn.addEventListener('click', startFromIntro);
introBtn.addEventListener('touchend', (e)=>{e.preventDefault(); startFromIntro();}, {passive:false});

window.addEventListener('DOMContentLoaded', showIntro);

/* ---------- Helpers ---------- */
function rand(min, max) { return Math.random() * (max - min) + min; }

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/* ---------- World gen (simple island) ---------- */
function drawIsland() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const cx = w/2, cy = h/2;
  // ocean gradient
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#cfefff');
  g.addColorStop(1, '#b4e1ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // big water ring
  ctx.fillStyle = '#79c6ee';
  ctx.beginPath(); ctx.arc(cx, cy, w*0.44, 0, Math.PI*2); ctx.fill();

  // shore
  ctx.fillStyle = '#7acb67';
  ctx.beginPath(); ctx.arc(cx, cy, w*0.35, 0, Math.PI*2); ctx.fill();

  // sand
  ctx.fillStyle = '#f2cd72';
  ctx.beginPath(); ctx.arc(cx, cy, w*0.25, 0, Math.PI*2); ctx.fill();

  // a simple tree
  const treeX = cx + w*0.14, treeY = cy - w*0.06;
  ctx.fillStyle = '#5b3b1f';
  ctx.fillRect(treeX-5, treeY, 10, 44);
  ctx.fillStyle = '#2f9a47';
  for (let i=0;i<6;i++){
    ctx.beginPath();
    ctx.arc(treeX + Math.cos(i*Math.PI/3)*18, treeY + Math.sin(i*Math.PI/3)*10, 24, 0, Math.PI*2);
    ctx.fill();
  }
}

/* ---------- Placement ---------- */
function resetLevel() {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  // player spawn near center
  state.player.w = Math.round(w * 0.08);
  state.player.h = state.player.w;
  state.player.x = w/2 - state.player.w/2;
  state.player.y = h/2 - state.player.h/2;

  // coins
  state.total = 7;
  state.coins = [];
  const radius = w*0.23; // sand radius
  for (let i=0;i<state.total;i++){
    // random point on sand area
    const angle = rand(0, Math.PI*2);
    const r = rand(0, radius - w*0.05);
    const cx = w/2 + Math.cos(angle)*r;
    const cy = h/2 + Math.sin(angle)*r;
    const size = Math.round(w*0.07);
    state.coins.push({x: cx-size/2, y: cy-size/2, w: size, h: size, taken:false});
  }
  updateScore();
}

/* ---------- Controls (keys, D-pad, swipe/tap) ---------- */
const keys = { up:false, down:false, left:false, right:false };
window.addEventListener('keydown', (e)=>{
  if (e.key === 'ArrowUp') keys.up = true;
  if (e.key === 'ArrowDown') keys.down = true;
  if (e.key === 'ArrowLeft') keys.left = true;
  if (e.key === 'ArrowRight') keys.right = true;
});
window.addEventListener('keyup', (e)=>{
  if (e.key === 'ArrowUp') keys.up = false;
  if (e.key === 'ArrowDown') keys.down = false;
  if (e.key === 'ArrowLeft') keys.left = false;
  if (e.key === 'ArrowRight') keys.right = false;
});

// D-pad
document.querySelectorAll('.pad').forEach(btn=>{
  const dir = btn.dataset.dir;
  const set = (v)=>{ keys.up=false; keys.down=false; keys.left=false; keys.right=false; keys[dir]=v; };
  btn.addEventListener('touchstart', e=>{ e.preventDefault(); set(true); }, {passive:false});
  btn.addEventListener('touchend',   e=>{ e.preventDefault(); set(false);}, {passive:false});
  btn.addEventListener('mousedown', ()=>set(true));
  btn.addEventListener('mouseup',   ()=>set(false));
  btn.addEventListener('mouseleave',()=>set(false));
});

// swipe / tap inside canvas
let touchStart = null;
canvas.addEventListener('touchstart', (e)=>{
  if (!state.started) return;
  touchStart = [...e.touches][0];
}, {passive:true});
canvas.addEventListener('touchend', (e)=>{
  if (!touchStart) return;
  const end = e.changedTouches[0];
  const dx = end.clientX - touchStart.clientX;
  const dy = end.clientY - touchStart.clientY;
  const absX = Math.abs(dx), absY = Math.abs(dy);
  keys.up = keys.down = keys.left = keys.right = false;
  if (Math.max(absX,absY) < 18) {
    // tap -> move toward tap
    const rect = canvas.getBoundingClientRect();
    const tx = end.clientX - rect.left;
    const ty = end.clientY - rect.top;
    // set direction roughly toward tap
    if (Math.abs(tx - (state.player.x+state.player.w/2)) >
        Math.abs(ty - (state.player.y+state.player.h/2))) {
      (tx > state.player.x) ? keys.right = true : keys.left = true;
    } else {
      (ty > state.player.y) ? keys.down = true : keys.up = true;
    }
    setTimeout(()=>{ keys.up=keys.down=keys.left=keys.right=false; }, 120);
  } else {
    if (absX > absY) (dx>0 ? keys.right=true : keys.left=true);
    else (dy>0 ? keys.down=true : keys.up=true);
    setTimeout(()=>{ keys.up=keys.down=keys.left=keys.right=false; }, 150);
  }
  touchStart = null;
});

/* ---------- Game loop ---------- */
function update(dt){
  if (!state.started) return;

  const p = state.player;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  const spd = p.spd * (dt/16.67); // normalize speed

  if (keys.left)  p.x -= spd;
  if (keys.right) p.x += spd;
  if (keys.up)    p.y -= spd;
  if (keys.down)  p.y += spd;

  // clamp to inner frame
  const pad = 8;
  p.x = clamp(p.x, pad, w - p.w - pad);
  p.y = clamp(p.y, pad, h - p.h - pad);

  // coin collisions
  for (const c of state.coins){
    if (c.taken) continue;
    if (p.x < c.x+c.w && p.x+p.w > c.x && p.y < c.y+c.h && p.y+p.h > c.y){
      c.taken = true;
      updateScore();
    }
  }
}

function render(){
  drawIsland();

  // coins
  for (const c of state.coins){
    if (c.taken) continue;
    if (coinImg.complete) ctx.drawImage(coinImg, c.x, c.y, c.w, c.h);
    else {
      ctx.fillStyle = '#f4b400';
      ctx.beginPath(); ctx.arc(c.x+c.w/2, c.y+c.h/2, c.w/2, 0, Math.PI*2); ctx.fill();
    }
  }

  // player
  const p = state.player;
  if (playerImg.complete) ctx.drawImage(playerImg, p.x, p.y, p.w, p.h);
  else { ctx.fillStyle = '#111'; ctx.fillRect(p.x, p.y, p.w, p.h); }
}

let last = 0;
function loop(t){
  const dt = t - last; last = t;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

/* ---------- Score / start ---------- */
function updateScore() {
  const got = state.coins.filter(c=>c.taken).length;
  const total = state.total;
  state.scoreEl.textContent = `Score: ${got} / ${total}`;
  if (got === total) state.scoreEl.classList.add('done');
  else state.scoreEl.classList.remove('done');
}

function startGame(){
  state.started = true;
  resetLevel();
  updateScore();
}

// start render loop immediately (even before intro dismissed)
requestAnimationFrame(loop);
