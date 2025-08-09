const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const playerImg = new Image();
playerImg.src = "mrpi_logo_transparent.png";

const tokenImg = new Image();
tokenImg.src = "mrpi_token_transparent.png";

let playerSize = 50;  // Bigger MrPi
let tokenSize = 35;   // Smaller coins
let playerX = 200;
let playerY = 200;
let score = 0;
let totalTokens = 5;

let tokens = [];
for (let i = 0; i < totalTokens; i++) {
    tokens.push({
        x: Math.random() * (canvas.width - tokenSize),
        y: Math.random() * (canvas.height - tokenSize)
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player
    ctx.drawImage(playerImg, playerX, playerY, playerSize, playerSize);

    // Draw tokens
    tokens.forEach(token => {
        ctx.drawImage(tokenImg, token.x, token.y, tokenSize, tokenSize);
    });

    // Score display
    document.getElementById("score").textContent = `Score: ${score} / ${totalTokens}`;

    if (score === totalTokens) {
        document.getElementById("message").innerHTML = "🎉 You collected all tokens!";
    }
}

function movePlayer(dx, dy) {
    playerX += dx;
    playerY += dy;

    // Keep inside boundaries
    playerX = Math.max(0, Math.min(canvas.width - playerSize, playerX));
    playerY = Math.max(0, Math.min(canvas.height - playerSize, playerY));

    // Check for token collection
    tokens = tokens.filter(token => {
        let collected = playerX < token.x + tokenSize &&
                        playerX + playerSize > token.x &&
                        playerY < token.y + tokenSize &&
                        playerY + playerSize > token.y;
        if (collected) score++;
        return !collected;
    });

    draw();
}

// Keyboard controls
document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp") movePlayer(0, -10);
    if (e.key === "ArrowDown") movePlayer(0, 10);
    if (e.key === "ArrowLeft") movePlayer(-10, 0);
    if (e.key === "ArrowRight") movePlayer(10, 0);
});

// Mobile swipe controls
let touchStartX, touchStartY;
canvas.addEventListener("touchstart", e => {
    let touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
});

canvas.addEventListener("touchend", e => {
    let touch = e.changedTouches[0];
    let dx = touch.clientX - touchStartX;
    let dy = touch.clientY - touchStartY;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) movePlayer(10, 0);
        else movePlayer(-10, 0);
    } else {
        if (dy > 0) movePlayer(0, 10);
        else movePlayer(0, -10);
    }
});

draw();
