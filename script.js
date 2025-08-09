/* ========== Setup & Assets ========== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });
const scoreEl = document.getElementById('score');

/* Filenames in your repo root (already uploaded) */
const IMG_PLAYER = 'mrpi_logo_transparent.png';
const IMG_TOKEN  = 'mrpi_token_transparent.png';

/* Logical sizing (scaled for devicePixelRatio for crispness) */
const DPR  = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
const SIZE = (() => {
  const w = Math.min(720, document.querySelector('.wrap').clientWidth - 8);
  return Math.max(280, Math.floor(w)); // canvas CSS size (square)
})();

/* Player / token sizes (in CSS pixels, scaled later) */
const PLAYER_SIZE = 56;   // MrPi bigger than coins
const TOKEN_SIZE  = 36;

let widthCSS = SIZE, heightCSS = SIZE;
let width = Math.floor(widthCSS * DPR);
let height = Math.floor(heightCSS * DPR);
canvas.style.height = `${heightCSS}px`;
canvas.style.width  = `${widthCSS}px`;
canvas.width  = width;
canvas.height = height;

/* ========== Game State ========== */

const playerImg = new Image();
const tokenImg  = new Image();
playerImg.src = IMG_PLAYER;
tokenImg.src  = IMG_TOKEN;

const player = { x: width / 2, y: height / 2, speed: 5 * DPR };
let tokens = [];
const TARGET = 5;
let score = 0;

function spawnTokens() {
  tokens = [];
  for (let i = 0; i < TARGET; i++) {
    tokens.push(randomPoint(TOKEN_SIZE * DPR * 1.2));
  }
  score = 0;
  updateScore();
}

function updateScore(msg) {
  scoreEl.textContent = `Score: ${score} / ${TARGET}`;
  if (msg) scoreEl.textContent += `  —  ${msg}`;
}

/* ========== Helpers ========== */

function randomPoint(padding = 0) {
  const px = Math.random() * (width - padding * 2) + padding;
  const py = Math.random() * (height - padding * 2) + padding;
  return { x: px, y: py };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function dist(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/* ========== Input (keyboard, buttons, swipe/tap) ========== */

const keys = new Set();

window.addEventListener('keydown', e => {
  const k = e.key;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k)) {
    e.preventDefault();
    keys.add(k);
  }
});

window.addEventListener('keyup', e => keys.delete(e.key));

/* On-screen buttons (mobile) */
document.querySelectorAll('#controls .btn').forEach(btn => {
  const dir = btn.dataset.dir;
  btn.addEventListener('touchstart', e => { e.preventDefault(); keys.add(dirToKey(dir)); });
  btn.addEventListener('touchend',   e => { e.preventDefault(); keys.delete(dirToKey(dir)); });
  btn.addEventListener('mousedown',  () => keys.add(dirToKey(dir)));
  btn.addEventListener('mouseup',    () => keys.delete(dirToKey(dir)));
  btn.addEventListener('mouseleave', () => keys.delete(dirToKey(dir)));
});

function dirToKey(d) {
  return d === 'up' ? 'ArrowUp'
       : d === 'down' ? 'ArrowDown'
       : d === 'left' ? 'ArrowLeft'
       : 'ArrowRight';
}

/* Swipe / Tap inside canvas */
let touchStart = null;
canvas.addEventListener('touchstart', e => {
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: true });

canvas.addEventListener('touchend', e => {
  const t = e.changedTouches[0];
  if (!touchStart) return;
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const thresh = 24; // px
  keys.clear();
  if (Math.abs(dx) < thresh && Math.abs(dy) < thresh) {
    // tap -> move toward nearest token
    const nearest = tokens.reduce((best, cur) =>
      (!best || dist(cur, player) < dist(best, player)) ? cur : best, null);
    if (nearest) {
      const vx = Math.sign(nearest.x - player.x);
      const vy = Math.sign(nearest.y - player.y);
      if (Math.abs(vx) > Math.abs(vy)) keys.add(vx < 0 ? 'ArrowLeft' : 'ArrowRight');
      else keys.add(vy < 0 ? 'ArrowUp' : 'ArrowDown');
      setTimeout(() => keys.clear(), 120);
    }
  } else {
    if (Math.abs(dx) > Math.abs(dy)) keys.add(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
    else keys.add(dy > 0 ? 'ArrowDown' : 'ArrowUp');
    setTimeout(() => keys.clear(), 160);
  }
});

/* ========== Drawing ========== */

function drawBackground() {
  // Sky gradient
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, '#cfefff');
  g.addColorStop(1, '#9ad8ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  // Water (ocean ring)
  ctx.fillStyle = '#5cc6ff';
  ctx.beginPath();
  ctx.ellipse(width * 0.5, height * 0.7, width * 0.55, height * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Sand island
  const sandCx = width * 0.5, sandCy = height * 0.72;
  ctx.fillStyle = '#f4d188';
  ctx.beginPath();
  ctx.ellipse(sandCx, sandCy, width * 0.40, height * 0.20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Simple palm silhouette
  ctx.save();
  ctx.translate(width * 0.72, height * 0.44);
  ctx.fillStyle = '#2f1e0b';
  ctx.fillRect(-6 * DPR, 0, 12 * DPR, 80 * DPR);
  ctx.fillStyle = '#208b3a';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 56 * DPR, 18 * DPR, i * (Math.PI / 5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Play area border shadow (matches CSS frame look)
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 6 * DPR;
  ctx.strokeRect(3 * DPR, 3 * DPR, width - 6 * DPR, height - 6 * DPR);
}

function drawImageCentered(img, x, y, wCSS, hCSS) {
  const w = wCSS * DPR, h = hCSS * DPR;
  ctx.drawImage(img, x - w / 2, y - h / 2, w, h);
}

function drawTokenCircleFallback(x, y, rCSS) {
  const r = rCSS * DPR;
  ctx.fillStyle = '#ffc107';
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a06a00'; ctx.lineWidth = 3 * DPR; ctx.stroke();
}

/* ========== Update Loop ========== */

function step() {
  // movement
  if (keys.has('ArrowUp'))    player.y -= player.speed;
  if (keys.has('ArrowDown'))  player.y += player.speed;
  if (keys.has('ArrowLeft'))  player.x -= player.speed;
  if (keys.has('ArrowRight')) player.x += player.speed;

  // clamp to canvas
  const halfP = (PLAYER_SIZE * DPR) / 2;
  player.x = clamp(player.x, halfP, width - halfP);
  player.y = clamp(player.y, halfP, height - halfP);

  // collisions
  const hitRadius = (PLAYER_SIZE + TOKEN_SIZE) * DPR * 0.5 * 0.9;
  tokens = tokens.filter(t => {
    if (dist(t, player) < hitRadius) {
      score++;
      updateScore(score >= TARGET ? '🎉 You collected all tokens!' : undefined);
      return false;
    }
    return true;
  });

  // draw
  drawBackground();

  // tokens
  for (const t of tokens) {
    if (tokenImg.complete && tokenImg.naturalWidth) {
      drawImageCentered(tokenImg, t.x, t.y, TOKEN_SIZE, TOKEN_SIZE);
    } else {
      drawTokenCircleFallback(t.x, t.y, TOKEN_SIZE * 0.5);
    }
  }

  // player
  if (playerImg.complete && playerImg.naturalWidth) {
    drawImageCentered(playerImg, player.x, player.y, PLAYER_SIZE, PLAYER_SIZE);
  } else {
    // Fallback box if image not ready yet
    ctx.fillStyle = '#1b3a57';
    ctx.fillRect(player.x - halfP, player.y - halfP, PLAYER_SIZE*DPR, PLAYER_SIZE*DPR);
  }

  requestAnimationFrame(step);
}

/* ========== Start ==========\ */

function start() {
  spawnTokens();
  requestAnimationFrame(step);
}

window.addEventListener('load', start);

/* Optional: reset on orientation change to keep square ratio nicely */
window.addEventListener('orientationchange', () => setTimeout(() => location.reload(), 350));
