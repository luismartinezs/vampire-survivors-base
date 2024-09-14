const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let keys: { [key: string]: boolean } = {};

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

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

class Player extends GameObject {
  speed: number;
  level: number;
  shootTimer: number;
  attackSpeed: number;
  attackPower: number;
  xp: number;
  xpToLevelUp: number;
  collectRadius: number;

  constructor(x: number, y: number) {
    super(x, y, 20, 'blue');
    this.speed = 1.5;
    this.level = 1;
    this.shootTimer = 0;
    this.attackSpeed = 60; // Frames between shots (lower is faster)
    this.attackPower = 1;
    this.xp = 0;
    this.xpToLevelUp = 10;
    this.collectRadius = 30;
  }

  update() {
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
            1 + this.level,
            'red',
            nearestEnemy,
            this.attackPower
          )
        );
        this.shootTimer = 0;
      }
    }

    // Level Up
    if (this.xp >= this.xpToLevelUp) {
      this.levelUp();
    }
  }

  levelUp() {
    this.level++;
    this.xp = 0;
    this.xpToLevelUp += 5;
    this.attackSpeed = Math.max(10, this.attackSpeed - 3); // Increase attack speed
    this.attackPower += 1; // Increase attack power
    this.collectRadius += 3;
    console.log(`Level Up! Level: ${this.level}`);
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
    const dx = obj.x - this.x;
    const dy = obj.y - this.y;
    return Math.hypot(dx, dy);
  }

  draw() {
    super.draw();
    // Draw collection radius
    ctx.beginPath();
    ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.collectRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
    ctx.stroke();
  }
}

class Enemy extends GameObject {
  speed: number;
  health: number;

  constructor(x: number, y: number) {
    super(x, y, 20, 'green');
    this.speed = 1;
    this.health = 3; // Enemy health
  }

  update() {
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    // Move towards player
    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;
  }
}

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
    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
    } else {
      // No target, remove bullet
      const index = bullets.indexOf(this);
      if (index > -1) bullets.splice(index, 1);
    }
  }
}

class Gem extends GameObject {
  speed: number;

  constructor(x: number, y: number) {
    super(x, y, 10, 'yellow');
    this.speed = 2;
  }

  update() {
    // Move towards player if within collect radius
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < player.collectRadius) {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
    }
  }
}

let player = new Player(canvas.width / 2, canvas.height / 2);
let enemies: Enemy[] = [];
let bullets: Bullet[] = [];
let gems: Gem[] = [];

let enemySpawnInterval = 1200; // Initial interval in milliseconds
let timeSinceLastSpawn = 0;

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

  enemies.push(new Enemy(x, y));
}

function spawnGem(x: number, y: number) {
  gems.push(new Gem(x, y));
}

let lastTimestamp = 0;

function update(timestamp: number) {
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;

  timeSinceLastSpawn += delta;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.update();
  player.draw();

  bullets.forEach((bullet, index) => {
    bullet.update();
    bullet.draw();

    // Remove off-screen bullets
    if (
      bullet.x < -bullet.size ||
      bullet.x > canvas.width + bullet.size ||
      bullet.y < -bullet.size ||
      bullet.y > canvas.height + bullet.size
    ) {
      bullets.splice(index, 1);
    }
  });

  enemies.forEach((enemy, eIndex) => {
    enemy.update();
    enemy.draw();

    // Collision with player
    if (isColliding(player, enemy)) {
      alert('Game Over!');
      resetGame();
      return;
    }

    // Collision with bullets
    bullets.forEach((bullet, bIndex) => {
      if (isColliding(bullet, enemy)) {
        enemy.health -= bullet.damage;
        bullets.splice(bIndex, 1);

        if (enemy.health <= 0) {
          enemies.splice(eIndex, 1);
          spawnGem(enemy.x, enemy.y);
        }
      }
    });
  });

  gems.forEach((gem, gIndex) => {
    gem.update();
    gem.draw();

    // Collision with player
    if (isColliding(player, gem)) {
      gems.splice(gIndex, 1);
      player.xp += 1;
    }
  });

  // Spawn enemies based on interval
  if (timeSinceLastSpawn >= enemySpawnInterval) {
    spawnEnemy();
    timeSinceLastSpawn = 0;

    // Decrease interval to increase spawn rate over time
    enemySpawnInterval = Math.max(500, enemySpawnInterval - 10);
  }

  drawXPBar();

  requestAnimationFrame(update);
}

function isColliding(a: GameObject, b: GameObject): boolean {
  return (
    a.x < b.x + b.size &&
    a.x + a.size > b.x &&
    a.y < b.y + b.size &&
    a.y + a.size > b.y
  );
}

function drawXPBar() {
  const barWidth = canvas.width - 20;
  const barHeight = 20;
  const x = 10;
  const y = 10;

  // Background
  ctx.fillStyle = 'gray';
  ctx.fillRect(x, y, barWidth, barHeight);

  // Fill
  const fillWidth = (player.xp / player.xpToLevelUp) * barWidth;
  ctx.fillStyle = 'lime';
  ctx.fillRect(x, y, fillWidth, barHeight);

  // Border
  ctx.strokeStyle = 'white';
  ctx.strokeRect(x, y, barWidth, barHeight);

  // Level text
  ctx.fillStyle = 'white';
  ctx.font = '16px Arial';
  ctx.fillText(`Level: ${player.level}`, x + 5, y + 15);
}

function resetGame() {
  player = new Player(canvas.width / 2, canvas.height / 2);
  enemies = [];
  bullets = [];
  gems = [];
  enemySpawnInterval = 2000;
  timeSinceLastSpawn = 0;
}

requestAnimationFrame(update);