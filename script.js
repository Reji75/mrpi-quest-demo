// ========= CONFIG =========
// Make sure these filenames match your repo:
const MRPI_IMG  = "mrpi_logo_transparent.png";
const TOKEN_IMG = "mrpi_token_transparent.png";

// Sizes (bigger MrPi, smaller coin)
const PLAYER_SIZE = 72;  // px
const TOKEN_SIZE  = 36;  // px
const SPEED = 3.0;       // pixels/frame
const TOKENS_TO_SPAWN = 5;

// ========= SETUP =========
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const playAgainBtn = document.getElementById("play-again");

let playerImg = new Image();  playerImg.src = MRPI_IMG;
let tokenImg  = new Image();  tokenImg.src  = TOKEN_IMG;

let player = { x: 100, y: 100, w: PLAYER_SIZE, h: PLAYER_SIZE, vx: 0, vy: 0 };
let tokens = [];
let score = 0;
let gameOver = false;
let target = null;  // tap-to-move target

function spawnTokens(){
  tokens = [];
  for (let i=0;i<TOKENS_TO_SPAWN;i++) tokens.push(randomToken());
  score = 0; updateScore();
  gameOver = false; playAgainBtn.hidden = true;
}
function randomToken(){
  const margin = 20;
  return {
    x: Math.random()*(canvas.width - TOKEN_SIZE - margin*2) + margin,
    y: Math.random()*(canvas.height- TOKEN_SIZE - margin*2) + margin,
    w: TOKEN_SIZE, h: TOKEN_SIZE
  };
}

// ========= INPUT: KEYBOARD =========
const KEYS = { ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false };
addEventListener("keydown", e=>{
  if (e.key in KEYS){ KEYS[e.key]=true; e.preventDefault(); }
});
addEventListener("keyup", e=>{
  if (e.key in KEYS){ KEYS[e.key]=false; e.preventDefault(); }
});

// ========= INPUT: TOUCH BUTTONS (fallback) =========
document.querySelectorAll("#controls .btn").forEach(btn=>{
  const dir = btn.dataset.dir;
  const down = ()=>setDir(dir,true);
  const up   = ()=>setDir(dir,false);
  btn.addEventListener("touchstart", down, {passive:false});
  btn.addEventListener("touchend",   up,   {passive:false});
  btn.addEventListener("mousedown", down);
  btn.addEventListener("mouseup",   up);
});
function setDir(dir, on){
  const map={up:"ArrowUp",down:"ArrowDown",left:"ArrowLeft",right:"ArrowRight"};
  KEYS[map[dir]] = on;
}

// ========= INPUT: SWIPE & TAP ON CANVAS =========
let touchStart = null;
canvas.addEventListener("touchstart", e=>{
  const t = e.changedTouches[0];
  touchStart = { x:t.clientX, y:t.clientY };
  e.preventDefault();
},{passive:false});

canvas.addEventListener("touchend", e=>{
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStart.x;
  const dy = t.clientY - touchStart.y;
  const dist = Math.hypot(dx,dy);

  // tap -> move toward tap; swipe -> set direction
  if (dist < 12){
    const r = canvas.getBoundingClientRect();
    target = { x: t.clientX - r.left - player.w/2, y: t.clientY - r.top - player.h/2 };
    KEYS.ArrowUp = KEYS.ArrowDown = KEYS.ArrowLeft = KEYS.ArrowRight = false;
  } else {
    const ax = Math.abs(dx), ay = Math.abs(dy);
    KEYS.ArrowUp = KEYS.ArrowDown = KEYS.ArrowLeft = KEYS.ArrowRight = false;
    if (ax > ay) (dx>0 ? KEYS.ArrowRight : KEYS.ArrowLeft) = true;
    else        (dy>0 ? KEYS.ArrowDown : KEYS.ArrowUp)     = true;
    target = null;
  }
  e.preventDefault();
},{passive:false});

// ========= LOOP =========
function update(){
  const usingKeys = KEYS.ArrowUp || KEYS.ArrowDown || KEYS.ArrowLeft || KEYS.ArrowRight;

  // velocity from keys
  player.vx = (KEYS.ArrowRight?1:0) - (KEYS.ArrowLeft?1:0);
  player.vy = (KEYS.ArrowDown?1:0)  - (KEYS.ArrowUp?1:0);

  if (player.vx && player.vy){
    const inv = 1/Math.sqrt(2); player.vx*=inv; player.vy*=inv;
  }

  // tap target movement
  if (!usingKeys && target){
    const dx = target.x - player.x, dy = target.y - player.y;
    const d = Math.hypot(dx,dy);
    if (d > 1){ player.vx = dx/d; player.vy = dy/d; }
    else { target=null; player.vx=player.vy=0; }
  }

  player.x += player.vx * SPEED;
  player.y += player.vy * SPEED;

  // bounds
  player.x = Math.max(0, Math.min(canvas.width  - player.w, player.x));
  player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

  // collect
  for (let i=tokens.length-1;i>=0;i--){
    if (overlap(player, tokens[i])){ tokens.splice(i,1); score++; updateScore(); }
  }
  if (!gameOver && score >= TOKENS_TO_SPAWN){ gameOver=true; playAgainBtn.hidden=false; }

  draw();
  requestAnimationFrame(update);
}

function overlap(a,b){
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

// ========= RENDER =========
function drawBackground(){
  // sky gradient
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0,"#9bd7ff"); g.addColorStop(1,"#bfeaff");
  ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);

  // ocean band
  ctx.fillStyle="#6ec1ff"; ctx.fillRect(0, canvas.height*0.55, canvas.width, canvas.height*0.25);

  // sand island
  ctx.fillStyle="#f7e9a4"; roundedRect(canvas.width*0.2, canvas.height*0.62, canvas.width*0.6, canvas.height*0.2, 24);

  // palm
  ctx.fillStyle="#8d5a2b"; ctx.fillRect(canvas.width*0.28, canvas.height*0.52, 18, 70);
  ctx.fillStyle="#2eac66";
  for (let i=0;i<5;i++){ ctx.beginPath(); ctx.ellipse(canvas.width*0.29, canvas.height*0.5, 70, 22, i*0.6, 0, Math.PI*2); ctx.fill(); }
}
function roundedRect(x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle="rgba(0,0,0,0.15)"; ctx.stroke();
}

function draw(){
  drawBackground();
  tokens.forEach(t=> ctx.drawImage(tokenImg, t.x, t.y, t.w, t.h));
  ctx.drawImage(playerImg, player.x, player.y, player.w, player.h);
  ctx.strokeStyle="#333"; ctx.lineWidth=4; ctx.strokeRect(0,0,canvas.width,canvas.height);
}

function updateScore(){
  scoreEl.textContent = `Score: ${score} / ${TOKENS_TO_SPAWN}`;
  if (score >= TOKENS_TO_SPAWN) scoreEl.textContent += "  🎉 You collected all tokens!";
}

playAgainBtn.addEventListener("click", ()=>{
  player.x=100; player.y=100; target=null; spawnTokens();
});

// boot
spawnTokens();
requestAnimationFrame(update);
