// ---- MrPi Island Quest — Phaser 3 tilemap demo ----
// Uses only two external images already in your repo:
//  - mrpi_logo_transparent.png
//  - mrpi_token_transparent.png
//
// Everything else (tiles & trees) is generated at runtime.

const TILE = 32;
const MAP_W = 48;      // tiles wide
const MAP_H = 36;      // tiles high
const SPEED = 180;     // player speed
const COINS = 7;       // how many to spawn

// Phaser game config
const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#bfe8ff",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: MAP_W * TILE,
    height: MAP_H * TILE
  },
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: { preload, create, update }
};

let cursors, player, coins, trees, scoreText, score = 0;
let pointerActive = false, pointerVec = new Phaser.Math.Vector2();

new Phaser.Game(config);

// ---------- Scene ----------
function preload() {
  // Player & coin from repo root
  this.load.image("playerImg", "mrpi_logo_transparent.png");
  this.load.image("coinImg",   "mrpi_token_transparent.png");

  // Build a tiny tileset texture (3 tiles in one row): water, sand, grass
  const g = this.make.graphics({ x: 0, y: 0, add: false });
  // Water
  g.fillStyle(0x7ec8f5, 1).fillRoundedRect(0, 0, TILE, TILE, 6);
  // Sand
  g.fillStyle(0xf2d18b, 1).fillRoundedRect(TILE, 0, TILE, TILE, 6);
  // Grass
  g.fillStyle(0x62b85a, 1).fillRoundedRect(TILE*2, 0, TILE, TILE, 6);
  g.generateTexture("tiles", TILE*3, TILE);
  g.clear();

  // Simple tree texture (green blob + trunk)
  const t = this.make.graphics({ x:0, y:0, add:false });
  t.fillStyle(0x2b1709, 1).fillRect(14, 20, 4, 12);
  t.fillStyle(0x2f9448, 1).fillCircle(16, 16, 12);
  t.generateTexture("tree", 32, 32);

  // UI font
  this.load.script("webfont", "https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js");
}

function create() {
  // Create tilemap from generated data
  const data = makeIslandData(MAP_W, MAP_H);
  const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });

  // Add our 3-tile tileset (each tile is 32x32, arranged in a single row)
  const tiles = map.addTilesetImage("tiles", null, TILE, TILE, 0, 0);
  const layer = map.createLayer(0, tiles, 0, 0);

  // Place some trees as static obstacles on grass ring
  trees = this.physics.add.staticGroup();
  placeTreesOnGrassRing(this, data, trees);

  // Player
  player = this.physics.add.image(map.widthInPixels/2, map.heightInPixels/2 + 20, "playerImg");
  const scaleP = 0.20; // adjust if still too small/big
  player.setScale(scaleP).setCircle(player.width*scaleP*0.40).setOffset(
    player.width*scaleP*0.5 - player.body.circle.radius,
    player.height*scaleP*0.55 - player.body.circle.radius
  );
  player.setCollideWorldBounds(true);

  // Coins
  coins = this.physics.add.group();
  scatterCoinsOnSand(this, data, coins);

  // Overlaps & collisions
  this.physics.add.overlap(player, coins, onCoin, null, this);
  this.physics.add.collider(player, trees);

  // Camera
  this.cameras.main.startFollow(player, true, 0.15, 0.15);
  this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

  // Input
  cursors = this.input.keyboard.createCursorKeys();
  this.input.on("pointerdown", (p) => { pointerActive = true; pointerVec.set(0); });
  this.input.on("pointerup",   () => { pointerActive = false; player.setVelocity(0,0); });
  this.input.on("pointermove", (p) => {
    if (!pointerActive) return;
    const worldPoint = p.positionToCamera(this.cameras.main);
    pointerVec.set(worldPoint.x - player.x, worldPoint.y - player.y).limit(SPEED);
    player.setVelocity(pointerVec.x, pointerVec.y);
  });

  // Score text
  scoreText = this.add.text(12, 8, "Score: 0 / " + COINS, {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fontSize: "22px",
    color: "#0c2f45",
    stroke: "#ffffff", strokeThickness: 4
  }).setScrollFactor(0);

  // Win banner (hidden until complete)
  this.winText = this.add.text(config.scale.width/2, 40, "🎉 You collected all tokens!", {
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    fontSize: "24px",
    color: "#0c7a2d",
    stroke: "#ffffff", strokeThickness: 6
  }).setOrigin(0.5, 0).setScrollFactor(0).setVisible(false);
}

function update() {
  // Keyboard movement (if no touch swipe active)
  if (!pointerActive) {
    let vx = 0, vy = 0;
    if (cursors.left.isDown)  vx -= SPEED;
    if (cursors.right.isDown) vx += SPEED;
    if (cursors.up.isDown)    vy -= SPEED;
    if (cursors.down.isDown)  vy += SPEED;
    player.setVelocity(vx, vy);
  }
}

// ---------- Helpers ----------
function makeIslandData(w, h) {
  // Build a simple island: water border, beach (sand) circle, grass ring around sand
  const WATER = 0, SAND = 1, GRASS = 2;
  const cx = Math.floor(w/2), cy = Math.floor(h/2);
  const rSand = Math.min(w, h) * 0.28; // inner sand radius
  const rGrass = rSand * 1.45;         // outer grass radius
  const arr = [];
  for (let y=0; y<h; y++) {
    const row = [];
    for (let x=0; x<w; x++) {
      const dx = x - cx, dy = y - cy;
      const d = Math.sqrt(dx*dx + dy*dy);
      let tile = WATER;
      if (d < rGrass) tile = GRASS;
      if (d < rSand)  tile = SAND;
      row.push(tile);
    }
    arr.push(row);
  }
  return arr;
}

function placeTreesOnGrassRing(scene, data, group) {
  const GRASS = 2, SAND = 1;
  // Drop a handful of trees on grass but not too close to sand center
  const w = data[0].length, h = data.length;
  const tries = 60;
  for (let i=0; i<tries; i++) {
    const tx = Phaser.Math.Between(2, w-3);
    const ty = Phaser.Math.Between(2, h-3);
    if (data[ty][tx] === GRASS && data[ty][tx] !== SAND) {
      const tree = group.create(tx*TILE+TILE/2, ty*TILE+TILE/2, "tree");
      tree.refreshBody();
    }
  }
}

function scatterCoinsOnSand(scene, data, group) {
  const SAND = 1;
  const w = data[0].length, h = data.length;
  let count = 0, guard = 0;
  while (count < COINS && guard < 500) {
    guard++;
    const tx = Phaser.Math.Between(2, w-3);
    const ty = Phaser.Math.Between(2, h-3);
    if (data[ty][tx] === SAND) {
      const c = group.create(tx*TILE+TILE/2, ty*TILE+TILE/2, "coinImg");
      c.setScale(0.085).setCircle(c.width*0.085*0.45).setBounce(0.2);
      c.body.setAllowGravity(false);
      count++;
    }
  }
}

function onCoin(player, coin) {
  coin.disableBody(true, true);
  score++;
  scoreText.setText(`Score: ${score} / ${COINS}`);
  // Tiny pickup tween
  this.tweens.add({ targets: player, scaleX: player.scaleX*1.05, scaleY: player.scaleY*1.05, yoyo: true, duration: 120 });
  if (score >= COINS) this.winText.setVisible(true);
}
