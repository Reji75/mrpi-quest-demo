const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const playerImage = new Image();
playerImage.src = 'mrpi_sprite_64x64.png';

const player = {
  x: canvas.width / 2 - 32,
  y: canvas.height / 2 - 32,
  speed: 5,
  width: 64,
  height: 64,
};

playerImage.onload = () => {
  draw();
};

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

document.addEventListener('keydown', (event) => {
  switch (event.key) {
    case 'ArrowUp':
      player.y -= player.speed;
      break;
    case 'ArrowDown':
      player.y += player.speed;
      break;
    case 'ArrowLeft':
      player.x -= player.speed;
      break;
    case 'ArrowRight':
      player.x += player.speed;
      break;
  }
  draw();
});
