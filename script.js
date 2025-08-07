const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 320;
canvas.height = 320;

const sprite = new Image();
sprite.src = "mrpi_sprite_64x64.png";

const player = {
  x: 150,
  y: 150,
  size: 32,
  speed: 3,
  dx: 0,
  dy: 0,
};

// Handle key press
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") player.dx = player.speed;
  if (e.key === "ArrowLeft") player.dx = -player.speed;
  if (e.key === "ArrowUp") player.dy = -player.speed;
  if (e.key === "ArrowDown") player.dy = player.speed;
});

// Handle key release
document.addEventListener("keyup", (e) => {
  if (["ArrowRight", "ArrowLeft"].includes(e.key)) player.dx = 0;
  if (["ArrowUp", "ArrowDown"].includes(e.key)) player.dy = 0;
});

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
  ctx.drawImage(sprite, player.x, player.y, player.size, player.size);
}

function update() {
  clearCanvas();
  player.x += player.dx;
  player.y += player.dy;
  drawPlayer();
  requestAnimationFrame(update);
}

sprite.onload = update;
