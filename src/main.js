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
import { LEVEL2 } from './levels/level2.js';
import { Player } from './entities/player.js';
import { Enemy, Ghost, Zombie } from './entities/enemies.js';
import { Boss } from './entities/boss.js';
import { Chest } from './entities/pickups.js';
import { MovingPlatform } from './entities/traps.js';
import { Camera } from './camera.js';
import { Background } from './background.js';
import { drawHUD } from './hud.js';
import {
  initAudio, toggleMute, isMuted, toggleMusic, isMusicMuted,
  playMusic, stopMusic, playFanfare, audioState, Sfx,
} from './audio.js';
import { drawTextCentered } from './font.js';
import {
  MAIN_MENU, LEVELS, unlockLevels,
  drawTitle, drawLevelSelect, drawControls, drawSettings, drawQuit, drawDeath,
} from './scenes.js';

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
// Звук включается при первом нажатии клавиши: так требует браузер
Input.init(initAudio);

// Все уровни игры по порядку
const LEVEL_MAPS = [LEVEL1, LEVEL2];

// Мир собирается из карты заново каждый раз, когда начинается уровень.
// Поэтому все его части живут в объекте world, а не в отдельных константах.
let levelIndex = 0;
let level;
let player;
let platforms;
let enemies;
let ghosts;
let boss;
let chests;
let coins = [];
let camera;
let background;

// Собрать мир по карте уровня с номером n
function buildWorld(n) {
  levelIndex = n;
  level = new Level(LEVEL_MAPS[n], n === 0 ? 'forest' : 'castle');

  // Герой создаётся один раз за игру: он несёт с собой собранное золото
  if (!player) player = new Player(level.spawnX, level.spawnY);
  player.spawnX = level.spawnX;
  player.spawnY = level.spawnY;
  player.checkpointX = undefined; // чекпоинты нового уровня ещё не взяты
  player.checkpointY = undefined;
  player.respawn();

  // Движущиеся платформы из меток 'm' и 'M'
  platforms = level.platformSpawns.map((s) => new MovingPlatform(s.col, s.row, s.axis));
  // Враги: 'g' — тёмные рыцари, 'z' — зомби
  enemies = level.enemySpawns.map((s) => {
    const x = s.col * CONFIG.TILE + 2;
    const y = s.row * CONFIG.TILE + CONFIG.TILE - 20;
    return s.kind === 'zombie' ? new Zombie(x, y) : new Enemy(x, y);
  });
  // Привидения из меток 'G' (снизу) и 'V' (сверху)
  ghosts = level.ghostSpawns.map((s) => new Ghost(s.col, s.row, s.fromBelow));
  // Босс из метки 'B'
  boss = level.bossSpawn
    ? new Boss(
        level.bossSpawn.col * CONFIG.TILE,
        (level.bossSpawn.row + 1) * CONFIG.TILE - CONFIG.BOSS_H,
      )
    : null;
  // Сундуки из меток 'c' и монеты, которые из них выбиваются
  chests = level.chestSpawns.map((s) => new Chest(s.col, s.row));
  coins = [];

  camera = new Camera(level);
  background = new Background(level.pixelW, level.theme);
  // Камера сразу смотрит на героя, без "подъезда" в первый кадр
  camera.update(player, 1);
}

buildWorld(0);

// Доступ к состоянию игры из консоли браузера (для отладки)
window.__game = {
  get player() { return player; },
  get camera() { return camera; },
  get level() { return level; },
  get platforms() { return platforms; },
  get enemies() { return enemies; },
  get ghosts() { return ghosts; },
  get boss() { return boss; },
  get chests() { return chests; },
  getCoins: () => coins,
  getState: () => ({ scene, levelIndex, entering, visiting, victory, dying, fadeAlpha }),
  startLevel: (n) => startLevel(n),   // для ручной проверки из консоли
  audioState, Sfx,
};

// Пересекаются ли два прямоугольника
function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Все враги и призраки возвращаются на свои места (при смерти героя)
function resetEnemies() {
  for (const enemy of enemies) enemy.reset();
  for (const ghost of ghosts) ghost.reset();
  for (const chest of chests) chest.reset();
  coins = [];
  if (boss) boss.reset();
}

// ---------- ПРИВАЛ У КОСТРА (конец уровня) ----------
// Дойдя до костра, герой сам останавливается рядом, садится
// и греется у огня. Потом экран плавно гаснет и уровень начинается
// заново (сюда позже встанет переход на уровень 2).
let entering = null; // null или { phase, timer }
let fadeAlpha = 0;   // затемнение экрана (0 — нет, 1 — чёрный)
let victory = false; // уровень пройден — показываем экран победы
let victoryTimer = 0;
let dying = false;   // герой погиб — показываем экран смерти
let dyingTimer = 0;
let levelTime = 0;   // сколько секунд идёт прохождение

// ---------- ЭКРАНЫ ----------
// 'title' — главное меню, 'levels' — выбор уровня, 'settings' — параметры,
// 'quit' — прощание, 'game' — сама игра
let scene = 'title';
let menuIndex = 0;

// ---------- ПРОГРЕСС ----------
// Сколько уровней открыто. Запоминается в браузере, чтобы прогресс
// не пропадал между заходами в игру
const PROGRESS_KEY = 'knight-progress';
let unlocked = 1;
try {
  const saved = Number(localStorage.getItem(PROGRESS_KEY));
  if (saved >= 1 && saved <= LEVEL_MAPS.length) unlocked = saved;
} catch (e) { /* localStorage может быть недоступен — играем с начала */ }
unlockLevels(unlocked);

function saveProgress(count) {
  unlocked = Math.max(unlocked, count);
  unlockLevels(unlocked);
  try { localStorage.setItem(PROGRESS_KEY, String(unlocked)); } catch (e) { /* не страшно */ }
}

// Начать уровень заново с чистого листа
function startLevel(n = 0) {
  fadeAlpha = 0;
  victory = false;
  dying = false;
  levelTime = 0;
  player.coins = 0;
  entering = null;
  visiting = null;
  buildWorld(n);          // собираем уровень заново: карта, враги, сундуки
  player.hidden = false;
  player.sitting = false;
  scene = 'game';
}

// Огр повержен? Пока нет — костёр не разжечь и отдыхать нельзя
function bossDefeated() {
  return !boss || boss.dead;
}

// ---------- ЗАХОД В ДОМИК ----------
// Герой входит в дверь, отдыхает внутри и выходит с восстановленным сердцем
let visiting = null; // null или { door, phase, timer }

function updateVisiting(dt) {
  player.invuln = 1;
  const doorCenter = visiting.door.x + visiting.door.w / 2;
  const playerCenter = player.x + player.w / 2;

  if (visiting.phase === 'walk') {
    player.facing = doorCenter > playerCenter ? 1 : -1;
    player.x += player.facing * 45 * dt;
    if (Math.abs(doorCenter - playerCenter) < 2) {
      player.hidden = true;              // вошёл внутрь
      visiting.phase = 'inside';
      visiting.timer = 1.3;
      Sfx.doorCreak();                   // скрипнули старые петли
    }
  } else if (visiting.phase === 'inside') {
    visiting.timer -= dt;
    if (visiting.timer <= 0) {
      // Отдохнул: сердце восстановлено, хозяева накормили
      if (player.hearts < CONFIG.PLAYER_HEARTS) player.hearts++;
      Sfx.heal();
      player.hidden = false;
      visiting.door.used = true;
      visiting = null;
    }
  }
}

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
      Sfx.rest();            // спокойная фраза на привале
    }
  } else if (entering.phase === 'rest') {
    // Сидит и греется у огня после победы
    entering.timer -= dt;
    if (entering.timer <= 0) {
      entering = { phase: 'fade' };
      stopMusic();
      playFanfare(); // трубят фанфары победы
    }
  } else if (entering.phase === 'fade') {
    // Экран плавно гаснет и остаётся тёмным — время для экрана победы
    fadeAlpha += dt * 1.2;
    if (fadeAlpha >= 0.82) {
      fadeAlpha = 0.82;
      victory = true;
      victoryTimer = 0;
      entering = null;
      saveProgress(levelIndex + 2); // пройден уровень — открылся следующий
    }
  }
}

// Экран смерти: ждём Enter, чтобы вернуться к последнему флагу
function updateDeath(dt) {
  dyingTimer += dt;
  if (Input.wasPressed('back')) {
    // Насовсем сдаться и уйти в меню
    dying = false;
    scene = 'title';
    menuIndex = 0;
    Sfx.menuBack();
    return;
  }
  if (dyingTimer > 0.8 && Input.wasPressed('start')) {
    dying = false;
    player.respawn();          // встанет у последнего флага, если он был
    player.hidden = false;
    player.sitting = false;
    resetEnemies();            // враги и сундуки — на свои места
    camera.update(player, 1);
  }
}

// Экран победы: ждём Enter, чтобы пройти уровень заново
function updateVictory(dt) {
  victoryTimer += dt;
  if (victoryTimer > 1.2 && Input.wasPressed('start')) {
    const следующий = levelIndex + 1;
    if (следующий < LEVEL_MAPS.length) {
      startLevel(следующий);   // впереди ещё один уровень
    } else {
      // Игра пройдена целиком — возвращаемся в меню
      victory = false;
      fadeAlpha = 0;
      scene = 'title';
      menuIndex = 0;
    }
  }
  if (Input.wasPressed('back')) {
    victory = false;
    fadeAlpha = 0;
    scene = 'title';
    menuIndex = 0;
  }
}

// ---------- МУЗЫКА И ЗВУКОВАЯ АТМОСФЕРА ----------
let fireTimer = 0; // отсчёт до следующего щелчка поленьев в костре

function updateAudio(dt) {
  // M — выключить весь звук, N — только мелодию (звуки боя останутся)
  if (Input.wasPressed('mute')) toggleMute();
  if (Input.wasPressed('muteMusic')) toggleMusic();

  // Рядом с боссом играет боевая тема, иначе — лесная
  const nearBoss = boss && !boss.dead
    && Math.abs((player.x + player.w / 2) - (boss.x + boss.w / 2)) < 220;
  playMusic(nearBoss ? 'boss' : 'forest');

  // Костёр потрескивает, когда герой рядом — чем ближе, тем чаще
  if (level.exit) {
    const dist = Math.abs((player.x + player.w / 2) - (level.exit.x + 16));
    if (dist < 150 && !isMuted()) {
      fireTimer -= dt;
      if (fireTimer <= 0) {
        Sfx.fireCrackle();
        fireTimer = 0.12 + Math.random() * 0.5;
      }
    }
  }
}

// ---------- НАВИГАЦИЯ ПО МЕНЮ ----------
function updateMenu() {
  playMusic('forest'); // в меню тихо играет лесная баллада

  // Переключатели звука работают на любом экране
  if (Input.wasPressed('mute')) toggleMute();
  if (Input.wasPressed('muteMusic')) toggleMusic();

  const items = scene === 'title' ? MAIN_MENU.length
    : scene === 'levels' ? LEVELS.length
      : scene === 'settings' ? 3 : 0;

  if (items > 0) {
    if (Input.wasPressed('up')) {
      menuIndex = (menuIndex - 1 + items) % items;
      Sfx.menuMove();
    }
    if (Input.wasPressed('down')) {
      menuIndex = (menuIndex + 1) % items;
      Sfx.menuMove();
    }
  }

  const enter = Input.wasPressed('start');
  const back = Input.wasPressed('back');

  if (scene === 'title' && enter) {
    if (menuIndex === 0) { Sfx.menuSelect(); startLevel(); }
    else if (menuIndex === 1) { Sfx.menuSelect(); scene = 'levels'; menuIndex = 0; }
    else if (menuIndex === 2) { Sfx.menuSelect(); scene = 'controls'; }
    else if (menuIndex === 3) { Sfx.menuSelect(); scene = 'settings'; menuIndex = 0; }
    else { Sfx.menuSelect(); scene = 'quit'; }
  } else if (scene === 'controls') {
    // Экран управления просто читают и выходят
    if (enter || back) { Sfx.menuBack(); scene = 'title'; menuIndex = 2; }
  } else if (scene === 'levels') {
    if (enter) {
      if (LEVELS[menuIndex].unlocked) { Sfx.menuSelect(); startLevel(menuIndex); }
      else Sfx.menuLocked(); // уровень ещё не открыт
    }
    if (back) { Sfx.menuBack(); scene = 'title'; menuIndex = 1; }
  } else if (scene === 'settings') {
    if (enter) {
      if (menuIndex === 0) { toggleMute(); Sfx.menuSelect(); }
      else if (menuIndex === 1) { toggleMusic(); Sfx.menuSelect(); }
      else { Sfx.menuBack(); scene = 'title'; menuIndex = 3; }
    }
    if (back) { Sfx.menuBack(); scene = 'title'; menuIndex = 3; }
  } else if (scene === 'quit') {
    if (enter || back) { Sfx.menuBack(); scene = 'title'; menuIndex = 0; }
  }

  Input.endFrame();
}

// Один шаг игровой логики
function update(dt) {
  // Экраны меню живут своей жизнью, игра в это время стоит
  if (scene !== 'game') {
    updateMenu();
    return;
  }

  // Esc в игре — выйти в главное меню
  if (Input.wasPressed('back')) {
    scene = 'title';
    menuIndex = 0;
    Sfx.menuBack();
    Input.endFrame();
    return;
  }

  // Герой погиб — игра стоит, ждём решения игрока
  if (dying) {
    updateDeath(dt);
    if (Input.wasPressed('mute')) toggleMute();
    Input.endFrame();
    return;
  }

  // На экране победы игра замирает — ждём Enter
  if (victory) {
    updateVictory(dt);
    if (Input.wasPressed('mute')) toggleMute();
    Input.endFrame();
    return;
  }

  updateAudio(dt);
  levelTime += dt;
  for (const plat of platforms) plat.update(dt);

  if (entering) {
    updateEntering(dt);
    camera.update(player, dt);
    Input.endFrame();
    return;
  }
  if (visiting) {
    updateVisiting(dt);
    camera.update(player, dt);
    Input.endFrame();
    return;
  }

  player.update(dt, level, platforms);

  // Подошли к двери жилого домика — заходим отдохнуть (один раз)
  for (const door of level.doors) {
    if (door.used || !player.onGround) continue;
    if (overlaps(player, door)) {
      visiting = { door, phase: 'walk', timer: 0 };
      player.vx = 0;
      player.attackTimer = 0;
      Input.endFrame();
      return;
    }
  }

  // Герой погиб — останавливаем игру и показываем экран смерти
  if (player.dead) {
    dying = true;
    dyingTimer = 0;
    stopMusic();
    Input.endFrame();
    return;
  }

  // Добежал до флага-чекпоинта — отсюда и начнёт после смерти
  for (const cp of level.checkpoints) {
    if (cp.taken) continue;
    if (overlaps(player, cp)) {
      cp.taken = true;
      player.checkpointX = cp.x + 2;
      player.checkpointY = cp.y - 2;
      Sfx.checkpoint();
    }
  }

  // Дошли до костра — привал начинается ТОЛЬКО если огр повержен.
  // Пока он жив, костёр холодный и садиться не за что
  if (level.exit && player.onGround && bossDefeated() && overlaps(player, level.exit)) {
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

  for (const chest of chests) chest.update(dt);
  for (const coin of coins) coin.update(dt, level, player);
  coins = coins.filter((c) => !c.taken); // подобранные убираем

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
    // Удар по сундуку выбивает монету
    for (const chest of chests) {
      if (chest.lastHitSwing === player.swingId) continue;
      if (overlaps(sword, chest)) {
        chest.lastHitSwing = player.swingId;
        const coin = chest.hurt();
        if (coin) coins.push(coin);
      }
    }
  }

  camera.update(player, dt);
  Input.endFrame();
}

// ---------- ЭКРАН ПОБЕДЫ ----------
function drawVictoryScreen(ctx) {
  // «ПОБЕДА!» переливается золотом
  const shine = 0.7 + 0.3 * Math.sin(victoryTimer * 3);
  const gold = `rgba(255, 214, 92, ${shine})`;

  const последний = levelIndex + 1 >= LEVEL_MAPS.length;

  drawTextCentered(ctx, последний ? 'ИГРА ПРОЙДЕНА!' : 'УРОВЕНЬ ПРОЙДЕН!', W, 38, gold, 2);
  drawTextCentered(ctx, 'ТЫ ПОБЕДИТЕЛЬ', W, 66, '#e8f1f5', 1);
  drawTextCentered(
    ctx,
    последний ? 'ЗАМОК ОСВОБОЖДЁН' : 'ОГР ПОВЕРЖЕН, ВПЕРЕДИ ЗАМОК',
    W, 84, '#a9c2d0', 1,
  );

  // Итоги: собранное золото и время прохождения
  const minutes = Math.floor(levelTime / 60);
  const seconds = Math.floor(levelTime % 60);
  const timeText = `ВРЕМЯ: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  drawTextCentered(ctx, `ЗОЛОТО: ${player.coins}`, W, 110, '#f2c14e', 1);
  drawTextCentered(ctx, timeText, W, 124, '#f2c14e', 1);

  // Подсказка появляется чуть позже и мигает
  if (victoryTimer > 1.2 && Math.floor(victoryTimer * 2) % 2 === 0) {
    drawTextCentered(
      ctx,
      последний ? 'НАЖМИ ВВОД - В ГЛАВНОЕ МЕНЮ' : 'НАЖМИ ВВОД - СЛЕДУЮЩИЙ УРОВЕНЬ',
      W, 152, '#8d99ae', 1,
    );
  }
}

// Показать буфер 320x180 на настоящем экране, увеличив его целое число раз
function blitToScreen() {
  const scale = Math.max(1, Math.floor(Math.min(screen.width / W, screen.height / H)));
  const dx = Math.floor((screen.width - W * scale) / 2);
  const dy = Math.floor((screen.height - H * scale) / 2);

  sctx.imageSmoothingEnabled = false; // без размытия!
  sctx.fillStyle = '#000';
  sctx.fillRect(0, 0, screen.width, screen.height);
  sctx.drawImage(buffer, 0, 0, W, H, dx, dy, W * scale, H * scale);
}

// Отрисовка одного кадра в буфер
function render() {
  const now = performance.now();

  // ---------- ЭКРАНЫ МЕНЮ ----------
  if (scene !== 'game') {
    // Позади меню виден тот же мрачный лес — только сильно затемнённый
    background.draw(bctx, camera);
    bctx.fillStyle = 'rgba(6, 8, 14, 0.72)';
    bctx.fillRect(0, 0, W, H);

    if (scene === 'title') drawTitle(bctx, menuIndex, now);
    else if (scene === 'levels') drawLevelSelect(bctx, menuIndex, now);
    else if (scene === 'controls') drawControls(bctx);
    else if (scene === 'settings') drawSettings(bctx, menuIndex, isMuted(), isMusicMuted(), now);
    else if (scene === 'quit') drawQuit(bctx, player.coins);

    blitToScreen();
    return;
  }

  // Мрачный лес в несколько слоёв (вместо простого неба)
  background.draw(bctx, camera);
  level.drawDecor(bctx, camera, now); // домики в лесу
  level.draw(bctx, camera);
  level.drawTorches(bctx, camera, now);
  level.drawCheckpoints(bctx, camera, now);
  for (const chest of chests) chest.draw(bctx, camera);
  for (const coin of coins) coin.draw(bctx, camera);
  for (const plat of platforms) plat.draw(bctx, camera);
  for (const enemy of enemies) enemy.draw(bctx, camera);
  if (boss) boss.draw(bctx, camera);
  player.draw(bctx, camera);
  // Костёр разгорается только после победы над огром
  level.drawExit(bctx, camera, now, bossDefeated());
  for (const ghost of ghosts) ghost.draw(bctx, camera); // призраки — поверх всех
  drawHUD(bctx, player, isMuted(), isMusicMuted());

  // Затемнение (привал у костра и экран победы)
  if (fadeAlpha > 0) {
    bctx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
    bctx.fillRect(0, 0, W, H);
  }

  if (victory) drawVictoryScreen(bctx);
  if (dying) {
    bctx.fillStyle = 'rgba(10, 4, 6, 0.78)';
    bctx.fillRect(0, 0, W, H);
    drawDeath(bctx, now, player.checkpointX !== undefined);
  }

  blitToScreen();
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
