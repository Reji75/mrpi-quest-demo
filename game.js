// Basic isometric "fake 3D" island demo that always renders something

(function () {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  // Resize canvas to the CSS size * device pixel ratio for crispness
  function fitCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width  = Math.round(rect.width  * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(); // redraw after size change
  }

  // Simple island + coins + MrPi placeholder
  const state = {
    score: 0, lives: 3, time: 60,
    px: 0, py: 0, // player offset around center
    coins: []
  };

  function resetCoins() {
    const C = [];
    const R = 120;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      C.push({ x: Math.cos(a) * R, y: Math.sin(a) * R, taken: false });
    }
    state.coins = C;
  }

  function draw() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const cx = w / 2, cy = h / 2;

    // clear
    ctx.clearRect(0, 0, w, h);

    // isometric tile (diamond) ground
    const size = Math.min(w, h) * 0.70;
    const half = size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -half);
    ctx.lineTo(half, 0);
    ctx.lineTo(0, half);
    ctx.lineTo(-half, 0);
    ctx.closePath();
    ctx.fillStyle = '#d6efff';
    ctx.fill();

    // inner grass and sand
    const g = half * 0.82;
    ctx.beginPath();
    ctx.moveTo(0, -g);
    ctx.lineTo(g, 0);
    ctx.lineTo(0, g);
    ctx.lineTo(-g, 0);
    ctx.closePath();
    ctx.fillStyle = '#3b8f48';
    ctx.fill();

    const s = g * 0.55;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s, 0);
    ctx.closePath();
    ctx.fillStyle = '#f2c982';
    ctx.fill();

    // coins
    ctx.font = 'bold 14px system-ui, sans-serif';
    state.coins.forEach(c => {
      if (c.taken) return;
      const x = c.x * 0.6 + state.px * 0.4;
      const y = c.y * 0.6 + state.py * 0.4;
      drawCoin(ctx, x, y);
    });

    // MrPi placeholder (little circle + hat)
    drawMrPi(ctx, state.px, state.py);

    ctx.restore();
  }

  function drawCoin(ctx, x, y) {
    ctx.save();
    ctx.translate(canvas.clientWidth / 2 + x, canvas.clientHeight / 2 + y);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#ffb400';
    ctx.fill();
    ctx.strokeStyle = '#b87400';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffffee';
    ctx.fillText('MrPi', -15, 5);
    ctx.restore();
  }

  function drawMrPi(ctx, x, y) {
    const X = canvas.clientWidth / 2 + x;
    const Y = canvas.clientHeight / 2 + y;
    // body
    ctx.fillStyle = '#1b2a3a';
    ctx.beginPath(); ctx.arc(X, Y, 12, 0, Math.PI * 2); ctx.fill();
    // face
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(X, Y, 9, 0, Math.PI * 2); ctx.fill();
    // hat
    ctx.fillStyle = '#141e28';
    ctx.fillRect(X - 8, Y - 18, 16, 5);
    ctx.fillRect(X - 10, Y - 14, 20, 5);
    // eyes
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(X - 3, Y - 2, 1.5, 0, Math.PI * 2);
    ctx.arc(X + 4, Y - 2, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // Input (drag / swipe / arrows)
  let dragging = false, start=null;
  canvas.addEventListener('pointerdown', e => { dragging = true; start = point(e); move(e); });
  canvas.addEventListener('pointermove', e => dragging && move(e));
  window.addEventListener('pointerup',   () => dragging = false);

  function point(e){
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left - r.width/2, y: e.clientY - r.top - r.height/2 };
  }
  function move(e){
    const p = point(e);
    state.px = Math.max(-90, Math.min(90, p.x));
    state.py = Math.max(-90, Math.min(90, p.y));
    checkCollisions();
    draw();
  }

  window.addEventListener('keydown', e=>{
    const k = e.key.toLowerCase();
    const step = 8;
    if (['arrowup','w'].includes(k)) state.py -= step;
    if (['arrowdown','s'].includes(k)) state.py += step;
    if (['arrowleft','a'].includes(k)) state.px -= step;
    if (['arrowright','d'].includes(k)) state.px += step;
    state.px = Math.max(-90, Math.min(90, state.px));
    state.py = Math.max(-90, Math.min(90, state.py));
    checkCollisions();
    draw();
  });

  function checkCollisions(){
    state.coins.forEach(c=>{
      if (!c.taken){
        const dx = (state.px - c.x), dy = (state.py - c.y);
        if (dx*dx + dy*dy < 22*22){
          c.taken = true;
          document.getElementById('score').textContent =
            String( (parseInt(document.getElementById('score').textContent) || 0) + 1 );
          setStatus('Nice! +1 MrPi token');
        }
      }
    });
  }

  function setStatus(msg){ document.getElementById('status').textContent = msg; }

  // init
  window.addEventListener('resize', fitCanvas, { passive:true });
  resetCoins();
  fitCanvas();
  setStatus('Ready.');
})();
