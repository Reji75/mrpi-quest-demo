const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const sprite = new Image();
sprite.src = 'mrpi_sprite_64x64.png';

let x = 100;
let y = 100;
const speed = 5;

let keys = {
  ArrowUp: false,
  ArrowDown: false,
  ArrowLeft: false,
  ArrowRight: false
};

// Keyboard controls
document.addEventListener('keydown', (e) => {
  if (e.key in keys) keys[e.key] = true;
});
document.addEventListener('keyup', (e) => {
  if (e.key in keys) keys[e.key] = false;
});

// Mobile button controls
function move(direction) {
  if (direction === 'up') y -= speed;
  if (direction === 'down') y += speed;
  if (direction === 'left') x -= speed;
  if (direction === 'right') x += speed;
  draw();
}

function update() {
  if (keys.ArrowUp) y -= speed;
  if (keys.ArrowDown) y += speed;
  if (keys.ArrowLeft) x -= speed;
  if (keys.ArrowRight) x += speed;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sprite, x, y, 64, 64);
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

sprite.onload = () => {
  gameLoop();
};
