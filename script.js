/* MrPi Island Quest – script.js
   - Keyboard + on-screen buttons
   - Collect shiny golden MrPi tokens
   - Responsive, crisp scaling
*/

// ====== CONFIG ======
const CANVAS_SIZE = 320;        // logical game space (square)
const SPEED = 3;                // px per frame
const SPRITE_SIZE = 48;         // MrPi draw size
const TOKEN_SIZE  = 42;         // token draw size
const TOKENS_TO_WIN = 5;
// =====================

// Canvas & DPI scaling
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

// Assets (update these names if your files differ)
const mrpiImg = new Image();
mrpiImg.src = 'mrpi.png';

const tokenImg = new Image();
tokenImg.src = 'token.png';

// Game state
const mrpi = {
  x: (CANVAS_SIZE - SPRITE_SIZE) / 2,
  y: (CANVAS_SIZE - SPRITE_SIZE) / 2,
  w: SPRITE_SIZE,
  h: SPRITE_SIZE,
};
let keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };
let tokens = [];
let collected = 0;
let won = false;

// Helpers
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function overlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// Token placement
function placeTokens() {
  tokens = [];
  const pad = 16;
  for (let i = 0; i < TOKENS_TO_WIN; i++) {
    let attempts = 0;
    while (attempts++ < 50) {
      const t = {
        x: rand(pad, CANVAS_SIZE - pad - TOKEN_SIZE),
        y: rand(pad + 30, CANVAS_SIZE - pad - TOKEN_SIZE),
        w: TOKEN_SIZE, h: TOKEN_SIZE, collected: false,
      };
      const clash = tokens.some(o => Math.abs(o.x - t.x) < TOKEN_SIZE &&
                                     Math.abs(o.y - t.y) < TOKEN_SIZE);
      if (!clash) { tokens.push(t); break; }
    }
  }
}
placeTokens();

// Keyboard controls
window.addEventListener('keydown', (e) => {
  if (e.key in keys) { keys[e.key] = true; e.preventDefault(); }
});
window.addEventListener('keyup', (e) => {
  if (e.key in keys) { keys[e.key] = false; e.preventDefault(); }
});

// Touch buttons — support both id styles: btnUp/btn-up, etc.
function bindBtn(idA, idB, keyName) {
  const el = document.getElementById(idA) || document.getElementById(idB);
  if (!el) return;
  const down = () => { keys[keyName] = true; };
  const up   = () => { keys[keyName] = false; };
  el.addEventListener('touchstart', (e) => { e.preventDefault(); down(); }, {passive:false});
  el.addEventListener('touchend',   (e) => { e.preventDefault(); up();   }, {passive:false});
  el.addEventListener('mousedown', down);
  el.addEventListener('mouseup',   up);
  el.addEventListener('mouseleave', up);
}
bindBtn('btnUp',   'btn-up',   'ArrowUp');
bindBtn('btnDown', 'btn-down', 'ArrowDown');
bindBtn('btnLeft', 'btn-left', 'ArrowLeft');
bindBtn('btnRight','btn-right','ArrowRight');

// Update
function update() {
  if (won) return;

  let dx = 0, dy = 0;
  if (keys.ArrowUp)    dy -= 1;
  if (keys.ArrowDown)  dy += 1;
  if (keys.ArrowLeft)  dx -= 1;
  if (keys.ArrowRight) dx += 1;
  // normalize diagonal
  if (dx && dy) { dx *= Math.SQRT1_2; dy *= Math.SQRT1_2; }

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

// Draw
function draw() {
  // bg
  ctx.fillStyle = '#eaf4ff';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // tokens
  tokens.forEach(t => {
    if (!t.collected) {
      if (tokenImg.complete) {
        ctx.drawImage(tokenImg, t.x, t.y, t.w, t.h);
      } else {
        ctx.fillStyle = '#d4a017';
        ctx.beginPath();
        ctx.arc(t.x + t.w/2, t.y + t.h/2, t.w/2, 0, Math.PI*2);
        ctx.fill();
      }
    }
  });

  // mrpi
  if (mrpiImg.complete) {
    ctx.drawImage(mrpiImg, mrpi.x, mrpi.y, mrpi.w, mrpi.h);
  } else {
    ctx.fillStyle = '#1877f2';
    ctx.fillRect(mrpi.x, mrpi.y, mrpi.w, mrpi.h);
  }

  // HUD
  ctx.fillStyle = '#111';
  ctx.font = '16px system-ui, -apple-system, Arial';
  ctx.fillText(`Tokens: ${collected}/${TOKENS_TO_WIN}`, 10, 20);

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

// Main loop
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();

// Re-place tokens if size context changes (rare)
window.addEventListener('resize', () => {
  if (!won) placeTokens();
});
