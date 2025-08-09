// ====== config ======
const CANVAS = document.getElementById("gameCanvas");
const CTX = CANVAS.getContext("2d");
const SCORE_EL = document.getElementById("score");
const MSG_EL = document.getElementById("message");

const TARGET_TOKENS = 5;
const SPEED = 3; // base speed (scaled by DPR)
const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1)); // cap a bit

// sprite sizes (logical px before DPR scaling)
const PLAYER_SIZE = 48;
const TOKEN_SIZE = 40;

// images (use your uploaded filenames)
const PLAYER_SRC = "mrpi_logo_transparent.png";
const TOKEN_SRC  = "mrpi_token_transparent.png";

// ====== state ======
let player = { x: 80, y: 80, size: PLAYER_SIZE };
let tokens = [];
let collected = 0;

const keys = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };
let swipeDir = null;

// ====== helpers ======
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src + "?v=" + Date.now(); // bust stale cache during dev
  });
}

// Spawn tokens randomly inside the canvas bounds
function spawnTokens(n, tokenImg) {
  tokens = [];
  const padding = 10;
  for (let i = 0; i < n; i++) {
    const x = Math.random() * (CANVAS.width  - TOKEN_SIZE*DPR - padding*2) + padding;
    const y = Math.random() * (CANVAS.height - TOKEN_SIZE*DPR - padding*2) + padding;
    tokens.push({ x, y, size: TOKEN_SIZE, img: tokenImg });
  }
}

function rectsOverlap(a, b, aSize, bSize) {
  return !(
    a.x + aSize < b.x ||
    a.x > b.x + bSize ||
    a.y + aSize < b.y ||
    a.y > b.y + bSize
  );
}

// ====== input: keyboard ======
window.addEventListener("keydown", e => {
  if (e.key in keys) { keys[e.key] = true; }
});
window.addEventListener("keyup", e => {
  if (e.key in keys) { keys[e.key] = false; }
});

// ====== input: buttons ======
document.querySelectorAll(".btn").forEach(btn => {
  const dir = btn.dataset.dir;
  const keyMap = { up:"ArrowUp", down:"ArrowDown", left:"ArrowLeft", right:"ArrowRight" };
  const key = keyMap[dir];

  // Pointer events (works for mouse and touch)
  btn.addEventListener("pointerdown", () => { keys[key] = true; });
  btn.addEventListener("pointerup",   () => { keys[key] = false; });
  btn.addEventListener("pointercancel", () => { keys[key] = false; });
});

// ====== input: swipe/tap on canvas ======
let pointerStart = null;
CANVAS.addEventListener("pointerdown", (e) => {
  pointerStart = { x: e.clientX, y: e.clientY, t: Date.now() };
});
CANVAS.addEventListener("pointerup", (e) => {
  if (!pointerStart) return;
  const dx = e.clientX - pointerStart.x;
  const dy = e.clientY - pointerStart.y;
  const dt = Date.now() - pointerStart.t;
  pointerStart = null;

  // Tap = small movement or short time -> move toward tap point a bit
  const dist = Math.hypot(dx, dy);
  if (dist < 8 || dt < 160) {
    // nudge towards the tap point
    const angle = Math.atan2(dy, dx);
    player.x += Math.cos(angle) * 24 * DPR;
    player.y += Math.sin(angle) * 24 * DPR;
    return;
  }

  // Swipe: pick main axis
  if (Math.abs(dx) > Math.abs(dy)) {
    swipeDir = dx > 0 ? "right" : "left";
  } else {
    swipeDir = dy > 0 ? "down" : "up";
  }
  // briefly apply swipe as a “button press”
  const keyFromSwipe = { up:"ArrowUp", down:"ArrowDown", left:"ArrowLeft", right:"ArrowRight" }[swipeDir];
  keys[keyFromSwipe] = true;
  setTimeout(() => { keys[keyFromSwipe] = false; swipeDir = null; }, 120);
});

// ====== main loop ======
let playerImg, tokenImg;

function clamp(val, min, max){ return Math.max(min, Math.min(max, val)); }

function update() {
  const move = SPEED * DPR;
  if (keys.ArrowUp)    player.y -= move;
  if (keys.ArrowDown)  player.y += move;
  if (keys.ArrowLeft)  player.x -= move;
  if (keys.ArrowRight) player.x += move;

  // bounds
  const pSize = PLAYER_SIZE * DPR;
  player.x = clamp(player.x, 0, CANVAS.width  - pSize);
  player.y = clamp(player.y, 0, CANVAS.height - pSize);

  // collisions with tokens
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (rectsOverlap({x:player.x,y:player.y}, {x:tokens[i].x,y:tokens[i].y}, pSize, TOKEN_SIZE*DPR)) {
      tokens.splice(i, 1);
      collected++;
      SCORE_EL.textContent = `Score: ${collected} / ${TARGET_TOKENS}`;
      if (collected >= TARGET_TOKENS) {
        MSG_EL.textContent = "🎉 You collected all tokens!";
      }
    }
  }
}

function draw() {
  // clear
  CTX.clearRect(0, 0, CANVAS.width, CANVAS.height);

  // tokens
  for (const t of tokens) {
    CTX.drawImage(t.img, t.x, t.y, t.size*DPR, t.size*DPR);
  }

  // player
  CTX.drawImage(playerImg, player.x, player.y, PLAYER_SIZE*DPR, PLAYER_SIZE*DPR);
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

// ====== resize for DPR crispness ======
function resizeCanvas() {
  // Keep CSS size responsive, but set actual pixel buffer by DPR
  const cssWidth  = Math.min(700, Math.floor(window.innerWidth * 0.95));
  const cssHeight = Math.floor(cssWidth * 0.74); // aspect
  CANVAS.style.width  = cssWidth + "px";
  CANVAS.style.height = cssHeight + "px";
  CANVAS.width  = Math.floor(cssWidth  * DPR);
  CANVAS.height = Math.floor(cssHeight * DPR);
}
window.addEventListener("resize", () => {
  const oldW = CANVAS.width, oldH = CANVAS.height;
  resizeCanvas();
  // keep player roughly in same relative spot
  player.x = player.x * (CANVAS.width/oldW);
  player.y = player.y * (CANVAS.height/oldH);
  // respawn tokens to fit new bounds if none remain
  if (tokens.length === 0 && collected < TARGET_TOKENS) spawnTokens(TARGET_TOKENS - collected, tokenImg);
});

// ====== boot ======
(async function start() {
  resizeCanvas();

  try {
    [playerImg, tokenImg] = await Promise.all([
      loadImage(PLAYER_SRC),
      loadImage(TOKEN_SRC),
    ]);
  } catch (e) {
    console.error("Image load failed", e);
    MSG_EL.textContent = "⚠️ Could not load images. Check filenames.";
    return;
  }

  collected = 0;
  SCORE_EL.textContent = `Score: ${collected} / ${TARGET_TOKENS}`;
  MSG_EL.textContent = "";
  spawnTokens(TARGET_TOKENS, tokenImg);

  requestAnimationFrame(loop);
})();
