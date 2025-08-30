const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('final-score');
const gameOverContainer = document.getElementById('game-over-container');
const restartButton = document.getElementById('restart-button');
const levelSelectionContainer = document.getElementById('level-selection-container');
const mainGameContainer = document.getElementById('main-game');
const levelButtons = document.querySelectorAll('.level-button');

// --- Game State and Variables ---
let player, walls, score, isGameOver, currentLevel, wallSpawnTimer;
let scale = 1;

// --- Player Properties ---
const playerLength = 15; // Number of segments
const segmentGap = 8; // Gap between segments
let playerHeadY, playerVelocityY;
const gravity = 0.25;
const lift = -6;
const playerSmoothness = 0.4; // How smoothly the body follows (0-1)

// --- Wall Properties ---
const wallWidth = 30;
let wallSettings;

const levels = {
    easy:   { wallSpeed: -1.5, wallGap: 180, spawnRate: 120 },
    medium: { wallSpeed: -2.5, wallGap: 140, spawnRate: 90 },
    hard:   { wallSpeed: -3.5, wallGap: 110, spawnRate: 70 }
};

// --- Game Setup and Control ---
function resizeCanvas() {
    const containerRect = gameContainer.getBoundingClientRect();
    canvas.width = containerRect.width;
    canvas.height = containerRect.height;
    scale = canvas.width / 400; // Original width was 400
}

function startGame(level) {
    currentLevel = level;
    levelSelectionContainer.style.display = 'none';
    gameOverContainer.classList.add('hidden'); // Ensure game over is hidden before starting
    mainGameContainer.classList.remove('hidden');
    // We need to get the correct canvas size after it becomes visible
    requestAnimationFrame(() => {
        init();
    });
}

function init() {
    resizeCanvas();
    wallSettings = levels[currentLevel];

    player = [];
    const startY = canvas.height / 2;
    for (let i = 0; i < playerLength; i++) {
        player.push({ x: 40 - i * segmentGap, y: startY });
    }
    playerHeadY = startY;
    playerVelocityY = 0;

    walls = [];
    score = 0;
    isGameOver = false;
    wallSpawnTimer = 0;

    scoreEl.textContent = score;
    gameOverContainer.classList.add('hidden');

    if (!mainGameContainer.classList.contains('game-active')) {
        mainGameContainer.classList.add('game-active');
        gameLoop();
    }
}

// --- Game Loop ---
function gameLoop() {
    if (isGameOver) {
        mainGameContainer.classList.remove('game-active');
        return;
    }

    update();
    draw();

    requestAnimationFrame(gameLoop);
}

function update() {
    // Player head movement
    playerVelocityY += gravity * scale;
    playerHeadY += playerVelocityY;

    // Update player body
    player[0].y = playerHeadY;
    for (let i = 1; i < player.length; i++) {
        const targetY = player[i-1].y;
        player[i].y += (targetY - player[i].y) * playerSmoothness;
    }

    // Wall spawning
    wallSpawnTimer++;
    if (wallSpawnTimer % Math.round(wallSettings.spawnRate / scale) === 0) {
        const gapY = Math.random() * (canvas.height - wallSettings.wallGap * scale - 100 * scale) + 50 * scale;
        walls.push({ x: canvas.width, y: gapY });
    }

    // Move walls
    walls.forEach(wall => {
        wall.x += wallSettings.wallSpeed * scale;
    });

    // Score and wall cleanup
    walls = walls.filter(wall => {
        // Check if the wall has passed the player's head
        if (wall.x + wallWidth * scale < player[0].x && !wall.passed) {
            score++;
            scoreEl.textContent = score;
            wall.passed = true;
        }
        return wall.x + wallWidth * scale > 0;
    });

    // Collision detection
    const head = player[0];
    if (head.y < 0 || head.y > canvas.height) endGame();

    walls.forEach(wall => {
        for (let i = 0; i < player.length; i++) {
            const segment = player[i];
            if (segment.x > wall.x && segment.x < wall.x + wallWidth * scale && 
               (segment.y < wall.y || segment.y > wall.y + wallSettings.wallGap * scale)) {
                endGame();
                return; // Exit loop once collision is found
            }
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw player snake/thread
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const drawThread = (offset, color) => {
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2 * scale;
        ctx.moveTo(player[0].x + offset, player[0].y);
        for (let i = 1; i < player.length; i++) {
            const xc = (player[i].x + player[i-1].x) / 2 + offset;
            const yc = (player[i].y + player[i-1].y) / 2;
            ctx.quadraticCurveTo(player[i-1].x + offset, player[i-1].y, xc, yc);
        }
        ctx.stroke();
    }
    drawThread(1 * scale, '#ffb3c6'); // Lighter Pink
    drawThread(-1 * scale, '#ff85a2'); // Pink

    // Draw walls
    ctx.fillStyle = '#fafafa'; // Softer white
    const wallRadius = 10 * scale;
    walls.forEach(wall => {
        // Draw top part with rounded bottom corners
        ctx.beginPath();
        ctx.moveTo(wall.x, 0);
        ctx.lineTo(wall.x, wall.y - wallRadius);
        ctx.arcTo(wall.x, wall.y, wall.x + wallRadius, wall.y, wallRadius);
        ctx.lineTo(wall.x + wallWidth * scale - wallRadius, wall.y);
        ctx.arcTo(wall.x + wallWidth * scale, wall.y, wall.x + wallWidth * scale, wall.y - wallRadius, wallRadius);
        ctx.lineTo(wall.x + wallWidth * scale, 0);
        ctx.closePath();
        ctx.fill();

        // Draw bottom part with rounded top corners
        const bottomY = wall.y + wallSettings.wallGap * scale;
        ctx.beginPath();
        ctx.moveTo(wall.x, canvas.height);
        ctx.lineTo(wall.x, bottomY + wallRadius);
        ctx.arcTo(wall.x, bottomY, wall.x + wallRadius, bottomY, wallRadius);
        ctx.lineTo(wall.x + wallWidth * scale - wallRadius, bottomY);
        ctx.arcTo(wall.x + wallWidth * scale, bottomY, wall.x + wallWidth * scale, bottomY + wallRadius, wallRadius);
        ctx.lineTo(wall.x + wallWidth * scale, canvas.height);
        ctx.closePath();
        ctx.fill();
    });
}

// --- Event Handlers ---
function endGame() {
    if (isGameOver) return;
    isGameOver = true;
    finalScoreEl.textContent = score;
    gameOverContainer.classList.remove('hidden');
}

function handleInput(e) {
    e.preventDefault();
    if (!isGameOver) {
        playerVelocityY = lift * scale;
    }
}

levelButtons.forEach(button => {
    button.addEventListener('click', () => {
        const level = button.getAttribute('data-level');
        startGame(level);
    });
});

restartButton.addEventListener('click', () => {
    // Hide game over screen and show level selection
    gameOverContainer.classList.add('hidden');
    mainGameContainer.classList.add('hidden'); // Hide the main game container
    levelSelectionContainer.style.display = 'block';
});

document.addEventListener('keydown', e => e.code === 'Space' && handleInput(e));
document.addEventListener('mousedown', handleInput);
document.addEventListener('touchstart', handleInput);
window.addEventListener('resize', () => {
    if (!isGameOver) init(); // Re-initialize game on resize
});