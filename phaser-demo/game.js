// Simple Phaser 3 top-down collector demo

const WORLD_SIZE = 960;        // world is square
const TOKENS_TO_COLLECT = 7;   // how many golden tokens

let score = 0;
const scoreEl = () => document.getElementById('score');

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#cfeefe',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 480,
    height: 480
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
  // Use the images you already uploaded at repo root.
  // Phaser files live in phaser-demo/, so we go up one folder.
  this.load.image('player', '../mrpi_logo_transparent.png');
  this.load.image('token', '../mrpi_token_transparent.png');

  // Tiny island tiles drawn with graphics -> converted to texture
}

function create() {
  // Make a soft island background
  const g = this.add.graphics();
  const cx = config.scale.width / 2;
  const cy = config.scale.height / 2;
  const R = 210;

  g.fillStyle(0x9ad7f5, 1); g.fillCircle(cx, cy, R);        // ocean
  g.fillStyle(0x79c36e, 1); g.fillCircle(cx, cy, R * 0.78);  // grass ring
  g.fillStyle(0xefd28f, 1); g.fillCircle(cx, cy, R * 0.55);  // sand
  g.generateTexture('island', config.scale.width, config.scale.height);
  g.destroy();

  this.add.image(cx, cy, 'island').setDepth(0);

  // Player
  this.player = this.physics.add.image(cx, cy - 30, 'player')
    .setScale(0.13)            // make the panda small
    .setCircle(350, 150, 150)  // approximate circular body from source png
    .setCollideWorldBounds(true);

  // Token group
  this.tokens = this.physics.add.group();
  for (let i = 0; i < TOKENS_TO_COLLECT; i++) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const radius = Phaser.Math.Between(30, 140);
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    const t = this.tokens.create(x, y, 'token')
      .setScale(0.12)
      .setCircle(430, 85, 85)
      .setImmovable(true);
    t.body.setAllowGravity(false);
  }

  // Overlap = collect
  this.physics.add.overlap(this.player, this.tokens, (_p, token) => {
    token.disableBody(true, true);
    score++;
    scoreEl().textContent = `Score: ${score} / ${TOKENS_TO_COLLECT}`;
    if (score === TOKENS_TO_COLLECT) {
      this.time.delayedCall(100, () => {
        this.add.text(cx, cy, '🎉 All tokens!', { fontSize: '28px', color: '#116622' })
          .setOrigin(0.5).setDepth(10);
      });
    }
  });

  // Input
  this.cursors = this.input.keyboard.createCursorKeys();

  // Pointer/touch: move toward pointer
  this.input.on('pointerdown', (p) => moveToward(this.player, p));
  this.input.on('pointermove', (p) => { if (p.isDown) moveToward(this.player, p); });

  score = 0;
  scoreEl().textContent = `Score: ${score} / ${TOKENS_TO_COLLECT}`;
}

function update() {
  const SPEED = 180;
  this.player.setVelocity(0);

  if (this.cursors.left.isDown)  this.player.setVelocityX(-SPEED);
  if (this.cursors.right.isDown) this.player.setVelocityX(SPEED);
  if (this.cursors.up.isDown)    this.player.setVelocityY(-SPEED);
  if (this.cursors.down.isDown)  this.player.setVelocityY(SPEED);
}

function moveToward(sprite, pointer) {
  const SPEED = 180;
  const angle = Phaser.Math.Angle.Between(sprite.x, sprite.y, pointer.x, pointer.y);
  sprite.body.velocity.x = Math.cos(angle) * SPEED;
  sprite.body.velocity.y = Math.sin(angle) * SPEED;
}
