/* MrPi Island Quest – multi-enemy build
   - Movement: arrow keys / WASD / swipe-drag
   - Collect tokens for score
   - Avoid crabs (enemies). Touch = lose a life + respawn.
   - Tweakable settings are at the top (ENEMY_COUNT, SPEEDS, etc.)
*/

(() => {
  // ---------- Tweakable settings ----------
  const CANVAS_SIZE = 560;           // drawing size (auto fits via CSS)
  const RINGS = { inner: 110, grass: 180, water: 250 }; // island radii
  const PLAYER_SPEED = 2.2;
  const ENEMY_COUNT = 5;             // how many crabs to spawn
  const ENEMY_BASE_SPEED = 0.012;    // radians per frame (baseline)
  const ENEMY_SPEED_JITTER = 0.01;   // each crab gets ± this extra
  const ENEMY_PATROLS = ['grass','water']; // which rings crabs use
  const START_LIVES = 3;
  const TOKEN_COUNT = 7;
  const COLLIDE_RADIUS = 16;         // player <> coin/crab hit radius (px)
  const STATUS_HOLD_MS = 1200;

  // ---------- DOM ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  // Make sure canvas is square and crisp on high DPI
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  canvas.width  = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  canvas.style.width  = CANVAS_SIZE + 'px';
  canvas.style.height = CANVAS_SIZE + 'px';
  ctx.scale(dpr, dpr);

  // Score / status elements (be tolerant of different IDs)
  const scoreEl  =
    document.getElementById('score') ||
    document.getElementById('scoreText') ||
    document.querySelector('[data-score]') ||
    document.querySelector('.score');
  const statusEl =
    document.getElementById('status') ||
    document.getElementById('statusText') ||
    document.querySelector('[data-status]') ||
    document.querySelector('.status');

  function setStatus(msg, color = '#2e7d32') {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = color;
    // clear after a bit (unless it's Game Over / Victory)
    if (!/over|victory/i.test(msg)) {
      clearTimeout(setStatus._t);
      setStatus._t = setTimeout(() => (statusEl.textContent = 'Ready.'), STATUS_HOLD_MS);
    }
  }

  function setScore() {
    if (!scoreEl) return;
    scoreEl.textContent = `${state.score} / ${TOKEN_COUNT}`;
  }

  // ---------- Helpers ----------
  const C = { x: CANVAS_SIZE / 2, y: CANVAS_SIZE / 2 }; // canvas center

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function dist(a, b) {
    const dx = a.x - b.x, dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }
  function ringPoint(radius, angle) {
    return { x: C.x + Math.cos(angle) * radius, y: C.y + Math.sin(angle) * radius };
  }
  function random(min, max) { return min + Math.random() * (max - min); }

  // ---------- Assets (simple/fast: draw with shapes + emoji) ----------
  function drawMrPi(x, y) {
    // tiny body
    ctx.save();
    ctx.translate(x, y);
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
    // face
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -2, 9, 0, Math.PI * 2); ctx.fill();
    // eyes
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(-3, -3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc( 3, -3, 2, 0, Math.PI * 2); ctx.fill();
    // hat
    ctx.fillStyle = '#30323a';
    ctx.fillRect(-8, -18, 16, 4);
    ctx.fillRect(-6, -22, 12, 6);
    ctx.restore();
  }

  function drawToken(x, y) {
    // golden coin
    const r = 10;
    const grd = ctx.createRadialGradient(x - 6, y - 6, 4, x, y, r + 2);
    grd.addColorStop(0, '#fff59d');
    grd.addColorStop(1, '#f9a825');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#bf7e0a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r - 2, 0, Math.PI * 2); ctx.stroke();
    // MrPi text dot
    ctx.fillStyle = '#954f00';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MrPi', x, y+0.5);
  }

  function drawCrab(x, y) {
    // simple crab icon (red body + claws)
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();     // body
    ctx.beginPath(); ctx.arc(-12, -2, 4, 0, Math.PI * 2); ctx.fill();   // left claw
    ctx.beginPath(); ctx.arc( 12, -2, 4, 0, Math.PI * 2); ctx.fill();   // right claw
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(-4, -3, 1.6, 0, Math.PI * 2); ctx.fill();  // eyes
    ctx.beginPath(); ctx.arc( 4, -3, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- World state ----------
  const state = {
    player: { x: C.x, y: C.y, lives: START_LIVES },
    score: 0,
    tokens: [],
    enemies: []
  };

  function spawnTokens() {
    state.tokens.length = 0;
    // distribute on grass ring band
    for (let i = 0; i < TOKEN_COUNT; i++) {
      const angle = random(0, Math.PI * 2);
      const radius = random(RINGS.inner + 18, RINGS.grass - 18);
      const p = ringPoint(radius, angle);
      state.tokens.push({ x: p.x, y: p.y, taken: false });
    }
  }

  class Enemy {
    constructor(ringName, startAngle, speed) {
      this.ringName = ringName; // 'grass' or 'water'
      this.r = RINGS[ringName];
      this.a = startAngle;
      this.speed = speed; // radians per frame
      this.x = 0; this.y = 0;
      this.updatePos();
    }
    updatePos() {
      const p = ringPoint(this.r, this.a);
      this.x = p.x; this.y = p.y;
    }
    step() {
      this.a += this.speed;
      // wrap
      if (this.a > Math.PI * 2) this.a -= Math.PI * 2;
      if (this.a < 0) this.a += Math.PI * 2;
      this.updatePos();
    }
    draw() { drawCrab(this.x, this.y); }
  }

  function spawnEnemies() {
    state.enemies.length = 0;
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const ringName = ENEMY_PATROLS[i % ENEMY_PATROLS.length];
      const a = random(0, Math.PI * 2);
      const dir = Math.random() < 0.5 ? -1 : 1;
      const s = dir * (ENEMY_BASE_SPEED + random(0, ENEMY_SPEED_JITTER));
      state.enemies.push(new Enemy(ringName, a, s));
    }
  }

  function resetPlayer() {
    state.player.x = C.x;
    state.player.y = C.y;
  }

  function respawn() {
    resetPlayer();
    setStatus(`Ouch! -1 life`, '#c62828');
  }

  // ---------- Input ----------
  const keys = new Set();
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if ('wasd'.includes(k) || ['arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
      e.preventDefault();
    }
    keys.add(k);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

  // touch / drag
  let dragging = false, dragStart = null;
  function pointerPos(ev) {
    const r = canvas.getBoundingClientRect();
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    const y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - r.top;
    return { x: clamp(x, 0, CANVAS_SIZE), y: clamp(y, 0, CANVAS_SIZE) };
  }
  canvas.addEventListener('pointerdown', (e) => { dragging = true; dragStart = pointerPos(e); });
  canvas.addEventListener('pointerup',   ()  => { dragging = false; dragStart = null; });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = pointerPos(e);
    const dx = p.x - (dragStart?.x ?? p.x);
    const dy = p.y - (dragStart?.y ?? p.y);
    state.player.x = clamp(state.player.x + dx * 0.05, C.x - RINGS.water + 8, C.x + RINGS.water - 8);
    state.player.y = clamp(state.player.y + dy * 0.05, C.y - RINGS.water + 8, C.y + RINGS.water - 8);
    dragStart = p;
  }, { passive: true });

  // ---------- Update ----------
  function update() {
    // keyboard movement
    let vx = 0, vy = 0;
    if (keys.has('arrowleft') || keys.has('a')) vx -= PLAYER_SPEED;
    if (keys.has('arrowright')|| keys.has('d')) vx += PLAYER_SPEED;
    if (keys.has('arrowup')   || keys.has('w')) vy -= PLAYER_SPEED;
    if (keys.has('arrowdown') || keys.has('s')) vy += PLAYER_SPEED;
    if (vx || vy) {
      state.player.x = clamp(state.player.x + vx, C.x - RINGS.water + 8, C.x + RINGS.water - 8);
      state.player.y = clamp(state.player.y + vy, C.y - RINGS.water + 8, C.y + RINGS.water - 8);
    }

    // enemies patrol
    for (const e of state.enemies) e.step();

    // collisions: coins
    for (const t of state.tokens) {
      if (!t.taken && dist(t, state.player) < COLLIDE_RADIUS) {
        t.taken = true;
        state.score++;
        setScore();
        setStatus('Nice! +1 MrPi token', '#2e7d32');
      }
    }

    // collisions: enemies
    for (const e of state.enemies) {
      if (dist(e, state.player) < COLLIDE_RADIUS) {
        // Hit!
        state.player.lives--;
        if (state.player.lives <= 0) {
          setStatus('Game Over!', '#c62828');
          stop();
          return;
        } else {
          respawn();
        }
      }
    }

    // win?
    if (state.score >= TOKEN_COUNT) {
      setStatus('Victory! You collected all tokens!', '#1565c0');
      stop();
      return;
    }
  }

  // ---------- Draw ----------
  function drawIsland() {
    // water ring
    ctx.fillStyle = '#cfe9ff';
    ctx.beginPath(); ctx.arc(C.x, C.y, RINGS.water, 0, Math.PI * 2); ctx.fill();
    // grass ring
    ctx.fillStyle = '#3aa15b';
    ctx.beginPath(); ctx.arc(C.x, C.y, RINGS.grass, 0, Math.PI * 2); ctx.fill();
    // sand
    const sandGrad = ctx.createRadialGradient(C.x, C.y, 20, C.x, C.y, RINGS.inner);
    sandGrad.addColorStop(0, '#f8e1a0');
    sandGrad.addColorStop(1, '#e6c77a');
    ctx.fillStyle = sandGrad;
    ctx.beginPath(); ctx.arc(C.x, C.y, RINGS.inner, 0, Math.PI * 2); ctx.fill();
    // a simple tree
    ctx.fillStyle = '#2f7d32';
    ctx.beginPath(); ctx.arc(C.x + 60, C.y - 10, 35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5c3d1e';
    ctx.fillRect(C.x + 57, C.y + 20, 6, 20);
  }

  function render() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    drawIsland();

    // tokens
    for (const t of state.tokens) if (!t.taken) drawToken(t.x, t.y);
    // enemies
    for (const e of state.enemies) e.draw();
    // player
    drawMrPi(state.player.x, state.player.y);
  }

  // ---------- Loop ----------
  let raf = null;
  function frame() {
    update();
    render();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(frame);
  }
  function stop() { cancelAnimationFrame(raf); }

  // ---------- Init ----------
  function resetGame() {
    state.score = 0;
    state.player.lives = START_LIVES;
    resetPlayer();
    spawnTokens();
    spawnEnemies();
    setScore();
    setStatus('Ready.');
    start();
  }

  // Start immediately
  resetGame();

  // Expose a tiny API for future buttons/debug
  window.MrPiGame = {
    reset: resetGame,
    addEnemy() { state.enemies.push(new Enemy('grass', random(0, Math.PI*2), ENEMY_BASE_SPEED)); },
  };
})();
