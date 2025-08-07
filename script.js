const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 320;
canvas.height = 320;

const player = {
  x: 150,
  y: 150,
  size: 20,
  color: "blue",
  speed: 5,
};

function drawPlayer() {
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.size, player.size);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function update() {
  clearCanvas();
  drawPlayer();
  requestAnimationFrame(update);
}

// Listen for arrow key presses
document.addEventListener("keydown", function (event) {
  switch (event.key) {
    case "ArrowUp":
      player.y -= player.speed;
      break;
    case "ArrowDown":
      player.y += player.speed;
      break;
    case "ArrowLeft":
      player.x -= player.speed;
      break;
    case "ArrowRight":
      player.x += player.speed;
      break;
  }
});

// Start the game loop
update();
