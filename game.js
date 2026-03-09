const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const selector = document.getElementById('classSelector');
const elementInfo = document.getElementById('elementInfo');
const healthInfo = document.getElementById('healthInfo');
const scoreInfo = document.getElementById('scoreInfo');

const ELEMENTS = {
  water: {
    color: '#4fb5ff',
    altColor: '#d5f0ff',
    primary: 'Water',
    alternate: 'Ice',
    speed: 7,
    radius: 11,
    damage: 15,
    altDamage: 24,
    altSlow: 0.45,
    background: '#224a84'
  },
  fire: {
    color: '#ff6f42',
    altColor: '#f8ff7c',
    primary: 'Fire',
    alternate: 'Lightning',
    speed: 8.5,
    radius: 10,
    damage: 17,
    altDamage: 28,
    chainRange: 95,
    background: '#81311f'
  },
  earth: {
    color: '#7b5e43',
    altColor: '#7f7f84',
    primary: 'Earth',
    alternate: 'Metal',
    speed: 6,
    radius: 14,
    damage: 24,
    altDamage: 32,
    knockback: 4,
    background: '#4e4228'
  },
  air: {
    color: '#ccf8ff',
    altColor: '#d8b6ff',
    primary: 'Air',
    alternate: 'Storm',
    speed: 9,
    radius: 9,
    damage: 12,
    altDamage: 20,
    pierce: true,
    background: '#364680'
  }
};

const gameState = {
  running: false,
  player: null,
  enemies: [],
  projectiles: [],
  particles: [],
  mouse: { x: canvas.width / 2, y: canvas.height / 2, down: false, charge: 0 },
  score: 0,
  spawnTimer: 0,
  gameTime: 0
};

function createPlayer(element) {
  return {
    x: canvas.width / 2,
    y: canvas.height - 80,
    radius: 20,
    hp: 100,
    maxHp: 100,
    element,
    formAlt: false,
    cooldown: 0
  };
}

function spawnEnemy() {
  const side = Math.random() < 0.5 ? 0 : canvas.width;
  const y = 80 + Math.random() * (canvas.height - 200);
  const vx = side === 0 ? 1.4 + Math.random() * 0.6 : -1.4 - Math.random() * 0.6;
  gameState.enemies.push({
    x: side === 0 ? -40 : canvas.width + 40,
    y,
    radius: 18,
    hp: 60 + Math.random() * 20,
    speed: Math.abs(vx),
    vx,
    fireCooldown: 55 + Math.random() * 40,
    slow: 0,
    tint: ['#ff89ad', '#ffbc73', '#9ef6a0'][Math.floor(Math.random() * 3)]
  });
}

function shootProjectile(from, toX, toY, owner = 'player') {
  const player = gameState.player;
  const cfg = ELEMENTS[player.element];
  const dx = toX - from.x;
  const dy = toY - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = cfg.speed + Math.min(gameState.mouse.charge, 50) * 0.12;

  gameState.projectiles.push({
    x: from.x,
    y: from.y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    radius: cfg.radius + gameState.mouse.charge * 0.06,
    life: 120,
    owner,
    element: player.element,
    alt: player.formAlt,
    damage: player.formAlt ? cfg.altDamage : cfg.damage,
    color: player.formAlt ? cfg.altColor : cfg.color
  });
}

function enemyShoot(enemy) {
  const p = gameState.player;
  const dx = p.x - enemy.x;
  const dy = p.y - enemy.y;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = 4.1;
  gameState.projectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    radius: 7,
    life: 180,
    owner: 'enemy',
    element: 'enemy',
    alt: false,
    damage: 8,
    color: '#ff7ea6'
  });
}

function addParticles(x, y, color, count = 7) {
  for (let i = 0; i < count; i += 1) {
    gameState.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 28 + Math.random() * 14,
      color,
      size: 2 + Math.random() * 3
    });
  }
}

function updatePlayer() {
  const p = gameState.player;
  p.cooldown = Math.max(0, p.cooldown - 1);
  if (gameState.mouse.down) {
    gameState.mouse.charge = Math.min(75, gameState.mouse.charge + 1.15);
  }
}

function updateEnemies() {
  const p = gameState.player;
  for (let i = gameState.enemies.length - 1; i >= 0; i -= 1) {
    const e = gameState.enemies[i];
    const slowMultiplier = e.slow > 0 ? 0.4 : 1;
    e.x += e.vx * slowMultiplier;

    if (Math.abs(e.x - p.x) < 200) {
      e.y += Math.sign(p.y - e.y) * 0.8;
    }

    e.fireCooldown -= 1;
    if (e.fireCooldown <= 0) {
      enemyShoot(e);
      e.fireCooldown = 70 + Math.random() * 50;
    }

    e.slow = Math.max(0, e.slow - 1);

    if (e.hp <= 0) {
      addParticles(e.x, e.y, e.tint, 10);
      gameState.enemies.splice(i, 1);
      gameState.score += 10;
    }
  }
}

function updateProjectiles() {
  const p = gameState.player;

  for (let i = gameState.projectiles.length - 1; i >= 0; i -= 1) {
    const pr = gameState.projectiles[i];
    pr.x += pr.vx;
    pr.y += pr.vy;
    pr.life -= 1;

    let removeProjectile = false;

    if (pr.owner === 'player') {
      for (const enemy of gameState.enemies) {
        const d = Math.hypot(pr.x - enemy.x, pr.y - enemy.y);
        if (d < pr.radius + enemy.radius) {
          enemy.hp -= pr.damage;
          addParticles(pr.x, pr.y, pr.color, pr.alt ? 10 : 6);

          if (pr.element === 'water' && pr.alt) {
            enemy.slow = 90;
          }

          if (pr.element === 'earth' && pr.alt) {
            enemy.vx += Math.sign(enemy.x - p.x) * ELEMENTS.earth.knockback;
          }

          if (pr.element === 'fire' && pr.alt) {
            for (const nearby of gameState.enemies) {
              if (nearby === enemy) continue;
              const nDist = Math.hypot(nearby.x - enemy.x, nearby.y - enemy.y);
              if (nDist < ELEMENTS.fire.chainRange) {
                nearby.hp -= Math.round(pr.damage * 0.6);
                addParticles(nearby.x, nearby.y, '#f6fd95', 6);
              }
            }
          }

          if (!(pr.element === 'air' && pr.alt)) {
            removeProjectile = true;
          }
          break;
        }
      }
    } else {
      const d = Math.hypot(pr.x - p.x, pr.y - p.y);
      if (d < pr.radius + p.radius) {
        p.hp -= pr.damage;
        addParticles(pr.x, pr.y, '#ff9db8', 8);
        removeProjectile = true;
      }
    }

    if (
      removeProjectile ||
      pr.life <= 0 ||
      pr.x < -40 ||
      pr.y < -40 ||
      pr.x > canvas.width + 40 ||
      pr.y > canvas.height + 40
    ) {
      gameState.projectiles.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = gameState.particles.length - 1; i >= 0; i -= 1) {
    const pa = gameState.particles[i];
    pa.x += pa.vx;
    pa.y += pa.vy;
    pa.life -= 1;
    if (pa.life <= 0) {
      gameState.particles.splice(i, 1);
    }
  }
}

function drawArena() {
  const p = gameState.player;
  const cfg = ELEMENTS[p.element];

  ctx.fillStyle = '#0f1527';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = cfg.background;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let x = 0; x < canvas.width; x += 55) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
}

function drawEntities() {
  const p = gameState.player;
  const cfg = ELEMENTS[p.element];

  ctx.fillStyle = p.formAlt ? cfg.altColor : cfg.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();

  // aim line + charge preview
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(gameState.mouse.x, gameState.mouse.y);
  ctx.stroke();

  if (gameState.mouse.down) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(p.x - 35, p.y + 28, (gameState.mouse.charge / 75) * 70, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.strokeRect(p.x - 35, p.y + 28, 70, 6);
  }

  for (const enemy of gameState.enemies) {
    ctx.fillStyle = enemy.tint;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#101825';
    ctx.fillRect(enemy.x - 20, enemy.y - 26, 40, 5);
    ctx.fillStyle = '#8af5a0';
    const hpWidth = Math.max(0, (enemy.hp / 80) * 40);
    ctx.fillRect(enemy.x - 20, enemy.y - 26, hpWidth, 5);
  }

  for (const pr of gameState.projectiles) {
    ctx.fillStyle = pr.color;
    ctx.beginPath();
    ctx.arc(pr.x, pr.y, pr.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const pa of gameState.particles) {
    ctx.fillStyle = pa.color;
    ctx.globalAlpha = Math.max(0, pa.life / 40);
    ctx.beginPath();
    ctx.arc(pa.x, pa.y, pa.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function updateHud() {
  const p = gameState.player;
  const cfg = ELEMENTS[p.element];
  elementInfo.textContent = `Element: ${cfg.primary} ${p.formAlt ? `(${cfg.alternate} Form)` : ''}`;
  healthInfo.textContent = `Health: ${Math.max(0, Math.round(p.hp))}/${p.maxHp}`;
  scoreInfo.textContent = `Score: ${gameState.score}`;
}

function drawGameOver() {
  if (gameState.player.hp > 0) return;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.font = 'bold 50px sans-serif';
  ctx.fillText('Defeated', canvas.width / 2, canvas.height / 2 - 10);
  ctx.font = '24px sans-serif';
  ctx.fillText(`Final Score: ${gameState.score}`, canvas.width / 2, canvas.height / 2 + 35);
}

function gameLoop() {
  if (!gameState.running) return;

  gameState.gameTime += 1;
  gameState.spawnTimer -= 1;

  if (gameState.spawnTimer <= 0) {
    spawnEnemy();
    gameState.spawnTimer = Math.max(25, 95 - Math.floor(gameState.gameTime / 450));
  }

  if (gameState.player.hp > 0) {
    updatePlayer();
    updateEnemies();
    updateProjectiles();
    updateParticles();
  }

  drawArena();
  drawEntities();
  drawGameOver();
  updateHud();

  requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  gameState.mouse.x = event.clientX - rect.left;
  gameState.mouse.y = event.clientY - rect.top;
});

canvas.addEventListener('mousedown', (event) => {
  if (!gameState.running || gameState.player.hp <= 0) return;
  if (event.button === 0) {
    gameState.mouse.down = true;
  }
});

canvas.addEventListener('mouseup', (event) => {
  if (!gameState.running || gameState.player.hp <= 0) return;
  if (event.button === 0 && gameState.mouse.down) {
    gameState.mouse.down = false;
    shootProjectile(gameState.player, gameState.mouse.x, gameState.mouse.y);
    gameState.mouse.charge = 0;
  }
});

canvas.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  if (!gameState.running || gameState.player.hp <= 0) return;
  gameState.player.formAlt = !gameState.player.formAlt;
  addParticles(gameState.player.x, gameState.player.y, '#ffffff', 9);
});

for (const button of document.querySelectorAll('button[data-element]')) {
  button.addEventListener('click', () => {
    const element = button.dataset.element;
    gameState.player = createPlayer(element);
    gameState.running = true;
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.particles = [];
    gameState.score = 0;
    gameState.gameTime = 0;
    gameState.spawnTimer = 20;
    selector.style.display = 'none';
    gameLoop();
  });
}
