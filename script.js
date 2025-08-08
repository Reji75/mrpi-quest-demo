/* MrPi Island Quest – script.js
   - Arrow keys + mobile buttons
   - Collect 5 golden MrPi tokens (token_64x64.png)
   - Simple HUD + Win message
*/

// ---------- Canvas & sizing ----------
const existing = document.getElementById('gameCanvas');
const canvas = existing || (() => {
  const c = document.createElement('canvas');
  c.id = 'gameCanvas';
  document.body.insertBefore(c, document.getElementById('controls') || null);
  return c;
})();
const ctx = canvas.getContext('2d');

function sizeCanvas() {
  const maxW = Math.min(700, window.innerWidth - 24);
  const maxH = Math.min(500, window.innerHeight * 0.6);
  canvas.width = Math.max(320, Math.floor(maxW));
  canvas.height = Math.max(320, Math.floor(maxH));
}
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

// ---------- Assets ----------
const mrpiImg = new Image();
mrpiImg.src = 'mrpi_sprite_64x64.png'; // your player sprite

const tokenImg = new Image();
tokenImg.src = 'token_64x64.png'; // shiny golden MrPi token

// ---------- Player ----------
const player = {
  x: 60,
  y: 60,
  size: 32,
  speed: 3,
};

// ---------- Tokens ----------
const TOKEN_SIZE = 28;
const TOKENS_TO_COLLECT = 5;
let tokens = [];

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function placeTokens() {
  tokens = [];
  const pad = 20;
  for (let i = 0; i < TOKENS_TO_COLLECT; i++) {
    let tries = 0;
    while (tries++ < 50) {
      const t = {
        x: rand(pad, canvas.width - pad - TOKEN_SIZE),
        y: rand(pad + 40, canvas.height - pad - TOKEN_SIZE),
        collected: false,
      };
      // keep tokens from overlapping each other or the starting player spot
      const overlaps = tokens.some(o =>
        Math.abs(o.x - t.x) < TOKEN_SIZE &&
        Math.abs(o.y - t.y) < TOKEN_SIZE
      ) || (Math.abs(t.x - player.x) < 48 && Math.abs(t.y - player.y) < 48);
      if (!overlaps) { tokens.push(t); break; }
    }
  }
}
placeTokens();

// ---------- Input (keyboard) ----------
const keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };
window.addEventListener('keydown', e => { if (e.key in keys) { keys[e.key] = true; e.preventDefault(); }});
window.addEventListener('keyup',   e => { if (e.key in keys) { keys[e.key] = false; e.preventDefault(); }});

// ---------- Input (mobile buttons) ----------
function hookBtn(id, keyName) {
  const el = document.getElementById(id);
  if (!el) return;
  const press = () => { keys[keyName] = true; };
  const release = () => { keys[keyName] = false; };
  el.addEventListener('touchstart', e => { press(); e.preventDefault(); }, {passive:false});
  el.addEventListener('touchend',   e => { release(); e.preventDefault(); }, {passive:false});
  el.addEventListener('mousedown',  press);
  el.addEventListener('mouseup',    release);
  el.addEventListener('mouseleave', release);
}
hookBtn('btnUp', 'ArrowUp');
hookBtn('btnDown', 'ArrowDown');
hookBtn('btnLeft', 'ArrowLeft');
hookBtn('btnRight','ArrowRight');

// ---------- Helpers ----------
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// ---------- Game loop ----------
let collectedCount = 0;
let won = false;

function update() {
  // movement
  let dx = 0, dy = 0;
  if (keys.ArrowUp) dy -= 1;
  if (keys.ArrowDown) dy += 1;
  if (keys.ArrowLeft) dx -= 1;
  if (keys.ArrowRight) dx += 1;
  if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; } // diagonal normalize

  player.x = clamp(player.x + dx * player.speed, 0, canvas.width - player.size);
  player.y = clamp(player.y + dy * player.speed, 0, canvas.height - player.size);

  // collectibles
  tokens.forEach(t => {
    if (!t.collected && aabb(player.x, player.y, player.size, player.size, t.x, t.y, TOKEN_SIZE, TOKEN_SIZE)) {
      t.collected = true;
      collectedCount++;
      if (collectedCount >= TOKENS_TO_COLLECT) won = true;
    }
  });
}

function draw() {
  // background
  ctx.fillStyle = '#eaf6ff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // title area hint (kept blank because your page title text lives in HTML)

  // tokens
  tokens.forEach(t => {
    if (!t.collected && tokenImg.complete) {
      ctx.drawImage(tokenImg, t.x, t.y, TOKEN_SIZE, TOKEN_SIZE);
    } else if (!t.collected) {
      // fallback circle if image hasn’t loaded yet
      ctx.fillStyle = '#f2c200';
      ctx.beginPath();
      ctx.arc(t.x + TOKEN_SIZE/2, t.y + TOKEN_SIZE/2, TOKEN_SIZE/2, 0, Math.PI*2);
      ctx.fill();
   
