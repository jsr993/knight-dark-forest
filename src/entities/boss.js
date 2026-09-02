// ============================================================
// БОСС: ОГР-ПРИВРАТНИК.
// Громадный красный огр с тяжёлым молотом, который он держит
// ДВУМЯ РУКАМИ НАД ГОЛОВОЙ. Ходит и преследует героя как тёмные
// рыцари, но гораздо живучее: 10 HP вместо 2.
// Вблизи заносит молот и обрушивает его СВЕРХУ ВНИЗ.
// ============================================================

import { CONFIG } from '../config.js';
import { Sfx } from '../audio.js';
import {
  drawSprite,
  OGRE_IDLE,
  OGRE_RAISE,
  OGRE_SMASH,
  OGRE_WALK_CYCLE,
} from '../sprites.js';

const T = CONFIG.TILE;

// Смещение спрайта 32x40 относительно хитбокса
const SPRITE_W = 32;
const SPRITE_H = 40;

export class Boss {
  constructor(x, y) {
    this.w = CONFIG.BOSS_W;
    this.h = CONFIG.BOSS_H;
    this.spawnX = x;
    this.spawnY = y;
    this.reset();
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.vy = 0;
    this.dir = -1;
    this.onGround = false;
    this.hp = CONFIG.BOSS_HP;
    this.flash = 0;
    this.knock = 0;
    this.dying = 0;
    this.dead = false;
    this.lastHitSwing = -1;
    this.chasing = false;
    this.state = 'walk';   // walk | raise (замах) | smash (удар) | recover
    this.stateTimer = 0;
    this.attackCd = 0;
    this.animTime = 0;
    this.hitThisSmash = false; // молот бьёт героя один раз за удар
  }

  update(dt, level, player) {
    if (this.dead) return;

    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0) this.dead = true;
      return;
    }
    if (this.flash > 0) this.flash -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;

    const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
    const dy = (player.y + player.h) - (this.y + this.h);
    this.chasing = Math.abs(dx) < CONFIG.BOSS_SIGHT && Math.abs(dy) < 60;

    let speed = 0;

    if (this.state === 'raise') {
      // Замах: молот занесён над головой, огр стоит
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'smash';
        this.stateTimer = CONFIG.BOSS_SMASH_TIME;
        this.hitThisSmash = false;
        this.smashLanded = false;
        this.dir = dx > 0 ? 1 : -1; // бьёт туда, где герой
      }
    } else if (this.state === 'smash') {
      // Молот падает сверху вниз
      this.stateTimer -= dt;
      // Грохот в момент, когда молот врезался в землю
      if (!this.smashLanded && this.swingProgress() >= 1.9) {
        this.smashLanded = true;
        Sfx.bossSmash();
      }
      if (this.stateTimer <= 0) {
        this.state = 'recover';
        this.stateTimer = CONFIG.BOSS_RECOVER_TIME;
      }
    } else if (this.state === 'recover') {
      // Отдышка: молот тяжёлый, его надо снова поднять
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.state = 'walk';
        this.attackCd = CONFIG.BOSS_ATTACK_COOLDOWN;
      }
    } else {
      // Ходьба: патруль или погоня
      speed = CONFIG.BOSS_PATROL_SPEED;
      if (this.chasing) {
        this.dir = dx > 0 ? 1 : -1;
        speed = CONFIG.BOSS_CHASE_SPEED;
        if (this.attackCd <= 0 && this.onGround &&
            Math.abs(dy) < 20 && Math.abs(dx) < CONFIG.BOSS_ATTACK_RANGE) {
          this.state = 'raise';
          this.stateTimer = CONFIG.BOSS_RAISE_TIME;
          speed = 0;
          Sfx.bossRoar(); // рёв перед ударом
        }
      }
    }

    // Не сходит с обрыва
    if (this.onGround && speed > 0) {
      const aheadX = this.dir > 0 ? this.x + this.w + 1 : this.x - 1;
      const aheadCol = Math.floor(aheadX / T);
      const footRow = Math.floor((this.y + this.h + 1) / T);
      const groundAhead = level.isSolidAt(aheadCol, footRow) || level.isOneWayAt(aheadCol, footRow);
      if (!groundAhead) {
        if (this.chasing) speed = 0;
        else this.dir *= -1;
      }
    }

    const vx = this.dir * speed + this.knock;
    if (this.knock > 0) this.knock = Math.max(0, this.knock - 500 * dt);
    else if (this.knock < 0) this.knock = Math.min(0, this.knock + 500 * dt);

    this.vy += CONFIG.GRAVITY * dt;
    if (this.vy > CONFIG.FALL_MAX) this.vy = CONFIG.FALL_MAX;

    const hitWall = this.moveAndCollide(dt, level, vx);
    if (hitWall && !this.chasing) this.dir *= -1;

    this.animTime = (this.onGround && Math.abs(vx) > 8) ? this.animTime + dt : 0;

    // ---------- УРОН ГЕРОЮ ----------
    // 1) Молот в фазе удара
    const hammer = this.hammerHitbox();
    if (hammer && !this.hitThisSmash && overlaps(hammer, player)) {
      this.hitThisSmash = true;
      player.hurt(this.x + this.w / 2);
    }
    // 2) Врезался в героя тушей — но только пока идёт или замахивается.
    // Пока он вытаскивает молот из земли (recover), тушей он не бьёт:
    // это честное окно, чтобы подойти вплотную и рубить его самому.
    if (this.state !== 'recover' && overlaps(this, player)) {
      player.hurt(this.x + this.w / 2);
    }
  }

  // Зона удара молота (только когда он уже обрушился вниз)
  hammerHitbox() {
    if (this.state !== 'smash') return null;
    if (this.swingProgress() < 1.45) return null; // молот ещё летит вниз
    const reach = CONFIG.BOSS_HAMMER_REACH;
    return {
      x: this.dir > 0 ? this.x + this.w - 4 : this.x - reach + 4,
      y: this.y + this.h - 22,
      w: reach,
      h: 22,
    };
  }

  hurt(dmg, fromX) {
    if (this.dying > 0 || this.dead) return;
    this.hp -= dmg;
    this.flash = 0.12;
    // Тяжёлого огра почти не сдвинуть
    this.knock = (this.x + this.w / 2) < fromX ? -30 : 30;
    if (this.hp <= 0) {
      this.dying = 1.1;  // долгая, зрелищная смерть
      Sfx.bossRoar();    // предсмертный рёв
    } else {
      Sfx.ogreHurt();    // рычит от боли
    }
  }

  moveAndCollide(dt, level, vx) {
    let hitWall = false;
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

    // Смерть: мигает и оседает
    if (this.dying > 0) {
      if (Math.floor(this.dying * 14) % 2 === 0) return;
    }

    // Спрайт 32x40 шире хитбокса — центрируем по нему
    const sx = x - Math.round((SPRITE_W - this.w) / 2);
    let sy = y - (SPRITE_H - this.h);

    let frame = OGRE_IDLE;
    if (this.animTime > 0) {
      const step = OGRE_WALK_CYCLE[Math.floor(this.animTime / 0.16) % OGRE_WALK_CYCLE.length];
      frame = step.frame;
      sy += step.dy;
    }
    // Тело следует за молотом: занёс — руки вверх, обрушил — руки вниз вперёд
    const swing = this.swingProgress();
    if (this.state === 'raise' || (this.state === 'recover' && swing > 1.2)) {
      if (swing > 0.45) frame = OGRE_RAISE;
    } else if (this.state === 'smash') {
      if (swing > 1.4) {
        frame = OGRE_SMASH; // руки ушли вниз за молотом
        sy += 2;            // приседает от усилия
      } else {
        frame = OGRE_RAISE; // молот ещё вверху
      }
    }

    // Пока молот за спиной и над головой — рисуем его ЗА огром,
    // иначе рукоять перечеркнула бы туловище и лицо.
    // Как только он пошёл рубить вперёд — выносим на передний план.
    if (swing < 1.15) this.drawHammer(ctx, sx, sy, swing);

    if (this.flash > 0) {
      // Вспышка от попадания — белый силуэт
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#fff1f1';
      ctx.fillRect(sx + 4, sy + 8, SPRITE_W - 8, SPRITE_H - 8);
      ctx.globalAlpha = 1;
    } else {
      drawSprite(ctx, frame, sx, sy, this.dir < 0);
    }

    if (swing >= 1.15) this.drawHammer(ctx, sx, sy, swing);

    this.drawHealthBar(ctx);
  }

  // Положение молота: 0 — опущен вниз (обычная стойка),
  // 1 — занесён над головой, 2 — врезался в землю перед собой.
  // Огр бьёт как рыцарь: снизу поднял -> обрушил.
  swingProgress() {
    if (this.state === 'raise') {
      // Заносит молот снизу вверх
      const t = 1 - this.stateTimer / CONFIG.BOSS_RAISE_TIME;
      return Math.min(1, t * 1.3);
    }
    if (this.state === 'smash') {
      // Обрушивает сверху вниз
      const t = 1 - this.stateTimer / CONFIG.BOSS_SMASH_TIME;
      return 1 + Math.min(1, t / 0.5);
    }
    if (this.state === 'recover') {
      // Вытягивает молот из земли обратно в стойку
      return 2 - 2 * (1 - this.stateTimer / CONFIG.BOSS_RECOVER_TIME);
    }
    return 0; // покой: молот опущен
  }

  // ---------- МОЛОТ ----------
  // Держится ДВУМЯ РУКАМИ НАД ГОЛОВОЙ и обрушивается сверху вниз.
  drawHammer(ctx, sx, sy, swing) {
    const f = this.dir;
    // Кулаки в спрайте — вверху по бокам; рукоять идёт между ними
    const gripX = sx + SPRITE_W / 2;

    // Дуга молота вокруг корпуса огра:
    //   swing 0 — опущен вниз-назад (стойка), 1 — занесён над головой,
    //   2 — врезался в землю перед собой.
    const REST = (118 * Math.PI) / 180;   // вниз и чуть назад, вдоль ноги
    const OVERHEAD = -Math.PI / 2;        // прямо над головой
    const GROUND = (58 * Math.PI) / 180;  // в землю перед собой
    let angle;
    if (swing <= 1) {
      // Поднимает: идёт назад-вверх через спину
      angle = REST + swing * (OVERHEAD - REST);
    } else {
      // Рубит: сверху вперёд-вниз
      angle = OVERHEAD + (swing - 1) * (GROUND - OVERHEAD);
    }
    const len = 30;
    const pivotX = gripX;
    const pivotY = sy + 20;              // корпус — вокруг него ходит молот
    const hx = pivotX + Math.cos(angle) * len * f;
    const hy = pivotY + Math.sin(angle) * len;

    // Рукоять: тёмное дерево от рук к головке
    ctx.strokeStyle = '#5a4028';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(hx, hy);
    ctx.stroke();
    ctx.strokeStyle = '#3a2818';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Головка молота: тяжёлый железный брусок с ободами
    const bw = 18, bh = 13;
    const bx = Math.round(hx - bw / 2);
    const by = Math.round(hy - bh / 2);
    ctx.fillStyle = '#6b7280';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#8b95a3'; // блик сверху
    ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = '#454b55'; // тень снизу
    ctx.fillRect(bx, by + bh - 3, bw, 3);
    ctx.fillStyle = '#3a3f47'; // ободы
    ctx.fillRect(bx + 4, by, 2, bh);
    ctx.fillRect(bx + bw - 6, by, 2, bh);

    // Удар о землю: пыль и трещины
    if (this.state === 'smash' && swing >= 2) {
      ctx.fillStyle = '#8a7b63';
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 5; i++) {
        const px = bx + (i - 2) * 7;
        ctx.fillRect(px, by + bh - 2, 4, 2);
        ctx.fillRect(px + 1, by + bh - 6, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  // Полоса здоровья босса вверху экрана
  drawHealthBar(ctx) {
    if (!this.chasing && this.hp === CONFIG.BOSS_HP) return; // до боя не показываем
    const w = 120;
    const x = Math.round((CONFIG.SCREEN_W - w) / 2);
    const y = 8;
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(x - 2, y - 2, w + 4, 9);
    ctx.fillStyle = '#4a1015';
    ctx.fillRect(x, y, w, 5);
    const filled = Math.max(0, Math.round((this.hp / CONFIG.BOSS_HP) * w));
    ctx.fillStyle = '#d62828';
    ctx.fillRect(x, y, filled, 5);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(x, y, filled, 1);
  }
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
