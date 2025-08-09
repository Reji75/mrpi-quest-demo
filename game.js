/* MrPi Island Quest – Phaser 3, fixed scales + spacing */
const W = 360, H = 480; // virtual canvas size

const COIN_SCALE   = 0.085;  // <- smaller coins
const PLAYER_SCALE = 0.20;   // <- bigger MrPi than before, still tasteful
const TARGET_COINS = 7;

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#a3dfff',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { preload, create, update }
};

let cursors, player, coins, scoreText, score = 0;
let touchDir = {x:0, y:0};
let sparkEmitter;
let playRect; // inner safe play area

new Phaser.Game(config);

function preload(){
  // Draw island background as a texture (no external jpg)
  const g = this.add.graphics();
  g.fillStyle(0x7ad3ff, 1); g.fillEllipse(W/2, H/2, W*0.9, H*0.62);
  g.fillStyle(0xf3cf7a, 1); g.fillEllipse(W/2, H/2, W*0.68, H*0.44);
  g.lineStyle(8, 0x2b2b2b, 0.28); g.strokeEllipse(W/2, H/2, W*0.9, H*0.62);
  g.generateTexture('island', W, H); g.clear();

  // Simple tree
  g.fillStyle(0x3a2a17,1); g.fillRect(W*0.69, H*0.45, 10, 40);
  g.fillStyle(0x2aa043,1); g.fillCircle(W*0.69+5, H*0.45, 38);
  g.generateTexture('tree', 120, 120); g.destroy();

  // Sparkle for pickups
  const p = this.add.graphics();
  p.fillStyle(0xffffff, 1); p.fillCircle(4,4,4);
  p.generateTexture('spark', 8, 8); p.destroy();

  // Your assets
  this.load.image('mrpi',  'mrpi_logo_transparent.png');
  this.load.image('token', 'mrpi_token_transparent.png');
}

function create(){
  score = 0;

  // A “safe” play area inside the canvas so stuff isn’t glued to edges
  playRect = new Phaser.Geom.Rectangle(24, 40, W-48, H-150);

  // Background
  this.add.image(W/2, H/2, 'island').setDepth(-10);
  this.add.image(W*0.7, H*0.46, 'tree').setScale(0.9).setDepth(-5);

  // Player
  player = this.physics.add.image(playRect.centerX - 40, playRect.centerY, 'mrpi')
    .setOrigin(0.5, 0.82)
    .setScale(PLAYER_SCALE)
    .setCircle(90, 50, 38)                // hit circle based on source image
    .setCollideWorldBounds(true);
  player.setDamping(true).setDrag(0.001).setMaxVelocity(180);

  // Fake “walk” bob
  this.tweens.add({
    targets: player, scaleY: PLAYER_SCALE * 0.96,
    duration: 260, yoyo: true, repeat: -1, ease: 'sine.inOut'
  });

  // Coins
  coins = this.physics.add.group();
  spawnCoins(this);

  // Make coins feel alive
  coins.children.iterate(c => {
    this.tweens.add({ targets: c, scale: { from: COIN_SCALE*0.92, to: COIN_SCALE*1.08 },
      duration: 420, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    this.tweens.add({ targets: c, angle: { from: -6, to: 6 },
      duration: 520, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  });

  // Pickup sparkle
  const particles = this.add.particles(0, 0, 'spark', {
    lifespan: 300, speed: { min: 40, max: 120 },
    scale: { start: 0.8, end: 0 }, quantity: 0, emitting: false
  });
  sparkEmitter = particles;

  // Overlap
  this.physics.add.overlap(player, coins, (_p, coin) => {
    sparkEmitter.setPosition(coin.x, coin.y);
    sparkEmitter.explode(12);
    coin.disableBody(true, true);
    score++;
    scoreText.setText(`Score: ${score} / ${TARGET_COINS}`);
    if (score >= TARGET_COINS) winAndRestart(this);
  });

  // UI
  scoreText = this.add.text(W/2, H*0.83, `Score: 0 / ${TARGET_COINS}`, {
    fontSize: '22px', fontFamily: 'system-ui, Arial', color: '#102030'
  }).setOrigin(0.5);

  // Inputs
  cursors = this.input.keyboard.createCursorKeys();
  this.input.on('pointerdown', (p)=> touchStart(this, p));
  this.input.on('pointermove', (p)=> touchMove(p));
  this.input.on('pointerup', ()=> touchDir={x:0,y:0});

  hookButton('#up',    {x:0,  y:-1});
  hookButton('#down',  {x:0,  y: 1});
  hookButton('#left',  {x:-1, y: 0});
  hookButton('#right', {x:1,  y: 0});
}

function update(){
  const speed = 150;
  let vx = 0, vy = 0;

  if (cursors.left?.isDown)  vx = -speed;
  else if (cursors.right?.isDown) vx = speed;

  if (cursors.up?.isDown)    vy = -speed;
  else if (cursors.down?.isDown)  vy = speed;

  if (touchDir.x || touchDir.y){
    vx = speed * touchDir.x;
    vy = speed * touchDir.y;
  }
  player.setVelocity(vx, vy);

  if (vx !== 0) player.setFlipX(vx < 0);
}

/* ---------- helpers ---------- */

function spawnCoins(scene){
  coins.clear(true, true);
  const placed = [];
  const minDistBetweenCoins = 72;  // keep coins apart
  const minDistFromPlayer    = 80;  // don’t spawn on top of MrPi

  for (let i=0;i<TARGET_COINS;i++){
    let x,y,tries=0;
    do {
      x = Phaser.Math.Between(playRect.x + 20, playRect.right - 20);
      y = Phaser.Math.Between(playRect.y + 20, playRect.bottom - 20);
      tries++;
    } while (
      tries < 60 &&
      ( tooCloseToAny(x,y,placed,minDistBetweenCoins) ||
        Phaser.Math.Distance.Between(x,y,player.x,player.y) < minDistFromPlayer )
    );
    placed.push({x,y});
  }

  placed.forEach(p=>{
    coins.create(p.x, p.y, 'token')
      .setScale(COIN_SCALE)
      // Collision circle tuned to your PNG; tweak if needed
      .setCircle(340, 115, 115)
      .setAngle(Phaser.Math.Between(-6,6));
  });
}

function tooCloseToAny(x,y,arr,minD){ return arr.some(o => Phaser.Math.Distance.Between(x,y,o.x,o.y) < minD); }

function winAndRestart(scene){
  const t = scene.add.text(W/2, H*0.28, '🎉 You collected all tokens!', {
    fontSize:'22px', color:'#0a7a20', fontStyle:'bold', fontFamily:'system-ui, Arial'
  }).setOrigin(0.5).setDepth(10);

  scene.time.delayedCall(1400, ()=>{
    t.destroy();
    scene.scene.restart();
  });
}

function touchStart(scene, p){
  if (Phaser.Geom.Rectangle.Contains(playRect, p.x, p.y)){
    const dx = p.x - player.x, dy = p.y - player.y;
    const len = Math.hypot(dx,dy) || 1;
    touchDir = {x: dx/len, y: dy/len};
  }
}
function touchMove(p){
  if (p.isDown){
    const dx = p.x - player.x, dy = p.y - player.y;
    const len = Math.hypot(dx,dy) || 1;
    touchDir = {x: dx/len, y: dy/len};
  }
}

function hookButton(sel, dir){
  const el = document.querySelector(sel);
  if (!el) return;
  const on = ()=> touchDir = dir;
  const off = ()=> touchDir = {x:0,y:0};
  el.addEventListener('touchstart', e=>{e.preventDefault();on();}, {passive:false});
  el.addEventListener('touchend', off);
  el.addEventListener('mousedown', on);
  el.addEventListener('mouseup', off);
  el.addEventListener('mouseleave', off);
}
