// Waterbender Arena
// Beginner-friendly single-file game logic for HTML5 Canvas.

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hud = document.getElementById('hud');

const keys = {};
const mouse = { x: canvas.width / 2, y: canvas.height / 2, leftDown: false, rightDown: false };

const state = {
  running: true,
  time: 0,
  score: 0,
  spawnTimer: 0,
  particles: [],
  projectiles: [],
  enemies: []
};

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  r: 16,
  speed: 3.2,
  hp: 100,
  maxHp: 100,
  invuln: 0,
  waveCooldown: 0,
  iceCooldown: 0,
  orb: {
    x: canvas.width / 2 + 30,
    y: canvas.height / 2 - 20,
    amount: 100,
    max: 100,
    angle: 0
  }
};

function resetGame() {
  state.running = true;
  state.time = 0;
  state.score = 0;
  state.spawnTimer = 0;
  state.particles.length = 0;
  state.projectiles.length = 0;
  state.enemies.length = 0;
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.hp = player.maxHp;
  player.invuln = 0;
  player.waveCooldown = 0;
  player.iceCooldown = 0;
  player.orb.amount = 100;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function spawnEnemy() {
  const side = Math.floor(Math.random() * 4);
  let x = 0;
  let y = 0;
  if (side === 0) { x = -20; y = Math.random() * canvas.height; }
  if (side === 1) { x = canvas.width + 20; y = Math.random() * canvas.height; }
  if (side === 2) { x = Math.random() * canvas.width; y = -20; }
  if (side === 3) { x = Math.random() * canvas.width; y = canvas.height + 20; }

  state.enemies.push({
    x,
    y,
    r: 14,
    hp: 35,
    speed: 1 + Math.random() * 0.7,
    frozen: 0,
    hitTimer: 0,
    stepOffset: Math.random() * Math.PI * 2
  });
}

function emitParticles(x, y, color, count, speed = 2.5) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = Math.random() * speed;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 30 + Math.random() * 20,
      size: 2 + Math.random() * 3,
      color
    });
  }
}

function shootWaterWhip() {
  if (player.orb.amount < 8 || !state.running) return;
  player.orb.amount -= 8;
  const dx = mouse.x - player.x;
  const dy = mouse.y - player.y;
  const d = Math.hypot(dx, dy) || 1;
  state.projectiles.push({
    x: player.x,
    y: player.y,
    vx: (dx / d) * 8.5,
    vy: (dy / d) * 8.5,
    r: 6,
    damage: 16,
    life: 80,
    freeze: 0,
    color: '#7ed7ff'
  });
  emitParticles(player.x, player.y, '#7ed7ff', 8);
}

// Water Wave: short range burst that pushes enemies back.
function useWaterWave() {
  if (player.waveCooldown > 0 || player.orb.amount < 20 || !state.running) return;
  player.orb.amount -= 20;
  player.waveCooldown = 70;

  for (const enemy of state.enemies) {
    const d = dist(player.x, player.y, enemy.x, enemy.y);
    if (d < 90) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const n = Math.hypot(dx, dy) || 1;
      enemy.x += (dx / n) * 40;
      enemy.y += (dy / n) * 40;
      enemy.hp -= 8;
      enemy.hitTimer = 6;
      emitParticles(enemy.x, enemy.y, '#8ce4ff', 6);
    }
  }

  emitParticles(player.x, player.y, '#4dc8ff', 30, 4);
}

// Ice Shard blast: freezes enemies for 2 seconds.
function useIceBlast() {
  if (player.iceCooldown > 0 || player.orb.amount < 30 || !state.running) return;
  player.orb.amount -= 30;
  player.iceCooldown = 180;

  for (const enemy of state.enemies) {
    const d = dist(player.x, player.y, enemy.x, enemy.y);
    if (d < 170) {
      enemy.frozen = 120; // 2 seconds at 60fps
      enemy.hp -= 12;
      enemy.hitTimer = 10;
      emitParticles(enemy.x, enemy.y, '#d8f3ff', 10);
    }
  }

  emitParticles(player.x, player.y, '#b8ebff', 45, 5);
}

function updatePlayer() {
  let mx = 0;
  let my = 0;
  if (keys.KeyW) my -= 1;
  if (keys.KeyS) my += 1;
  if (keys.KeyA) mx -= 1;
  if (keys.KeyD) mx += 1;

  const len = Math.hypot(mx, my) || 1;
  player.x += (mx / len) * player.speed;
  player.y += (my / len) * player.speed;
  player.x = clamp(player.x, 20, canvas.width - 20);
  player.y = clamp(player.y, 20, canvas.height - 20);

  // Water orb floats around and follows player with slight delay.
  player.orb.angle += 0.06;
  const targetOrbX = player.x + Math.cos(player.orb.angle) * 26;
  const targetOrbY = player.y - 24 + Math.sin(player.orb.angle * 1.7) * 8;
  player.orb.x += (targetOrbX - player.orb.x) * 0.18;
  player.orb.y += (targetOrbY - player.orb.y) * 0.18;

  // Water regenerates over time.
  player.orb.amount = clamp(player.orb.amount + 0.16, 0, player.orb.max);
  player.invuln = Math.max(0, player.invuln - 1);
  player.waveCooldown = Math.max(0, player.waveCooldown - 1);
  player.iceCooldown = Math.max(0, player.iceCooldown - 1);
}

function updateProjectiles() {
  for (let i = state.projectiles.length - 1; i >= 0; i -= 1) {
    const p = state.projectiles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;

    let remove = false;
    for (const enemy of state.enemies) {
      if (dist(p.x, p.y, enemy.x, enemy.y) < p.r + enemy.r) {
        enemy.hp -= p.damage;
        enemy.hitTimer = 5;
        if (p.freeze > 0) enemy.frozen = p.freeze;
        emitParticles(p.x, p.y, p.color, 7);
        remove = true;
        break;
      }
    }

    if (p.life <= 0 || p.x < -20 || p.y < -20 || p.x > canvas.width + 20 || p.y > canvas.height + 20) {
      remove = true;
    }

    if (remove) state.projectiles.splice(i, 1);
  }
}

function updateEnemies() {
  for (let i = state.enemies.length - 1; i >= 0; i -= 1) {
    const e = state.enemies[i];
    e.hitTimer = Math.max(0, e.hitTimer - 1);
    e.frozen = Math.max(0, e.frozen - 1);

    if (e.frozen <= 0) {
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * e.speed;
      e.y += (dy / d) * e.speed;
    }

    if (dist(player.x, player.y, e.x, e.y) < player.r + e.r + 4 && player.invuln <= 0 && state.running) {
      player.hp -= 12;
      player.invuln = 30;
      emitParticles(player.x, player.y, '#9fe2ff', 15);
      if (mouse.rightDown && player.orb.amount >= 1) {
        // Shield reduces damage when held.
        player.hp += 7;
      }
      if (player.hp <= 0) {
        player.hp = 0;
        state.running = false;
      }
    }

    if (e.hp <= 0) {
      emitParticles(e.x, e.y, '#ff7c7c', 14);
      state.enemies.splice(i, 1);
      state.score += 10;
    }
  }
}

function updateParticles() {
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const p = state.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.97;
    p.vy *= 0.97;
    p.life -= 1;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

function drawHumanoid(x, y, bodyColor, walkPhase, frozen = false, scale = 1) {
  const swing = Math.sin(walkPhase) * 5 * scale;
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = 'round';
  ctx.strokeStyle = frozen ? '#c9f2ff' : bodyColor;

  // torso
  ctx.beginPath();
  ctx.moveTo(x, y - 6 * scale);
  ctx.lineTo(x, y + 14 * scale);
  ctx.stroke();

  // arms
  ctx.beginPath();
  ctx.moveTo(x - 8 * scale, y + swing * 0.4);
  ctx.lineTo(x + 8 * scale, y - swing * 0.4);
  ctx.stroke();

  // legs
  ctx.beginPath();
  ctx.moveTo(x, y + 14 * scale);
  ctx.lineTo(x - 7 * scale, y + 26 * scale + swing * 0.4);
  ctx.moveTo(x, y + 14 * scale);
  ctx.lineTo(x + 7 * scale, y + 26 * scale - swing * 0.4);
  ctx.stroke();

  // head
  ctx.fillStyle = frozen ? '#e7faff' : bodyColor;
  ctx.beginPath();
  ctx.arc(x, y - 15 * scale, 7 * scale, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background grid for visual style.
  ctx.strokeStyle = 'rgba(150,190,230,0.09)';
  for (let x = 0; x <= canvas.width; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Draw shield when right mouse is held.
  if (mouse.rightDown && player.orb.amount > 0 && state.running) {
    ctx.fillStyle = 'rgba(102, 201, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 34, 0, Math.PI * 2);
    ctx.fill();
    player.orb.amount = Math.max(0, player.orb.amount - 0.35);
  }

  // Player + orb animation.
  const moving = keys.KeyW || keys.KeyA || keys.KeyS || keys.KeyD;
  drawHumanoid(player.x, player.y, '#4fc3ff', moving ? state.time * 0.28 : 0, false, 1.1);

  const orbPulse = 10 + Math.sin(state.time * 0.12) * 2;
  const waterRatio = player.orb.amount / player.orb.max;
  ctx.fillStyle = `rgba(100, 210, 255, ${0.45 + waterRatio * 0.4})`;
  ctx.beginPath();
  ctx.arc(player.orb.x, player.orb.y, orbPulse * (0.6 + waterRatio * 0.5), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#bdefff';
  ctx.stroke();

  // Enemies.
  for (const e of state.enemies) {
    drawHumanoid(e.x, e.y, e.hitTimer > 0 ? '#ffb8b8' : '#ff5c5c', state.time * 0.25 + e.stepOffset, e.frozen > 0);
    if (e.frozen > 0) {
      ctx.fillStyle = 'rgba(190,240,255,0.4)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r + 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Projectiles.
  for (const p of state.projectiles) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Particles.
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / 40);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Game over overlay.
  if (!state.running) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 50px Arial';
    ctx.fillText('You Were Defeated', canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = '24px Arial';
    ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 25);
  }
}

function updateHud() {
  const aliveText = state.running ? '' : '<span class="dead">(Defeated)</span>';
  hud.innerHTML = `
    Health: ${Math.round(player.hp)}/${player.maxHp} ${aliveText}<br>
    Water Orb: ${Math.round(player.orb.amount)}/${player.orb.max}<br>
    Score: ${state.score}<br>
    Cooldowns → Wave: ${Math.ceil(player.waveCooldown / 60)}s | Ice: ${Math.ceil(player.iceCooldown / 60)}s
  `;
}

function update() {
  state.time += 1;

  if (state.running) {
    updatePlayer();
    updateProjectiles();
    updateEnemies();
    updateParticles();

    state.spawnTimer -= 1;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = Math.max(20, 80 - Math.floor(state.time / 480));
    }
  }

  draw();
  updateHud();
  requestAnimationFrame(update);
}

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  // Space activates Ice Blast + Water Wave to satisfy requested abilities.
  if (e.code === 'Space') {
    e.preventDefault();
    useIceBlast();
    useWaterWave();
  }

  if (e.code === 'KeyR' && !state.running) resetGame();
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = e.clientX - rect.left;
  mouse.y = e.clientY - rect.top;
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    mouse.leftDown = true;
    shootWaterWhip();
  }
  if (e.button === 2) mouse.rightDown = true;
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouse.leftDown = false;
  if (e.button === 2) mouse.rightDown = false;
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

update();
