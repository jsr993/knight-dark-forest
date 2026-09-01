// ============================================================
// HUD — то, что рисуется ПОВЕРХ игры: сердца и собранное золото.
// ============================================================

import { CONFIG } from './config.js';

// Пиксельное сердечко 8x6: X — заливка, точка — пусто
const HEART = [
  '.XX..XX.',
  'XXXXXXXX',
  'XXXXXXXX',
  '.XXXXXX.',
  '..XXXX..',
  '...XX...',
];

// Пиксельные цифры 3x5 для счётчика монет
const DIGITS = [
  ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'], // 0
  ['..X', '..X', '..X', '..X', '..X'], // 1
  ['XXX', '..X', 'XXX', 'X..', 'XXX'], // 2
  ['XXX', '..X', 'XXX', '..X', 'XXX'], // 3
  ['X.X', 'X.X', 'XXX', '..X', '..X'], // 4
  ['XXX', 'X..', 'XXX', '..X', 'XXX'], // 5
  ['XXX', 'X..', 'XXX', 'X.X', 'XXX'], // 6
  ['XXX', '..X', '..X', '..X', '..X'], // 7
  ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'], // 8
  ['XXX', 'X.X', 'XXX', '..X', 'XXX'], // 9
];

function drawMatrix(ctx, matrix, x, y, color) {
  ctx.fillStyle = color;
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[row].length; col++) {
      if (matrix[row][col] === 'X') ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}

function drawHeart(ctx, x, y, full) {
  drawMatrix(ctx, HEART, x, y, full ? '#e63946' : '#3a3f52');
}

// Число пиксельными цифрами
function drawNumber(ctx, value, x, y, color) {
  const text = String(value);
  for (let i = 0; i < text.length; i++) {
    const d = DIGITS[Number(text[i])];
    if (d) drawMatrix(ctx, d, x + i * 4, y, color);
  }
}

export function drawHUD(ctx, player, muted) {
  // Сердца слева сверху
  for (let i = 0; i < CONFIG.PLAYER_HEARTS; i++) {
    drawHeart(ctx, 4 + i * 10, 4, i < player.hearts);
  }

  // Собранное золото справа сверху: монетка и число
  const x = CONFIG.SCREEN_W - 34;
  ctx.fillStyle = '#8a6a12';
  ctx.fillRect(x, 4, 6, 7);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(x + 1, 4, 4, 7);
  ctx.fillStyle = '#fff1b8';
  ctx.fillRect(x + 2, 5, 2, 2);
  drawNumber(ctx, player.coins, x + 9, 5, '#f2c14e');

  // Значок «звук выключен» (клавиша M) — перечёркнутый динамик
  if (muted) {
    const mx = CONFIG.SCREEN_W - 12;
    const my = CONFIG.SCREEN_H - 11;
    ctx.fillStyle = '#8d99ae';
    ctx.fillRect(mx, my + 2, 2, 3);
    ctx.fillRect(mx + 2, my, 3, 7);
    ctx.fillStyle = '#e63946';
    for (let i = 0; i < 7; i++) ctx.fillRect(mx + i, my + i, 1, 1); // косая черта
  }
}
