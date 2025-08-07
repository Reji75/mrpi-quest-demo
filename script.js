const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 320;
canvas.height = 320;

const playerImage = new Image();
playerImage.src = "mrpi_sprite_64x64.png"; // Make sure this image is in your project root

const player = {
  x: 150,
  y: 150,
  width: 32,
  height: 32,
  speed: 2,
};

let keys = {};

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;
});

document.addEventListener("keyup", (e) => {
  keys[e.key] = false;
});

function updatePlayerPosition() {
  if (keys["ArrowUp"] && player.y > 0) player.y -= player.speed;
  if (keys["ArrowDown"] && player.y + player.height < canvas.height) player.y += player.speed;
  if (keys["ArrowLeft"] && player.x > 0) player.x -= player.speed;
  if (keys["ArrowRight"] && player.x + player.width < canvas.width) player.x += player.speed;
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
  ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
}

function gameLoop() {
  updatePlayerPosition();
  clearCanvas();
  drawPlayer();
  requestAnimationFrame(gameLoop);
}

playerImage.onload = function () {
  gameLoop();
};
