const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Get HTML elements for overlays and buttons
const gameOverOverlay = document.getElementById('gameOverOverlay') as HTMLDivElement;
const replayButton = document.getElementById('replayButton') as HTMLButtonElement;
const levelUpOverlay = document.getElementById('levelUpOverlay') as HTMLDivElement;
const upgradeAttackSpeedButton = document.getElementById('upgradeAttackSpeed') as HTMLButtonElement;
const upgradeAttackPowerButton = document.getElementById('upgradeAttackPower') as HTMLButtonElement;
const upgradeCollectRadiusButton = document.getElementById('upgradeCollectRadius') as HTMLButtonElement;
const xpBar = document.getElementById('xpBar') as HTMLDivElement;
const levelDisplay = document.getElementById('levelDisplay') as HTMLDivElement;
const scoreDisplay = document.getElementById('scoreDisplay') as HTMLDivElement; // New score display

let keys: { [key: string]: boolean } = {};
let gamePaused = false;
let score = 0; // Initialize score

// Event listeners for keyboard input
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// GameObject Base Class
class GameObject {
  x: number;
  y: number;
  size: number;
  color: string;

  constructor(x: number, y: number, size: number, color: string) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.color = color;
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// Player Class
class Player extends GameObject {
  speed: number;
  level: number;
  shootTimer: number;
  attackSpeed: number; // Frames between shots
  attackPower: number;
  xp: number;
  xpToLevelUp: number;
  collectRadius: number;

  constructor(x: number, y: number) {
    super(x, y, 20, 'cyan'); // Player color for visibility
    this.speed = 1.5; // Moderate speed for responsive movement
    this.level = 1;
    this.shootTimer = 0;
    this.attackSpeed = 70; // Faster shooting rate
    this.attackPower = 1;
    this.xp = 0;
    this.xpToLevelUp = 10; // XP required per level
    this.collectRadius = 30;
  }

  update() {
    if (gamePaused) return;

    // Movement with Arrow Keys and WASD
    if (keys['ArrowUp'] || keys['KeyW']) this.y -= this.speed;
    if (keys['ArrowDown'] || keys['KeyS']) this.y += this.speed;
    if (keys['ArrowLeft'] || keys['KeyA']) this.x -= this.speed;
    if (keys['ArrowRight'] || keys['KeyD']) this.x += this.speed;

    // Keep player within bounds
    this.x = Math.max(0, Math.min(canvas.width - this.size, this.x));
    this.y = Math.max(0, Math.min(canvas.height - this.size, this.y));

    // Auto-shoot
    this.shootTimer++;
    if (this.shootTimer >= this.attackSpeed) {
      const nearestEnemy = this.findNearestEnemy();
      if (nearestEnemy) {
        bullets.push(
          new Bullet(
            this.x + this.size / 2,
            this.y + this.size / 2,
            1 + this.level, // Increased bullet speed for visibility
            'red',
            nearestEnemy,
            1 + Math.floor(this.level / 2) // Scaled damage
          )
        );
        this.shootTimer = 0;
      }
    }

    // Level Up Check
    if (this.xp >= this.xpToLevelUp) {
      this.levelUp();
    }
  }

  levelUp() {
    console.log('Leveling up!');
    this.level++;
    this.xp = 0;
    this.xpToLevelUp += 10; // Increment XP requirement
    // Scale difficulty based on player level
    enemySpawnInterval = Math.max(500, 2000 - (this.level * 150)); // Gradually reduce spawn interval
    // Pause the game and show Level Up overlay
    gamePaused = true;
    showLevelUpOverlay();
    updateLevelDisplay();
  }

  findNearestEnemy(): Enemy | null {
    if (enemies.length === 0) return null;
    let nearestEnemy = enemies[0];
    let minDist = this.distanceTo(nearestEnemy);

    for (let enemy of enemies) {
      const dist = this.distanceTo(enemy);
      if (dist < minDist) {
        nearestEnemy = enemy;
        minDist = dist;
      }
    }

    return nearestEnemy;
  }

  distanceTo(obj: GameObject): number {
    const dx = (obj.x + obj.size / 2) - (this.x + this.size / 2);
    const dy = (obj.y + obj.size / 2) - (this.y + this.size / 2);
    return Math.hypot(dx, dy);
  }

  draw() {
    super.draw();
    // Draw collection radius
    ctx.beginPath();
    ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.collectRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)'; // Changed to cyan for visibility
    ctx.stroke();

    // Display Player Coordinates (for debugging)
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    // ctx.fillText(`(${Math.round(this.x)}, ${Math.round(this.y)})`, this.x, this.y - 5);
  }
}

// Enemy Class
enum EnemyType {
  Normal,
  Fast,
  Tank,
  Shooter,
  Boss
}

const enemySpawnChances: { [key in EnemyType]: number } = {
  [EnemyType.Normal]: 0.6,
  [EnemyType.Fast]: 0.2,
  [EnemyType.Tank]: 0.1,
  [EnemyType.Shooter]: 0.08,
  [EnemyType.Boss]: 0.02
};

class Enemy extends GameObject {
  speed: number;
  health: number;
  type: EnemyType;

  constructor(x: number, y: number, type: EnemyType = EnemyType.Normal) {
    super(x, y, 20, 'green'); // Default color
    this.type = type;
    switch (this.type) {
      case EnemyType.Fast:
        this.speed = 1.5;
        this.health = 1;
        this.color = 'orange';
        break;
      case EnemyType.Tank:
        this.speed = 0.5;
        this.health = 15;
        this.color = 'purple';
        break;
      case EnemyType.Boss:
        this.speed = 0.2;
        this.health = 30;
        this.color = 'red';
        break;
      case EnemyType.Shooter:
        this.speed = 0.8;
        this.health = 8;
        this.color = 'blue';
        break;
      default:
        this.speed = 0.8;
        this.health = 5;
        this.color = 'green';
    }
  }

  update() {
    if (gamePaused) return;

    const dx = (player.x + player.size / 2) - (this.x + this.size / 2);
    const dy = (player.y + player.size / 2) - (this.y + this.size / 2);
    const dist = Math.hypot(dx, dy);

    // Move towards player with speed based on type and player level
    this.x += (dx / dist) * this.speed * (1 + (player.level * 0.05));
    this.y += (dy / dist) * this.speed * (1 + (player.level * 0.05));
  }
}

// Bullet Class
class Bullet extends GameObject {
  speed: number;
  target: Enemy | null;
  damage: number;

  constructor(
    x: number,
    y: number,
    speed: number,
    color: string,
    target: Enemy | null,
    damage: number
  ) {
    super(x, y, 5, color);
    this.speed = speed;
    this.target = target;
    this.damage = damage;
  }

  update() {
    if (gamePaused) return;

    if (this.target) {
      // Check if the target still exists in the enemies array
      if (!enemies.includes(this.target)) {
        this.remove();
        return;
      }

      const dx = (this.target.x + this.target.size / 2) - (this.x + this.size / 2);
      const dy = (this.target.y + this.target.size / 2) - (this.y + this.size / 2);
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }

      // Check collision with target
      if (dist < (this.size + this.target.size) / 2) {
        this.target.health -= this.damage;
        console.log(`Enemy hit! Health: ${this.target.health}`);
        this.remove();
        if (this.target.health <= 0) {
          enemies.splice(enemies.indexOf(this.target), 1);
          spawnGem(this.target.x, this.target.y);
          score += 10; // Increment score
          updateScoreDisplay(); // Update score display
        }
      }
    } else {
      // No target, remove bullet
      this.remove();
    }

    // Remove bullet if it goes off-screen
    if (
      this.x < -this.size ||
      this.x > canvas.width + this.size ||
      this.y < -this.size ||
      this.y > canvas.height + this.size
    ) {
      this.remove();
    }
  }

  remove() {
    const index = bullets.indexOf(this);
    if (index > -1) bullets.splice(index, 1);
  }
}

// Gem Class
class Gem extends GameObject {
  speed: number;

  constructor(x: number, y: number) {
    super(x, y, 10, 'yellow'); // Gem color
    this.speed = 3; // Maintains collectability
  }

  update() {
    if (gamePaused) return;

    // Move towards player if within collect radius
    const dx = (player.x + player.size / 2) - (this.x + this.size / 2);
    const dy = (player.y + player.size / 2) - (this.y + this.size / 2);
    const dist = Math.hypot(dx, dy);

    if (dist < player.collectRadius) {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }
}

// Power-Up Class
enum PowerUpType {
  SpeedBoost,
  RapidFire,
  Shield
}

class PowerUp extends GameObject {
  type: PowerUpType;
  duration: number; // Duration in frames

  constructor(x: number, y: number, type: PowerUpType) {
    super(x, y, 15, 'magenta'); // Power-Up color
    this.type = type;
    this.duration = 300; // Example duration
  }

  update() {
    if (gamePaused) return;

    // Optionally, power-ups can move or have other behaviors
  }

  applyEffect(player: Player) {
    switch (this.type) {
      case PowerUpType.SpeedBoost:
        player.speed += 2;
        setTimeout(() => {
          player.speed = Math.max(4, player.speed - 2);
        }, this.duration * (1000 / 60)); // Convert frames to milliseconds
        break;
      case PowerUpType.RapidFire:
        player.attackSpeed = Math.max(30, player.attackSpeed - 30);
        setTimeout(() => {
          player.attackSpeed += 30;
        }, this.duration * (1000 / 60));
        break;
      case PowerUpType.Shield:
        // Implement shield logic, e.g., invincibility frames
        console.log('Shield activated!');
        setTimeout(() => {
          console.log('Shield deactivated!');
        }, this.duration * (1000 / 60));
        break;
      default:
        break;
    }
  }
}

// Initialize Player and Game Arrays
let player = new Player(canvas.width / 2 - 10, canvas.height / 2 - 10); // Adjusted position
let enemies: Enemy[] = [];
let bullets: Bullet[] = [];
let gems: Gem[] = [];
let powerUps: PowerUp[] = []; // Array for power-ups

// Enemy Spawn Configuration
let enemySpawnInterval = 2000; // Initial interval in milliseconds
let timeSinceLastSpawn = 0;

// Function to Spawn Enemies from Random Edges
function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x: number = 0, y: number = 0;

  switch (edge) {
    case 0: // Top
      x = Math.random() * canvas.width;
      y = -20;
      break;
    case 1: // Right
      x = canvas.width + 20;
      y = Math.random() * canvas.height;
      break;
    case 2: // Bottom
      x = Math.random() * canvas.width;
      y = canvas.height + 20;
      break;
    case 3: // Left
      x = -20;
      y = Math.random() * canvas.height;
      break;
  }

  // Randomly assign enemy type based on spawn probability
  const rand = Math.random();
  let type = EnemyType.Normal;
  let cumulativeChance = 0;

  for (const [enemyType, chance] of Object.entries(enemySpawnChances)) {
    cumulativeChance += chance;
    if (rand < cumulativeChance) {
      type = Number(enemyType) as EnemyType;
      break;
    }
  }

  enemies.push(new Enemy(x, y, type));

  // 10% chance to spawn a power-up instead of an enemy
  if (Math.random() < 0.1) {
    spawnPowerUp(x, y);
  }
}

// Function to Spawn Gems
function spawnGem(x: number, y: number) {
  gems.push(new Gem(x, y));
}

// Function to Spawn Power-Ups
function spawnPowerUp(x: number, y: number) {
  const rand = Math.random();
  let type: PowerUpType = PowerUpType.SpeedBoost;

  if (rand < 0.33) {
    type = PowerUpType.SpeedBoost;
  } else if (rand < 0.66) {
    type = PowerUpType.RapidFire;
  } else {
    type = PowerUpType.Shield;
  }

  powerUps.push(new PowerUp(x, y, type));
}

// Function to Update XP Bar
function updateXPBar() {
  const fillPercentage = (player.xp / player.xpToLevelUp) * 100;
  xpBar.style.width = `${fillPercentage}%`;
}

// Function to Update Level Display
function updateLevelDisplay() {
  levelDisplay.textContent = `Level: ${player.level}`;
}

// Function to Update Score Display
function updateScoreDisplay() {
  scoreDisplay.textContent = `Score: ${score}`;
}

// Level Up Overlay Handling
function showLevelUpOverlay() {
  levelUpOverlay.style.display = 'flex';
}

function hideLevelUpOverlay() {
  levelUpOverlay.style.display = 'none';
  gamePaused = false;
}

// Game Over Overlay Handling
function showGameOverOverlay() {
  gameOverOverlay.style.display = 'flex';
}

function hideGameOverOverlay() {
  gameOverOverlay.style.display = 'none';
}

// Event Listener for Replay Button
replayButton.addEventListener('click', () => {
  resetGame();
  hideGameOverOverlay();
});

// Event Listeners for Upgrade Buttons
upgradeAttackSpeedButton.addEventListener('click', () => {
  player.attackSpeed = Math.max(20, player.attackSpeed - 10); // Minimum attack speed limit
  hideLevelUpOverlay();
});

upgradeAttackPowerButton.addEventListener('click', () => {
  player.attackPower += 1;
  hideLevelUpOverlay();
});

upgradeCollectRadiusButton.addEventListener('click', () => {
  player.collectRadius += 20; // Increase collect radius
  hideLevelUpOverlay();
});

// Function to Reset the Game
function resetGame() {
  console.log('Resetting game');
  player = new Player(canvas.width / 2 - 10, canvas.height / 2 - 10); // Adjusted position
  enemies = [];
  bullets = [];
  gems = [];
  powerUps = []; // Reset power-ups
  enemySpawnInterval = 2000;
  timeSinceLastSpawn = 0;
  score = 0; // Reset score
  updateXPBar();
  updateLevelDisplay();
  updateScoreDisplay(); // Reset score display
  hideGameOverOverlay();
  hideLevelUpOverlay();
  gamePaused = false;
}

// Main Update Function
let lastTimestamp = 0;

function update(timestamp: number) {
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  timeSinceLastSpawn += delta;

  // Clear Canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gamePaused) {
    player.update();

    // Update and Draw Enemies
    enemies.forEach((enemy) => {
      enemy.update();
      enemy.draw();

      // Collision with Player
      if (isColliding(player, enemy)) {
        console.log('Collision detected! Game Over.');
        showGameOverOverlay();
        gamePaused = true;
      }
    });

    // Update and Draw Gems
    gems.forEach((gem) => {
      gem.update();
      gem.draw();

      // Collision with Player
      if (isColliding(player, gem)) {
        gems.splice(gems.indexOf(gem), 1);
        player.xp += 1;
        console.log(`Gem collected! XP: ${player.xp}`);
        updateXPBar();
      }
    });

    // Update and Draw Bullets
    bullets.forEach((bullet) => {
      bullet.update();
      bullet.draw();
    });

    // Update and Draw Power-Ups
    powerUps.forEach((powerUp) => {
      powerUp.update();
      powerUp.draw();

      // Collision with Player
      if (isColliding(player, powerUp)) {
        powerUp.applyEffect(player);
        powerUps.splice(powerUps.indexOf(powerUp), 1); // Remove power-up after collection
      }
    });

    // Draw Player Last to Ensure It's on Top
    player.draw();

    // Spawn Enemies Based on Interval
    if (timeSinceLastSpawn >= enemySpawnInterval) {
      spawnEnemy();
      timeSinceLastSpawn = 0;

      // Decrease spawn interval based on player level
      enemySpawnInterval = Math.max(
        500,
        2000 - (player.level * 150) // Adjust as player levels up
      );
    }
  }

  // Check for Level Up
  if (player.xp >= player.xpToLevelUp && !gamePaused) {
    player.levelUp();
  }

  // Update Level Display
  updateLevelDisplay();
  updateScoreDisplay(); // Update score display

  requestAnimationFrame(update);
}

// Collision Detection Function
function isColliding(a: GameObject, b: GameObject): boolean {
  return (
    a.x < b.x + b.size &&
    a.x + a.size > b.x &&
    a.y < b.y + b.size &&
    a.y + a.size > b.y
  );
}

// Start the Game Loop
requestAnimationFrame(update);