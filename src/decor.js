// ============================================================
// ДЕКОРАЦИИ УРОВНЯ: лесные домики.
// Рисуются ПЕРЕД тайлами земли, поэтому трава и почва слегка
// перекрывают их низ — домики словно вросли в землю.
// Герой проходит мимо них (сквозь), это фон, а не препятствие.
//
// На карте:  H — жилой домик (в окне горит свет)
//            R — заброшенный домик (руина, тёмные окна)
// ============================================================

// --- Палитра домиков ---
const WALL = '#4b3a2a';        // брёвна стены
const WALL_DARK = '#372a1e';   // щели между брёвнами
const WALL_LIGHT = '#5d4832';  // блик на брёвнах
const ROOF = '#3b2f3f';        // крыша (тёмная черепица)
const ROOF_EDGE = '#2a2029';   // край крыши
const ROOF_OLD = '#584c40';    // прогнившая крыша руины
const WALL_OLD = '#5e574c';    // серые гнилые доски
const WALL_OLD_DARK = '#332f2b';
const WALL_OLD_LIGHT = '#6f665a'; // выцветшие доски на свету луны
const DOOR = '#2b2118';        // дверной проём
const GLOW = '#ffbe55';        // тёплый свет в окне
const GLOW_CORE = '#ffe9b0';   // яркая сердцевина света
const DARK_GLASS = '#161a20';  // тёмное разбитое окно
const VINE = '#2f5136';        // плющ на руинах
const SMOKE = '#6a7480';       // дымок из трубы

// Постоянное «случайное» число для этого домика (не дрожит при движении камеры)
function seeded(col, salt) {
  const n = Math.sin(col * 41.13 + salt * 7.77) * 43758.5453;
  return n - Math.floor(n);
}

// Ступенчатая двускатная крыша
function drawRoof(ctx, x, y, w, h, color, edge, holes) {
  const steps = 5;
  const stepH = Math.ceil(h / steps);
  for (let s = 0; s < steps; s++) {
    const inset = Math.round((w / 2 - 4) * (s / steps));
    const rx = x + inset;
    const rw = w - inset * 2;
    const ry = y + s * stepH;
    // У руины крыша местами провалилась — пропускаем куски
    if (holes && (s === 1 || s === 3) && seeded(x, s) > 0.45) {
      ctx.fillStyle = color;
      ctx.fillRect(rx, ry, Math.round(rw * 0.35), stepH);
      ctx.fillRect(rx + Math.round(rw * 0.72), ry, Math.round(rw * 0.28), stepH);
      continue;
    }
    ctx.fillStyle = color;
    ctx.fillRect(rx, ry, rw, stepH);
    ctx.fillStyle = edge;
    ctx.fillRect(rx, ry, rw, 1);
  }
}

// ---------- ЖИЛОЙ ДОМИК: в окне горит свет ----------
function drawLivingHouse(ctx, x, bottom, col, time) {
  const w = 46;
  const bodyH = 30;
  const roofH = 15;
  const bodyY = bottom - bodyH;
  const roofY = bodyY - roofH;

  // Мерцание огня: медленная волна плюс быстрая мелкая дрожь
  const flicker = 0.72 + 0.18 * Math.sin(time / 420 + col) + 0.1 * Math.sin(time / 90 + col * 3);

  // Тёплое зарево вокруг дома (как свет из окна в ночном лесу)
  ctx.globalAlpha = 0.1 * flicker;
  ctx.fillStyle = GLOW;
  ctx.fillRect(x - 10, roofY - 4, w + 20, bodyH + roofH + 12);
  ctx.globalAlpha = 1;

  // Сруб
  ctx.fillStyle = WALL;
  ctx.fillRect(x, bodyY, w, bodyH);
  // Брёвна: горизонтальные швы
  ctx.fillStyle = WALL_DARK;
  for (let i = 5; i < bodyH; i += 6) ctx.fillRect(x, bodyY + i, w, 1);
  ctx.fillStyle = WALL_LIGHT;
  for (let i = 2; i < bodyH; i += 6) ctx.fillRect(x + 1, bodyY + i, w - 2, 1);

  drawRoof(ctx, x - 4, roofY, w + 8, roofH, ROOF, ROOF_EDGE, false);

  // Труба и дымок
  ctx.fillStyle = WALL_DARK;
  ctx.fillRect(x + w - 13, roofY - 7, 7, 9);
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = SMOKE;
  for (let i = 0; i < 3; i++) {
    const sy = roofY - 11 - i * 6 - ((time / 260 + i * 2) % 6);
    const sx = x + w - 12 + Math.sin(time / 500 + i) * 2;
    ctx.fillRect(Math.round(sx), Math.round(sy), 4 - i, 3);
  }
  ctx.globalAlpha = 1;

  // Окно со светом и переплётом
  const wx = x + 6;
  const wy = bodyY + 8;
  ctx.fillStyle = WALL_DARK;
  ctx.fillRect(wx - 1, wy - 1, 14, 13); // рама
  ctx.globalAlpha = 0.55 + 0.45 * flicker;
  ctx.fillStyle = GLOW;
  ctx.fillRect(wx, wy, 12, 11);
  ctx.fillStyle = GLOW_CORE;
  ctx.fillRect(wx + 2, wy + 2, 8, 7);
  ctx.globalAlpha = 1;
  ctx.fillStyle = WALL_DARK; // крестовина
  ctx.fillRect(wx + 5, wy, 2, 11);
  ctx.fillRect(wx, wy + 5, 12, 2);

  // Дверь
  const dx = x + w - 18;
  ctx.fillStyle = DOOR;
  ctx.fillRect(dx, bottom - 19, 12, 19);
  ctx.fillStyle = WALL_LIGHT;
  ctx.fillRect(dx, bottom - 19, 12, 1);
  ctx.fillRect(dx + 9, bottom - 11, 2, 2); // ручка

  // Тёплое пятно света на земле под окном
  ctx.globalAlpha = 0.13 * flicker;
  ctx.fillStyle = GLOW;
  ctx.fillRect(x + 1, bottom - 3, 22, 3);
  ctx.fillRect(x + 4, bottom, 16, 2);
  ctx.globalAlpha = 1;
}

// ---------- ЗАБРОШЕННЫЙ ДОМИК: тёмные окна, дырявая крыша ----------
function drawRuinedHouse(ctx, x, bottom, col) {
  const w = 42;
  const bodyH = 26;
  const roofH = 13;
  const bodyY = bottom - bodyH;
  const roofY = bodyY - roofH;

  // Гнилые доски
  ctx.fillStyle = WALL_OLD;
  ctx.fillRect(x, bodyY, w, bodyH);
  // Пара досок выцвела до светлого — стена не выглядит плоской
  ctx.fillStyle = WALL_OLD_LIGHT;
  for (let i = 1; i < w; i += 5) {
    if (seeded(col, i + 60) > 0.6) ctx.fillRect(x + i, bodyY, 3, bodyH);
  }
  // Вертикальные щели — стена рассохлась
  ctx.fillStyle = WALL_OLD_DARK;
  for (let i = 3; i < w; i += 5) {
    if (seeded(col, i) > 0.35) ctx.fillRect(x + i, bodyY, 1, bodyH);
  }
  // Пролом в стене
  ctx.fillStyle = DARK_GLASS;
  ctx.fillRect(x + w - 14, bottom - 12, 9, 12);
  ctx.fillRect(x + w - 16, bottom - 7, 3, 7);

  drawRoof(ctx, x - 4, roofY, w + 8, roofH, ROOF_OLD, ROOF_EDGE, true);

  // Пустое тёмное окно с остатками рамы
  const wx = x + 7;
  const wy = bodyY + 7;
  ctx.fillStyle = DARK_GLASS;
  ctx.fillRect(wx, wy, 12, 11);
  ctx.fillStyle = WALL_OLD_DARK;
  ctx.fillRect(wx - 1, wy - 1, 14, 1);
  ctx.fillRect(wx + 4, wy, 1, 6);   // обломок переплёта
  ctx.fillRect(wx, wy + 6, 7, 1);

  // Покосившаяся дверь, висящая на одной петле
  ctx.fillStyle = DOOR;
  ctx.fillRect(x + 24, bottom - 16, 10, 16);
  ctx.fillStyle = WALL_OLD_DARK;
  ctx.fillRect(x + 24, bottom - 16, 10, 2);
  ctx.fillRect(x + 23, bottom - 9, 12, 1);

  // Плющ и трава заплели стены
  ctx.fillStyle = VINE;
  for (let i = 0; i < w; i += 4) {
    if (seeded(col, i + 30) > 0.55) {
      const len = 5 + Math.floor(seeded(col, i + 40) * 12);
      ctx.fillRect(x + i, bodyY, 2, len);
      ctx.fillRect(x + i - 1, bodyY + len - 2, 4, 2);
    }
  }
  // Плющ свисает и с края крыши
  ctx.fillRect(x - 2, roofY + roofH - 2, 2, 8);
  ctx.fillRect(x + w, roofY + roofH - 4, 2, 10);
}

// ---------- КОСТЁР: место привала в конце пути ----------
const STONE = '#6b6f76';       // камни вокруг кострища
const STONE_DARK = '#4a4e54';
const LOG = '#5a4028';         // поленья
const LOG_DARK = '#3a2818';    // обугленный низ
const EMBER = '#c1440e';       // угли
const FLAME_OUT = '#ff7a2e';   // внешний язык пламени
const FLAME_MID = '#ffb02e';   // середина
const FLAME_CORE = '#ffe9a0';  // раскалённое ядро

// Пиксельный круг из горизонтальных полосок (для мягкого света)
function pixelCircle(ctx, cx, cy, r) {
  for (let dy = -r; dy <= r; dy += 2) {
    const half = Math.floor(Math.sqrt(r * r - dy * dy));
    ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 2);
  }
}

// x — левый край кострища, bottom — уровень земли
export function drawCampfire(ctx, x, bottom, time) {
  const cx = x + 16; // центр костра

  // Общая «дыхательная» волна огня
  const breath = 0.8 + 0.2 * Math.sin(time / 260) + 0.08 * Math.sin(time / 70);

  // --- Зарево вокруг костра: мягкие пиксельные круги света ---
  ctx.fillStyle = FLAME_OUT;
  for (let i = 3; i >= 1; i--) {
    ctx.globalAlpha = 0.05 * breath * (4 - i) * 0.5;
    pixelCircle(ctx, cx, bottom - 14, 14 + i * 12);
  }
  ctx.globalAlpha = 1;

  // --- Поленья крест-накрест ---
  ctx.fillStyle = LOG;
  ctx.fillRect(cx - 14, bottom - 7, 28, 4);
  ctx.fillRect(cx - 10, bottom - 11, 20, 3);
  ctx.fillStyle = LOG_DARK;
  ctx.fillRect(cx - 14, bottom - 4, 28, 2);
  ctx.fillRect(cx - 4, bottom - 11, 8, 3); // прогоревшая середина

  // --- Тлеющие угли под пламенем ---
  ctx.fillStyle = EMBER;
  ctx.globalAlpha = 0.6 + 0.4 * Math.sin(time / 130);
  ctx.fillRect(cx - 8, bottom - 9, 16, 3);
  ctx.globalAlpha = 1;

  // --- Пламя: языки разной высоты, каждый живёт своей волной ---
  const tongues = [
    { dx: -7, w: 3, base: 9, amp: 4, speed: 150, phase: 0 },
    { dx: -4, w: 4, base: 15, amp: 6, speed: 118, phase: 1.7 },
    { dx: 0, w: 5, base: 21, amp: 8, speed: 96, phase: 3.1 },
    { dx: 4, w: 4, base: 16, amp: 6, speed: 127, phase: 4.6 },
    { dx: 8, w: 3, base: 10, amp: 4, speed: 163, phase: 2.2 },
  ];
  for (const t of tongues) {
    const h = Math.round(t.base + Math.sin(time / t.speed + t.phase) * t.amp);
    const bx = cx + t.dx - Math.round(t.w / 2);
    const by = bottom - 8 - h;
    // внешний язык
    ctx.fillStyle = FLAME_OUT;
    ctx.fillRect(bx, by, t.w, h);
    // сердцевина — уже и короче
    ctx.fillStyle = FLAME_MID;
    ctx.fillRect(bx + 1, by + Math.round(h * 0.25), Math.max(1, t.w - 2), Math.round(h * 0.75));
    if (t.w >= 4) {
      ctx.fillStyle = FLAME_CORE;
      ctx.fillRect(bx + 1, by + Math.round(h * 0.55), Math.max(1, t.w - 3), Math.round(h * 0.45));
    }
  }

  // --- Искры, улетающие вверх ---
  ctx.fillStyle = FLAME_CORE;
  for (let i = 0; i < 5; i++) {
    const life = (time / 900 + i * 0.37) % 1;      // 0..1 — путь искры
    const sx = cx + Math.sin(time / 300 + i * 2.1) * (5 + i * 2);
    const sy = bottom - 14 - life * 46;
    ctx.globalAlpha = (1 - life) * 0.9;
    ctx.fillRect(Math.round(sx), Math.round(sy), 1, 1);
  }
  ctx.globalAlpha = 1;

  // --- Камни вокруг кострища ---
  const stones = [-20, -13, -5, 4, 12, 18];
  for (let i = 0; i < stones.length; i++) {
    const sx = cx + stones[i];
    const sw = 6 + (i % 3);
    ctx.fillStyle = STONE;
    ctx.fillRect(sx, bottom - 5, sw, 5);
    ctx.fillStyle = STONE_DARK;
    ctx.fillRect(sx, bottom - 2, sw, 2);
  }

  // --- Тёплое пятно света на земле ---
  ctx.globalAlpha = 0.16 * breath;
  ctx.fillStyle = FLAME_MID;
  ctx.fillRect(cx - 40, bottom - 2, 80, 2);
  ctx.fillRect(cx - 30, bottom, 60, 2);
  ctx.globalAlpha = 1;
}

// Нарисовать все домики уровня
export function drawHouses(ctx, houses, camera, time) {
  for (const h of houses) {
    const x = Math.round(h.x - camera.x);
    // Рисуем, только если домик рядом с экраном
    if (x < -70 || x > 330) continue;
    const bottom = Math.round(h.bottom - camera.y);
    if (h.lit) drawLivingHouse(ctx, x, bottom, h.col, time);
    else drawRuinedHouse(ctx, x, bottom, h.col);
  }
}
