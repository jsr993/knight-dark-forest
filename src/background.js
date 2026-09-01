// ============================================================
// ЗАДНИЙ ФОН: мрачный ночной лес в 3 слоя параллакса.
//   1. Небо с бледной луной и звёздами (почти неподвижное)
//   2. Дальняя стена леса в тумане (едет медленно)
//   3. Огромные корявые деревья с лианами (едет заметнее)
// Каждый слой рисуется ОДИН раз при старте в свой невидимый канвас,
// а потом просто повторяется по ширине со сдвигом от камеры.
// ============================================================

import { CONFIG } from './config.js';

const W = CONFIG.SCREEN_W;
const H = CONFIG.SCREEN_H;
const LAYER_H = 224; // выше экрана, чтобы был запас при сдвиге камеры вверх/вниз

// Насколько слой "отстаёт" от камеры (0 — приклеен к экрану, 1 — как уровень)
const FAR_FACTOR = 0.15;
const NEAR_FACTOR = 0.4;

// --- Мрачная палитра леса ---
const SKY_BANDS = [            // небо полосами, сверху вниз (цвет, высота)
  ['#0d1319', 44],
  ['#111a26', 46],
  ['#16202c', 54],
  ['#1c2836', 80],
];
const COL_STAR = '#2e3d4b';    // тусклые звёзды
const COL_MOON = '#b9c4bb';    // бледная луна
const COL_MOON_DARK = '#95a196'; // кратеры
const COL_MOON_HALO = '#1e2b38';  // свечение вокруг луны
const COL_FAR_TREES = '#182432';  // силуэты дальнего леса
const COL_FOG = '#243342';        // полоса тумана
const COL_TREE = '#0a0f16';       // ближние деревья (почти чёрные)
const COL_LIANA = '#152018';      // стебли лиан
const COL_LIANA_LEAF = '#1e2f22'; // листья лиан

// Простой генератор случайных чисел с зерном:
// лес всегда получается одинаковый, а не новый при каждом запуске
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export class Background {
  constructor(levelWidth = 4800) {
    this.levelWidth = levelWidth;
    this.sky = this.buildSky();
    this.far = this.buildFarForest();
    this.near = this.buildBigTrees();
    this.castle = this.buildCastle();

    // Светлячки: живые точки, мерцающие среди деревьев
    const rng = mulberry32(77);
    this.fireflies = [];
    for (let i = 0; i < 26; i++) {
      this.fireflies.push({
        x: rng() * 900,          // своя «полоса» по ширине, повторяется
        y: 40 + rng() * 120,
        phase: rng() * Math.PI * 2,
        speed: 0.4 + rng() * 0.8,
        radius: 6 + rng() * 14,
      });
    }
  }

  // ---------- ЗАМОК НА ГОРИЗОНТЕ ----------
  // Виден издалека во второй половине уровня и растёт по мере приближения —
  // это цель пути, к нему герой и пробивается через лес
  buildCastle() {
    const c = makeCanvas(150, 120);
    const ctx = c.getContext('2d');
    const base = 118;

    const WALL = '#232f3f';
    const WALL_LIT = '#2c3a4c';
    const WALL_DARK = '#1a232f';
    const WINDOW = '#d9a441';

    // Скала, на которой стоит замок
    ctx.fillStyle = WALL_DARK;
    ctx.fillRect(10, base - 14, 130, 14);
    ctx.fillRect(20, base - 20, 110, 8);

    // Стена между башнями
    ctx.fillStyle = WALL;
    ctx.fillRect(28, base - 52, 94, 34);
    ctx.fillStyle = WALL_LIT;
    ctx.fillRect(28, base - 52, 94, 2);
    // Зубцы на стене
    for (let x = 28; x < 122; x += 8) {
      ctx.fillStyle = WALL;
      ctx.fillRect(x, base - 57, 5, 5);
    }
    // Ворота
    ctx.fillStyle = WALL_DARK;
    ctx.fillRect(68, base - 34, 14, 16);
    ctx.fillRect(70, base - 37, 10, 4);

    // Три башни разной высоты
    const towers = [[18, 70], [62, 92], [110, 62]];
    for (const [tx, th] of towers) {
      const tw = 22;
      ctx.fillStyle = WALL;
      ctx.fillRect(tx, base - th, tw, th - 8);
      ctx.fillStyle = WALL_LIT;
      ctx.fillRect(tx, base - th, 2, th - 8);
      // Зубцы башни
      for (let x = 0; x < tw; x += 6) {
        ctx.fillStyle = WALL;
        ctx.fillRect(tx + x, base - th - 5, 4, 5);
      }
      // Островерхая крыша
      ctx.fillStyle = WALL_DARK;
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(tx + i + 3, base - th - 5 - (8 - i), tw - i * 2 - 6, 1);
      }
      // Светящиеся окна — в замке кто-то есть
      ctx.fillStyle = WINDOW;
      ctx.globalAlpha = 0.75;
      ctx.fillRect(tx + 8, base - th + 12, 3, 4);
      ctx.fillRect(tx + 8, base - th + 24, 3, 4);
      ctx.globalAlpha = 1;
    }

    // Флаги на башнях
    ctx.fillStyle = '#8a2231';
    ctx.fillRect(28, base - 70 - 20, 1, 8);
    ctx.fillRect(29, base - 70 - 20, 6, 4);
    ctx.fillRect(120, base - 62 - 20, 1, 8);
    ctx.fillRect(121, base - 62 - 20, 6, 4);

    return c;
  }

  // ---------- СЛОЙ 1: небо ----------
  buildSky() {
    const c = makeCanvas(W, LAYER_H);
    const ctx = c.getContext('2d');
    const rng = mulberry32(11);

    let y = 0;
    for (const [color, h] of SKY_BANDS) {
      ctx.fillStyle = color;
      ctx.fillRect(0, y, W, h);
      y += h;
    }
    // Звёзды — редкие тусклые точки в верхней половине
    ctx.fillStyle = COL_STAR;
    for (let i = 0; i < 26; i++) {
      ctx.fillRect(Math.floor(rng() * W), Math.floor(rng() * 90), 1, 1);
    }
    // Луна с ореолом и кратерами
    const mx = 252, my = 36;
    this.pixelCircle(ctx, mx, my, 17, COL_MOON_HALO);
    this.pixelCircle(ctx, mx, my, 12, COL_MOON);
    ctx.fillStyle = COL_MOON_DARK;
    ctx.fillRect(mx - 5, my - 3, 3, 3);
    ctx.fillRect(mx + 2, my + 2, 4, 3);
    ctx.fillRect(mx - 1, my - 7, 2, 2);
    return c;
  }

  // Пиксельный круг из горизонтальных полосок
  pixelCircle(ctx, cx, cy, r, color) {
    ctx.fillStyle = color;
    for (let dy = -r; dy <= r; dy++) {
      const half = Math.floor(Math.sqrt(r * r - dy * dy));
      ctx.fillRect(cx - half, cy + dy, half * 2 + 1, 1);
    }
  }

  // ---------- СЛОЙ 2: дальний лес в тумане ----------
  buildFarForest() {
    const c = makeCanvas(512, LAYER_H);
    const ctx = c.getContext('2d');
    const rng = mulberry32(22);
    const base = 176; // "земля" дальнего леса

    ctx.fillStyle = COL_FAR_TREES;
    ctx.fillRect(0, base, 512, LAYER_H - base);

    // Частокол ёлок разной высоты
    let x = -10;
    while (x < 512 + 20) {
      const h = 46 + Math.floor(rng() * 58); // высота ёлки
      const wBase = 10 + Math.floor(rng() * 10);
      const steps = 5;
      for (let s = 0; s < steps; s++) {
        const sw = Math.max(2, Math.round(wBase * (1 - s / steps)));
        const sh = Math.ceil(h / steps);
        // рисуем с заворотом за край, чтобы слой бесшовно повторялся
        for (const ox of [0, 512, -512]) {
          ctx.fillRect(Math.round(x - sw / 2 + ox), base - h + s * sh - 2, sw, sh + 1);
        }
      }
      x += wBase * 0.9 + rng() * 10;
    }

    // Полоса тумана поверх подножия леса, с рваным верхним краем
    ctx.fillStyle = COL_FOG;
    ctx.fillRect(0, base - 8, 512, 26);
    for (let fx = 0; fx < 512; fx += 2) {
      if ((fx / 2) % 2 === (Math.floor(fx / 24) % 2)) {
        ctx.fillRect(fx, base - 11, 2, 3); // "клочья" сверху
      }
    }
    return c;
  }

  // ---------- СЛОЙ 3: огромные корявые деревья с лианами ----------
  buildBigTrees() {
    const c = makeCanvas(640, LAYER_H);
    const ctx = c.getContext('2d');
    const rng = mulberry32(33);
    const base = 214; // основание стволов (уходит за нижний край экрана)

    // 6 деревьев, распределённых по ширине слоя
    for (let i = 0; i < 6; i++) {
      const tx = Math.round(i * 106 + rng() * 40);
      this.drawTree(ctx, rng, tx, base);
    }
    return c;
  }

  drawTree(ctx, rng, tx, base) {
    const height = 130 + Math.floor(rng() * 60);
    const top = base - height;
    const lean = rng() < 0.5 ? -1 : 1; // куда ствол кривится
    let w = 14 + Math.floor(rng() * 5); // толщина у корней
    let x = tx;

    const branchPoints = []; // откуда растут ветки и свисают лианы

    // Ствол: рисуем сегментами снизу вверх, сужая и искривляя
    for (let y = base; y > top; y -= 10) {
      const wobble = Math.round((rng() - 0.3) * 2) * lean;
      x += wobble;
      const seg = Math.max(5, Math.round(w));
      for (const ox of [0, 640, -640]) { // заворот за край для бесшовности
        ctx.fillStyle = COL_TREE;
        ctx.fillRect(Math.round(x - seg / 2) + ox, y - 11, seg, 12);
      }
      w *= 0.92;
      // На средней высоте иногда пускаем ветку
      if (y < base - 40 && y > top + 25 && rng() < 0.45) {
        const side = rng() < 0.5 ? -1 : 1;
        const len = 4 + Math.floor(rng() * 4); // длина в "ступеньках"
        let bx = x + side * (seg / 2);
        let by = y - 8;
        for (let s = 0; s < len; s++) {
          for (const ox of [0, 640, -640]) {
            ctx.fillRect(Math.round(bx) + ox, Math.round(by), 6, 4);
          }
          bx += side * 5;
          by -= 3;
        }
        branchPoints.push([bx, by + 4]);
      }
    }

    // Корни: расползаются в стороны у основания
    for (const side of [-1, 1]) {
      const rootLen = 8 + Math.floor(rng() * 8);
      for (const ox of [0, 640, -640]) {
        ctx.fillStyle = COL_TREE;
        ctx.fillRect(Math.round(tx + side * 4) + ox, base - 6, side * rootLen, 6);
      }
    }

    // Крона: несколько тёмных "клубов" вокруг верхушки.
    // Каждый клуб — пирамидка из трёх блоков, чтобы контур был рваным
    const blobs = 4 + Math.floor(rng() * 3);
    for (let b = 0; b < blobs; b++) {
      const bw = 24 + Math.floor(rng() * 26);
      const bh = 6 + Math.floor(rng() * 5);
      const bx = x + (rng() - 0.5) * 46;
      const by = top + (rng() - 0.4) * 22;
      ctx.fillStyle = COL_TREE;
      for (const ox of [0, 640, -640]) {
        ctx.fillRect(Math.round(bx - bw / 2) + ox, Math.round(by), bw, bh);
        ctx.fillRect(Math.round(bx - bw * 0.35) + ox, Math.round(by - bh * 0.7), Math.round(bw * 0.7), bh);
        ctx.fillRect(Math.round(bx - bw * 0.2) + ox, Math.round(by + bh), Math.round(bw * 0.55), Math.round(bh * 0.7));
      }
      // Из-под кроны свисают лианы
      if (rng() < 0.7) branchPoints.push([bx + (rng() - 0.5) * bw * 0.6, by + bh]);
    }

    // Лианы: тонкие качающиеся плети с листочками
    for (const [lx, ly] of branchPoints) {
      const len = 24 + Math.floor(rng() * 46);
      let px = Math.round(lx);
      for (let d = 0; d < len; d += 3) {
        if (d > 0 && d % 9 === 0) px += rng() < 0.5 ? -1 : 1; // лёгкий изгиб
        for (const ox of [0, 640, -640]) {
          ctx.fillStyle = COL_LIANA;
          ctx.fillRect(px + ox, Math.round(ly + d), 1, 3);
          if (d % 12 === 6) { // листочек
            ctx.fillStyle = COL_LIANA_LEAF;
            ctx.fillRect(px - 1 + ox, Math.round(ly + d), 3, 2);
          }
        }
      }
    }
  }

  // ---------- ОТРИСОВКА КАЖДЫЙ КАДР ----------
  draw(ctx, camera) {
    // Небо почти не двигается (лёгкий сдвиг вверх при подъёме камеры)
    ctx.drawImage(this.sky, 0, Math.round(-camera.y * 0.08));
    this.drawCastle(ctx, camera);
    this.drawWrapped(ctx, this.far, camera.x * FAR_FACTOR, camera.y * 0.18);
    this.drawMoonlight(ctx, camera);
    this.drawWrapped(ctx, this.near, camera.x * NEAR_FACTOR, camera.y * 0.4);
    this.drawFireflies(ctx, camera);
  }

  // Косые лучи лунного света, пробивающиеся сквозь кроны
  drawMoonlight(ctx, camera) {
    const offset = -camera.x * 0.22;
    ctx.fillStyle = '#7d94ad';
    ctx.globalAlpha = 0.05;
    for (let i = 0; i < 6; i++) {
      // Луч — наклонная лесенка из полосок
      const baseX = ((i * 190 + offset) % 900 + 900) % 900 - 120;
      for (let s = 0; s < 26; s++) {
        const w = 16 - Math.floor(s / 4);
        ctx.fillRect(Math.round(baseX + s * 2), s * 5, w, 5);
      }
    }
    ctx.globalAlpha = 1;
  }

  // Светлячки мерцают и плавают между стволами
  drawFireflies(ctx, camera) {
    const t = performance.now() / 1000;
    for (const f of this.fireflies) {
      // Плавают по маленькому кругу
      const fx = f.x + Math.cos(t * f.speed + f.phase) * f.radius - camera.x * 0.5;
      const fy = f.y + Math.sin(t * f.speed * 1.3 + f.phase) * f.radius * 0.6 - camera.y * 0.5;
      // Повторяем по ширине, чтобы светлячки были на всём уровне
      const x = ((fx % 900) + 900) % 900;
      if (x > CONFIG.SCREEN_W + 4) continue;

      // Мигают вразнобой, иногда совсем гаснут
      const blink = Math.sin(t * 2.2 + f.phase * 3);
      if (blink < -0.2) continue;
      const glow = Math.min(1, blink + 0.4);

      ctx.fillStyle = '#c9e26b';
      ctx.globalAlpha = 0.16 * glow;
      ctx.fillRect(Math.round(x) - 1, Math.round(fy) - 1, 3, 3);
      ctx.globalAlpha = 0.85 * glow;
      ctx.fillRect(Math.round(x), Math.round(fy), 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Замок стоит в конце пути: проявляется во второй половине уровня
  // и медленно приближается, пока герой идёт вправо
  drawCastle(ctx, camera) {
    const progress = camera.x / Math.max(1, this.levelWidth - CONFIG.SCREEN_W);
    if (progress < 0.35) return; // в начале леса замка ещё не видно

    // Проявляется постепенно из тумана
    const alpha = Math.min(1, (progress - 0.35) / 0.3);
    // Двигается очень медленно — он далеко. К концу уровня выходит
    // почти на середину экрана: герой подошёл к нему вплотную
    const x = Math.round(340 - (progress - 0.35) * 290);
    const y = Math.round(14 - camera.y * 0.05);

    ctx.globalAlpha = alpha * 0.9;
    ctx.drawImage(this.castle, x, y);
    ctx.globalAlpha = 1;
  }

  // Рисуем слой с повтором по горизонтали
  drawWrapped(ctx, layer, offX, offY) {
    const lw = layer.width;
    let start = -Math.round(offX) % lw;
    if (start > 0) start -= lw;
    const y = Math.round(-offY);
    for (let x = start; x < W; x += lw) {
      ctx.drawImage(layer, x, y);
    }
  }
}
