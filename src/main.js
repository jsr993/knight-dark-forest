// ============================================================
// ГЛАВНЫЙ ФАЙЛ: игровой цикл.
// Игра рисуется в маленький буфер 320x180, а он растягивается
// на весь экран ЦЕЛЫМ числом раз — так пиксели остаются чёткими.
// Логика обновляется фиксированным шагом 60 раз в секунду,
// независимо от частоты монитора.
// ============================================================

import { CONFIG } from './config.js';
import { Input } from './input.js';
import { Level } from './level.js';
import { LEVEL1 } from './levels/level1.js';
import { Player } from './entities/player.js';
import { Enemy, Ghost } from './entities/enemies.js';
import { Boss } from './entities/boss.js';
import { MovingPlatform } from './entities/traps.js';
import { Camera } from './camera.js';
import { Background } from './background.js';
import { drawHUD } from './hud.js';

const W = CONFIG.SCREEN_W;
const H = CONFIG.SCREEN_H;
const STEP = 1 / 60; // фиксированный шаг логики: 60 раз в секунду

// Внутренний экран (буфер), в который рисует вся игра
const buffer = document.createElement('canvas');
buffer.width = W;
buffer.height = H;
const bctx = buffer.getContext('2d');

// Настоящий канвас на всю страницу
const screen = document.getElementById('screen');
const sctx = screen.getContext('2d');

function resize() {
  screen.width = window.innerWidth;
  screen.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Создаём мир ---
Input.init();
const level = new Level(LEVEL1);
const player = new Player(level.spawnX, level.spawnY);
// Движущиеся платформы из меток 'm' и 'M' на карте
const platforms = level.platformSpawns.map((s) => new MovingPlatform(s.col, s.row, s.axis));
// Враги из меток 'g'
const enemies = level.enemySpawns.map(
  (s) => new Enemy(s.col * CONFIG.TILE + 2, s.row * CONFIG.TILE + CONFIG.TILE - 20),
);
// Привидения из меток 'G' (снизу) и 'V' (сверху)
const ghosts = level.ghostSpawns.map((s) => new Ghost(s.col, s.row, s.fromBelow));
// Босс из метки 'B'
const boss = level.bossSpawn
  ? new Boss(
      level.bossSpawn.col * CONFIG.TILE,
      (level.bossSpawn.row + 1) * CONFIG.TILE - CONFIG.BOSS_H,
    )
  : null;
const camera = new Camera(level);
const background = new Background();
// Камера сразу смотрит на героя, без "подъезда" в первый кадр
camera.update(player, 1);

// Доступ к состоянию игры из консоли браузера (для отладки)
window.__game = { player, camera, level, platforms, enemies, ghosts, boss };

// Пересекаются ли два прямоугольника
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Все враги и призраки возвращаются на свои места (при смерти героя)
function resetEnemies() {
  for (const enemy of enemies) enemy.reset();
  for (const ghost of ghosts) ghost.reset();
  if (boss) boss.reset();
}

// ---------- ПРИВАЛ У КОСТРА (конец уровня) ----------
// Дойдя до костра, герой сам останавливается рядом, садится
// и греется у огня. Потом экран плавно гаснет и уровень начинается
// заново (сюда позже встанет переход на уровень 2).
let entering = null; // null или { phase, timer }
let fadeAlpha = 0;   // затемнение экрана (0 — нет, 1 — чёрный)

function updateEntering(dt) {
  player.invuln = 1; // в сценке герой неуязвим
  // Садится слева от костра, лицом к огню
  const sitX = level.exit.x - 4;
  const playerCenter = player.x + player.w / 2;

  if (entering.phase === 'walk') {
    // Сам доходит до места привала
    player.facing = sitX > playerCenter ? 1 : -1;
    player.x += player.facing * 40 * dt;
    if (Math.abs(sitX - playerCenter) < 2) {
      player.facing = 1;     // повернулся к огню
      player.sitting = true; // сел
      entering = { phase: 'rest', timer: 2.6 };
    }
  } else if (entering.phase === 'rest') {
    // Сидит и греется
    entering.timer -= dt;
    if (entering.timer <= 0) entering = { phase: 'fade' };
  } else if (entering.phase === 'fade') {
    // Экран плавно гаснет...
    fadeAlpha += dt * 2;
    if (fadeAlpha >= 1) {
      fadeAlpha = 1;
      // ...и мир начинается заново
      player.respawn();
      player.hidden = false;
      player.sitting = false;
      resetEnemies();
      camera.update(player, 1);
      entering = { phase: 'unfade' };
    }
  } else if (entering.phase === 'unfade') {
    // ...и проявляется обратно
    fadeAlpha -= dt * 2;
    if (fadeAlpha <= 0) {
      fadeAlpha = 0;
      entering = null;
    }
  }
}

// Один шаг игровой логики
function update(dt) {
  for (const plat of platforms) plat.update(dt);

  if (entering) {
    updateEntering(dt);
    camera.update(player, dt);
    Input.endFrame();
    return;
  }

  player.update(dt, level, platforms);

  // Смерть героя возрождает всех врагов на их местах
  if (player.justDied) {
    player.justDied = false;
    resetEnemies();
  }

  // Дошли до костра, стоя на земле, — начинается привал
  if (level.exit && player.onGround && overlaps(player, level.exit)) {
    entering = { phase: 'walk' };
    player.vx = 0;
    player.vy = 0;
    player.attackTimer = 0;
    Input.endFrame();
    return;
  }

  for (const enemy of enemies) enemy.update(dt, level, player);
  for (const ghost of ghosts) ghost.update(dt, level, player);
  if (boss) boss.update(dt, level, player);

  // Меч задевает врагов (каждый мах бьёт цель не больше одного раза)
  const sword = player.attackHitbox();
  if (sword) {
    const targets = boss ? [...enemies, boss] : enemies;
    for (const target of targets) {
      if (target.dead || target.dying > 0) continue;
      if (target.lastHitSwing === player.swingId) continue;
      if (overlaps(sword, target)) {
        target.lastHitSwing = player.swingId;
        target.hurt(CONFIG.SWORD_DAMAGE, player.x + player.w / 2);
      }
    }
  }

  camera.update(player, dt);
  Input.endFrame();
}

// Отрисовка одного кадра в буфер
function render() {
  // Мрачный лес в несколько слоёв (вместо простого неба)
  background.draw(bctx, camera);

  const now = performance.now();
  level.drawDecor(bctx, camera, now); // домики в лесу
  level.draw(bctx, camera);
  for (const plat of platforms) plat.draw(bctx, camera);
  for (const enemy of enemies) enemy.draw(bctx, camera);
  if (boss) boss.draw(bctx, camera);
  player.draw(bctx, camera);
  level.drawExit(bctx, camera, now); // костёр горит перед героем
  for (const ghost of ghosts) ghost.draw(bctx, camera); // призраки — поверх всех
  drawHUD(bctx, player);

  // Затемнение при входе в замок
  if (fadeAlpha > 0) {
    bctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
    bctx.fillRect(0, 0, W, H);
  }

  // --- Выводим буфер на экран с целочисленным масштабом ---
  const scale = Math.max(1, Math.floor(Math.min(screen.width / W, screen.height / H)));
  const dx = Math.floor((screen.width - W * scale) / 2);
  const dy = Math.floor((screen.height - H * scale) / 2);

  sctx.imageSmoothingEnabled = false; // без размытия!
  sctx.fillStyle = '#000';
  sctx.fillRect(0, 0, screen.width, screen.height);
  sctx.drawImage(buffer, 0, 0, W, H, dx, dy, W * scale, H * scale);
}

// --- Игровой цикл с накопителем времени (fixed timestep) ---
let last = performance.now();
let acc = 0;

function frame(now) {
  // Если вкладка была свёрнута, не навёрстываем больше 0.25 сек
  let elapsed = (now - last) / 1000;
  if (elapsed > 0.25) elapsed = 0.25;
  last = now;

  acc += elapsed;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
