(() => {
  const canvas = document.getElementById('play');
  const ctx = canvas.getContext('2d');

  // --- HUD elements
  const elScore = document.getElementById('score');
  const elLives = document.getElementById('lives');
  const elTime  = document.getElementById('time');
  const elStatus = document.getElementById('status');

  // --- Game state
  const state = {
    w: canvas.width,
    h: canvas.height,
    running: true,
    score: 0,
    lives: 3,
    time: 60,
    dt: 0,
    last: 0,
  };

  // --- World layout (fake isometric diamond)
  const world = {
    cx: canvas.width / 2,
    cy: canvas.height / 2 + 20,
    ringR: [260, 200, 135, 80], // water, grass, sand, inner
  };

  // --- Entities
  const player = {
    x: world.cx,
    y: world.cy - 10,
    r: 14,
    speed: 220, // px/s
    vx: 0, vy: 0
  };

  /** Coins (gold dots) and hazards (red crabs) */
  const coins = [];
  const hazards = [];

  // --- Helpers ---------------------------------------------------------------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  function resetRound() {
    coins.length = 0;
    hazards.length = 0;

    // Scatter 7 coins in the grass ring
    for (let i = 0; i < 7; i++) {
      const ang = rand(0, Math.PI * 2);
      const r = rand(world.ringR[2] + 8, world.ringR[1] - 10);
      coins.push({ x: world.cx + Math.cos(ang) * r, y: world.cy + Math.sin(ang) * r, r: 10, taken: false });
    }

    // A couple of "crabs" circling the outer grass
    for (let i = 0; i < 2; i++) {
      hazards.push({
        t: rand(0, Math.PI * 2),
        speed: (Math.random() < .5 ? -1 : 1) * rand(0.7, 1.1),
        r: world.ringR[1] - 8
      });
    }
  }

  // --- Input (keys + swipe / drag) ------------------------------------------
  const keys = new Set();
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if ('wasd'.includes(k) || ['arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
      keys.add(k); e.preventDefault();
    }
  });
  window.addEventListener('keyup',   e => keys.delete(e.key.toLowerCase()));

  // Touch / pointer: drag to set a direction vector
  let pointer = null;
  function setPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer = {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height)
    };
  }
  canvas.addEventListener('pointerdown', e => { setPointer(e.clientX, e.clientY); });
  canvas.addEventListener('pointermove', e => { if (pointer) setPointer(e.clientX, e.clientY); });
  window.addEventListener('pointerup',   () => { pointer = null; });

  // --- Update & Render -------------------------------------------------------
  function update(dt) {
    // Keys -> velocity
    let vx = 0, vy = 0;
    if (keys.has('arrowleft') || keys.has('a'))  vx -= 1;
    if (keys.has('arrowright')|| keys.has('d'))  vx += 1;
    if (keys.has('arrowup')   || keys.has('w'))  vy -= 1;
    if (keys.has('arrowdown') || keys.has('s'))  vy += 1;

    // Pointer drag -> move toward pointer
    if (pointer) {
      const dx = pointer.x - player.x;
      const dy = pointer.y - player.y;
      const len = Math.hypot(dx, dy) || 1;
      vx = dx / len; vy = dy / len;
    }

    // Normalize & apply speed
    if (vx || vy) {
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
      player.x += vx * player.speed * dt;
      player.y += vy * player.speed * dt;
    }

    // Keep the player inside the grass ring
    const dx = player.x - world.cx;
    const dy = player.y - world.cy;
    const dist = Math.hypot(dx, dy);
    const maxR = world.ringR[1] - 10;
    if (dist > maxR) {
      const k = maxR / dist;
      player.x = world.cx + dx * k;
      player.y = world.cy + dy * k;
    }

    // Coins: collect
    for (const c of coins) {
      if (!c.taken && Math.hypot(player.x - c.x, player.y - c.y) < player.r + c.r) {
        c.taken = true;
        state.score += 1;
        elScore.textContent = state.score;
        setStatus(`Nice! +1 MrPi token`);
      }
    }

    // Hazards: move and collide
    for (const h of hazards) {
      h.t += dt * h.speed;
      const x = world.cx + Math.cos(h.t) * h.r;
      const y = world.cy + Math.sin(h.t) * h.r;
      if (Math.hypot(player.x - x, player.y - y) < player.r + 10) {
        // hit
        state.lives = Math.max(0, state.lives - 1);
        elLives.textContent = state.lives;
        setStatus('Ouch! Crab pinch 🦀', true);
        // knock back a bit
        const ndx = (player.x - x) || 1;
        const ndy = (player.y - y);
        const nlen = Math.hypot(ndx, ndy) || 1;
        player.x += (ndx / nlen) * 20;
        player.y += (ndy / nlen) * 20;
      }
    }
  }

  function drawIsland() {
    // Sky gradient background (inside canvas)
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#bfe6ff');
    sky.addColorStop(1, '#dff3ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0,0,canvas.width, canvas.height);

    // Isometric diamond frame
    ctx.save();
    ctx.translate(world.cx, world.cy);
    ctx.rotate(Math.PI/4);

    // water -> grass -> sand
    const layers = [
      { r: world.ringR[0], col: '#bfe0ff' },
      { r: world.ringR[1], col: '#3ea35a' },
      { r: world.ringR[2], col: '#f1d08a' },
    ];
    for (const L of layers) {
      ctx.fillStyle = L.col;
      ctx.beginPath();
      ctx.moveTo(0, -L.r);
      ctx.lineTo(L.r, 0);
      ctx.lineTo(0, L.r);
      ctx.lineTo(-L.r, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // A simple tree (top-down-ish)
    const tree = { x: world.cx + 80, y: world.cy - 10 };
    ctx.fillStyle = '#5c3b1e';
    ctx.fillRect(tree.x - 4, tree.y + 12, 8, 28);
    ctx.beginPath();
    ctx.fillStyle = '#2f8848';
    ctx.arc(tree.x, tree.y, 34, 0, Math.PI*2);
    ctx.fill();
  }

  function drawCoins() {
    for (const c of coins) {
      if (c.taken) continue;
      const g = ctx.createRadialGradient(c.x-3,c.y-3,2, c.x,c.y,c.r+3);
      g.addColorStop(0, '#fff9b7');
      g.addColorStop(0.4, '#ffd95e');
      g.addColorStop(1, '#ffad14');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI*2);
      ctx.fill();

      // rim
      ctx.strokeStyle = '#d98100';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r-1.5, 0, Math.PI*2);
      ctx.stroke();

      // tiny "MrPi" mark
      ctx.fillStyle = '#7a4a00';
      ctx.font = 'bold 10px system-ui,Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('MrPi', c.x, c.y);
    }
  }

  function drawHazards() {
    ctx.fillStyle = '#e84747';
    ctx.strokeStyle = '#b51f1f';
    for (const h of hazards) {
      const x = world.cx + Math.cos(h.t) * h.r;
      const y = world.cy + Math.sin(h.t) * h.r;

      // body
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI*2);
      ctx.fill();
      ctx.stroke();

      // eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x-3, y-2, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+3, y-2, 2, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x-3, y-2, 1, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x+3, y-2, 1, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e84747';
    }
  }

  function drawPlayer() {
    // Panda-like circle + hat (super simple)
    // body shadow
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath(); ctx.ellipse(player.x+2, player.y+12, 14, 6, 0, 0, Math.PI*2); ctx.fill();

    // head
    ctx.beginPath(); ctx.fillStyle = '#fff';
    ctx.arc(player.x, player.y, player.r, 0, Math.PI*2); ctx.fill();

    // ears
    ctx.fillStyle = '#20262b';
    ctx.beginPath(); ctx.arc(player.x-9, player.y-9, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(player.x+9, player.y-9, 5, 0, Math.PI*2); ctx.fill();

    // eyes
    ctx.fillStyle = '#20262b';
    ctx.beginPath(); ctx.arc(player.x-5, player.y-2, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(player.x+5, player.y-2, 3, 0, Math.PI*2); ctx.fill();

    // hat
    ctx.fillStyle = '#2a2f36';
    ctx.fillRect(player.x-12, player.y-18, 24, 5);
    ctx.beginPath(); ctx.ellipse(player.x, player.y-20, 12, 6, 0, 0, Math.PI*2); ctx.fill();
  }

  function render() {
    drawIsland();
    drawCoins();
    drawHazards();
    drawPlayer();
  }

  // --- Status text -----------------------------------------------------------
  let statusTimer = 0;
  function setStatus(text, warn=false) {
    elStatus.textContent = text;
    elStatus.classList.toggle('warn', !!warn);
    statusTimer = 1.6; // seconds
  }

  // --- Timer -----------------------------------------------------------------
  let timeTick = 0;
  function tickTimer(dt) {
    timeTick += dt;
    if (timeTick >= 1) {
      timeTick = 0;
      state.time = Math.max(0, state.time - 1);
      elTime.textContent = state.time;
      if (state.time === 0) {
        state.running = false;
        setStatus('Time! Final score: '+state.score, true);
      }
    }
  }

  // --- Game loop -------------------------------------------------------------
  function loop(t) {
    if (!state.last) state.last = t;
    state.dt = Math.min(0.033, (t - state.last) / 1000);
    state.last = t;

    if (state.running) {
      update(state.dt);
      tickTimer(state.dt);
      if (statusTimer > 0) {
        statusTimer -= state.dt;
        if (statusTimer <= 0) { elStatus.textContent = 'Ready.'; elStatus.classList.remove('warn'); }
      }
    }

    render();
    requestAnimationFrame(loop);
  }

  // --- Init ------------------------------------------------------------------
  function resizeCanvas() {
    // Square canvas that fits the panel
    const rect = canvas.getBoundingClientRect();
    const cssSize = Math.min(rect.width, rect.height);
    // keep internal resolution fixed (already 640x640) for crisp drawing
  }
  window.addEventListener('resize', resizeCanvas);

  function start() {
    elScore.textContent = state.score;
    elLives.textContent = state.lives;
    elTime.textContent  = state.time;
    resetRound();
    requestAnimationFrame(loop);
  }

  start();
})();
