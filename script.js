// ====== CONFIG ======
const CANVAS_SIZE = 320;        // logical game space
const SPEED = 3;                // px per frame
const SPRITE_SIZE = 48;         // draw size for MrPi
const TOKEN_SIZE  = 42;         // draw size for token
// =====================

// Canvas & hi-DPI scaling
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

function resizeCanvas() {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  canvas.width  = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  canvas.style.width  = CANVAS_SIZE + 'px';
  canvas.style.height = CANVAS_SIZE + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Load images
const mrpiImg = new Image();
mrpiImg.src = 'mrpi_sprite_64x64.png';

const tokenImg = new Image();
tokenImg.src = 'token_64x64.png';

// Game state
const mrpi = {
  x: (CANVAS_SIZE - SPRITE_SIZE) / 2,
  y: (CANVAS_SIZE - SPRITE_SIZE) / 2,
  w: SPRITE_SIZE,
  h: SPRITE_SIZE,
};

let token = spawnToken();
let keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };
let score = 0;

// Helpers
function spawnToken() {
  const margin = 12;
  const x = Math.floor(Math.random() * (CANVAS_SIZE - TOKEN_SIZE - margin*2)) + margin;
  const y = Math.floor(Math.random() * (CANVAS_SIZE - TOKEN_SIZE - margin*2)) + margin;
  return { x, y, w: TOKEN_SIZE, h: TOKEN_SIZE };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

// Input — keyboard
window.addEventListener('keydown', (e) => {
  if (e.key in keys) { keys[e.key] = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  if (e.key in keys) { keys[e.key] = false; e.preventDefault(); }
});

// Input — touch buttons (if they exist in your HTML)
function bindBtn(id, on, off) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = () => on();
  const end   = () => off();

  el.addEventListener('touchstart', (e) => { e.preventDefault(); start(); }, { passive:false });
  el.addEventListener('touchend',   (e) => { e.preventDefault(); end();   }, { passive:false });
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup',   end);
  el.addEventListener('mouseleave', end);
}

bindBtn('btn-up',    () => keys.ArrowUp    = true, () => keys.ArrowUp    = false);
bindBtn('btn-down',  () => keys.ArrowDown  = true, () => keys.ArrowDown  = false);
bindBtn('btn-left',  () => keys.ArrowLeft  = true, () => keys.ArrowLeft  = false);
bindBtn('btn-right', () => keys.ArrowRight = true, () => keys.ArrowRight = false);

// Update loop
function update() {
  // Move
  if (keys.ArrowUp)    mrpi.y -= SPEED;
  if (keys.ArrowDown)  mrpi.y += SPEED;
  if (keys.ArrowLeft)  mrpi.x -= SPEED;
  if (keys.ArrowRight) mrpi.x += SPEED;

  // Clamp to canvas
  mrpi.x = clamp(mrpi.x, 0, CANVAS_SIZE - mrpi.w);
  mrpi.y = clamp(mrpi.y, 0, CANVAS_SIZE - mrpi.h);

  // Collect token
  if (rectsOverlap(mrpi, token)) {
    score += 1;
    token = spawnToken();
  }

  draw();
  requestAnimationFrame(update);
}

// Draw
function draw() {
  // Background
  ctx.fillStyle = '#eaf4ff'; // match your CSS canvas bg
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Token
  if (tokenImg.complete) {
    ctx.drawImage(tokenImg, token.x, token.y, TOKEN_SIZE, TOKEN_SIZE);
  } else {
    // fallback circle
    ctx.fillStyle = '#d4a017';
    ctx.beginPath();
    ctx.arc(token.x + TOKEN_SIZE/2, token.y + TOKEN_SIZE/2, TOKEN_SIZE/2, 0, Math.PI*2);
    ctx.fill();
  }

  // MrPi
  if (mrpiImg.complete) {
    ctx.drawImage(mrpiImg, mrpi.x, mrpi.y, SPRITE_SIZE, SPRITE_SIZE);
  } else {
    // fallback square
    ctx.fillStyle = '#1877f2';
    ctx.fillRect(mrpi.x, mrpi.y, SPRITE_SIZE, SPRITE_SIZE);
  }

  // HUD
  ctx.fillStyle = '#111';
  ctx.font = '16px system-ui, -apple-system, Arial';
  ctx.fillText(`Tokens: ${score}`, 10, 20);
}

// Start once images have a chance to load
Promise.all([
  new Promise(res => { mrpiImg.onload = res; if (mrpiImg.complete) res(); }),
  new Promise(res => { tokenImg.onload = res; if (tokenImg.complete) res(); }),
]).finally(() => requestAnimationFrame(update));
