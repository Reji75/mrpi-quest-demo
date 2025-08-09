const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 400;
canvas.height = 400;

// Load Images
const playerImg = new Image();
playerImg.src = "mrpi_logo_transparent.png";

const tokenImg = new Image();
tokenImg.src = "mrpi_token_transparent.png";

// Player
let player = { x: 50, y: 50, size: 40, speed: 20 };

// Tokens
let tokens = [];
for (let i = 0; i < 5; i++) {
    tokens.push({
        x: Math.random() * (canvas.width - 40),
        y: Math.random() * (canvas.height - 40),
        size: 40
    });
}

let score = 0;

// Draw Game
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Player
    ctx.drawImage(playerImg, player.x, player.y, player.size, player.size);

    // Tokens
    tokens.forEach(token => {
        ctx.drawImage(tokenImg, token.x, token.y, token.size, token.size);
    });

    requestAnimationFrame(draw);
}
draw();

// Movement
function movePlayer(dx, dy) {
    player.x += dx * player.speed;
    player.y += dy * player.speed;

    // Prevent going outside canvas
    player.x = Math.max(0, Math.min(player.x, canvas.width - player.size));
    player.y = Math.max(0, Math.min(player.y, canvas.height - player.size));

    checkCollision();
}

// Collision
function checkCollision() {
    tokens = tokens.filter(token => {
        let distX = player.x - token.x;
        let distY = player.y - token.y;
        let distance = Math.sqrt(distX * distX + distY * distY);

        if (distance < player.size) {
            score++;
            document.getElementById("score").innerText = `Score: ${score} / 5`;

            if (score === 5) {
                document.getElementById("message").innerText = "🎉 You collected all tokens!";
            }
            return false;
        }
        return true;
    });
}

// Controls
document.getElementById("up").addEventListener("click", () => movePlayer(0, -1));
document.getElementById("down").addEventListener("click", () => movePlayer(0, 1));
document.getElementById("left").addEventListener("click", () => movePlayer(-1, 0));
document.getElementById("right").addEventListener("click", () => movePlayer(1, 0));

// Keyboard Controls
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") movePlayer(0, -1);
    if (e.key === "ArrowDown") movePlayer(0, 1);
    if (e.key === "ArrowLeft") movePlayer(-1, 0);
    if (e.key === "ArrowRight") movePlayer(1, 0);
});
