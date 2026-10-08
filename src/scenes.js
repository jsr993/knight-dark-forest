// ============================================================
// ЭКРАНЫ ИГРЫ: титульный, выбор уровня, параметры, прощание.
// Здесь только рисование и навигация по пунктам меню —
// сама игра живёт в main.js.
// ============================================================

import { CONFIG } from './config.js';
import { drawText, drawTextCentered, textWidth } from './font.js';

const W = CONFIG.SCREEN_W;
const H = CONFIG.SCREEN_H;

// Пункты главного меню
export const MAIN_MENU = ['ИГРАТЬ', 'ВЫБОР УРОВНЯ', 'УПРАВЛЕНИЕ', 'ПАРАМЕТРЫ', 'ВЫХОД'];

// Уровни игры. Открываются по мере прохождения: пройдёшь первый —
// откроется второй. Третий ещё не сделан
export const LEVELS = [
  { name: 'ТЁМНЫЙ ЛЕС', unlocked: true },
  { name: 'ЗАМОК', unlocked: false },
  { name: 'ПОДЗЕМЕЛЬЕ', unlocked: false, скоро: true },
];

// Сколько уровней открыто (1 — только первый)
export function unlockLevels(count) {
  for (let i = 0; i < LEVELS.length; i++) {
    if (LEVELS[i].скоро) continue;      // ещё не сделанные не открываем
    LEVELS[i].unlocked = i < count;
  }
}

// Рамка вокруг экрана — как на старых консолях
function drawFrame(ctx) {
  ctx.fillStyle = '#2a3546';
  ctx.fillRect(4, 4, W - 8, 1);
  ctx.fillRect(4, H - 5, W - 8, 1);
  ctx.fillRect(4, 4, 1, H - 8);
  ctx.fillRect(W - 5, 4, 1, H - 8);
}

// Стрелка-указатель у выбранного пункта (меч рыцаря)
function drawPointer(ctx, x, y, time) {
  const wobble = Math.sin(time / 180) > 0 ? 1 : 0; // чуть покачивается
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(x + wobble, y + 1, 5, 1);
  ctx.fillRect(x + wobble + 4, y, 1, 3);
  ctx.fillRect(x + wobble + 5, y + 1, 1, 1);
}

// ---------- ТИТУЛЬНЫЙ ЭКРАН ----------
export function drawTitle(ctx, selected, time) {
  // Название с тенью
  drawTextCentered(ctx, 'РЫЦАРЬ', W, 25, '#3a2a10', 4);
  drawTextCentered(ctx, 'РЫЦАРЬ', W, 23, '#f2c14e', 4);
  drawTextCentered(ctx, 'ТЁМНЫЙ ЛЕС', W, 58, '#8d99ae', 1);

  // Пункты меню
  const startY = 84;
  for (let i = 0; i < MAIN_MENU.length; i++) {
    const label = MAIN_MENU[i];
    const w = textWidth(label, 1);
    const x = Math.round((W - w) / 2);
    const y = startY + i * 16;
    const active = i === selected;
    drawText(ctx, label, x, y, active ? '#ffffff' : '#6c7a8d', 1);
    if (active) drawPointer(ctx, x - 12, y + 2, time);
  }

  drawTextCentered(ctx, 'СТРЕЛКИ - ВЫБОР, ВВОД - ОК', W, H - 16, '#4a5568', 1);
  drawFrame(ctx);
}

// ---------- ВЫБОР УРОВНЯ ----------
export function drawLevelSelect(ctx, selected, time) {
  drawTextCentered(ctx, 'ВЫБОР УРОВНЯ', W, 20, '#f2c14e', 2);

  const startY = 60;
  for (let i = 0; i < LEVELS.length; i++) {
    const lvl = LEVELS[i];
    const label = `${i + 1}. ${lvl.name}`;
    const w = textWidth(label, 1);
    const x = Math.round((W - w) / 2);
    const y = startY + i * 20;
    const active = i === selected;

    let color = '#3f4a5a';               // закрытый уровень — тусклый
    if (lvl.unlocked) color = active ? '#ffffff' : '#8d99ae';
    drawText(ctx, label, x, y, color, 1);

    if (active) drawPointer(ctx, x - 12, y + 2, time);
    if (!lvl.unlocked) {
      // Замочек справа от названия
      const lx = x + w + 5;
      ctx.fillStyle = '#6c7a8d';
      ctx.fillRect(lx, y + 3, 5, 4);
      ctx.fillRect(lx + 1, y, 3, 1);
      ctx.fillRect(lx, y + 1, 1, 2);
      ctx.fillRect(lx + 4, y + 1, 1, 2);
    }
  }

  drawTextCentered(ctx, 'ОТКРЫТ ТОЛЬКО ПЕРВЫЙ УРОВЕНЬ', W, H - 30, '#4a5568', 1);
  drawTextCentered(ctx, 'ESC - НАЗАД', W, H - 16, '#4a5568', 1);
  drawFrame(ctx);
}

// Пиксельные стрелки 5x5, нарисованные по клеточкам
const ARROWS = {
  left: ['..X..', '.X...', 'XXXXX', '.X...', '..X..'],
  right: ['..X..', '...X.', 'XXXXX', '...X.', '..X..'],
  up: ['..X..', '.XXX.', 'X.X.X', '..X..', '..X..'],
  down: ['..X..', '..X..', 'X.X.X', '.XXX.', '..X..'],
};

function drawArrow(ctx, x, y, dir, color = '#f2c14e') {
  ctx.fillStyle = color;
  const m = ARROWS[dir];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (m[row][col] === 'X') ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}

// Клавиша в рамочке — чтобы было видно, что это кнопка
function drawKey(ctx, label, x, y) {
  const w = textWidth(label, 1) + 6;
  ctx.fillStyle = '#2a3546';
  ctx.fillRect(x, y - 2, w, 11);
  ctx.fillStyle = '#4a5568';
  ctx.fillRect(x, y - 2, w, 1);
  ctx.fillRect(x, y + 8, w, 1);
  drawText(ctx, label, x + 3, y + 1, '#e8f1f5', 1);
  return w;
}

// ---------- УПРАВЛЕНИЕ ----------
export function drawControls(ctx) {
  drawTextCentered(ctx, 'УПРАВЛЕНИЕ', W, 12, '#f2c14e', 2);

  let y = 38;
  const step = 15;
  const keyX = 26;      // колонка с клавишами
  const textX = 108;    // колонка с описанием

  // Бег: стрелки влево-вправо
  drawArrow(ctx, keyX + 6, y + 3, 'left');
  drawArrow(ctx, keyX + 16, y + 3, 'right');
  drawText(ctx, 'БЕГ ВЛЕВО И ВПРАВО', textX, y, '#c8d3e0', 1);
  y += step;

  // Лестницы: стрелки вверх-вниз
  drawArrow(ctx, keyX + 6, y + 3, 'up');
  drawArrow(ctx, keyX + 16, y + 3, 'down');
  drawText(ctx, 'ЛЕСТНИЦЫ И ЛИАНЫ', textX, y, '#c8d3e0', 1);
  y += step;

  drawKey(ctx, 'ПРОБЕЛ', keyX, y);
  drawText(ctx, 'ПРЫЖОК', textX, y + 1, '#c8d3e0', 1);
  y += step;

  drawKey(ctx, 'ПРОБЕЛ 2Х', keyX, y);
  drawText(ctx, 'ДВОЙНОЙ ПРЫЖОК', textX, y + 1, '#c8d3e0', 1);
  y += step;

  drawKey(ctx, 'X', keyX, y);
  drawText(ctx, 'УДАР МЕЧОМ', textX, y + 1, '#c8d3e0', 1);
  y += step;

  drawKey(ctx, 'N', keyX, y);
  drawText(ctx, 'БЫСТРО УБРАТЬ МУЗЫКУ', textX, y + 1, '#c8d3e0', 1);
  y += step;

  drawKey(ctx, 'M', keyX, y);
  drawText(ctx, 'УБРАТЬ ВЕСЬ ЗВУК', textX, y + 1, '#c8d3e0', 1);
  y += step;

  drawKey(ctx, 'ESC', keyX, y);
  drawText(ctx, 'ВЫЙТИ В МЕНЮ', textX, y + 1, '#c8d3e0', 1);

  drawTextCentered(ctx, 'ESC - НАЗАД', W, H - 14, '#4a5568', 1);
  drawFrame(ctx);
}

// ---------- ПАРАМЕТРЫ ----------
export function drawSettings(ctx, selected, muted, musicMuted, time) {
  drawTextCentered(ctx, 'ПАРАМЕТРЫ', W, 20, '#f2c14e', 2);

  const rows = [
    ['ЗВУК', muted ? 'ВЫКЛ' : 'ВКЛ'],
    ['МУЗЫКА', musicMuted ? 'ВЫКЛ' : 'ВКЛ'],
    ['НАЗАД', ''],
  ];

  const startY = 62;
  for (let i = 0; i < rows.length; i++) {
    const [label, value] = rows[i];
    const y = startY + i * 20;
    const active = i === selected;
    const color = active ? '#ffffff' : '#8d99ae';
    drawText(ctx, label, 90, y, color, 1);
    if (value) {
      drawText(ctx, value, 190, y, value === 'ВКЛ' ? '#7ec87e' : '#c86c6c', 1);
    }
    if (active) drawPointer(ctx, 78, y + 2, time);
  }

  drawTextCentered(ctx, 'ВВОД - ПЕРЕКЛЮЧИТЬ', W, H - 30, '#4a5568', 1);
  drawTextCentered(ctx, 'ESC - НАЗАД', W, H - 16, '#4a5568', 1);
  drawFrame(ctx);
}

// ---------- ЭКРАН СМЕРТИ ----------
// Показывается, когда кончились сердца или герой упал в пропасть.
// Главное — чтобы игрок ясно понял: он погиб, и это не мелькнуло мимо.
export function drawDeath(ctx, time, наЧекпоинте) {
  // Надпись пульсирует тревожным красным
  const pulse = 0.75 + 0.25 * Math.sin(time / 260);
  drawTextCentered(ctx, 'ТЫ ПОГИБ', W, 52, `rgba(214, 40, 40, ${pulse})`, 3);

  drawTextCentered(
    ctx,
    наЧекпоинте ? 'ВЕРНЁШЬСЯ К ПОСЛЕДНЕМУ ФЛАГУ' : 'НАЧНЁШЬ СНАЧАЛА',
    W, 96, '#8d99ae', 1,
  );

  if (time % 1200 < 800) {
    drawTextCentered(ctx, 'НАЖМИ ВВОД', W, 128, '#c8d3e0', 1);
  }
  drawTextCentered(ctx, 'ESC - В ГЛАВНОЕ МЕНЮ', W, H - 16, '#4a5568', 1);
  drawFrame(ctx);
}

// ---------- ПРОЩАНИЕ (пункт «Выход») ----------
export function drawQuit(ctx, coins) {
  drawTextCentered(ctx, 'СПАСИБО ЗА ИГРУ!', W, 60, '#f2c14e', 2);
  drawTextCentered(ctx, 'МОЖНО ЗАКРЫТЬ ВКЛАДКУ', W, 92, '#8d99ae', 1);
  if (coins > 0) {
    drawTextCentered(ctx, `СОБРАНО ЗОЛОТА: ${coins}`, W, 110, '#f2c14e', 1);
  }
  drawTextCentered(ctx, 'ВВОД - ВЕРНУТЬСЯ В МЕНЮ', W, H - 24, '#4a5568', 1);
  drawFrame(ctx);
}
