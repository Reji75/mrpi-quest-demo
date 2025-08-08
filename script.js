// Load token image
const tokenImage = new Image();
tokenImage.src = 'token_64x64.png'; // Make sure filename matches exactly

// Example collectible item structure
let collectibles = [
  { x: 100, y: 100, collected: false },
  { x: 200, y: 150, collected: false },
  { x: 300, y: 200, collected: false },
];

// Draw collectibles
function drawCollectibles(ctx) {
  collectibles.forEach(token => {
    if (!token.collected) {
      ctx.drawImage(tokenImage, token.x, token.y, 32, 32);
    }
  });
}

// Collision check
function checkCollectibles(playerX, playerY) {
  collectibles.forEach(token => {
    if (!token.collected &&
        playerX < token.x + 32 &&
        playerX + 32 > token.x &&
        playerY < token.y + 32 &&
        playerY + 32 > token.y) {
      token.collected = true;
      // Increase score here if needed
    }
  });
}
