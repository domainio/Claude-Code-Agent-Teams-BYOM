# Snake Game Architecture Plan

## Overview
A browser-based Snake game using vanilla JavaScript and HTML5 Canvas. Simple, performant, and easy to maintain.

---

## 1. Technology Stack

| Component | Choice | Reason |
|-----------|--------|--------|
| Language | Vanilla JavaScript (ES6+) | No build step needed, universal browser support |
| Rendering | HTML5 Canvas API | Efficient pixel-based graphics, perfect for grid games |
| Styling | CSS3 | Simple styling for UI elements and canvas container |
| Markup | HTML5 | Semantic structure for game container |

**No external dependencies** - keeps the project lightweight and dependency-free.

---

## 2. Game State Structure

### Main State Object

```javascript
const gameState = {
  // Game status
  isRunning: false,
  isPaused: false,
  isGameOver: false,

  // Snake data
  snake: {
    body: [{ x: 10, y: 10 }], // Array of segments, head at index 0
    direction: 'RIGHT',       // Current direction: UP, DOWN, LEFT, RIGHT
    nextDirection: 'RIGHT',   // Buffered direction for next frame
    growthPending: 0          // Number of segments to add (from eating food)
  },

  // Food data
  food: {
    x: 15,
    y: 15,
    type: 'normal'           // Future: power-ups (speed, multi-food, etc.)
  },

  // Score and stats
  score: 0,
  highScore: 0,              // Loaded from localStorage
  speed: 150,                // Milliseconds between moves (lower = faster)

  // Timing
  lastMoveTime: 0            // Timestamp of last snake move
};
```

### State Management Principles
- Single source of truth: All data in `gameState`
- Immutable updates: Create new objects rather than mutating directly
- State changes trigger renders (within game loop)

---

## 3. Core Components

### 3.1 Snake Class/Object

**Responsibilities:**
- Track body segment positions
- Handle movement and direction changes
- Manage growth when eating food
- Self-collision detection

**Key Methods:**
```javascript
const Snake = {
  // Move snake in current direction, returns new head position
  move() {
    const head = gameState.snake.body[0];
    const newHead = this.getNextPosition(head, gameState.snake.direction);
    gameState.snake.body.unshift(newHead);

    // Remove tail unless growing
    if (gameState.snake.growthPending > 0) {
      gameState.snake.growthPending--;
    } else {
      gameState.snake.body.pop();
    }
  },

  // Calculate next position based on direction
  getNextPosition(position, direction) {
    const moves = {
      UP:    { x: position.x, y: position.y - 1 },
      DOWN:  { x: position.x, y: position.y + 1 },
      LEFT:  { x: position.x - 1, y: position.y },
      RIGHT: { x: position.x + 1, y: position.y }
    };
    return moves[direction];
  },

  // Check if snake eats itself
  checkSelfCollision() {
    const head = gameState.snake.body[0];
    return gameState.snake.body.slice(1).some(
      segment => segment.x === head.x && segment.y === head.y
    );
  },

  // Add growth segments
  grow(amount = 1) {
    gameState.snake.growthPending += amount;
  }
};
```

### 3.2 Food Spawning Logic

**Requirements:**
- Spawn food at random grid position
- Never spawn on snake body
- Consider future: power-up types

```javascript
const Food = {
  spawn() {
    let position;
    do {
      position = {
        x: Math.floor(Math.random() * GRID_WIDTH),
        y: Math.floor(Math.random() * GRID_HEIGHT)
      };
    } while (this.isOnSnake(position));

    gameState.food = { ...position, type: 'normal' };
  },

  isOnSnake(position) {
    return gameState.snake.body.some(
      segment => segment.x === position.x && segment.y === position.y
    );
  },

  // Check if snake head is at food position
  isEaten() {
    const head = gameState.snake.body[0];
    return head.x === gameState.food.x && head.y === gameState.food.y;
  }
};
```

### 3.3 Collision Detection System

**Collision Types:**
1. **Wall collision**: Snake head outside grid bounds
2. **Self collision**: Snake head hits any body segment
3. **Food collision**: Snake head at food position (not a collision, but event)

```javascript
const Collision = {
  // Check wall collision
  checkWall() {
    const head = gameState.snake.body[0];
    return (
      head.x < 0 ||
      head.x >= GRID_WIDTH ||
      head.y < 0 ||
      head.y >= GRID_HEIGHT
    );
  },

  // Check all game-ending collisions
  checkGameOver() {
    return this.checkWall() || Snake.checkSelfCollision();
  },

  // Check food collision
  checkFood() {
    return Food.isEaten();
  }
};
```

### 3.4 Input Handling

**Controls:**
- Arrow keys or WASD for direction
- P to pause
- Space to start/restart
- Prevent 180-degree turns (can't go directly back into yourself)

```javascript
const Input = {
  init() {
    document.addEventListener('keydown', this.handleKeydown.bind(this));
  },

  handleKeydown(event) {
    const keyMap = {
      'ArrowUp': 'UP', 'w': 'UP', 'W': 'UP',
      'ArrowDown': 'DOWN', 's': 'DOWN', 'S': 'DOWN',
      'ArrowLeft': 'LEFT', 'a': 'LEFT', 'A': 'LEFT',
      'ArrowRight': 'RIGHT', 'd': 'RIGHT', 'D': 'RIGHT'
    };

    if (keyMap[event.key]) {
      event.preventDefault();
      this.setDirection(keyMap[event.key]);
    }

    if (event.key === 'p' || event.key === 'P') {
      Game.togglePause();
    }

    if (event.key === ' ') {
      if (gameState.isGameOver) {
        Game.restart();
      } else if (!gameState.isRunning) {
        Game.start();
      }
    }
  },

  setDirection(newDirection) {
    const opposites = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' };
    // Prevent 180-degree turns
    if (opposites[newDirection] !== gameState.snake.direction) {
      gameState.snake.nextDirection = newDirection;
    }
  }
};
```

### 3.5 Game Loop Mechanism

**Architecture:**
- Use `requestAnimationFrame` for smooth rendering
- Separate update logic from rendering
- Time-based movement (not frame-based)

```javascript
const GameLoop = {
  init() {
    this.lastFrameTime = 0;
    requestAnimationFrame(this.loop.bind(this));
  },

  loop(timestamp) {
    // Handle timing
    if (!gameState.lastMoveTime) {
      gameState.lastMoveTime = timestamp;
    }

    const elapsed = timestamp - gameState.lastMoveTime;

    // Update game state based on speed
    if (gameState.isRunning && !gameState.isPaused && elapsed >= gameState.speed) {
      this.update();
      gameState.lastMoveTime = timestamp;
    }

    // Always render
    Renderer.draw();

    // Next frame
    requestAnimationFrame(this.loop.bind(this));
  },

  update() {
    // Apply buffered direction
    gameState.snake.direction = gameState.snake.nextDirection;

    // Move snake
    Snake.move();

    // Check collisions
    if (Collision.checkGameOver()) {
      Game.gameOver();
      return;
    }

    // Check food
    if (Collision.checkFood()) {
      Snake.grow();
      Food.spawn();
      Game.addScore(10);
      // Optionally increase speed slightly
      gameState.speed = Math.max(50, gameState.speed - 2);
    }
  }
};
```

---

## 4. File Structure

```
./
├── index.html          # Main HTML, canvas element, UI structure
├── css/
│   └── style.css       # Game styling, canvas centering, UI elements
├── js/
│   ├── main.js         # Entry point, initialization
│   ├── game.js         # Game state, Game object (start, pause, restart, gameOver)
│   ├── snake.js        # Snake object (move, grow, collision)
│   ├── food.js         # Food object (spawn, position)
│   ├── input.js        # Input handler (keyboard events)
│   ├── renderer.js     # Canvas drawing (snake, food, grid, UI)
│   └── config.js       # Game constants (GRID_SIZE, CELL_SIZE, etc.)
└── plan.md             # This architecture document
```

### File Purposes

| File | Purpose |
|------|---------|
| `config.js` | Single source for all game constants. Easy tuning without touching logic. |
| `game.js` | Game lifecycle management: start, pause, restart, game over, score tracking. |
| `snake.js` | All snake-related logic: movement, growth, position tracking. |
| `food.js` | Food spawning algorithm and position management. |
| `input.js` | Keyboard event handling, input buffering, key mapping. |
| `renderer.js` | All canvas drawing operations. Separated from game logic for clarity. |
| `main.js` | Bootstrap: imports all modules, initializes game, starts loop. |
| `style.css` | Visual styling: canvas container, score display, game over overlay. |
| `index.html` | Page structure: canvas element, score UI, game over message. |

---

## 5. Game Constants

### Config Object (`js/config.js`)

```javascript
const CONFIG = {
  // Grid dimensions (number of cells)
  GRID_WIDTH: 25,
  GRID_HEIGHT: 25,

  // Cell size in pixels
  CELL_SIZE: 20,

  // Canvas dimensions (calculated)
  get CANVAS_WIDTH() { return this.GRID_WIDTH * this.CELL_SIZE; },
  get CANVAS_HEIGHT() { return this.GRID_HEIGHT * this.CELL_SIZE; },

  // Game speed (milliseconds between moves)
  INITIAL_SPEED: 150,
  MIN_SPEED: 50,
  SPEED_DECREMENT: 2,

  // Scoring
  POINTS_PER_FOOD: 10,

  // Snake settings
  INITIAL_SNAKE_LENGTH: 3,
  INITIAL_SNAKE_X: 10,
  INITIAL_SNAKE_Y: 10,

  // Colors (for renderer)
  COLORS: {
    BACKGROUND: '#1a1a2e',
    GRID_LINES: '#16213e',
    SNAKE_HEAD: '#4ecca3',
    SNAKE_BODY: '#45b08c',
    FOOD: '#e74c3c',
    TEXT: '#eeeeee'
  }
};

// Prevent modification
Object.freeze(CONFIG);
```

### Derived Values

| Calculation | Value |
|-------------|-------|
| Canvas Width | 25 cells x 20px = **500px** |
| Canvas Height | 25 cells x 20px = **500px** |
| Initial Speed | **150ms** (~6.6 moves/second) |
| Max Speed | **50ms** (20 moves/second) |

---

## 6. Implementation Order

1. **config.js** - Define constants first
2. **index.html + style.css** - Basic page structure
3. **renderer.js** - Draw grid (for testing)
4. **snake.js** - Create and draw snake
5. **input.js** - Add keyboard controls
6. **game.js + main.js** - Game loop and lifecycle
7. **food.js** - Add food spawning
8. **Collision detection** - Complete game logic
9. **Polish** - Scoring, high score, game over UI

---

## 7. Design Decisions

### Why Vanilla JS?
- No build step required
- Runs in any browser
- Minimal dependencies
- Easy to understand and modify

### Why Canvas over DOM?
- Better performance for grid-based games
- Smoother animations
- Easier pixel-perfect rendering
- Consistent across browsers

### Why Module Pattern?
- Clean separation of concerns
- No global namespace pollution
- Easy to test individual components
- Simple to extend

---

## 8. Future Extensions

Potential features to add later:
- Difficulty levels (affects speed)
- Power-ups (speed boost, score multiplier)
- Obstacles/walls
- Multiple food items
- Sound effects
- Touch controls for mobile
- High score persistence (localStorage)

---

*Plan created by Game Architect. Ready for implementation.*
