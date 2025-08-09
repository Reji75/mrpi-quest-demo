/* MrPi Island Quest – Phaser 3 with simple animations */
const W = 360, H = 480; // virtual resolution (responsive via CSS)

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  width: W,
  height: H,
  backgroundColor: '#a3dfff',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false }},
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: { preload, create, update }
};

let cursors, player, coins, scoreText, score = 0, target = 7;
let touchDir = {x:0, y:0};
let sparkEmitter;

new Phaser.Game(config);

function preload(){
  // Generate an island texture on-the-fly (no external JPGs)
  const g = this.add.graphics();
  g.fillStyle(0x7ad3ff, 1); g.fillEllipse(W/2, H/2, W*0.92, H*0.62);
  g.fillStyle(0xf3cf7a, 1); g.fillEllipse(W/2, H/2, W*0.7, H*0.45);
  g.lineStyle(8, 0x2b2b2b, 0.35); g.strokeEllipse(W/2, H/2, W*0.92, H*0.62);
  g.generateTexture('island', W, H); g.clear();

  // Simple tree
  g.fillStyle(0x3a2a17,1); g.fillRect(W*0.67, H*0.45, 10, 40);
  g.fillStyle(0x2aa043,1); g.fillCircle(W*0.67+5, H*0.45, 40);
  g.generateTexture('tree', 120, 120); g.clear();

  // Sparkle dot for coin pickup particles
  g.fillStyle(0xffffff, 1); g.fillCircle(4,4,4);
  g.generateTexture('spark', 8, 8); g.destroy();

  // Your uploaded images
  this.load.image('mrpi',  'mrpi_logo_transparent.png');
  this.load.image('token', 'mrpi_token_transparent.png');
}

function create(){
  score = 0;

  // Background island & a tree
  this.add.image(W/2, H/2, 'island').setDepth(-10);
  this.add.image(W*0.67+15, H*0.47, 'tree').setScale(0.9).setDepth(-5);

  // Player sprite with physics body
  player = this.physics.add.image(W*0.35, H*0.42, 'mrpi')
    .setOrigin(0.5, 0.8)
    .setScale(0.24)                // bigger MrPi
    .setCircle(90, 50, 38)         // rough hit circle; tweak if needed
    .setCollideWorldBounds(true);

  // Smoother feel
  player.setDamping(true).setDrag(0.001).setMaxVelocity(180);

  // "Walk" bob animation (fake)
  this.tweens.add({
    targets: player,
    scaleY: 0.24 * 0.96,
    duration: 260,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inOut'
  });

  // Coins
  coins = this.physics.add.group();
  spawnCoins(this);

  // Spin/pulse the coins so they feel alive
  coins.children.iterate(c => {
    this.tweens.add({
      targets: c, scale: { from: 0.13, to: 0.16 },
      duration: 420, yoyo: true, repeat: -1, ease: 'sine.inOut'
    });
    this.tweens.add({
      targets: c, angle: { from: -8, to: 8 },
      duration: 520, yoyo: true, repeat: -1, ease: 'sine.inOut'
    });
  });

  // Sparkle particles on collect
  const particles = this.add.particles(0, 0, 'spark', {
    lifespan: 300,
    speed: { min: 40, max: 120 },
    scale: { start: 0.8, end: 0 },
    quantity: 0,
    emitting: false
  });
  sparkEmitter = particles;

  // Overlap for pickups
  this.physics.add.overlap(player, coins, (_p, coin) => {
    sparkEmitter.setPosition(coin.x, coin.y);
    sparkEmitter.explode(12);
    coin.disableBody(true, true);
    score++;
    scoreText.setText(`Score: ${score} / ${target}`);
    if (score >= target) winAndRestart(this);
  });

  // UI
  scoreText = this.add.text(W/2, H*0.85, `Score: 0 / ${target}`, {
    fontSize: '22px', fontFamily: 'system-ui, Arial', color: '#102030'
  }).setOrigin(0.5);

  // Input: keyboard
  cursors = this.input.keyboard.createCursorKeys();

  // Input: swipe/tap
  this.input.on('pointerdown', (p)=> touchStart(this, p));
  this.input.on('pointermove', (p)=> touchMove(p));
  this.input.on('pointerup', ()=> touchDir={x:0,y:0});

  // On-screen buttons
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

  // Touch/onscreen override wins
  if (touchDir.x || touchDir.y){
    vx = speed * touchDir.x;
    vy = speed * touchDir.y;
  }
  player.setVelocity(vx, vy);

  // Flip MrPi to face horizontal direction
  if (vx !== 0) player.setFlipX(vx < 0);
}

/* ---- helpers ---- */

function spawnCoins(scene){
  coins.clear(true, true);
  const margin = 30;
  const placements = [];
  for (let i=0;i<target;i++){
    let x,y,tries=0;
    do {
      x = Phaser.Math.Between(margin, W-margin);
      y = Phaser.Math.Between(margin+40, H-margin-90);
      tries++;
    } while (tries < 50 && tooCloseToAny(x,y,placements,54));
    placements.push({x,y});
  }
  placements.forEach(p=>{
    coins.create(p.x, p.y, 'token')
      .setScale(0.145)
      .setCircle(340, 115, 115)
      .setAngle(Phaser.Math.Between(-6,6));
  });
}

function tooCloseToAny(x,y,arr,minD){ return arr.some(o => Phaser.Math.Distance.Between(x,y,o.x,o.y) < minD); }

function winAndRestart(scene){
  const t = scene.add.text(W/2, H*0.32, '🎉 You collected all tokens!', {
    fontSize:'22px', color:'#0a7a20', fontStyle:'bold', fontFamily:'system-ui, Arial'
  }).setOrigin(0.5).setDepth(10);

  scene.time.delayedCall(1300, ()=>{
    t.destroy();
    scene.scene.restart();
  });
}

function touchStart(scene, p){
  const rect = new Phaser.Geom.Rectangle(0, 0, W, H*0.8);
  if (rect.contains(p.x, p.y)){
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const len = Math.hypot(dx,dy) || 1;
    touchDir = {x: dx/len, y: dy/len};
  }
}
function touchMove(p){
  if (p.isDown){
    const dx = p.x - player.x;
    const dy = p.y - player.y;
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
