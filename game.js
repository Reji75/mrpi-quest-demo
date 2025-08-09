/* MrPi Island Quest — Isometric Mini-Adventure (no libraries)
   - isometric grid & camera
   - coins to collect (uses mrpi_token_transparent.png)
   - patrolling crab enemies (drawn as simple shapes)
   - swipe/drag + keyboard controls
   - timer, lives, toasts
*/

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const ui = {
    score: document.getElementById('score'),
    lives: document.getElementById('lives'),
    time:  document.getElementById('time'),
    status:document.getElementById('status'),
    toast: document.getElementById('toast')
  };

  // --- assets (use your existing repo files) --------------------
  const imgPlayer = new Image();
  imgPlayer.src = 'mrpi_logo_transparent.png'; // smaller on draw

  const imgCoin = new Image();
  imgCoin.src = 'mrpi_token_transparent.png';

  // --- world config ---------------------------------------------
  const TILE_W = 64;         // tile width (cartesian)
  const TILE_H = 32;         // tile height (cartesian)
  const MAP_W = 26;          // tiles
  const MAP_H = 26;
  const CAMERA = { x: 0, y: 0, lerp: 0.12 };

  // ring radii to paint water/sand/grass
  const R1 = 5, R2 = 9, R3 = 12; // inner sand, grass, shallow-water

  // gameplay
  let coins = [];
  let enemies = [];
  let score = 0;
  let lives = 3;
  let timeLeft = 60;
  let gameOver = false;
  let statusMsg = 'Ready.';
  let lastShake = 0;

  ui.lives.textContent = lives;
  ui.time.textContent = timeLeft;

  // --- helpers ---------------------------------------------------
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  function cartToIso(cx, cy){
    // convert cartesian tile coords to screen (top-left of tile)
    const sx = (cx - cy) * (TILE_W/2);
    const sy = (cx + cy) * (TILE_H/2);
    return {x:sx, y:sy};
  }

  function worldToScreen(wx, wy){
    // wx/wy = world tile coords (float)
    const iso = cartToIso(wx, wy);
    return { x: iso.x - CAMERA.x + canvas.width/2,
             y: iso.y - CAMERA.y + canvas.height/2 };
  }

  function showToast(text, good=true){
    ui.toast.textContent = text;
    ui.toast.style.background = good ? 'rgba(255,255,255,.92)' : 'rgba(255,230,230,.95)';
    ui.toast.classList.add('show');
    setTimeout(()=>ui.toast.classList.remove('show'), 900);
  }

  // --- generate island tiles (procedural rings) -----------------
  // 0 water, 1 shallow, 2 grass, 3 sand (center)
  const tiles = new Uint8Array(MAP_W * MAP_H);
  const cx = MAP_W/2, cy = MAP_H/2;

  for(let y=0;y<MAP_H;y++){
    for(let x=0;x<MAP_W;x++){
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx*dx + dy*dy);

      let t = 0; // deep water
      if (d < R3) t = 1;     // shallow water
      if (d < R2) t = 2;     // grass ring
      if (d < R1) t = 3;     // beach center
      tiles[y*MAP_W + x] = t;
    }
  }

  // --- player ----------------------------------------------------
  const player = {
    x: cx, y: cy,  // tile coords (float)
    spd: 3.2 / TILE_W, // tile units per frame based on width
    vx:0, vy:0,
    r: 0.35,      // collision radius in tiles
  };

  // --- place coins on grass ring---------------------------------
  function scatterCoins(n=12){
    coins = [];
    let tries = 0;
    while(coins.length < n && tries < 500){
      tries++;
      const x = 4 + Math.random()*(MAP_W-8);
      const y = 4 + Math.random()*(MAP_H-8);
      const t = tiles[Math.floor(y)*MAP_W + Math.floor(x)];
      if(t === 2){ // grass only
        coins.push({x,y, r:0.28, picked:false, bob:(Math.random()*Math.PI*2)});
      }
    }
  }

  // --- enemies (crabs) ------------------------------------------
  function spawnCrabs(n=3){
    enemies = [];
    for(let i=0;i<n;i++){
      const ang = Math.random()*Math.PI*2;
      const radius = 6 + Math.random()*3;
      enemies.push({
        x: cx + Math.cos(ang)*radius,
        y: cy + Math.sin(ang)*radius,
        r: .35,
        t: Math.random()*Math.PI*2,   // phase
        speed: 0.009 + Math.random()*0.006
      });
    }
  }

  function drawCrab(e){
    const p = worldToScreen(e.x, e.y);
    // body
    ctx.save();
    ctx.translate(p.x, p.y - 6);
    ctx.scale(1, .9);
    ctx.fillStyle = '#e11d48'; // red
    ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.fill();
    // eyes
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-6,-5,4,0,7); ctx.arc(6,-5,4,0,7); ctx.fill();
    ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(-6,-5,2,0,7); ctx.arc(6,-5,2,0,7); ctx.fill();
    // claws
    ctx.fillStyle = '#ef3b65';
    ctx.beginPath(); ctx.arc(-18,0,6,0,7); ctx.arc(18,0,6,0,7); ctx.fill();
    ctx.restore();
    // shadow
    ctx.fillStyle='rgba(0,0,0,.18)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y+10, 18, 6, 0, 0, 7); ctx.fill();
  }

  // --- controls --------------------------------------------------
  const keys = {};
  window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
  window.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

  // swipe / drag
  let touchActive=false, touchStart=null;
  canvas.addEventListener('pointerdown', e=>{
    touchActive = true;
    touchStart = {x:e.clientX, y:e.clientY};
  });
  window.addEventListener('pointerup', ()=>touchActive=false);
  window.addEventListener('pointermove', e=>{
    if(!touchActive || !touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    const dead=6;
    player.vx = Math.abs(dx)>dead ? Math.sign(dx) : 0;
    player.vy = Math.abs(dy)>dead ? Math.sign(dy) : 0;
  });

  // --- game flow -------------------------------------------------
  function reset(){
    score = 0; lives = 3; timeLeft = 60; gameOver = false;
    ui.score.textContent = score;
    ui.lives.textContent = lives;
    ui.time.textContent = timeLeft;
    statusMsg = 'Ready.';
    player.x = cx; player.y = cy;
    scatterCoins(10);
    spawnCrabs(4);
  }

  reset();

  // timer
  setInterval(()=>{
    if (gameOver) return;
    timeLeft = Math.max(0, timeLeft-1);
    ui.time.textContent = timeLeft;
    if(timeLeft === 0){
      statusMsg = 'Time up!';
      gameOver = true;
      showToast('⏳ Time up!', false);
    }
  }, 1000);

  // --- update ----------------------------------------------------
  function update(dt){
    if (gameOver) return;

    // keyboard -> cartesian movement (WASD/Arrows)
    let mvx = 0, mvy = 0;
    if(keys['arrowleft']||keys['a'])  mvx -= 1;
    if(keys['arrowright']||keys['d']) mvx += 1;
    if(keys['arrowup']||keys['w'])    mvy -= 1;
    if(keys['arrowdown']||keys['s'])  mvy += 1;

    // merge with drag
    mvx = mvx || player.vx;
    mvy = mvy || player.vy;

    // convert screen intent to isometric axes (approx.)
    // moving right means increasing x and decreasing y in iso space
    let ix = (mvx - mvy) * player.spd * (dt*60);
    let iy = (mvx + mvy) * player.spd * (dt*60);

    // attempt move; keep inside map and avoid deep water
    const nx = clamp(player.x + ix, 1, MAP_W-2);
    const ny = clamp(player.y + iy, 1, MAP_H-2);
    const tileIdx = tiles[Math.floor(ny)*MAP_W + Math.floor(nx)];
    if(tileIdx !== 0){ // not deep water
      player.x = nx; player.y = ny;
    }

    // camera follow (lerp)
    const target = cartToIso(player.x, player.y);
    CAMERA.x += (target.x - CAMERA.x) * CAMERA.lerp;
    CAMERA.y += (target.y - CAMERA.y) * CAMERA.lerp;

    // coins
    for(const c of coins){
      if(c.picked) continue;
      const dx = c.x - player.x, dy = c.y - player.y;
      if(dx*dx + dy*dy < (player.r + c.r)**2){
        c.picked = true; score++;
        ui.score.textContent = score;
        statusMsg = 'Nice! +1 MrPi token';
        showToast('🟡 +1 MrPi token');
      }else{
        c.bob += dt*4;
      }
    }

    // enemies
    enemies.forEach(e=>{
      e.t += e.speed * (dt*60);
      // orbit center-ish
      const radius = 6.5;
      e.x = cx + Math.cos(e.t)*(radius + Math.sin(e.t*2)*.6);
      e.y = cy + Math.sin(e.t)*(radius + Math.cos(e.t*2)*.4);

      // collision with player
      const dx=e.x-player.x, dy=e.y-player.y;
      if(dx*dx + dy*dy < (e.r+player.r)**2 && Date.now()-lastShake>700){
        lives = Math.max(0,lives-1);
        ui.lives.textContent = lives;
        statusMsg = 'Ouch! Crab pinch!';
        showToast('🦀 Ouch! -1 life', false);
        lastShake = Date.now();
        if(lives===0){ gameOver=true; statusMsg='Game over'; }
      }
    });

    // win
    if(!gameOver && coins.every(c=>c.picked)){
      statusMsg = 'All tokens collected!';
      showToast('🎉 All tokens!');
      gameOver = true;
    }

    // clear drag intent when not touching
    if(!touchActive){ player.vx = player.vy = 0; }
  }

  // --- draw ------------------------------------------------------
  function draw(){
    // sky
    ctx.clearRect(0,0,canvas.width,canvas.height);

    // draw iso tiles back->front by cartesian y then x
    for(let y=0;y<MAP_H;y++){
      for(let x=0;x<MAP_W;x++){
        const t = tiles[y*MAP_W+x];
        const s = worldToScreen(x, y);
        const cx = s.x, cy = s.y;

        // tile diamond
        const w = TILE_W, h = TILE_H;
        ctx.beginPath();
        ctx.moveTo(cx, cy + h/2);
        ctx.lineTo(cx + w/2, cy);
        ctx.lineTo(cx + w, cy + h/2);
        ctx.lineTo(cx + w/2, cy + h);
        ctx.closePath();

        if(t===0) ctx.fillStyle = '#6fb1d6';           // deep water
        if(t===1) ctx.fillStyle = '#9dd6f0';           // shallow
        if(t===2) ctx.fillStyle = '#3fa763';           // grass
        if(t===3) ctx.fillStyle = '#f2d39b';           // sand
        ctx.fill();

        // subtle highlight edge on upper facet
        if(t>=2){
          ctx.strokeStyle='rgba(255,255,255,.12)';
          ctx.lineWidth=1;
          ctx.beginPath();
          ctx.moveTo(cx + w/2, cy);
          ctx.lineTo(cx + w, cy + h/2);
          ctx.stroke();
        }

        // simple tree on a specific grass spot
        if(t===2 && x===Math.floor(MAP_W*0.62) && y===Math.floor(MAP_H*0.58)){
          // trunk shadow
          ctx.fillStyle='rgba(0,0,0,.22)';
          ctx.beginPath(); ctx.ellipse(cx+w/2, cy+h*.64, 14, 6, 0, 0, 7); ctx.fill();
          // trunk
          ctx.fillStyle='#7b4b27';
          ctx.fillRect(cx+w/2-3, cy+h*.42, 6, 18);
          // crown
          ctx.fillStyle='#2e8b57';
          ctx.beginPath();
          ctx.ellipse(cx+w/2, cy+h*.28, 34, 22, 0, 0, 7);
          ctx.fill();
        }
      }
    }

    // sort drawables by iso screen y for fake depth
    const drawables = [];

    // coins
    for(const c of coins){
      if(c.picked) continue;
      const p = worldToScreen(c.x, c.y);
      drawables.push({
        y: p.y,
        fn: () => {
          // shadow
          ctx.fillStyle = 'rgba(0,0,0,.18)';
          ctx.beginPath(); ctx.ellipse(p.x + TILE_W/2, p.y + TILE_H*.8, 12, 6, 0, 0, 7); ctx.fill();
          // coin
          const bob = Math.sin(c.bob)*2;
          const size = 26;
          ctx.drawImage(imgCoin,
            p.x + TILE_W/2 - size/2,
            p.y + TILE_H*.45 - size/2 - bob,
            size, size);
        }
      });
    }

    // enemies
    enemies.forEach(e=>{
      const p = worldToScreen(e.x, e.y);
      drawables.push({ y:p.y, fn:()=>drawCrab(e) });
    });

    // player
    const pp = worldToScreen(player.x, player.y);
    drawables.push({
      y: pp.y,
      fn: () => {
        // shadow
        ctx.fillStyle='rgba(0,0,0,.22)';
        ctx.beginPath(); ctx.ellipse(pp.x + TILE_W/2, pp.y + TILE_H*.85, 16, 8, 0, 0, 7); ctx.fill();
        // MrPi sprite (scaled down)
        const pw = 38, ph = 38;
        ctx.drawImage(imgPlayer, pp.x + TILE_W/2 - pw/2, pp.y + TILE_H*.55 - ph, pw, ph);
      }
    });

    // draw in order
    drawables.sort((a,b)=>a.y-b.y).forEach(d=>d.fn());

    // HUD status
    ui.status.textContent = statusMsg;
  }

  // --- loop ------------------------------------------------------
  let last = performance.now();
  function loop(now){
    const dt = Math.min(0.033, (now-last)/1000); // clamp
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
