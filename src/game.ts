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

  constructor(x: number, y: number) {
    super(x, y, 20, 'blue');
    this.speed = 1.5;
    this.level = 1;
    this.shootTimer = 0;
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
    if (this.shootTimer > 100) {
      const nearestEnemy = this.findNearestEnemy();
      if (nearestEnemy) {
        bullets.push(
          new Bullet(
            this.x + this.size / 2,
            this.y + this.size / 2,
            5 + this.level,
            'red',
            nearestEnemy
          )
        );
      }
      this.shootTimer = 0;
    }
  }

  findNearestEnemy(): Enemy | null {
    if (enemies.length === 0) return null;
    let nearestEnemy = enemies[0];
    let minDist = this.distanceTo(nearestEnemy);

    for (const enemy of enemies) {
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
}

class Enemy extends GameObject {
  speed: number;

  constructor(x: number, y: number) {
    super(x, y, 20, 'green');
    this.speed = 1;
  }

  update() {
    // Move towards player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    this.x += (dx / dist) * this.speed;
    this.y += (dy / dist) * this.speed;
  }
}

class Bullet extends GameObject {
  speed: number;
  target: Enemy | null;

  constructor(
    x: number,
    y: number,
    speed: number,
    color: string,
    target: Enemy | null
  ) {
    super(x, y, 5, color);
    this.speed = speed;
    this.target = target;
  }

  update() {
    if (this.target) {
      // Move towards target enemy
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);

      if (dist > 0) {
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;
      }
    } else {
      // No target, move upwards
      this.y -= this.speed;
    }
  }
}

class Gem extends GameObject {
  constructor(x: number, y: number) {
    super(x, y, 10, 'yellow');
  }
}

let player = new Player(canvas.width / 2, canvas.height / 2);
let enemies: Enemy[] = [];
let bullets: Bullet[] = [];
let gems: Gem[] = [];

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x: number, y: number;

  // Spawn enemies at random edges
  switch (edge) {
    case 0: // Top edge
      x = Math.random() * canvas.width;
      y = -20;
      break;
    case 1: // Right edge
      x = canvas.width + 20;
      y = Math.random() * canvas.height;
      break;
    case 2: // Bottom edge
      x = Math.random() * canvas.width;
      y = canvas.height + 20;
      break;
    case 3: // Left edge
      x = -20;
      y = Math.random() * canvas.height;
      break;
  }

  enemies.push(new Enemy(x, y));
}

function spawnGem(x: number, y: number) {
  gems.push(new Gem(x, y));
}

function update() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  player.update();
  player.draw();

  bullets.forEach((bullet, index) => {
    bullet.update();
    bullet.draw();

    // Remove bullets that go off-screen
    if (
      bullet.x + bullet.size < 0 ||
      bullet.x > canvas.width ||
      bullet.y + bullet.size < 0 ||
      bullet.y > canvas.height
    ) {
      bullets.splice(index, 1);
    }
  });

  enemies.forEach((enemy, eIndex) => {
    enemy.update();
    enemy.draw();

    // Check collision with player
    if (isColliding(player, enemy)) {
      alert('Game Over!');
      resetGame();
    }

    // Check collision with bullets
    bullets.forEach((bullet, bIndex) => {
      if (isColliding(bullet, enemy)) {
        enemies.splice(eIndex, 1);
        bullets.splice(bIndex, 1);
        spawnGem(enemy.x, enemy.y);
      }
    });
  });

  gems.forEach((gem, gIndex) => {
    gem.draw();

    // Check collision with player
    if (isColliding(player, gem)) {
      gems.splice(gIndex, 1);
      player.level++;
      console.log('Level Up! Level:', player.level);
    }
  });

  // Randomly spawn enemies
  if (Math.random() < 0.01) {
    spawnEnemy();
  }

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

function resetGame() {
  enemies = [];
  bullets = [];
  gems = [];
  player = new Player(canvas.width / 2, canvas.height / 2);
}

update();