/* MrPi Island Quest – script.js
   - Keyboard + mobile buttons
   - Collect 5 shiny golden MrPi tokens
   - Works with: index.html (btnUp/Down/Left/Right) + style.css
*/

// ---------- Config ----------
const CANVAS_SIZE = 320;      // logical game area (square)
const SPEED = 3;              // movement speed
const MRPI_SIZE = 48;         // draw size for MrPi
const TOKEN_SIZE = 42;        // draw size for token
const TOKENS_TO_WIN = 5;

// ---------- Canvas (crisp on mobile/retina) ----------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

function resizeCanvas() {
  const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  canvas.width  = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  // CSS handles responsive layout; we keep logical size stable
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
addEventListener('resize', resizeCanvas);

// ---------- Assets (make sure these files exist in repo root) ----------
const mrpiImg = new Image();
mrpiImg.src = 'mrpi.png';

const tokenImg = new Image();
tokenImg.src = 'token.png';

// ---------- Game state ----------
const mrpi = {
  x: (CANVAS_SIZE - MRPI_SIZE) / 2,
  y: (CANVAS_SIZE - MRPI_SIZE) / 2,
  w: MRPI_SIZE,
  h: MRPI_SIZE,
};

let keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };
let tokens = [];
let collected = 0;
let won = false;

// ---------- Helpers ----------
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Place 5 tokens in non-overlapping spots
function placeTokens() {
  tokens = [];
  const pad = 16;
  for (let i = 0; i < TOKENS_TO_WIN; i++) {
    let tries = 0;
    while (tries++ < 60) {
      const t = {
        x: rand(pad, CANVAS_SIZE - pad - TOKEN_SIZE),
        y: rand(pad + 30, CANVAS_SIZE - pad - TOKEN_SIZE),
        w: TOKEN_SIZE, h: TOKEN_SIZE, collected: false,
      };
      const clashes = tokens.some(o => Math.abs(o.x - t.x) < TOKEN_SIZE && Math.abs(o.y - t.y) < TOKEN_SIZE);
      if (!clashes) { tokens.push(t); break; }
    }
  }
}
placeTokens();

// ---------- Input: keyboard ----------
addEventListener('keydown', e => {
  if (e.key in keys) { keys[e.key] = true; e.preventDefault(); }
});
addEventListener('keyup', e => {
  if (e.key in keys) { keys[e.key] = false; e.preventDefault(); }
});

// ---------- Input: mobile buttons ----------
function bindBtn(id, keyName) {
  const el = document.getElementById(id);
  if (!el) return;
  const press = () => { keys[keyName] = true; };
  const release = () => { keys[keyName] = false; };

  el.addEventListener('touchstart', e => { e.preventDefault(); press(); }, { passive:false });
  el.addEventListener('touchend',   e => { e.preventDefault(); release(); }, { passive:false });
  el.addEventListener('mousedown',  press);
  el.addEventListener('mouseup',    release);
  el.addEventListener('mouseleave', release);
}
bindBtn('btnUp', 'ArrowUp');
bindBtn('btnDown', 'ArrowDown');
bindBtn('btnLeft', 'ArrowLeft');
bindBtn('btnRight','ArrowRight');

// ---------- Update ----------
function update() {
  if (won) return;

  let dx = 0, dy = 0;
  if (keys.ArrowUp)    dy -= 1;
  if (keys.ArrowDown)  dy += 1;
  if (keys.ArrowLeft)  dx -= 1;
  if (keys.ArrowRight) dx += 1;
  if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; } // normalize diagonal

  mrpi.x = clamp(mrpi.x + dx * SPEED, 0, CANVAS_SIZE - mrpi.w);
  mrpi.y = clamp(mrpi.y + dy * SPEED, 0, CANVAS_SIZE - mrpi.h);

  // Collect tokens
  tokens.forEach(t => {
    if (!t.collected && overlap(mrpi, t)) {
      t.collected = true;
      collected++;
      if (collected >= TOKENS_TO_WIN) won = true;
    }
  });
}

// ---------- Draw ----------
function draw() {
  // Background (matches CSS grass vibe)
  ctx.fillStyle = '#c2f970';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Tokens
  tokens.forEach(t => {
    if (!t.collected) {
      if (tokenImg.complete) {
        ctx.drawImage(tokenImg, t.x, t.y, t.w, t.h);
      } else {
        // fallback circle
        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(t.x + t.w/2, t.y + t.h/2, t.w/2, 0, Math.PI*2);
        ctx.fill();
      }
    }
  });

  // MrPi
  if (mrpiImg.complete) {
    ctx.drawImage(mrpiImg, mrpi.x, mrpi.y, mrpi.w, mrpi.h);
  } else {
    // fallback square
    ctx.fillStyle = '#1877f2';
    ctx.fillRect(mrpi.x, mrpi.y, mrpi.w, mrpi.h);
  }

  // HUD
  ctx.fillStyle = '#111';
  ctx.font = '16px system-ui, -apple-system, Arial';
  ctx.fillText(`Tokens: ${collected}/${TOKENS_TO_WIN}`, 10, 22);

  // Win overlay
  if (won) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '26px system-ui, -apple-system, Arial';
    ctx.fillText('🎉 You Win! 🎉', CANVAS_SIZE/2, CANVAS_SIZE/2 - 6);
    ctx.font = '14px system-ui, -apple-system, Arial';
    ctx.fillText('Refresh to play again', CANVAS_SIZE/2, CANVAS_SIZE/2 + 20);
    ctx.textAlign = 'start';
  }
}

// ---------- Main loop ----------
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

// Re-place tokens if the screen context changes
addEventListener('resize', () => {
  if (!won) placeTokens();
});
