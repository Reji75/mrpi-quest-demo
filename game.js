/* MrPi Island Quest — Free Roam Starter (Phaser 3)
 * Uses existing assets:
 *   - mrpi_logo_transparent.png (player)
 *   - mrpi_token_transparent.png (coin)
 */

const UI = {
  scoreEl: null,
  livesEl: null,
  statusEl: null,
  setScore(v){ this.scoreEl.textContent = v; },
  setLives(v){ this.livesEl.textContent = v; },
  setStatus(t){ this.statusEl.textContent = t; }
};

// --- Phaser config -----------------------------------------------------------
const GAME_W = 900;   // virtual world width
const GAME_H = 900;   // virtual world height

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#bfe8ff',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: { preload, create, update }
};

let game = new Phaser.Game(config);

// --- Scene globals -----------------------------------------------------------
let player, cursors, pointerActive = false, pointerVec = new Phaser.Math.Vector2();
let coins, chests, hazards;
let score = 0, lives = 3;
let island = { cx: GAME_W/2, cy: GAME_H/2, sandR: 250, grassR: 360, waterR: 430 };

function preload(){
  // Core art
  this.load.image('mrpi', 'mrpi_logo_transparent.png');
  this.load.image('coin', 'mrpi_token_transparent.png');

  // Simple generated textures (chest & crab) via canvas
  makeSimpleTextures(this);
}

function create(){
  // Hook up UI
  UI.scoreEl = document.getElementById('score');
  UI.livesEl = document.getElementById('lives');
  UI.statusEl = document.getElementById('status');
  UI.setScore(score); UI.setLives(lives);

  // Draw island (water / grass / sand)
  drawIsland(this);

  // World bounds
  this.physics.world.setBounds(0, 0, GAME_W, GAME_H);

  // Player
  player = this.physics.add.image(island.cx, island.cy, 'mrpi');
  player.setCircle(player.width * 0.22).setOffset(player.width*0.28, player.height*0.28); // nicer collisions
  player.setScale(0.22).setDepth(10);
  player.setCollideWorldBounds(true);
  player.speed = 180;
  player.slowFactor = 0.55; // in water

  // Camera follow
  this.cameras.main.setZoom(1.0);
  this.cameras.main.startFollow(player, true, 0.12, 0.12);

  // Coins
  coins = this.physics.add.staticGroup();
  spawnCoins(this, 7);

  // Surprise chests
  chests = this.physics.add.staticGroup();
  spawnChests(this, 2);

  // Hazards (crabs)
  hazards = this.physics.add.group();
  spawnCrab(this);

  // Overlaps
  this.physics.add.overlap(player, coins, collectCoin, null, this);
  this.physics.add.overlap(player, chests, openChest, null, this);
  this.physics.add.overlap(player, hazards, hitHazard, null, this);

  // Input
  cursors = this.input.keyboard.createCursorKeys();

  // Pointer drag-to-move
  this.input.on('pointerdown', (p)=>{
    pointerActive = true;
    pointerVec.set(p.worldX, p.worldY);
  });
  this.input.on('pointermove', (p)=>{
    if(pointerActive){ pointerVec.set(p.worldX, p.worldY); }
  });
  this.input.on('pointerup', ()=>{ pointerActive = false; player.setAcceleration(0); });

  UI.setStatus('Collect coins. Beware the crab!');
}

function update(time, delta){
  // Free movement — keyboard
  const accel = 600;
  let ax = 0, ay = 0;

  if (cursors.left.isDown)  ax -= accel;
  if (cursors.right.isDown) ax += accel;
  if (cursors.up.isDown)    ay -= accel;
  if (cursors.down.isDown)  ay += accel;

  // Pointer steer — move towards pointer
  if (pointerActive){
    const dir = new Phaser.Math.Vector2(pointerVec.x - player.x, pointerVec.y - player.y);
    if (dir.lengthSq() > 8) {
      dir.normalize().scale(accel);
      ax = dir.x; ay = dir.y;
    }
  }

  player.setDrag(350);
  player.setMaxVelocity(player.speed);

  // Water slows you
  const dist = Phaser.Math.Distance.Between(player.x, player.y, island.cx, island.cy);
  const inWater = dist > island.grassR;
  const maxV = inWater ? player.speed * player.slowFactor : player.speed;
  player.setMaxVelocity(maxV);

  player.setAcceleration(ax, ay);

  // Hazards simple AI: crabs wander in a ring
  hazards.children.iterate((crab)=>{
    if(!crab) return;
    crab.aiTick = (crab.aiTick || 0) + delta;
    if (crab.aiTick > 1600){
      crab.aiTick = 0;
      const angle = Phaser.Math.FloatBetween(0, Math.PI*2);
      const v = 90;
      crab.setVelocity(Math.cos(angle)*v, Math.sin(angle)*v);
    }
    // keep crab roughly on the grass ring
    const d = Phaser.Math.Distance.Between(crab.x, crab.y, island.cx, island.cy);
    if (d < island.sandR*1.05 || d > island.waterR*0.96){
      const ang = Phaser.Math.Angle.Between(crab.x, crab.y, island.cx, island.cy);
      crab.setVelocity(Math.cos(ang+Math.PI/2)*100, Math.sin(ang+Math.PI/2)*100);
    }
  });
}

// --- Helpers -----------------------------------------------------------------
function drawIsland(scene){
  const g = scene.add.graphics({ x: 0, y: 0 });

  // water
  g.fillStyle(0x77c4ee, 1); g.fillCircle(island.cx, island.cy, island.waterR);
  // grass
  g.fillStyle(0x3ea35c, 1); g.fillCircle(island.cx, island.cy, island.grassR);
  // sand
  const sandGrad = scene.textures.createCanvas('sandGrad', GAME_W, GAME_H).context;
  const grd = sandGrad.createRadialGradient(island.cx, island.cy, 10, island.cx, island.cy, island.sandR);
  grd.addColorStop(0, '#f3d08a'); grd.addColorStop(1, '#e7b96c');
  sandGrad.fillStyle = grd; sandGrad.beginPath();
  sandGrad.arc(island.cx, island.cy, island.sandR, 0, Math.PI*2);
  sandGrad.fill(); sandGrad.closePath();
  scene.textures.get('sandGrad').refresh();
  scene.add.image(0,0,'sandGrad').setOrigin(0).setDepth(1);

  // little tree
  const tree = scene.add.graphics().setDepth(2);
  tree.fillStyle(0x2a7f3e, 1); tree.fillCircle(island.cx+140, island.cy-20, 70);
  tree.fillStyle(0x3ea35c, 1); tree.fillCircle(island.cx+140, island.cy-20, 58);
  tree.fillStyle(0x6d4c2e, 1); tree.fillRect(island.cx+132, island.cy+20, 16, 40);
}

function spawnCoins(scene, n){
  coins.clear(true, true);
  for (let i=0;i<n;i++){
    const pt = randomPointOnRing(island.cx, island.cy, island.sandR*0.85, island.grassR*0.8);
    const c = coins.create(pt.x, pt.y, 'coin').setScale(0.12).refreshBody();
    c.setDepth(5);
  }
}

function spawnChests(scene, n){
  for (let i=0;i<n;i++){
    const pt = randomPointOnRing(island.cx, island.cy, island.sandR*0.45, island.sandR*0.9);
    const chest = chests.create(pt.x, pt.y, 'chest').setScale(0.9).refreshBody();
    chest.setDepth(4);
  }
}

function spawnCrab(scene){
  const pt = randomPointOnRing(island.cx, island.cy, island.grassR*0.9, island.waterR*0.9);
  const crab = hazards.create(pt.x, pt.y, 'crab').setDepth(6);
  crab.setCircle(12).setOffset(4,4);
  crab.setVelocity(100, 0);
  crab.setBounce(1,1).setCollideWorldBounds(true);
}

function collectCoin(player, coin){
  coin.destroy();
  score += 1;
  UI.setScore(score);
  UI.setStatus('Nice! +1 MrPi token');

  // little pop
  player.scene.tweens.add({ targets: player, scale: 0.25, yoyo: true, duration: 120 });
}

function openChest(player, chest){
  chest.destroy();
  const roll = Math.random();
  if (roll < 0.5){
    // reward: spawn 2 extra coins nearby
    UI.setStatus('Surprise! Bonus coins ✨');
    for (let i=0;i<2;i++){
      const pt = randomPointOnRing(player.x, player.y, 40, 120);
      const c = coins.create(pt.x, pt.y, 'coin').setScale(0.12).refreshBody();
      c.setDepth(5);
    }
  } else if (roll < 0.8){
    // speed boost
    UI.setStatus('Speed boost! 🏃‍♂️');
    const old = player.speed; player.speed = old * 1.45;
    player.scene.time.delayedCall(3000, ()=>{ player.speed = old; UI.setStatus('Boost over'); });
  } else {
    // mini-storm (knockback)
    UI.setStatus('Uh oh… mini-storm! 🌪️');
    const ang = Phaser.Math.FloatBetween(0, Math.PI*2);
    player.setVelocity(Math.cos(ang)*-250, Math.sin(ang)*-250);
  }
}

function hitHazard(player, crab){
  UI.setStatus('Ouch! The crab pinched you 🦀');
  lives = Math.max(0, lives-1); UI.setLives(lives);
  const kb = Phaser.Math.Angle.Between(crab.x, crab.y, player.x, player.y);
  player.setVelocity(Math.cos(kb)*260, Math.sin(kb)*260);

  if (lives === 0){
    UI.setStatus('You fainted… tap to try again');
    // simple reset on tap
    player.scene.input.once('pointerdown', ()=> location.reload());
  }
}

function randomPointOnRing(cx, cy, rMin, rMax){
  const r = Phaser.Math.FloatBetween(rMin, rMax);
  const a = Phaser.Math.FloatBetween(0, Math.PI*2);
  return { x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r };
}

function makeSimpleTextures(scene){
  // Chest (yellow rounded rect)
  const s = scene.add.graphics();
  s.fillStyle(0xffc83a, 1).fillRoundedRect(0,0,36,28,6);
  s.lineStyle(3, 0x8b5e00, 1).strokeRoundedRect(0,0,36,28,6);
  s.fillStyle(0x8b5e00,1).fillRect(14,12,8,6);
  s.generateTexture('chest', 36, 28);
  s.destroy();

  // Crab (red circle with claws)
  const c = scene.add.graphics();
  c.fillStyle(0xd33a2f, 1).fillCircle(16,16,12);
  c.fillCircle(6,16,5); c.fillCircle(26,16,5);
  c.generateTexture('crab', 32, 32);
  c.destroy();
}
