// ============================================================
// ВРАГИ.
// "Тёмный рыцарь": патрулирует платформу, заметив героя — идёт
// на него. Вблизи приседает (замах!) и делает ускоренный рывок.
// Если герой стоит выше — подпрыгивает к нему.
// Красные глаза светятся и пульсируют.
// На этапе 3 сюда добавятся лучник и летучая мышь.
// ============================================================

import { CONFIG } from '../config.js';
import {
  drawSprite,
  DARK_IDLE,
  DARK_JUMP,
  DARK_CROUCH,
  DARK_WALK_CYCLE,
  GHOST_FRAMES,
} from '../sprites.js';

const T = CONFIG.TILE;

export class Enemy {
  constructor(x, y) {
    this.w = 12;
    this.h = 20;
    // Точка появления: сюда враг вернётся, когда герой погибнет
    this.spawnX = x;
    this.spawnY = y;
    this.reset();
  }

  // Вернуть врага в исходное состояние (вызывается при смерти героя)
  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vy = 0;
    this.dir = -1;           // куда идём: 1 вправо, -1 влево
    this.onGround = false;
    this.hp = CONFIG.ENEMY_HP;
    this.flash = 0;          // белая вспышка после ранения (сек)
    this.knock = 0;          // скорость отброса от удара мечом
    this.dying = 0;          // таймер анимации смерти
    this.dead = false;       // враг убит и убран из игры
    this.lastHitSwing = -1;  // каким по счёту махом меча нас уже задели
    this.chasing = false;    // видит ли героя прямо сейчас
    this.state = 'walk';     // walk | crouch (замах) | lunge (рывок)
    this.stateTimer = 0;     // сколько осталось текущему состоянию
    this.attackCd = 0;       // отдых до следующей атаки/прыжка
    this.animTime = 0;       // таймер анимации ходьбы
  }

  update(dt, level, player) {
    if (this.dead) return;

    // Анимация смерти: мигаем и сплющиваемся, потом исчезаем
    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) this.dead = true;
      return;
    }
    if (this.flash > 0) this.flash -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;

    // ---------- МОЗГИ ----------
    const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
    const dy = (player.y + player.h) - (this.y + this.h);
    // Видим героя: недалеко по горизонтали и не слишком выше/ниже нас
    this.chasing = Math.abs(dx) < CONFIG.ENEMY_SIGHT && Math.abs(dy) < 56;

    let speed = 0;

    if (this.state === 'crouch') {
      // Присед-замах: стоим и "заряжаемся" (у героя есть время увернуться)
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'lunge';
        this.stateTimer = CONFIG.ENEMY_LUNGE_TIME;
        this.dir = dx > 0 ? 1 : -1; // бросаемся туда, где герой СЕЙЧАС
      }
    } else if (this.state === 'lunge') {
      // Ускоренный бросок вперёд
      this.stateTimer -= dt;
      speed = CONFIG.ENEMY_LUNGE_SPEED;
      if (this.stateTimer <= 0) {
        this.state = 'walk';
        this.attackCd = CONFIG.ENEMY_ATTACK_COOLDOWN;
      }
    } else {
      // Обычная ходьба: патруль или погоня
      speed = CONFIG.ENEMY_PATROL_SPEED;
      if (this.chasing) {
        this.dir = dx > 0 ? 1 : -1;
        speed = CONFIG.ENEMY_CHASE_SPEED;

        if (this.attackCd <= 0 && this.onGround) {
          if (Math.abs(dy) < 10 && Math.abs(dx) < CONFIG.ENEMY_ATTACK_RANGE) {
            // Герой рядом на нашей высоте: присесть и готовить рывок
            this.state = 'crouch';
            this.stateTimer = CONFIG.ENEMY_CROUCH_TIME;
            speed = 0;
          } else if (dy < -24 && Math.abs(dx) < 90) {
            // Герой стоит выше: подпрыгиваем к нему
            this.vy = -CONFIG.ENEMY_JUMP_SPEED;
            this.attackCd = 1.0;
          }
        }
      }
    }

    // ---------- НЕ ШАГАЕМ С ОБРЫВА ----------
    if (this.onGround && speed > 0) {
      const aheadX = this.dir > 0 ? this.x + this.w + 1 : this.x - 1;
      const aheadCol = Math.floor(aheadX / T);
      const footRow = Math.floor((this.y + this.h + 1) / T);
      const groundAhead = level.isSolidAt(aheadCol, footRow) || level.isOneWayAt(aheadCol, footRow);
      if (!groundAhead) {
        if (this.state === 'lunge') {
          // Рывок обрывается у края — рыцарь не самоубийца
          this.state = 'walk';
          this.attackCd = CONFIG.ENEMY_ATTACK_COOLDOWN;
          speed = 0;
        } else if (this.chasing) {
          speed = 0; // стоим у края и ждём
        } else {
          this.dir *= -1; // на патруле — разворачиваемся
        }
      }
    }

    // ---------- ДВИЖЕНИЕ ----------
    const vx = this.dir * speed + this.knock;
    // Отдача от удара мечом постепенно затухает
    if (this.knock > 0) this.knock = Math.max(0, this.knock - 400 * dt);
    else if (this.knock < 0) this.knock = Math.min(0, this.knock + 400 * dt);

    this.vy += CONFIG.GRAVITY * dt;
    if (this.vy > CONFIG.FALL_MAX) this.vy = CONFIG.FALL_MAX;

    const hitWall = this.moveAndCollide(dt, level, vx);
    if (hitWall) {
      if (this.state === 'lunge') {
        this.state = 'walk';
        this.attackCd = CONFIG.ENEMY_ATTACK_COOLDOWN;
      } else if (!this.chasing) {
        this.dir *= -1; // упёрлись в стену на патруле
      }
    }

    // ---------- АНИМАЦИЯ ----------
    // При рывке ноги мелькают вдвое быстрее
    if (this.onGround && Math.abs(vx) > 10) {
      this.animTime += this.state === 'lunge' ? dt * 2 : dt;
    } else {
      this.animTime = 0;
    }

    // ---------- КАСАНИЕ ГЕРОЯ ----------
    const touching =
      this.x < player.x + player.w && this.x + this.w > player.x &&
      this.y < player.y + player.h && this.y + this.h > player.y;
    if (touching) player.hurt(this.x + this.w / 2);
  }

  // Удар мечом по врагу
  hurt(dmg, fromX) {
    if (this.dying > 0 || this.dead) return;
    this.hp -= dmg;
    this.flash = 0.12;
    // Удар сбивает замах и рывок
    this.state = 'walk';
    this.attackCd = Math.max(this.attackCd, 0.6);
    // отлетаем ОТ бьющего
    this.knock = (this.x + this.w / 2) < fromX ? -90 : 90;
    if (this.hp <= 0) this.dying = 0.35; // запускаем анимацию смерти
  }

  // Упрощённые коллизии с тайлами (как у героя). Возвращает true, если упёрлись в стену
  moveAndCollide(dt, level, vx) {
    let hitWall = false;

    // --- По горизонтали ---
    this.x += vx * dt;
    const top = Math.floor(this.y / T);
    const bottom = Math.floor((this.y + this.h - 0.01) / T);
    if (vx > 0) {
      const col = Math.floor((this.x + this.w) / T);
      for (let row = top; row <= bottom; row++) {
        if (level.isSolidAt(col, row)) { this.x = col * T - this.w; hitWall = true; break; }
      }
    } else if (vx < 0) {
      const col = Math.floor(this.x / T);
      for (let row = top; row <= bottom; row++) {
        if (level.isSolidAt(col, row)) { this.x = (col + 1) * T; hitWall = true; break; }
      }
    }

    // --- По вертикали ---
    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    this.onGround = false;
    const left = Math.floor(this.x / T);
    const right = Math.floor((this.x + this.w - 0.01) / T);
    if (this.vy > 0) {
      const row = Math.floor((this.y + this.h) / T);
      for (let col = left; col <= right; col++) {
        const solid = level.isSolidAt(col, row);
        const platform = level.isOneWayAt(col, row) && prevBottom <= row * T + 0.01;
        if (solid || platform) {
          this.y = row * T - this.h;
          this.vy = 0;
          this.onGround = true;
          break;
        }
      }
    } else if (this.vy < 0) {
      const row = Math.floor(this.y / T);
      for (let col = left; col <= right; col++) {
        if (level.isSolidAt(col, row)) { this.y = (row + 1) * T; this.vy = 0; break; }
      }
    }
    return hitWall;
  }

  draw(ctx, camera) {
    if (this.dead) return;
    const x = Math.round(this.x - camera.x);
    const y = Math.round(this.y - camera.y);

    // Смерть: мигаем через кадр и сплющиваемся вниз
    if (this.dying > 0) {
      if (Math.floor(this.dying * 20) % 2 === 0) return;
      const k = this.dying / 0.35;
      const h = Math.max(3, Math.round(this.h * k));
      ctx.fillStyle = '#3a4250';
      ctx.fillRect(x, y + this.h - h, this.w, h);
      return;
    }

    // Спрайт 16x24 чуть больше хитбокса 12x20
    const sx = x - 2;
    let sy = y - 4;

    // Выбираем кадр
    let frame = DARK_IDLE;
    let eyeRow = 4; // строка спрайта, где расположены глаза
    if (this.state === 'crouch') {
      frame = DARK_CROUCH;
      eyeRow = 9;
    } else if (!this.onGround) {
      frame = DARK_JUMP;
    } else if (this.animTime > 0) {
      const step = DARK_WALK_CYCLE[Math.floor(this.animTime / 0.11) % DARK_WALK_CYCLE.length];
      frame = step.frame;
      sy += step.dy;
    }

    // Вспышка при ранении — белый силуэт
    if (this.flash > 0) {
      ctx.fillStyle = '#f1f1f1';
      ctx.fillRect(x - 1, y - 3, this.w + 2, this.h + 3);
      return;
    }

    drawSprite(ctx, frame, sx, sy, this.dir < 0);

    this.drawSword(ctx, x, y, sx, sy);

    this.drawEyes(ctx, sx, sy, eyeRow);
  }

  // ---------- МЕЧ ВРАГА ----------
  // В покое держится вверх; в приседе заносится высоко над головой (замах);
  // во время рывка проходит сверху вниз — настоящий рубящий удар.
  drawSword(ctx, x, y, sx, sy) {
    const f = this.dir;
    const BLADE = '#6b7484';   // тёмная сталь
    const SHINE = '#98a2b3';   // блик
    const GUARD = '#8f1622';   // багровое перекрестье
    const GRIP = '#2a2f3a';    // рукоять

    if (this.state === 'lunge') {
      // Прогресс удара: 0 — меч ещё вверху, 1 — уже внизу
      const t = 1 - this.stateTimer / CONFIG.ENEMY_LUNGE_TIME;
      const shoulderX = f > 0 ? x + this.w : x;
      const shoulderY = y + 8;

      ctx.fillStyle = BLADE;
      if (t < 0.3) {
        // Фаза 1: клинок ещё занесён вверх-вперёд
        for (let i = 0; i < 5; i++) {
          const px = f > 0 ? shoulderX + i * 3 : shoulderX - i * 3 - 3;
          ctx.fillRect(px, shoulderY - 4 - i * 3, 3, 3);
        }
      } else if (t < 0.62) {
        // Фаза 2: рубит по горизонтали прямо перед собой
        const bx2 = f > 0 ? shoulderX : shoulderX - 16;
        ctx.fillRect(bx2, shoulderY, 16, 2);
        ctx.fillStyle = SHINE;
        ctx.fillRect(f > 0 ? bx2 + 14 : bx2, shoulderY - 1, 2, 4);
      } else {
        // Фаза 3: клинок ушёл вниз-вперёд
        for (let i = 0; i < 5; i++) {
          const px = f > 0 ? shoulderX + i * 3 : shoulderX - i * 3 - 3;
          ctx.fillRect(px, shoulderY + 4 + i * 3, 3, 3);
        }
      }
      // Рукоять у плеча
      ctx.fillStyle = GRIP;
      ctx.fillRect(f > 0 ? shoulderX - 1 : shoulderX - 2, shoulderY - 1, 3, 4);
      return;
    }

    // Замах в приседе: меч занесён высоко над головой
    if (this.state === 'crouch') {
      const bx = f > 0 ? sx + 12 : sx + 3;
      const top = sy - 4;
      ctx.fillStyle = GRIP;
      ctx.fillRect(bx, top + 15, 1, 3);
      ctx.fillStyle = GUARD;
      ctx.fillRect(bx - 1, top + 14, 3, 1);
      ctx.fillStyle = BLADE;
      ctx.fillRect(bx, top, 2, 14); // клинок толще — видно, что занесён
      ctx.fillStyle = SHINE;
      ctx.fillRect(bx, top, 2, 2);
      return;
    }

    // Обычная стойка: меч поднят вверх наизготовку
    const bx = f > 0 ? sx + 13 : sx + 2;
    ctx.fillStyle = GRIP;
    ctx.fillRect(bx, sy + 12, 1, 3);
    ctx.fillStyle = GUARD;
    ctx.fillRect(bx - 1, sy + 11, 3, 1);
    ctx.fillStyle = BLADE;
    ctx.fillRect(bx, sy - 2, 1, 13);
    ctx.fillStyle = SHINE;
    ctx.fillRect(bx, sy - 2, 1, 2);
  }

  drawEyes(ctx, sx, sy, eyeRow) {
    // ---------- СВЕЧЕНИЕ ГЛАЗ (тёмного рыцаря) ----------
    // Мягкий ореол вокруг каждого глаза: пульсирует сам по себе,
    // а перед рывком и в рывке разгорается ярче
    const pulse = 0.55 + 0.45 * Math.sin(performance.now() / 140);
    const angry = this.state === 'crouch' || this.state === 'lunge';
    // Глаза в спрайте стоят на колонках 6 и 8 (при зеркале — 7 и 9)
    const eyeCols = this.dir > 0 ? [6, 8] : [7, 9];
    const ey = sy + eyeRow;
    ctx.fillStyle = '#ff3131';
    for (const ec of eyeCols) {
      const ex = sx + ec;
      // широкое тусклое свечение
      ctx.globalAlpha = (angry ? 0.5 : 0.22) * pulse;
      ctx.fillRect(ex - 1, ey - 1, 3, 3);
      // яркая точка самого глаза
      ctx.globalAlpha = angry ? 1 : 0.55 + 0.35 * pulse;
      ctx.fillRect(ex, ey, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// ПРИВИДЕНИЕ.
// Прячется в карте, а когда герой подходит — с воем вылетает
// снизу вверх (метка 'G') или сверху вниз (метка 'V'),
// пролетая СКВОЗЬ стены и землю. Не ранит, но пугает:
// отшвыривает героя назад. Растаяв, через несколько секунд
// возвращается в засаду.
// ============================================================
export class Ghost {
  constructor(col, row, fromBelow) {
    this.w = 14;
    this.h = 18;
    this.fromBelow = fromBelow;   // true — вылетает снизу, false — падает сверху
    // Метка на карте = место, ГДЕ призрак пугает. Прячется он на полпути
    // ниже (или выше) этого места и пролетает точку метки в середине пути.
    this.homeX = col * T + (T - this.w) / 2;
    const half = CONFIG.GHOST_TRAVEL / 2;
    this.homeY = fromBelow ? row * T + half : row * T - half;
    this.reset();
  }

  reset() {
    this.x = this.homeX;
    this.y = this.homeY;
    this.state = 'hidden';  // hidden (в засаде) | fly (летит) | gone (растаял)
    this.timer = 0;         // отсчёт до возвращения в засаду
    this.travelled = 0;     // сколько уже пролетел
    this.alpha = 0;         // прозрачность (проявляется и тает)
    this.animTime = 0;
    this.dead = false;      // призрака нельзя убить, но поле нужно общему циклу
  }

  update(dt, level, player) {
    this.animTime += dt;

    if (this.state === 'hidden') {
      // Ждём, пока герой подойдёт по горизонтали
      const dx = Math.abs((player.x + player.w / 2) - (this.homeX + this.w / 2));
      if (dx < CONFIG.GHOST_TRIGGER) {
        this.state = 'fly';
        this.travelled = 0;
        this.alpha = 0;
      }
      return;
    }

    if (this.state === 'gone') {
      // Растаял — отдыхает и возвращается в засаду
      this.timer -= dt;
      if (this.timer <= 0) this.reset();
      return;
    }

    // ---------- ПОЛЁТ ----------
    const step = CONFIG.GHOST_SPEED * dt;
    this.y += this.fromBelow ? -step : step;
    this.travelled += step;
    // Покачивание из стороны в сторону — призрак «плывёт»
    this.x = this.homeX + Math.sin(this.travelled / 26) * CONFIG.GHOST_WOBBLE;

    // Проявляется в начале пути и тает в конце
    const progress = this.travelled / CONFIG.GHOST_TRAVEL;
    if (progress < 0.18) this.alpha = progress / 0.18;
    else if (progress > 0.72) this.alpha = Math.max(0, (1 - progress) / 0.28);
    else this.alpha = 1;

    if (this.travelled >= CONFIG.GHOST_TRAVEL) {
      this.state = 'gone';
      this.timer = CONFIG.GHOST_RESPAWN;
      return;
    }

    // ---------- ИСПУГ ----------
    // Пугает, только когда уже проявился
    if (this.alpha > 0.35) {
      const touching =
        this.x < player.x + player.w && this.x + this.w > player.x &&
        this.y < player.y + player.h && this.y + this.h > player.y;
      if (touching) player.scare();
    }
  }

  draw(ctx, camera) {
    if (this.state !== 'fly' || this.alpha <= 0) return;
    const x = Math.round(this.x - camera.x);
    const y = Math.round(this.y - camera.y);

    // Подол колышется: два кадра по очереди
    const frame = GHOST_FRAMES[Math.floor(this.animTime / 0.14) % GHOST_FRAMES.length];

    // Призрак полупрозрачный, со слабым холодным ореолом
    ctx.globalAlpha = this.alpha * 0.16;
    ctx.fillStyle = '#9fd8e8';
    ctx.fillRect(x - 2, y - 2, this.w + 4, this.h + 6);

    ctx.globalAlpha = this.alpha * 0.85;
    drawSprite(ctx, frame, x - 1, y - 2);
    ctx.globalAlpha = 1;
  }
}
