// Waterbender Arena - beginner friendly canvas game
// Controls:
// WASD = move, Mouse = aim, Left Click = Water Whip, Right Click = Water Wave shield, Space = Ice Shard

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('status');

// ---------- Input tracking ----------
const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

// ---------- Core game data ----------
const game = {
  running: true,
  score: 0,
  spawnTimer: 0,
  particles: [],
  projectiles: [],
  enemies: [],
  restartPrompt: false
};

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  r: 16,
  speed: 3.2,
  hp: 100,
  maxHp: 100,
  invuln: 0
};

// Floating water orb resource system
const orb = {
  x: player.x + 34,
  y: player.y - 26,
  angle: 0,
  radius: 12,
  water: 100,
  maxWater: 100,
  regen: 0.22
};

// ---------- Utility helpers ----------
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function spawnParticles(x, y, color, count, speed = 2.5) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * speed;
    game.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 20 + Math.random() * 15,
      size: 2 + Math.random() * 2,
      color
    });
  }
}

function spawnEnemy() {
  // Spawn from a random edge and chase player
  const edge = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;

  if (edge === 0) { x = -30; y = Math.random() * canvas.height; }
  if (edge === 1) { x = canvas.width + 30; y = Math.random() * canvas.height; }
  if (edge === 2) { x = Math.random() * canvas.width; y = -30; }
  if (edge === 3) { x = Math.random() * canvas.width; y = canvas.height + 30; }

  game.enemies.push({
    x,
    y,
    r: 14,
    speed: 1.1 + Math.random() * 0.6,
    hp: 35,
    freezeTimer: 0,
    hitCooldown: 0
  });
}

// ---------- Abilities ----------
function castWaterWhip() {
  // Water Whip = fast projectile
  const cost = 8;
  if (!game.running || orb.water < cost) return;
  orb.water -= cost;

  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const len = Math.hypot(dx, dy) || 1;

  game.projectiles.push({
    type: 'whip',
    x: orb.x,
    y: orb.y,
    vx: (dx / len) * 8.5,
    vy: (dy / len) * 8.5,
    r: 6,
    damage: 15,
    life: 70,
    color: '#7ed5ff'
  });

  spawnParticles(orb.x, orb.y, '#7ed5ff', 10, 3.2);
}

function castWaterWave() {
  // Water Wave = short range push + damage ring around player
  const cost = 20;
  if (!game.running || orb.water < cost) return;
  orb.water -= cost;

  const waveRadius = 84;
  for (const e of game.enemies) {
    const d = distance(player.x, player.y, e.x, e.y);
    if (d < waveRadius + e.r) {
      // Push enemy away from player
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const len = Math.hypot(dx, dy) || 1;
      e.x += (dx / len) * 26;
      e.y += (dy / len) * 26;
      e.hp -= 10;
      spawnParticles(e.x, e.y, '#8fe8ff', 8, 2.2);
    }
  }

  spawnParticles(player.x, player.y, '#64ccff', 45, 4.5);
}

function castIceShard() {
  // Ice Shard = projectile that freezes enemies for 2 seconds
  const cost = 26;
  if (!game.running || orb.water < cost) return;
  orb.water -= cost;

  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const len = Math.hypot(dx, dy) || 1;

  game.projectiles.push({
    type: 'ice',
    x: orb.x,
    y: orb.y,
    vx: (dx / len) * 6.8,
    vy: (dy / len) * 6.8,
    r: 9,
    damage: 8,
    life: 90,
    color: '#c9f4ff'
  });

  spawnParticles(orb.x, orb.y, '#dff7ff', 14, 2.8);
}

function restartGame() {
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.hp = player.maxHp;
  player.invuln = 0;
  orb.water = orb.maxWater;
  game.score = 0;
  game.spawnTimer = 35;
  game.enemies = [];
  game.projectiles = [];
  game.particles = [];
  game.running = true;
  game.restartPrompt = false;
}

// ---------- Update systems ----------
function updatePlayer() {
  let dx = 0;
  let dy = 0;

  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  // Normalize diagonal movement
  const length = Math.hypot(dx, dy) || 1;
  player.x += (dx / length) * player.speed * (dx || dy ? 1 : 0);
  player.y += (dy / length) * player.speed * (dx || dy ? 1 : 0);

  // Keep player inside arena
  player.x = clamp(player.x, player.r, canvas.width - player.r);
  player.y = clamp(player.y, player.r, canvas.height - player.r);

  player.invuln = Math.max(0, player.invuln - 1);
}

function updateOrb() {
  // Orb circles near the player for animation
  orb.angle += 0.06;
  orb.x = player.x + Math.cos(orb.angle) * 30;
  orb.y = player.y - 24 + Math.sin(orb.angle * 1.4) * 7;

  // Water regenerates slowly over time
  orb.water = clamp(orb.water + orb.regen, 0, orb.maxWater);
}

function updateEnemies() {
  for (let i = game.enemies.length - 1; i >= 0; i -= 1) {
    const e = game.enemies[i];

    if (e.freezeTimer > 0) {
      e.freezeTimer -= 1;
      spawnParticles(e.x, e.y, 'rgba(207,243,255,0.25)', 1, 0.7);
    } else {
      // Chase player
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      e.x += (dx / len) * e.speed;
      e.y += (dy / len) * e.speed;
    }

    // Enemy collision damage
    const d = distance(player.x, player.y, e.x, e.y);
    e.hitCooldown = Math.max(0, e.hitCooldown - 1);
    if (d < player.r + e.r && player.invuln <= 0 && e.hitCooldown <= 0) {
      player.hp -= 10;
      player.invuln = 25;
      e.hitCooldown = 25;
      spawnParticles(player.x, player.y, '#9ad9ff', 15, 3);
    }

    if (e.hp <= 0) {
      game.score += 10;
      spawnParticles(e.x, e.y, '#ff9aa3', 20, 3.2);
      game.enemies.splice(i, 1);
    }
  }
}

function updateProjectiles() {
  for (let i = game.projectiles.length - 1; i >= 0; i -= 1) {
    const p = game.projectiles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;

    let remove = false;

    // Check collisions with enemies
    for (const e of game.enemies) {
      const d = distance(p.x, p.y, e.x, e.y);
      if (d < p.r + e.r) {
        e.hp -= p.damage;
        if (p.type === 'ice') {
          e.freezeTimer = 120; // 2 seconds at ~60 FPS
          spawnParticles(e.x, e.y, '#dff7ff', 16, 2.4);
        } else {
          spawnParticles(e.x, e.y, '#79d4ff', 8, 2.2);
        }
        remove = true;
        break;
      }
    }

    if (
      remove ||
      p.life <= 0 ||
      p.x < -20 ||
      p.y < -20 ||
      p.x > canvas.width + 20 ||
      p.y > canvas.height + 20
    ) {
      game.projectiles.splice(i, 1);
    }
  }
}

function updateParticles() {
  for (let i = game.particles.length - 1; i >= 0; i -= 1) {
    const p = game.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= 1;
    if (p.life <= 0) game.particles.splice(i, 1);
  }
}

function updateGame() {
  if (!game.running) return;

  updatePlayer();
  updateOrb();
  updateEnemies();
  updateProjectiles();
  updateParticles();

  // Spawn enemies repeatedly
  game.spawnTimer -= 1;
  if (game.spawnTimer <= 0) {
    spawnEnemy();
    game.spawnTimer = 45 + Math.random() * 35;
  }

  // Game over state
  if (player.hp <= 0) {
    game.running = false;
    game.restartPrompt = true;
  }
}

// ---------- Drawing ----------
function drawBackground() {
  ctx.fillStyle = '#0b1f3f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle wave lines
  ctx.strokeStyle = 'rgba(130,190,255,0.12)';
  ctx.lineWidth = 1;
  for (let y = 20; y < canvas.height; y += 30) {
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 24) {
      const wave = Math.sin((x + performance.now() * 0.08 + y) * 0.02) * 2;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }
}

function drawHumanoid(x, y, bodyColor) {
  // Very simple humanoid shape
  ctx.fillStyle = bodyColor;
  // head
  ctx.beginPath();
  ctx.arc(x, y - 14, 7, 0, Math.PI * 2);
  ctx.fill();
  // torso
  ctx.fillRect(x - 6, y - 8, 12, 18);
  // arms
  ctx.fillRect(x - 13, y - 7, 7, 4);
  ctx.fillRect(x + 6, y - 7, 7, 4);
  // legs
  ctx.fillRect(x - 5, y + 10, 4, 11);
  ctx.fillRect(x + 1, y + 10, 4, 11);
}

function drawUI() {
  ctx.fillStyle = 'rgba(4,10,20,0.6)';
  ctx.fillRect(12, 12, 270, 92);
  ctx.strokeStyle = 'rgba(130,190,255,0.45)';
  ctx.strokeRect(12, 12, 270, 92);

  ctx.fillStyle = '#eaf6ff';
  ctx.font = '16px Arial';
  ctx.fillText(`Health: ${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`, 20, 36);
  ctx.fillText(`Water: ${Math.floor(orb.water)}/${orb.maxWater}`, 20, 60);
  ctx.fillText(`Score: ${game.score}`, 20, 84);

  // Water meter bar
  const waterRatio = orb.water / orb.maxWater;
  ctx.fillStyle = '#123455';
  ctx.fillRect(110, 48, 150, 10);
  ctx.fillStyle = '#66d0ff';
  ctx.fillRect(110, 48, 150 * waterRatio, 10);
}

function drawGame() {
  drawBackground();

  // Draw enemies first
  for (const e of game.enemies) {
    drawHumanoid(e.x, e.y, e.freezeTimer > 0 ? '#ffb6be' : '#ff5c6d');

    // Frozen overlay
    if (e.freezeTimer > 0) {
      ctx.fillStyle = 'rgba(200,245,255,0.35)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Player (blue humanoid)
  drawHumanoid(player.x, player.y, player.invuln > 0 ? '#7fd4ff' : '#45b7ff');

  // Orb glow + animated water orb
  ctx.shadowColor = '#78d8ff';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#74d3ff';
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, orb.radius + Math.sin(performance.now() * 0.01) * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Projectiles
  for (const p of game.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Particles
  for (const p of game.particles) {
    ctx.globalAlpha = clamp(p.life / 35, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Aim line
  ctx.strokeStyle = 'rgba(175,230,255,0.45)';
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(mouse.x, mouse.y);
  ctx.stroke();
  ctx.setLineDash([]);

  drawUI();

  if (game.restartPrompt) {
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px Arial';
    ctx.fillText('You Were Defeated', canvas.width / 2, canvas.height / 2 - 35);
    ctx.font = '24px Arial';
    ctx.fillText(`Final Score: ${game.score}`, canvas.width / 2, canvas.height / 2 + 8);
    ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 45);
    ctx.textAlign = 'left';
  }
}

function loop() {
  updateGame();
  drawGame();
  requestAnimationFrame(loop);
}

// ---------- Events ----------
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === ' ' && game.running) {
    event.preventDefault();
    castIceShard();
  }

  if (key === 'r' && game.restartPrompt) {
    restartGame();
  }
});

window.addEventListener('keyup', (event) => {
  keys[event.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = event.clientX - rect.left;
  mouse.y = event.clientY - rect.top;
});

canvas.addEventListener('mousedown', (event) => {
  if (!game.running) return;
  if (event.button === 0) castWaterWhip();
});

canvas.addEventListener('contextmenu', (event) => {
  // Prevent browser menu because right click is an ability
  event.preventDefault();
  if (game.running) castWaterWave();
});

statusText.textContent = 'Defeat red raiders using waterbending. Keep your orb filled!';
restartGame();
loop();
