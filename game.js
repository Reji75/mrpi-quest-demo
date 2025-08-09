// game.js — MrPi Island Quest (isometric-look, full-screen fix)

// ---- Phaser config ---------------------------------------------------------
const GAME_BG = 0x7ec6e8; // ocean blue (fills everything)
const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: GAME_BG,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,   // logical canvas size (will scale to fit)
    height: 720
  },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: { preload, create, update }
};

let game = new Phaser.Game(config);

// ---- helpers ---------------------------------------------------------------
function drawDiamond(g, cx, cy, w, h, fill, alpha = 1, line = 0x000000, lw = 0) {
  const pts = [
    { x: cx,     y: cy - h / 2 }, // top
    { x: cx + w / 2, y: cy },     // right
    { x: cx,     y: cy + h / 2 }, // bottom
    { x: cx - w / 2, y: cy }      // left
  ];
  g.fillStyle(fill, alpha);
  g.lineStyle(lw, line, lw ? 1 : 0);
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.closePath();
  g.fillPath();
  if (lw) g.strokePath();
}

// ---- scene state -----------------------------------------------------------
let player, cursors, keys, tokens, scoreText, statusText;
let pointerTarget = null;
let islandBounds = { cx: 0, cy: 0, w: 0, h: 0, innerW: 0, innerH: 0 };

// ---- preload ---------------------------------------------------------------
function preload() {
  this.load.image('player', 'mrpi_logo_transparent.png');
  this.load.image('token',  'mrpi_token_transparent.png');
}

// ---- create ---------------------------------------------------------------
function create() {
  const W = this.scale.width;
  const H = this.scale.height;
  const cx = W / 2;
  const cy = H * 0.52;

  // Fill background (prevents any black bars)
  this.cameras.main.setBackgroundColor(GAME_BG);

  // Draw “isometric” island layers (diamonds)
  const g = this.add.graphics();
  const size = Math.min(W, H) * 0.92; // overall island footprint
  const waterW = size, waterH = size * 0.62;
  const grassW = waterW * 0.78, grassH = waterH * 0.78;
  const sandW  = grassW * 0.60, sandH  = grassH * 0.60;

  drawDiamond(g, cx, cy, waterW, waterH, 0xbfe7ff); // outer water
  drawDiamond(g, cx, cy, grassW, grassH, 0x3aa85b); // island grass
  drawDiamond(g, cx, cy, sandW,  sandH,  0xf3d59b); // beach/sand
  // subtle outline
  drawDiamond(g, cx, cy, grassW, grassH, 0xffffff, 0, 0x1b3a4b, 2);

  // record bounds for clamping (movement kept within “grass”)
  islandBounds = { cx, cy, w: grassW, h: grassH, innerW: sandW, innerH: sandH };

  // Player
  const pScale = sandW / 900; // scales nicely across devices
  player = this.physics.add.image(cx, cy - sandH * 0.1, 'player')
    .setScale(pScale)
    .setCollideWorldBounds(true)
    .setDepth(10);

  // World bounds = canvas (we clamp to island manually)
  this.physics.world.setBounds(0, 0, W, H);

  // Tokens in a ring on the sand
  tokens = this.physics.add.group();
  const ringR = (sandW / 2) * 0.75;
  const tokenCount = 7;
  for (let i = 0; i < tokenCount; i++) {
    const a = (i / tokenCount) * Math.PI * 2 + Math.PI / 8;
    const tx = cx + Math.cos(a) * ringR;
    const ty = cy + Math.sin(a) * (ringR * 0.62); // squash for iso look
    const t = tokens.create(tx, ty, 'token').setScale(pScale * 0.8).setDepth(5);
    t.body.setCircle((t.width * t.scaleX) / 2);
  }

  // Score UI
  const style = { fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto',
                  fontSize: '28px', color: '#112', fontStyle: '700' };
  scoreText = this.add.text(W / 2, H - 40, `Score: 0 / ${tokenCount}`, style)
    .setOrigin(0.5, 0.5)
    .setDepth(20);
  statusText = this.add.text(W / 2, H - 10, `Ready.`, { ...style, fontSize: '20px', color: '#155' })
    .setOrigin(0.5, 1)
    .setDepth(20);

  // Collect overlap
  this.physics.add.overlap(player, tokens, (_, coin) => {
    coin.disableBody(true, true);
    const collected = tokenCount - tokens.countActive(true);
    scoreText.setText(`Score: ${collected} / ${tokenCount}`);
    statusText.setText(collected === tokenCount ? 'All tokens collected! 🎉' : 'Nice! +1 MrPi token');
  });

  // Input: keyboard
  cursors = this.input.keyboard.createCursorKeys();
  keys = this.input.keyboard.addKeys('W,A,S,D');

  // Input: tap / drag toward point
  this.input.on('pointerdown', p => (pointerTarget = { x: p.x, y: p.y }));
  this.input.on('pointermove', p => { if (p.isDown) pointerTarget = { x: p.x, y: p.y }; });
  this.input.on('pointerup', () => (pointerTarget = null));

  // Resize handler keeps everything centered
  this.scale.on('resize', () => {
    this.scene.restart(); // simple + robust: redraw island to new size
  });
}

// ---- update ---------------------------------------------------------------
function update(time, delta) {
  if (!player) return;

  const speed = 180;
  let vx = 0, vy = 0;

  // Keyboard move
  if (cursors.left.isDown || keys.A.isDown) vx -= speed;
  if (cursors.right.isDown || keys.D.isDown) vx += speed;
  if (cursors.up.isDown || keys.W.isDown) vy -= speed;
  if (cursors.down.isDown || keys.S.isDown) vy += speed;

  // Pointer chase (if active)
  if (pointerTarget && vx === 0 && vy === 0) {
    const dx = pointerTarget.x - player.x;
    const dy = pointerTarget.y - player.y;
    const len = Math.hypot(dx, dy) || 1;
    const follow = Math.min(len, speed);
    vx = (dx / len) * follow;
    vy = (dy / len) * follow;
  }

  player.setVelocity(vx, vy);

  // Clamp inside the grass diamond for better “island” feel
  const { cx, cy, w, h } = islandBounds;
  // Convert to diamond “Manhattan-like” boundary check
  const rx = Math.abs(player.x - cx) / (w / 2);
  const ry = Math.abs(player.y - cy) / (h / 2);
  if (rx + ry > 1) {
    // push back toward center a bit
    const dirx = Math.sign(player.x - cx) || 1;
    const diry = Math.sign(player.y - cy) || 1;
    player.x -= dirx * 2;
    player.y -= diry * 2;
    player.setVelocity(0, 0);
  }
}
