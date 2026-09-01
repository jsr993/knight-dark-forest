// ============================================================
// КАМЕРА.
// На этапе 1 — плавно следует за героем и не выходит за края уровня.
// На этапе 2 добавим опережение взгляда и запрет отката назад.
// ============================================================

import { CONFIG } from './config.js';

export class Camera {
  constructor(level) {
    this.x = 0;
    this.y = 0;
    // За эти пределы камера не выходит
    this.maxX = Math.max(0, level.pixelW - CONFIG.SCREEN_W);
    this.maxY = Math.max(0, level.pixelH - CONFIG.SCREEN_H);
  }

  update(target, dt) {
    // Хотим видеть героя в центре экрана
    const wantX = target.x + target.w / 2 - CONFIG.SCREEN_W / 2;
    const wantY = target.y + target.h / 2 - CONFIG.SCREEN_H / 2;

    // Плавно догоняем цель
    const k = Math.min(1, CONFIG.CAMERA_SPEED * dt);
    this.x += (wantX - this.x) * k;
    this.y += (wantY - this.y) * k;

    // Не выходим за края уровня
    if (this.x < 0) this.x = 0;
    if (this.x > this.maxX) this.x = this.maxX;
    if (this.y < 0) this.y = 0;
    if (this.y > this.maxY) this.y = this.maxY;
  }
}
