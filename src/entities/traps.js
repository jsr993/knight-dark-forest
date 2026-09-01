// ============================================================
// ЛОВУШКИ И ПОДВИЖНЫЕ ОБЪЕКТЫ УРОВНЯ.
// Пока здесь только движущиеся платформы.
// Позже добавятся шипы и падающие камни (этап 4).
// ============================================================

import { CONFIG } from '../config.js';

const T = CONFIG.TILE;

// Движущаяся платформа. axis: 'x' — ездит влево-вправо, 'y' — вверх-вниз (лифт).
// Катается туда-сюда от точки старта на PLATFORM_H_RANGE / PLATFORM_V_RANGE тайлов.
export class MovingPlatform {
  constructor(col, row, axis) {
    this.w = T * 2; // платформа шириной в 2 тайла
    this.h = 6;
    this.x = col * T;
    this.y = row * T;
    this.axis = axis;
    this.dir = 1; // 1 или -1 — куда едем сейчас

    const range = (axis === 'x' ? CONFIG.PLATFORM_H_RANGE : CONFIG.PLATFORM_V_RANGE) * T;
    if (axis === 'x') {
      this.min = this.x - range;
      this.max = this.x + range;
    } else {
      this.min = this.y - range;
      this.max = this.y + range;
    }

    // Смещение за последний кадр — столько же проедет стоящий на платформе герой
    this.dx = 0;
    this.dy = 0;
    this.prevTop = this.y;
  }

  update(dt) {
    this.prevTop = this.y;
    const move = CONFIG.PLATFORM_SPEED * this.dir * dt;

    if (this.axis === 'x') {
      const prevX = this.x;
      this.x += move;
      // Доехали до края маршрута — разворачиваемся
      if (this.x >= this.max) { this.x = this.max; this.dir = -1; }
      if (this.x <= this.min) { this.x = this.min; this.dir = 1; }
      this.dx = this.x - prevX;
      this.dy = 0;
    } else {
      const prevY = this.y;
      this.y += move;
      if (this.y >= this.max) { this.y = this.max; this.dir = -1; }
      if (this.y <= this.min) { this.y = this.min; this.dir = 1; }
      this.dy = this.y - prevY;
      this.dx = 0;
    }
  }

  draw(ctx, camera) {
    const x = Math.round(this.x - camera.x);
    const y = Math.round(this.y - camera.y);
    // Дощатая платформа с металлической окантовкой, чтобы отличалась от статичных
    ctx.fillStyle = '#b07d4f';
    ctx.fillRect(x, y, this.w, 4);
    ctx.fillStyle = '#7c4a2d';
    ctx.fillRect(x, y + 4, this.w, 2);
    ctx.fillStyle = '#8d99ae';
    ctx.fillRect(x, y, 3, this.h);
    ctx.fillRect(x + this.w - 3, y, 3, this.h);
  }
}
