/* MrPi Island Quest — clean 2D starter
   Controls: Arrow keys / WASD, or swipe/drag inside the canvas.
*/
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Device-pixel sharpness
  function fitDPR() {
    const cssSize = Math.min(canvas.parentElement.clientWidth * 0.94, 512);
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    canvas.style.width = cssSize + 'px';
    canvas.style.height = cssSize + 'px';
    canvas.width = Math.round(cssSize * dpr);
    canvas.height = Math.round(cssSize * dpr);
    scale = canvas.width; // keep square
  }
  window.addEventListener('resize', fitDPR);

  // Assets
  const playerImg = new Image();
  playerImg.src = 'mrpi_logo_transparent.png';
  const coinImg = new Image();
  coinImg.src = 'mrpi_token_transparent.png';

  // World
  let scale = canvas.width;
  const world = {
    size: 1, // normalized 1x1 square
    island: { center: {x: 0.5, y: 0.5}, sandR: 0.23, grassR: 0.38, shallowR: 0.47 },
  };

  const player = {
    x: 0.5, y: 0.5,
    r: 0.035,              // radius in normalized space
    speed: 0.5,            // per second (normalized units)
    vx: 0, vy: 0
  };

  const GOAL = 7;
  const coins = [];
  let score = 0;
  const scoreEl = document.getElementById('score');
  document.getElementById('goal').textContent = GOAL;
  const statusEl = document.getElementById('status');

  // Spawn coins on the sand ring
  function spawnCoins(n = GOAL) {
    coins.length = 0;
    const { center, sandR, grassR } = world.island;
    for (let i = 0; i < n; i++) {
      let ok = false, px, py;
      for (let tries = 0; tries < 50 && !ok; tries++) {
        const ang = Math.random() * Math.PI * 2;
        const rad = sandR + (grassR - sandR) * Math.random() * 0.9;
        px = center.x + Math.cos(ang) * rad;
        py = center.y + Math.sin(ang) * rad;
        ok = true;
        // keep coins apart
        for (const c of coins) {
          const d2 = (c.x - px)**2 + (c.y - py)**2;
          if (d2 < 0.015**2) { ok = false; break; }
        }
      }
      coins.push({ x: px, y: py, r: 0.028, a: Math.random()*Math.PI*2 });
    }
  }

  function resetGame() {
    player.x = 0.5; player.y = 0.5; player.vx = 0; player.vy = 0;
    score = 0; scoreEl.textContent = score; statusEl.textContent = 'Ready.';
    spawnCoins(GOAL);
  }

  // Input: keyboard
  const keys = {};
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (['arrowup','w','arrowdown','s','arrowleft','a','arrowright','d'].includes(k)) {
      keys[k] = true; e.preventDefault();
    }
  }, {passive:false});
  window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

  // Input: swipe/drag -> velocity
  let touchId = null, touchStart = null;
  function normFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const cx = (('clientX' in e) ? e.clientX : e.touches[0].clientX) - rect.left;
    const cy = (('clientY' in e) ? e.clientY : e.touches[0].clientY) - rect.top;
    return { x: cx / rect.width, y: cy / rect.height };
  }
  canvas.addEventListener('pointerdown', e => {
    touchId = e.pointerId; touchStart = normFromEvent(e);
    canvas.setPointerCapture(touchId);
  });
  canvas.addEventListener('pointermove', e => {
    if (touchId === e.pointerId && touchStart) {
      const now = normFromEvent(e);
      const dx = now.x - touchStart.x;
      const dy = now.y - touchStart.y;
      const mag = Math.hypot(dx, dy);
      const max = 0.15;
      const f = mag > 0 ? Math.min(1, mag / max) : 0;
      const ang = Math.atan2(dy, dx);
      player.vx = Math.cos(ang) * player.speed * f;
      player.vy = Math.sin(ang) * player.speed * f;
    }
  });
  canvas.addEventListener('pointerup', e => {
    if (touchId === e.pointerId) {
      player.vx = player.vy = 0;
      touchId = null; touchStart = null;
      canvas.releasePointerCapture(e.pointerId);
    }
  });

  // Helpers
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  function update(dt) {
    // Keyboard velocity
    let ax = 0, ay = 0;
    if (keys['arrowup'] || keys['w']) ay -= 1;
    if (keys['arrowdown'] || keys['s']) ay += 1;
    if (keys['arrowleft'] || keys['a']) ax -= 1;
    if (keys['arrowright'] || keys['d']) ax += 1;
    if (ax || ay) {
      const m = Math.hypot(ax, ay) || 1;
      player.vx = (ax / m) * player.speed;
      player.vy = (ay / m) * player.speed;
    } else if (!touchStart) {
      // if not dragging, slow to stop
      player.vx *= 0.9; player.vy *= 0.9;
      if (Math.hypot(player.vx, player.vy) < 0.0005) player.vx = player.vy = 0;
    }

    // Integrate & clamp within shallow water circle
    const { center, shallowR } = world.island;
    player.x = clamp(player.x + player.vx * dt, center.x - shallowR, center.x + shallowR);
    player.y = clamp(player.y + player.vy * dt, center.y - shallowR, center.y + shallowR);

    // Snap back inside circle border if pushed out
    const dx = player.x - center.x;
    const dy = player.y - center.y;
    const dist = Math.hypot(dx, dy);
    const maxR = shallowR - player.r * 0.6;
    if (dist > maxR) {
      const k = maxR / dist;
      player.x = center.x + dx * k;
      player.y = center.y + dy * k;
    }

    // Collect coins
    for (const c of coins) {
      if (!c.collected) {
        const d = Math.hypot(player.x - c.x, player.y - c.y);
        if (d < player.r + c.r * 0.85) {
          c.collected = true;
          score++; scoreEl.textContent = score;
          statusEl.textContent = 'Nice! +1 MrPi token';
        }
      }
    }

    // Win
    if (score >= GOAL) statusEl.textContent = '🎉 You collected them all!';
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // ocean gradient
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#dff1ff'); g.addColorStop(1, '#cfe9ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

    // island rings (normalized -> px)
    const toPx = v => v * w;
    const { center, sandR, grassR, shallowR } = world.island;

    // shallow water
    ctx.fillStyle = '#9ad2ff';
    ctx.beginPath();
    ctx.arc(toPx(center.x), toPx(center.y), toPx(shallowR), 0, Math.PI*2);
    ctx.fill();

    // grass
    ctx.fillStyle = '#3ea652';
    ctx.beginPath();
    ctx.arc(toPx(center.x), toPx(center.y), toPx(grassR), 0, Math.PI*2);
    ctx.fill();

    // sand
    const sandGrad = ctx.createRadialGradient(
      toPx(center.x), toPx(center.y), toPx(sandR*0.2),
      toPx(center.x), toPx(center.y), toPx(sandR)
    );
    sandGrad.addColorStop(0, '#f6dc9c');
    sandGrad.addColorStop(1, '#e8c87d');
    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    ctx.arc(toPx(center.x), toPx(center.y), toPx(sandR), 0, Math.PI*2);
    ctx.fill();

    // (optional) tree
    ctx.fillStyle = '#2b7a3f';
    ctx.beginPath();
    ctx.arc(toPx(center.x + 0.16), toPx(center.y - 0.02), toPx(0.075), 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#6a421f';
    ctx.fillRect(toPx(center.x + 0.156), toPx(center.y + 0.02), toPx(0.008), toPx(0.05));

    // coins
    for (const c of coins) {
      if (c.collected) continue;
      c.a += 0.04; // tiny spin wobble
      const size = toPx(c.r) * (1 + Math.sin(c.a)*0.05);
      ctx.drawImage(
        coinImg,
        toPx(c.x) - size, toPx(c.y) - size,
        size*2, size*2
      );
    }

    // player
    const pSize = toPx(player.r)*2.2;
    ctx.drawImage(playerImg, toPx(player.x)-pSize/2, toPx(player.y)-pSize*0.95, pSize, pSize);
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000); // clamp delta
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function startWhenReady() {
    if (playerImg.complete && coinImg.complete) {
      fitDPR();
      resetGame();
      requestAnimationFrame(loop);
    } else {
      setTimeout(startWhenReady, 60);
    }
  }
  startWhenReady();
})();
