// ============================================================
// КОМНАТЫ ЗАМКА.
// Когда герой входит в дверь, экран целиком превращается
// в интерьер: гостиную или спальню. Там стоят сундуки,
// а выйти можно через ту же дверь.
// ============================================================

import { CONFIG } from './config.js';
import { drawTextCentered } from './font.js';

const W = CONFIG.SCREEN_W;
const H = CONFIG.SCREEN_H;
// Уровень пола: вся мебель стоит на этой линии
const FLOOR_Y = 140;

// --- Общая готическая палитра ---
const WALL = '#3a2f3f';        // тёмная стена с лиловым отливом
const WALL_LIGHT = '#473b4d';
const WALL_SEAM = '#2c2430';
const FLOOR = '#6b5134';       // дощатый пол — заметно светлее стен
const FLOOR_LIGHT = '#7d6040'; // блик на досках
const FLOOR_DARK = '#382b20';  // тёмное дерево мебели и панели
const GOLD = '#c9a227';
const GOLD_LIGHT = '#f2c14e';
const CRIMSON = '#7d1f2d';     // бордовый бархат
const CRIMSON_DARK = '#5a1420';
const CANDLE = '#ffe9a0';
const FLAME = '#ffb02e';

// Стена с кладкой и высокой панелью — общий задник обеих комнат
function drawWalls(ctx) {
  ctx.fillStyle = WALL;
  ctx.fillRect(0, 0, W, H);
  // Кладка
  ctx.fillStyle = WALL_LIGHT;
  for (let y = 0; y < 120; y += 14) {
    for (let x = (y / 14) % 2 ? 0 : -14; x < W; x += 28) {
      ctx.fillRect(x, y, 27, 13);
    }
  }
  ctx.fillStyle = WALL_SEAM;
  for (let y = 13; y < 120; y += 14) ctx.fillRect(0, y, W, 1);

  // Деревянная панель понизу стены, с золотым карнизом сверху
  ctx.fillStyle = '#2f2518';
  ctx.fillRect(0, 128, W, FLOOR_Y - 128);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 128, W, 1);
  ctx.fillStyle = '#3d3020';
  for (let x = 0; x < W; x += 22) ctx.fillRect(x, 129, 1, FLOOR_Y - 129);
}

// Дощатый пол. Вся мебель стоит НА нём, начиная с FLOOR_Y
function drawFloor(ctx) {
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, FLOOR_Y, W, H - FLOOR_Y);
  // Плинтус на стыке со стеной
  ctx.fillStyle = FLOOR_DARK;
  ctx.fillRect(0, FLOOR_Y, W, 2);
  // Доски: светлый блик и тёмный шов
  ctx.fillStyle = FLOOR_LIGHT;
  for (let y = FLOOR_Y + 3; y < H; y += 10) ctx.fillRect(0, y, W, 1);
  ctx.fillStyle = FLOOR_DARK;
  for (let y = FLOOR_Y + 9; y < H; y += 10) ctx.fillRect(0, y, W, 1);
  // Поперечные стыки досок
  for (let x = 0; x < W; x += 34) {
    for (let y = FLOOR_Y + 2; y < H; y += 10) ctx.fillRect(x + (y % 20), y, 1, 7);
  }
}

// Готическая картина в золочёной раме
function drawPainting(ctx, x, y, w, h, сюжет) {
  // Рама
  ctx.fillStyle = GOLD;
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillRect(x - 2, y - 2, w + 4, 1);
  ctx.fillStyle = '#8a6a12';
  ctx.fillRect(x - 2, y + h + 1, w + 4, 2);

  // Холст
  ctx.fillStyle = '#20202c';
  ctx.fillRect(x, y, w, h);

  if (сюжет === 'knight') {
    // Портрет рыцаря в латах
    ctx.fillStyle = '#2b3a4a';
    ctx.fillRect(x + 2, y + h - 10, w - 4, 10);
    ctx.fillStyle = '#8d99ae';
    ctx.fillRect(x + w / 2 - 4, y + 5, 8, 9);     // шлем
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(x + w / 2 - 3, y + 8, 6, 2);     // забрало
    ctx.fillStyle = '#6b7484';
    ctx.fillRect(x + w / 2 - 7, y + 14, 14, 8);   // плечи
    ctx.fillStyle = '#c9a227';
    ctx.fillRect(x + w / 2 - 1, y + 16, 2, 6);    // меч
  } else if (сюжет === 'forest') {
    // Пейзаж: тёмный лес и луна
    ctx.fillStyle = '#1b2838';
    ctx.fillRect(x, y, w, h - 6);
    ctx.fillStyle = '#b9c4bb';
    ctx.fillRect(x + w - 9, y + 4, 5, 5);
    ctx.fillStyle = '#0f1a14';
    for (let i = 0; i < w; i += 5) {
      const th = 6 + ((i * 7) % 9);
      ctx.fillRect(x + i, y + h - 6 - th, 3, th);
    }
    ctx.fillStyle = '#16301f';
    ctx.fillRect(x, y + h - 6, w, 6);
  } else {
    // Герб: щит с мечами
    ctx.fillStyle = CRIMSON;
    ctx.fillRect(x + w / 2 - 6, y + 4, 12, 10);
    ctx.fillRect(x + w / 2 - 4, y + 14, 8, 4);
    ctx.fillRect(x + w / 2 - 2, y + 18, 4, 3);
    ctx.fillStyle = GOLD_LIGHT;
    ctx.fillRect(x + w / 2 - 1, y + 6, 2, 12);
    ctx.fillRect(x + w / 2 - 5, y + 9, 10, 2);
  }
}

// Горящая свеча
function drawCandle(ctx, x, y, h, time, seed = 0) {
  ctx.fillStyle = CANDLE;
  ctx.fillRect(x, y, 2, h);
  const f = Math.sin(time / 90 + seed) > 0 ? 2 : 3;
  ctx.fillStyle = FLAME;
  ctx.fillRect(x, y - f, 2, f);
  ctx.fillStyle = '#ffe9a0';
  ctx.fillRect(x, y - f, 2, 1);
  // Пятно света
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = FLAME;
  ctx.fillRect(x - 10, y - 12, 22, 26);
  ctx.globalAlpha = 1;
}

// Кованая люстра на цепи под потолком
function drawChandelier(ctx, cx, time) {
  const top = 14;       // низ цепи, где начинается люстра
  // Цепь звеньями
  ctx.fillStyle = '#5a5f66';
  for (let y = 0; y < top; y += 3) ctx.fillRect(cx, y, 1, 2);
  // Верхнее кольцо
  ctx.fillStyle = GOLD;
  ctx.fillRect(cx - 3, top, 7, 2);
  // Два яруса обручей
  ctx.fillRect(cx - 16, top + 8, 33, 2);
  ctx.fillRect(cx - 10, top + 16, 21, 2);
  // Подвесы между ярусами
  ctx.fillStyle = '#8a6a12';
  ctx.fillRect(cx - 16, top + 2, 1, 7);
  ctx.fillRect(cx + 16, top + 2, 1, 7);
  ctx.fillRect(cx - 10, top + 10, 1, 7);
  ctx.fillRect(cx + 10, top + 10, 1, 7);
  // Свечи на обоих ярусах
  for (let i = -15; i <= 15; i += 7) drawCandle(ctx, cx + i, top + 2, 6, time, i);
  for (let i = -9; i <= 9; i += 9) drawCandle(ctx, cx + i, top + 10, 6, time, i + 3);
  // Тёплое зарево вокруг люстры
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = FLAME;
  ctx.fillRect(cx - 44, 0, 88, 76);
  ctx.globalAlpha = 1;
}

// Тяжёлая бархатная штора, расшитая золотом
function drawCurtain(ctx, x, y, w, h) {
  ctx.fillStyle = CRIMSON_DARK;
  ctx.fillRect(x, y, w, h);
  // Складки
  ctx.fillStyle = CRIMSON;
  for (let i = 0; i < w; i += 5) ctx.fillRect(x + i, y, 3, h);
  // Золотая кайма и кисть
  ctx.fillStyle = GOLD;
  ctx.fillRect(x, y, w, 2);
  ctx.fillRect(x, y + h - 3, w, 2);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillRect(x + w / 2 - 1, y + h - 1, 2, 4);
}

// ---------- ГОСТИНАЯ ----------
// Большой стол со свечами, картины, люстра, камин
function drawHall(ctx, time) {
  drawWalls(ctx);

  // Люстры под потолком
  drawChandelier(ctx, 84, time);
  drawChandelier(ctx, 236, time);

  // Картины на стене между люстрами
  drawPainting(ctx, 26, 52, 26, 30, 'knight');
  drawPainting(ctx, 143, 48, 34, 34, 'crest');
  drawPainting(ctx, 268, 52, 26, 30, 'forest');

  // Шторы по краям
  drawCurtain(ctx, 0, 24, 16, 96);
  drawCurtain(ctx, W - 16, 24, 16, 96);

  drawFloor(ctx);

  // Ковровая дорожка под столом
  ctx.fillStyle = CRIMSON_DARK;
  ctx.fillRect(56, FLOOR_Y + 4, W - 112, 22);
  ctx.fillStyle = GOLD;
  ctx.fillRect(56, FLOOR_Y + 5, W - 112, 1);
  ctx.fillRect(56, FLOOR_Y + 24, W - 112, 1);

  // Стулья с высокими спинками — за столом, поэтому рисуем раньше
  ctx.fillStyle = '#2a1f14';
  ctx.fillRect(82, FLOOR_Y - 34, 5, 38);
  ctx.fillRect(233, FLOOR_Y - 34, 5, 38);
  ctx.fillStyle = CRIMSON;
  ctx.fillRect(83, FLOOR_Y - 32, 3, 16);
  ctx.fillRect(234, FLOOR_Y - 32, 3, 16);

  // Длинный стол: столешница на уровне пояса, ножки упираются в пол
  const tx = 96;
  const ty = FLOOR_Y - 22;
  ctx.fillStyle = '#2a1f14';
  ctx.fillRect(tx + 8, ty + 8, 6, 14);     // ножки
  ctx.fillRect(tx + 110, ty + 8, 6, 14);
  ctx.fillStyle = FLOOR_DARK;
  ctx.fillRect(tx, ty, 124, 8);            // столешница
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(tx, ty, 124, 2);

  // Скатерть с золотой каймой свисает со столешницы
  ctx.fillStyle = CRIMSON;
  ctx.fillRect(tx + 3, ty + 7, 118, 7);
  ctx.fillStyle = GOLD;
  ctx.fillRect(tx + 3, ty + 13, 118, 1);

  // Канделябры и кубки на столе
  drawCandle(ctx, tx + 26, ty - 11, 11, time, 1);
  drawCandle(ctx, tx + 60, ty - 14, 14, time, 2);
  drawCandle(ctx, tx + 94, ty - 11, 11, time, 3);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillRect(tx + 44, ty - 5, 4, 5);
  ctx.fillRect(tx + 43, ty - 6, 6, 1);
  ctx.fillRect(tx + 76, ty - 5, 4, 5);
  ctx.fillRect(tx + 75, ty - 6, 6, 1);
  // Блюдо посередине
  ctx.fillStyle = '#b9b2a0';
  ctx.fillRect(tx + 56, ty - 3, 12, 3);

  // Сундук с добычей в углу
  drawTreasureChest(ctx, 268, FLOOR_Y - 16);   // сундук стоит ровно на полу
}

// Сундук, стоящий в комнате.
// Тёмное дерево и светлая крышка — чтобы не сливался с полом
function drawTreasureChest(ctx, x, y) {
  // тень под сундуком — «приклеивает» его к полу
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(x - 1, y + 15, 28, 2);

  // короб
  ctx.fillStyle = '#3b2616';
  ctx.fillRect(x, y + 5, 26, 11);
  ctx.fillStyle = '#4e3420';
  ctx.fillRect(x + 1, y + 6, 24, 6);

  // выпуклая крышка
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(x + 1, y + 1, 24, 4);
  ctx.fillStyle = '#8a6136';
  ctx.fillRect(x + 3, y, 20, 2);

  // золотые обручи и накладки
  ctx.fillStyle = GOLD;
  ctx.fillRect(x, y + 4, 26, 2);
  ctx.fillRect(x + 3, y, 2, 16);
  ctx.fillRect(x + 21, y, 2, 16);

  // замок
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillRect(x + 11, y + 4, 4, 6);
  ctx.fillStyle = '#2a1a0e';
  ctx.fillRect(x + 12, y + 6, 2, 2);
}

// ---------- СПАЛЬНЯ ----------
// Большая кровать с балдахином, шторы, картины, подсветка
function drawBedroom(ctx, time) {
  drawWalls(ctx);

  // Мягкий свет из окна
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#6fa8dc';
  ctx.fillRect(196, 20, 60, 100);
  ctx.globalAlpha = 1;

  // Стрельчатое окно
  ctx.fillStyle = '#1b2838';
  ctx.fillRect(208, 24, 36, 56);
  for (let s = 0; s < 8; s++) {
    ctx.fillRect(208 + s, 24 - s * 1.2, 36 - s * 2, 2);
  }
  // Витражные стёкла
  ctx.fillStyle = '#2f4f6b';
  ctx.fillRect(212, 30, 12, 22);
  ctx.fillStyle = '#4a3357';
  ctx.fillRect(228, 30, 12, 22);
  ctx.fillStyle = '#51432a';
  ctx.fillRect(212, 56, 28, 20);
  // Переплёт
  ctx.fillStyle = '#20202c';
  ctx.fillRect(225, 26, 2, 52);
  ctx.fillRect(210, 53, 32, 2);

  // Шторы вокруг окна — золотисто-красные
  drawCurtain(ctx, 190, 18, 18, 104);
  drawCurtain(ctx, 246, 18, 18, 104);

  // Картины
  drawPainting(ctx, 118, 30, 28, 32, 'crest');
  drawPainting(ctx, 160, 48, 24, 26, 'knight');

  drawFloor(ctx);

  // Ковёр перед кроватью
  ctx.fillStyle = CRIMSON_DARK;
  ctx.fillRect(28, FLOOR_Y + 6, 110, 18);
  ctx.fillStyle = GOLD;
  ctx.fillRect(28, FLOOR_Y + 7, 110, 1);
  ctx.fillRect(28, FLOOR_Y + 22, 110, 1);

  // Кровать с балдахином. Низ кровати стоит на полу
  const bx = 20;
  const bed = FLOOR_Y - 4;    // уровень основания кровати
  // Столбы балдахина от пола до верха
  ctx.fillStyle = '#2a1f14';
  ctx.fillRect(bx, bed - 76, 6, 80);
  ctx.fillRect(bx + 96, bed - 76, 6, 80);
  // Полог
  ctx.fillStyle = CRIMSON;
  ctx.fillRect(bx, bed - 82, 102, 10);
  ctx.fillStyle = GOLD;
  ctx.fillRect(bx, bed - 73, 102, 2);
  ctx.fillStyle = GOLD_LIGHT;
  ctx.fillRect(bx, bed - 82, 102, 1);
  // Свисающие занавеси по углам полога
  drawCurtain(ctx, bx + 2, bed - 71, 12, 40);
  drawCurtain(ctx, bx + 88, bed - 71, 12, 40);

  // Основание, матрас и бельё
  ctx.fillStyle = '#3a2414';
  ctx.fillRect(bx + 4, bed - 10, 94, 14);
  ctx.fillStyle = '#d8d2c0';
  ctx.fillRect(bx + 6, bed - 18, 90, 9);     // простыня
  ctx.fillStyle = CRIMSON;
  ctx.fillRect(bx + 32, bed - 19, 64, 10);   // одеяло
  ctx.fillStyle = GOLD;
  ctx.fillRect(bx + 32, bed - 19, 64, 1);
  // Подушки у изголовья
  ctx.fillStyle = '#e8e3d2';
  ctx.fillRect(bx + 10, bed - 24, 20, 7);
  ctx.fillStyle = '#f2ecdc';
  ctx.fillRect(bx + 10, bed - 24, 20, 2);

  // Прикроватный столик со свечой
  ctx.fillStyle = FLOOR_DARK;
  ctx.fillRect(bx + 110, bed - 12, 20, 16);
  ctx.fillStyle = '#6b4a2a';
  ctx.fillRect(bx + 110, bed - 12, 20, 2);
  drawCandle(ctx, bx + 119, bed - 24, 12, time, 5);

  // Сундук в изножье кровати
  drawTreasureChest(ctx, 168, FLOOR_Y - 16);   // сундук стоит ровно на полу
}

// Нарисовать комнату нужного вида
export function drawRoom(ctx, kind, time) {
  if (kind === 'bedroom') drawBedroom(ctx, time);
  else drawHall(ctx, time);

  // Подпись комнаты сверху
  drawTextCentered(ctx, kind === 'bedroom' ? 'СПАЛЬНЯ' : 'ГОСТИНАЯ', W, 6, '#c9a227', 1);
}

// Подсказка внизу: как выйти
export function drawRoomHint(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, H - 14, W, 14);
  drawTextCentered(ctx, 'ESC ИЛИ ВНИЗ - ВЫЙТИ', W, H - 11, '#8d99ae', 1);
}
