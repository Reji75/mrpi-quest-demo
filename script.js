// === CONFIG ===
const CANVAS = document.getElementById("game");
const CTX = CANVAS.getContext("2d");

const PLAYER_SRC = "mrpi_logo_transparent.png";
const TOKEN_SRC  = "mrpi_token_transparent.png";
const BG_SRC     = "island_bg.jpg";      // <-- upload this file

const TARGET_TOKENS = 5;                 // how many to collect
const SPEED_BASE = 3.6;                  // movement base speed (scaled with canvas)
const PLAYER_SCALE = 0.13;               // relative to canvas height
const TOKEN_SCALE  = 0.12;               // relative to canvas height

// === STATE ===
let w = CANVAS.width, h = CANVAS.height;
let player = { x: 100, y: 100, size: 48, vx: 0, vy: 0 };
let tokens = [];
let score = 0;

let playerImg, tokenImg, bgImg;
let lastTs = 0;

// swipe/tap
let touchDir = null;

// === UTILS ===
function loadImage(src){
  return new Promise((res, rej)=>{
    const im = new Image();
    im.onload = ()=>res(im);
    im.onerror = rej;
    im.src = src + "?v=" + Date.now(); // bust cache while iterating
  });
}

function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

function rand(min, max){ return Math.random() * (max - min) + min; }

function spawnTokens(n){
  tokens.length = 0;
  const pad = Math.max(player.size, tokenSize());
  for(let i=0;i<n;i++){
    tokens.push({
      x: rand(pad, w - pad),
      y: rand(pad, h - pad),
      size: tokenSize(),
      collected: false
    });
  }
}

function tokenSize(){ return Math.round(h * TOKEN_SCALE); }
function playerSize(){ return Math.round(h * PLAYER_SCALE); }

function resetPlayer(){
  player.size = playerSize();
  player.x = w * 0.15;
  player.y = h * 0.2;
  player.vx = player.vy = 0;
}

function setCanvasSize(){
  // Keep a nice 7:4 aspect on wide screens, shrink on mobile width
  const cssWidth = Math.min(760, document.querySelector(".wrap").clientWidth - 8);
  const cssHeight = Math.round(cssWidth * (4/7));
  CANVAS.style.width = cssWidth + "px";
  CANVAS.style.height = cssHeight + "px";
  // Internal pixel size = CSS * devicePixelRatio for crisp rendering
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  CANVAS.width = Math.round(cssWidth * dpr);
  CANVAS.height = Math.round(cssHeight * dpr);
  w = CANVAS.width; h = CANVAS.height;

  // scale stroke based on DPR
  CTX.setTransform(dpr,0,0,dpr,0,0);

  // rescale entities
  resetPlayer();
  tokens.forEach(t => t.size = tokenSize());
}

// === INPUT ===
function keyDown(e){
  switch(e.key){
    case "ArrowUp":    player.vy = -1; break;
    case "ArrowDown":  player.vy =  1; break;
    case "ArrowLeft":  player.vx = -1; break;
    case "ArrowRight": player.vx =  1; break;
  }
}
function keyUp(e){
  switch(e.key){
    case "ArrowUp":
    case "ArrowDown":  player.vy = 0; break;
    case "ArrowLeft":
    case "ArrowRight": player.vx = 0; break;
  }
}

// touch buttons
document.querySelectorAll("#touchControls .btn").forEach(btn=>{
  const dir = btn.dataset.dir;
  const set = (on)=>{
    if(!on){ player.vx = player.vy = 0; return; }
    if(dir==="up")    { player.vx=0; player.vy=-1; }
    if(dir==="down")  { player.vx=0; player.vy= 1; }
    if(dir==="left")  { player.vx=-1; player.vy=0; }
    if(dir==="right") { player.vx= 1; player.vy=0; }
  };
  btn.addEventListener("touchstart", e=>{ e.preventDefault(); set(true); }, {passive:false});
  btn.addEventListener("touchend",   e=>{ e.preventDefault(); set(false); }, {passive:false});
  btn.addEventListener("mousedown",  ()=>set(true));
  btn.addEventListener("mouseup",    ()=>set(false));
  btn.addEventListener("mouseleave", ()=>set(false));
});

// swipe/tap on canvas
let touchStart=null;
CANVAS.addEventListener("touchstart", e=>{
  const t=e.changedTouches[0];
  touchStart={x:t.clientX,y:t.clientY};
},{passive:true});
CANVAS.addEventListener("touchend", e=>{
  if(!touchStart) return;
  const t=e.changedTouches[0];
  const dx=t.clientX-touchStart.x;
  const dy=t.clientY-touchStart.y;
  const dead=12;
  player.vx = player.vy = 0;
  if(Math.abs(dx)<dead && Math.abs(dy)<dead){
    // tap = move toward tap position a bit (nudge)
    const rect = CANVAS.getBoundingClientRect();
    const tx = (t.clientX-rect.left)/rect.width * w;
    const ty = (t.clientY-rect.top)/rect.height * h;
    const angle = Math.atan2(ty-player.y, tx-player.x);
    player.vx = Math.cos(angle);
    player.vy = Math.sin(angle);
  } else {
    if(Math.abs(dx)>Math.abs(dy)){
      player.vx = dx>0 ? 1 : -1;
    } else {
      player.vy = dy>0 ? 1 : -1;
    }
  }
  setTimeout(()=>{ player.vx=player.vy=0; }, 160); // short burst
},{passive:true});

// === GAME LOOP ===
function update(dt){
  const speed = SPEED_BASE * (h/480); // scale speed with canvas height
  player.x += (player.vx * speed * dt);
  player.y += (player.vy * speed * dt);
  const half = player.size/2;
  player.x = clamp(player.x, half, w-half);
  player.y = clamp(player.y, half, h-half);

  // collisions
  for(const t of tokens){
    if(t.collected) continue;
    const dx = (player.x - t.x);
    const dy = (player.y - t.y);
    const r  = (player.size*0.45 + t.size*0.45);
    if(dx*dx + dy*dy < r*r){
      t.collected = true;
      score++;
      document.getElementById("score").textContent = `Score: ${score} / ${TARGET_TOKENS}`;
    }
  }
}

function draw(){
  // background image covering canvas
  if(bgImg){
    // draw cover
    const ir = bgImg.width / bgImg.height;
    const cr = w / h;
    let dw, dh, dx, dy;
    if(cr > ir){   // canvas wider than image
      dw = w; dh = w/ir; dx = 0; dy = (h - dh)/2;
    } else {
      dh = h; dw = h*ir; dy = 0; dx = (w - dw)/2;
    }
    CTX.drawImage(bgImg, dx, dy, dw, dh);
  } else {
    CTX.clearRect(0,0,w,h);
  }

  // draw tokens
  for(const t of tokens){
    if(t.collected) continue;
    CTX.drawImage(tokenImg, t.x - t.size/2, t.y - t.size/2, t.size, t.size);
  }

  // draw player on top
  CTX.drawImage(playerImg, player.x - player.size/2, player.y - player.size/2, player.size, player.size);

  // rim (nice frame)
  CTX.lineWidth = 6;
  CTX.strokeStyle = "#323232";
  CTX.strokeRect(3,3,w-6,h-6);
}

function loop(ts){
  const dt = Math.min(32, ts - lastTs) / 16.6667; // ~60fps step
  lastTs = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

// === BOOT ===
async function start(){
  [playerImg, tokenImg, bgImg] = await Promise.all([
    loadImage(PLAYER_SRC),
    loadImage(TOKEN_SRC),
    loadImage(BG_SRC),
  ]);

  setCanvasSize();
  resetPlayer();
  spawnTokens(TARGET_TOKENS);
  document.getElementById("score").textContent = `Score: ${score} / ${TARGET_TOKENS}`;

  window.addEventListener("resize", ()=>{ setCanvasSize(); }, {passive:true});
  window.addEventListener("orientationchange", ()=>{ setTimeout(setCanvasSize, 250); });

  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup",   keyUp);

  requestAnimationFrame(ts=>{ lastTs = ts; loop(ts); });
}

start();
