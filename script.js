const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 320;
canvas.height = 320;

const sprite = new Image();
sprite.src = "mrpi_sprite_64x64.png";

let x = 0;
let y = 0;

document.addEventListener("keydown", (e) => {
  const step = 64;

  switch (e.key) {
    case "ArrowUp":
      if (y - step >= 0) y -= step;
      break;
    case "ArrowDown":
      if (y + step < canvas.height) y += step;
      break;
    case "ArrowLeft":
      if (x - step >= 0) x -= step;
      break;
    case "ArrowRight":
      if (x + step < canvas.width) x += step;
      break;
  }

  draw();
});

sprite.onload = function () {
  draw();
};

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sprite, x, y, 64, 64);
}
