// Game Configuration
const GRID_SIZE = 20;
const TILE_COUNT = 20;
const CANVAS_SIZE = 400;

// Difficulty Settings (speed in ms)
const DIFFICULTY_SETTINGS = {
    slow: 150,
    normal: 100,
    fast: 60
};

// Game State
let canvas, ctx;
let snake = [];
let food = { x: 0, y: 0 };
let dx = 0;
let dy = 0;
let score = 0;
let bestScore = localStorage.getItem('snakeBestScore') || 0;
let gameLoop = null;
let isGameRunning = false;
let isPaused = false;
let snakeDirection = 'right';
let foodPulsePhase = 0;
let currentSpeed = DIFFICULTY_SETTINGS.normal;
let soundEnabled = true;

// Audio Context for sound effects
let audioContext = null;

// DOM Elements
let scoreElement, bestScoreElement, finalScoreElement;
let startScreen, gameOverScreen, pauseScreen;
let startBtn, restartBtn, resumeBtn;
let difficultySelect, soundBtn, helpBtn, closeHelpBtn, helpModal;

// Initialize Game
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Get canvas and context
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Get DOM elements
    scoreElement = document.getElementById('score');
    bestScoreElement = document.getElementById('best-score');
    finalScoreElement = document.getElementById('final-score');
    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    pauseScreen = document.getElementById('pause-screen');
    startBtn = document.getElementById('start-btn');
    restartBtn = document.getElementById('restart-btn');
    resumeBtn = document.getElementById('resume-btn');

    // Initialize best score display
    bestScoreElement.textContent = bestScore;

    // Event Listeners
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', resetGame);
    resumeBtn.addEventListener('click', resumeGame);
    document.addEventListener('keydown', handleKeyDown);

    // Mobile controls
    const dPadButtons = document.querySelectorAll('.d-btn');
    dPadButtons.forEach(btn => {
        btn.addEventListener('touchstart', handleTouchStart, { passive: false });
        btn.addEventListener('click', handleDpadClick);
    });

    // Canvas touch controls
    let touchStartX = 0;
    let touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    canvas.addEventListener('touchend', (e) => {
        if (!isGameRunning || isPaused) return;
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
    }, { passive: true });

    // Initial draw
    resetGameState();
    draw();
}

function handleTouchStart(e) {
    e.preventDefault();
}

function handleDpadClick(e) {
    const direction = e.target.dataset.dir;
    changeDirection(direction);
}

function handleSwipe(startX, startY, endX, endY) {
    const dx = endX - startX;
    const dy = endY - startY;
    const minSwipeDistance = 30;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (Math.abs(dx) > minSwipeDistance) {
            changeDirection(dx > 0 ? 'right' : 'left');
        }
    } else {
        if (Math.abs(dy) > minSwipeDistance) {
            changeDirection(dy > 0 ? 'down' : 'up');
        }
    }
}

function startGame() {
    startScreen.classList.add('hidden');
    isGameRunning = true;
    isPaused = false;
    dx = GRID_SIZE;
    dy = 0;
    snakeDirection = 'right';
    gameLoop = setInterval(gameStep, 100);
}

function resetGame() {
    gameOverScreen.classList.add('hidden');
    resetGameState();
    startGame();
}

function resetGameState() {
    snake = [
        { x: 5 * GRID_SIZE, y: 10 * GRID_SIZE },
        { x: 4 * GRID_SIZE, y: 10 * GRID_SIZE },
        { x: 3 * GRID_SIZE, y: 10 * GRID_SIZE }
    ];
    score = 0;
    dx = 0;
    dy = 0;
    snakeDirection = 'right';
    scoreElement.textContent = score;
    placeFood();
}

function placeFood() {
    food.x = Math.floor(Math.random() * TILE_COUNT) * GRID_SIZE;
    food.y = Math.floor(Math.random() * TILE_COUNT) * GRID_SIZE;

    // Don't place food on snake
    for (let segment of snake) {
        if (segment.x === food.x && segment.y === food.y) {
            placeFood();
            return;
        }
    }
}

function gameStep() {
    if (isPaused) return;

    update();
    draw();
}

function update() {
    // Move snake
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    // Wall collision
    if (head.x < 0 || head.x >= CANVAS_SIZE || head.y < 0 || head.y >= CANVAS_SIZE) {
        gameOver();
        return;
    }

    // Self collision
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }

    snake.unshift(head);

    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        animateScore();
        placeFood();
    } else {
        snake.pop();
    }

    // Update food animation phase
    foodPulsePhase += 0.1;
}

function animateScore() {
    scoreElement.classList.add('score-update');
    setTimeout(() => {
        scoreElement.classList.remove('score-update');
    }, 300);
}

function gameOver() {
    isGameRunning = false;
    clearInterval(gameLoop);

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('snakeBestScore', bestScore);
        bestScoreElement.textContent = bestScore;
    }

    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function pauseGame() {
    if (!isGameRunning) return;
    isPaused = true;
    pauseScreen.classList.remove('hidden');
}

function resumeGame() {
    isPaused = false;
    pauseScreen.classList.add('hidden');
}

function handleKeyDown(e) {
    if (!isGameRunning && e.key === 'Enter') {
        if (!gameOverScreen.classList.contains('hidden')) {
            resetGame();
        } else if (!startScreen.classList.contains('hidden')) {
            startGame();
        }
        return;
    }

    if (e.key === ' ' || e.key === 'Escape') {
        if (isPaused) {
            resumeGame();
        } else {
            pauseGame();
        }
        return;
    }

    switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            changeDirection('up');
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            changeDirection('down');
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            changeDirection('left');
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            changeDirection('right');
            break;
    }
}

function changeDirection(newDirection) {
    if (!isGameRunning || isPaused) return;

    const goingUp = dy === -GRID_SIZE;
    const goingDown = dy === GRID_SIZE;
    const goingRight = dx === GRID_SIZE;
    const goingLeft = dx === -GRID_SIZE;

    switch (newDirection) {
        case 'up':
            if (!goingDown) {
                dx = 0;
                dy = -GRID_SIZE;
                snakeDirection = 'up';
            }
            break;
        case 'down':
            if (!goingUp) {
                dx = 0;
                dy = GRID_SIZE;
                snakeDirection = 'down';
            }
            break;
        case 'left':
            if (!goingRight) {
                dx = -GRID_SIZE;
                dy = 0;
                snakeDirection = 'left';
            }
            break;
        case 'right':
            if (!goingLeft) {
                dx = GRID_SIZE;
                dy = 0;
                snakeDirection = 'right';
            }
            break;
    }
}

// ============================================
// ENHANCED DRAWING FUNCTIONS
// ============================================

function draw() {
    // Clear canvas
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw grid (subtle)
    drawGrid();

    // Draw food
    drawFood();

    // Draw snake
    drawSnake();
}

function drawGrid() {
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;

    for (let i = 0; i <= TILE_COUNT; i++) {
        const pos = i * GRID_SIZE;

        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, CANVAS_SIZE);
        ctx.stroke();

        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(CANVAS_SIZE, pos);
        ctx.stroke();
    }
}

function drawFood() {
    const centerX = food.x + GRID_SIZE / 2;
    const centerY = food.y + GRID_SIZE / 2;

    // Pulsing effect
    const pulse = Math.sin(foodPulsePhase) * 1.5;
    const radius = (GRID_SIZE / 2 - 2) + pulse;

    // Glow effect
    const gradient = ctx.createRadialGradient(
        centerX, centerY, 0,
        centerX, centerY, radius + 4
    );
    gradient.addColorStop(0, 'rgba(239, 68, 68, 0.8)');
    gradient.addColorStop(0.5, 'rgba(239, 68, 68, 0.3)');
    gradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 4, 0, Math.PI * 2);
    ctx.fill();

    // Main food body (apple-like)
    const bodyGradient = ctx.createRadialGradient(
        centerX - 2, centerY - 2, 0,
        centerX, centerY, radius
    );
    bodyGradient.addColorStop(0, '#fca5a5');
    bodyGradient.addColorStop(0.3, '#ef4444');
    bodyGradient.addColorStop(1, '#b91c1c');

    ctx.fillStyle = bodyGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Shine/highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(
        centerX - radius * 0.3,
        centerY - radius * 0.3,
        radius * 0.25,
        radius * 0.15,
        -Math.PI / 4,
        0,
        Math.PI * 2
    );
    ctx.fill();

    // Small leaf
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(
        centerX + 2,
        centerY - radius - 1,
        4,
        2,
        Math.PI / 4,
        0,
        Math.PI * 2
    );
    ctx.fill();
}

function drawSnake() {
    for (let i = 0; i < snake.length; i++) {
        if (i === 0) {
            drawSnakeHead(snake[i]);
        } else {
            drawSnakeBody(snake[i], i);
        }
    }
}

function drawSnakeHead(segment) {
    const x = segment.x;
    const y = segment.y;
    const size = GRID_SIZE - 1;
    const radius = 6;

    // Head gradient (darker green)
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, '#16a34a');
    gradient.addColorStop(0.5, '#166534');
    gradient.addColorStop(1, '#14532d');

    ctx.fillStyle = gradient;

    // Draw rounded rect
    roundRect(ctx, x, y, size, size, radius);
    ctx.fill();

    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    roundRect(ctx, x + 1, y + 1, size - 2, size / 2 - 1, radius - 1);
    ctx.fill();

    // Draw eyes based on direction
    drawEyes(x, y, size, snakeDirection);
}

function drawEyes(headX, headY, size, direction) {
    const eyeSize = 3.5;
    const eyeOffset = 4;
    const eyeDistance = size / 2;

    ctx.fillStyle = '#ffffff';

    let leftEyeX, leftEyeY, rightEyeX, rightEyeY;

    switch (direction) {
        case 'right':
            leftEyeX = headX + size - eyeOffset - eyeSize;
            leftEyeY = headY + eyeDistance - 3;
            rightEyeX = headX + size - eyeOffset - eyeSize;
            rightEyeY = headY + eyeDistance + 3;
            break;
        case 'left':
            leftEyeX = headX + eyeOffset;
            leftEyeY = headY + eyeDistance - 3;
            rightEyeX = headX + eyeOffset;
            rightEyeY = headY + eyeDistance + 3;
            break;
        case 'up':
            leftEyeX = headX + eyeDistance - 3;
            leftEyeY = headY + eyeOffset;
            rightEyeX = headX + eyeDistance + 3;
            rightEyeY = headY + eyeOffset;
            break;
        case 'down':
            leftEyeX = headX + eyeDistance - 3;
            leftEyeY = headY + size - eyeOffset - eyeSize;
            rightEyeX = headX + eyeDistance + 3;
            rightEyeY = headY + size - eyeOffset - eyeSize;
            break;
    }

    // Draw eyes
    ctx.beginPath();
    ctx.arc(leftEyeX, leftEyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(rightEyeX, rightEyeY, eyeSize, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#000000';
    const pupilOffset = 1;

    ctx.beginPath();
    ctx.arc(leftEyeX + pupilOffset, leftEyeY + pupilOffset, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(rightEyeX + pupilOffset, rightEyeY + pupilOffset, 1.5, 0, Math.PI * 2);
    ctx.fill();
}

function drawSnakeBody(segment, index) {
    const x = segment.x;
    const y = segment.y;
    const size = GRID_SIZE - 2;
    const radius = 5;

    // Body gradient - gets lighter towards tail
    const brightness = Math.max(0.5, 1 - (index / (snake.length + 5)));

    // Gradient based on position in body
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);

    if (index % 2 === 0) {
        // Lighter segment
        gradient.addColorStop(0, `rgba(74, 222, 128, ${brightness})`);
        gradient.addColorStop(0.5, `rgba(34, 197, 94, ${brightness})`);
        gradient.addColorStop(1, `rgba(22, 163, 74, ${brightness})`);
    } else {
        // Darker segment
        gradient.addColorStop(0, `rgba(34, 197, 94, ${brightness})`);
        gradient.addColorStop(0.5, `rgba(22, 163, 74, ${brightness})`);
        gradient.addColorStop(1, `rgba(21, 128, 61, ${brightness})`);
    }

    ctx.fillStyle = gradient;

    // Draw rounded rect
    roundRect(ctx, x + 0.5, y + 0.5, size, size, radius);
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = 'rgba(21, 128, 61, 0.3)';
    ctx.lineWidth = 1;
    roundRect(ctx, x + 0.5, y + 0.5, size, size, radius);
    ctx.stroke();

    // Scale pattern on body
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    const scaleSize = size / 3;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, scaleSize / 2, 0, Math.PI * 2);
    ctx.fill();
}

// Utility function for rounded rectangles
function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}
