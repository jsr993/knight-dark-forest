// ============================================================
// УРОВЕНЬ: парсинг ASCII-карты и проверка коллизий с тайлами.
// ============================================================

import { CONFIG } from './config.js';
import { drawHouses, drawCampfire } from './decor.js';

const T = CONFIG.TILE;

// Временные цвета тайлов (на этапе 2 их заменят настоящие спрайты)
// --- Земля: заросшая почва ---
const COL_SOIL = '#4a3b2d';        // почва
const COL_SOIL_DARK = '#33291f';   // тёмные комья
const COL_SOIL_LIGHT = '#5b4838';  // светлые комья
const COL_HOLE = '#1b1610';        // пустоты-норы внутри земли
const COL_GRASS = '#3f7a3d';       // трава на кромке
const COL_GRASS_DARK = '#2c5a2c';  // тень травы
const COL_MOSS = '#4d6b3a';        // мох на боках
const COL_BUSH = '#2f5c34';        // кусты
const COL_BUSH_LIGHT = '#437a45';  // блики кустов
const COL_ROOT = '#5a4a35';        // свисающие корешки
const COL_STONE = '#5f6f7a';       // камень (осталось для платформ)
const COL_STONE_DARK = '#46535c';  // тень камня
const COL_WOOD = '#a5673f';        // деревянная платформа
const COL_WOOD_DARK = '#7c4a2d';   // тень платформы
const COL_VINE = '#2d6a4f';        // стебель лианы
const COL_VINE_LEAF = '#52b788';   // листья лианы

export class Level {
  constructor(rows) {
    // Выравниваем строки по самой длинной (короткие дополняем пустотой)
    const width = Math.max(...rows.map((r) => r.length));
    this.cols = width;
    this.rows = rows.length;
    this.pixelW = this.cols * T;
    this.pixelH = this.rows * T;

    // Точка старта игрока (если 'P' не нашли — левый верхний угол)
    this.spawnX = T * 2;
    this.spawnY = 0;

    // Точки появления движущихся платформ и врагов (собираем при парсинге)
    this.platformSpawns = [];
    this.enemySpawns = [];
    this.ghostSpawns = [];
    this.houses = [];       // декоративные домики
    this.bossSpawn = null;  // точка появления босса

    // Выход с уровня (дверь замка), заполняется меткой 'E'
    this.exit = null;

    // Сетка тайлов: массив строк-массивов символов
    this.grid = [];
    for (let row = 0; row < this.rows; row++) {
      const line = rows[row].padEnd(width, '.');
      const cells = [];
      for (let col = 0; col < width; col++) {
        let ch = line[col];
        // Символы-объекты (игрок, враги, предметы) — не тайлы:
        // запоминаем их позицию и кладём в сетку пустоту
        if (ch === 'P') {
          this.spawnX = col * T + (T - CONFIG.PLAYER_W) / 2;
          this.spawnY = row * T + T - CONFIG.PLAYER_H;
          ch = '.';
        } else if (ch === 'm') {
          // горизонтальная движущаяся платформа
          this.platformSpawns.push({ col, row, axis: 'x' });
          ch = '.';
        } else if (ch === 'M') {
          // вертикальная движущаяся платформа (лифт)
          this.platformSpawns.push({ col, row, axis: 'y' });
          ch = '.';
        } else if (ch === 'g') {
          // враг: тёмный рыцарь
          this.enemySpawns.push({ col, row });
          ch = '.';
        } else if (ch === 'G' || ch === 'V') {
          // привидение: 'G' вылетает снизу вверх, 'V' падает сверху вниз
          this.ghostSpawns.push({ col, row, fromBelow: ch === 'G' });
          ch = '.';
        } else if (ch === 'B') {
          // босс-огр: стоит ногами на полу этой клетки
          this.bossSpawn = { col, row };
          ch = '.';
        } else if (ch === 'H' || ch === 'R') {
          // домик: 'H' жилой (горит свет), 'R' заброшенный.
          // Метка ставится в клетку, НА КОТОРОЙ стоит дом (его низ — низ клетки)
          this.houses.push({
            x: col * T,
            bottom: (row + 1) * T,
            col,
            lit: ch === 'H',
          });
          ch = '.';
        } else if (ch === 'E') {
          // костёр — привал в конце уровня. Зона, при входе в которую
          // герой останавливается и садится погреться
          this.exit = {
            x: col * T,
            y: (row + 1) * T - 24,
            w: T * 2,
            h: 24,
            groundY: (row + 1) * T, // уровень земли под костром
          };
          ch = '.';
        }
        cells.push(ch);
      }
      this.grid.push(cells);
    }
  }

  // Символ тайла в клетке (col, row)
  tileAt(col, row) {
    if (row < 0 || row >= this.rows) return '.';
    // За левым и правым краем уровня — невидимая стена
    if (col < 0 || col >= this.cols) return '#';
    return this.grid[row][col];
  }

  // Твёрдый тайл: нельзя пройти ни с какой стороны
  isSolidAt(col, row) {
    return this.tileAt(col, row) === '#';
  }

  // Платформа: сверху можно стоять, снизу и сбоку — пролетаешь
  isOneWayAt(col, row) {
    return this.tileAt(col, row) === '=';
  }

  // Лиана / лестница: по ней можно лазить стрелками вверх/вниз
  isVineAt(col, row) {
    return this.tileAt(col, row) === '|';
  }

  // Пересекается ли прямоугольник героя с лианой
  // (проверяем колонку, где находится центр героя)
  overlapsVine(box) {
    const col = Math.floor((box.x + box.w / 2) / T);
    const top = Math.floor(box.y / T);
    const bottom = Math.floor((box.y + box.h - 0.01) / T);
    for (let row = top; row <= bottom; row++) {
      if (this.isVineAt(col, row)) return true;
    }
    return false;
  }

  // Лесные домики (рисуются раньше тайлов — земля перекрывает их низ)
  drawDecor(ctx, camera, time) {
    drawHouses(ctx, this.houses, camera, time);
  }

  // Костёр в конце уровня (рисуется ПОСЛЕ героя, чтобы пламя грело его спереди)
  drawExit(ctx, camera, time) {
    if (!this.exit) return;
    const x = Math.round(this.exit.x - camera.x);
    const bottom = Math.round(this.exit.groundY - camera.y);
    drawCampfire(ctx, x, bottom, time);
  }

  // Тайл земли: почва с комьями и пустотами, сверху трава и кусты,
  // на боках мох, снизу свисают корешки.
  // Узор зависит от координат тайла, поэтому не "дрожит" при движении камеры.
  drawGroundTile(ctx, x, y, col, row) {
    // Псевдослучайное, но постоянное число 0..1 для этой клетки
    const rnd = (salt) => {
      const n = Math.sin(col * 12.9898 + row * 78.233 + salt * 37.719) * 43758.5453;
      return n - Math.floor(n);
    };

    const openAbove = !this.isSolidAt(col, row - 1);   // сверху воздух — там трава
    const openLeft = !this.isSolidAt(col - 1, row);
    const openRight = !this.isSolidAt(col + 1, row);
    const openBelow = !this.isSolidAt(col, row + 1);

    // Основа — почва
    ctx.fillStyle = COL_SOIL;
    ctx.fillRect(x, y, T, T);

    // Комья земли: тёмные и светлые пятнышки
    for (let i = 0; i < 5; i++) {
      const px = x + Math.floor(rnd(i) * (T - 3));
      const py = y + 3 + Math.floor(rnd(i + 9) * (T - 6));
      ctx.fillStyle = rnd(i + 20) > 0.5 ? COL_SOIL_DARK : COL_SOIL_LIGHT;
      ctx.fillRect(px, py, 2 + Math.floor(rnd(i + 30) * 2), 2);
    }

    // Пустоты-норы внутри земли (в глубине, не у самой кромки)
    if (!openAbove && rnd(41) > 0.62) {
      const hw = 3 + Math.floor(rnd(42) * 4);
      const hh = 2 + Math.floor(rnd(43) * 3);
      const hx = x + 2 + Math.floor(rnd(44) * (T - hw - 4));
      const hy = y + 3 + Math.floor(rnd(45) * (T - hh - 5));
      ctx.fillStyle = COL_HOLE;
      ctx.fillRect(hx, hy, hw, hh);
      // светлая нижняя кромка норы — объём
      ctx.fillStyle = COL_SOIL_LIGHT;
      ctx.fillRect(hx, hy + hh, hw, 1);
    }

    // --- Трава на верхней кромке ---
    if (openAbove) {
      ctx.fillStyle = COL_GRASS_DARK;
      ctx.fillRect(x, y, T, 4);
      ctx.fillStyle = COL_GRASS;
      ctx.fillRect(x, y, T, 2);
      // Торчащие травинки разной длины
      for (let i = 0; i < T; i += 2) {
        if (rnd(i + 50) > 0.45) {
          const hgt = 1 + Math.floor(rnd(i + 60) * 3);
          ctx.fillRect(x + i, y - hgt, 1, hgt);
        }
      }
      // Куст: пышный тёмно-зелёный ком с бликами
      if (rnd(70) > 0.72) {
        const bx = x + 2 + Math.floor(rnd(71) * 6);
        ctx.fillStyle = COL_BUSH;
        ctx.fillRect(bx, y - 6, 8, 6);
        ctx.fillRect(bx + 2, y - 8, 4, 3);
        ctx.fillStyle = COL_BUSH_LIGHT;
        ctx.fillRect(bx + 1, y - 6, 2, 2);
        ctx.fillRect(bx + 5, y - 4, 2, 2);
      }
    }

    // --- Мох на открытых боках ---
    if (openLeft) {
      ctx.fillStyle = COL_MOSS;
      for (let i = 0; i < T; i += 2) {
        if (rnd(i + 80) > 0.4) ctx.fillRect(x, y + i, 2, 2);
      }
    }
    if (openRight) {
      ctx.fillStyle = COL_MOSS;
      for (let i = 0; i < T; i += 2) {
        if (rnd(i + 90) > 0.4) ctx.fillRect(x + T - 2, y + i, 2, 2);
      }
    }

    // --- Снизу свисают корешки и лианы ---
    if (openBelow) {
      ctx.fillStyle = COL_SOIL_DARK;
      ctx.fillRect(x, y + T - 2, T, 2);
      for (let i = 1; i < T; i += 3) {
        if (rnd(i + 100) > 0.5) {
          const len = 2 + Math.floor(rnd(i + 110) * 5);
          ctx.fillStyle = COL_ROOT;
          ctx.fillRect(x + i, y + T, 1, len);
          // на длинных корешках — листочек лианы
          if (len > 4) {
            ctx.fillStyle = COL_GRASS_DARK;
            ctx.fillRect(x + i - 1, y + T + len - 2, 3, 2);
          }
        }
      }
    }
  }

  // Рисуем только видимые тайлы (в пределах камеры)
  draw(ctx, camera) {
    // Берём на тайл шире с каждой стороны: трава и кусты торчат за границы клетки
    const col0 = Math.max(0, Math.floor(camera.x / T) - 1);
    const col1 = Math.min(this.cols - 1, Math.floor((camera.x + CONFIG.SCREEN_W) / T) + 1);
    const row0 = Math.max(0, Math.floor(camera.y / T) - 1);
    const row1 = Math.min(this.rows - 1, Math.floor((camera.y + CONFIG.SCREEN_H) / T) + 1);

    for (let row = row0; row <= row1; row++) {
      for (let col = col0; col <= col1; col++) {
        const ch = this.grid[row][col];
        if (ch === '.') continue;
        const x = col * T - Math.round(camera.x);
        const y = row * T - Math.round(camera.y);
        if (ch === '#') {
          this.drawGroundTile(ctx, x, y, col, row);
        } else if (ch === '=') {
          // Деревянная дощатая платформа (тонкая, у верха тайла)
          ctx.fillStyle = COL_WOOD;
          ctx.fillRect(x, y, T, 5);
          ctx.fillStyle = COL_WOOD_DARK;
          ctx.fillRect(x, y + 5, T, 2);
        } else if (ch === '|') {
          // Лиана: стебель по центру и листики в шахматном порядке
          ctx.fillStyle = COL_VINE;
          ctx.fillRect(x + 6, y, 4, T);
          ctx.fillStyle = COL_VINE_LEAF;
          ctx.fillRect(x + 2, y + 3, 4, 3);
          ctx.fillRect(x + 10, y + 10, 4, 3);
        }
        // Остальные символы (^ | c h ...) пока не рисуем — их этапы впереди
      }
    }
  }
}
