// ============================================================
// HUD — то, что рисуется ПОВЕРХ игры: сердца здоровья.
// На этапе 3-4 добавятся монеты, кинжалы и счёт.
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

function drawHeart(ctx, x, y, full) {
  ctx.fillStyle = full ? '#e63946' : '#3a3f52'; // полное или потерянное
  for (let row = 0; row < HEART.length; row++) {
    for (let col = 0; col < HEART[row].length; col++) {
      if (HEART[row][col] === 'X') ctx.fillRect(x + col, y + row, 1, 1);
    }
  }
}

export function drawHUD(ctx, player) {
  // Сердца слева сверху
  for (let i = 0; i < CONFIG.PLAYER_HEARTS; i++) {
    drawHeart(ctx, 4 + i * 10, 4, i < player.hearts);
  }
}
