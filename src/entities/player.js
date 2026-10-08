// ============================================================
// ГЕРОЙ-РЫЦАРЬ.
// На этапе 1 — прямоугольник, но с "правильной" физикой:
// разгон/торможение, прыжок с переменной высотой, двойной прыжок,
// coyote time, jump buffering, лазание по лианам,
// езда на движущихся платформах.
// ============================================================

import { CONFIG } from '../config.js';
import { Input } from '../input.js';
import { Sfx } from '../audio.js';
import {
  drawSprite,
  KNIGHT_IDLE,
  KNIGHT_JUMP,
  KNIGHT_SIT,
  KNIGHT_WALK_CYCLE,
} from '../sprites.js';

const T = CONFIG.TILE;

export class Player {
  constructor(x, y) {
    this.w = CONFIG.PLAYER_W;
    this.h = CONFIG.PLAYER_H;
    this.spawnX = x;
    this.spawnY = y;
    this.respawn();
  }

  // Возродиться. Если герой добежал до чекпоинта, появляется там,
  // а не в самом начале уровня
  respawn() {
    this.x = this.checkpointX !== undefined ? this.checkpointX : this.spawnX;
    this.y = this.checkpointY !== undefined ? this.checkpointY : this.spawnY;
    this.dead = false;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;          // 1 = вправо, -1 = влево
    this.coyote = 0;          // кадры "времени койота"
    this.jumpBuffer = 0;      // кадры буфера прыжка
    this.jumpHeld = false;    // прыжок начат и кнопка ещё держится
    this.airJumpsLeft = CONFIG.AIR_JUMPS; // сколько прыжков в воздухе осталось
    this.climbing = false;    // лезем по лиане?
    this.riding = null;       // движущаяся платформа, на которой стоим
    // --- Бой ---
    this.hearts = CONFIG.PLAYER_HEARTS; // здоровье
    this.coins = this.coins || 0; // собранное золото не пропадает при возрождении
    this.attackTimer = 0;     // идёт мах мечом (сек, убывает)
    this.attackCooldown = 0;  // пауза до следующего удара
    this.swingId = 0;         // номер маха (чтобы один мах бил врага один раз)
    this.invuln = CONFIG.HURT_INVULN; // неуязвимость (и короткая защита после возрождения)
    this.stun = 0;            // потеря управления после урона
    this.hidden = false;      // герой не рисуется
    this.sitting = false;     // сидит у костра (сценка привала)
    this.animTime = 0;        // таймер анимации ходьбы
    // dead сбрасывается выше: герой снова жив
  }

  update(dt, level, platforms) {
    // ---------- БОЕВЫЕ ТАЙМЕРЫ ----------
    if (this.attackTimer > 0) this.attackTimer -= dt;
    if (this.attackCooldown > 0) this.attackCooldown -= dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.stun > 0) this.stun -= dt;

    // ---------- ЕДЕМ ВМЕСТЕ С ПЛАТФОРМОЙ ----------
    // Если в прошлом кадре стояли на платформе — сдвигаемся вместе с ней
    if (this.riding) {
      this.x += this.riding.dx;
      this.y = this.riding.y - this.h;
    }

    // ---------- ЛИАНА: ВХОД И ВЫХОД ----------
    const onVine = level.overlapsVine(this);
    if (!this.climbing && onVine) {
      // Хватаемся: "вверх" в любой момент, "вниз" — только в воздухе
      if (Input.isDown('up') || (Input.isDown('down') && !this.onGround)) {
        this.climbing = true;
        this.riding = null;
        this.vx = 0;
        this.vy = 0;
        this.airJumpsLeft = CONFIG.AIR_JUMPS; // лиана освежает двойной прыжок
        // Прилипаем к стеблю по центру колонки
        const col = Math.floor((this.x + this.w / 2) / T);
        this.x = col * T + (T - this.w) / 2;
      }
    }
    if (this.climbing && !onVine) this.climbing = false; // долезли до конца

    if (this.climbing) {
      this.updateClimbing(dt, level);
      return;
    }

    // ---------- УДАР МЕЧОМ ----------
    if (Input.wasPressed('attack') && this.attackCooldown <= 0 && this.stun <= 0) {
      this.attackTimer = CONFIG.ATTACK_TIME;
      this.attackCooldown = CONFIG.ATTACK_COOLDOWN;
      this.swingId++; // новый мах — можно снова задеть каждого врага
      Sfx.sword();
    }

    // ---------- ВОДА ----------
    // В воде тянет вниз слабее, плывём медленнее, а прыжок становится гребком
    this.inWater = level.overlapsWater(this);

    // ---------- ГОРИЗОНТАЛЬНОЕ ДВИЖЕНИЕ ----------
    // Пока герой оглушён после урона, управление не работает — его откидывает
    const dir = this.stun > 0 ? 0
      : (Input.isDown('right') ? 1 : 0) - (Input.isDown('left') ? 1 : 0);
    const accel = this.onGround ? CONFIG.RUN_ACCEL : CONFIG.AIR_ACCEL;
    const decel = this.onGround ? CONFIG.RUN_DECEL : CONFIG.AIR_DECEL;
    const runMax = this.inWater ? CONFIG.RUN_MAX * CONFIG.WATER_SPEED : CONFIG.RUN_MAX;

    if (dir !== 0) {
      this.facing = dir;
      this.vx += dir * accel * dt;
      // не разгоняемся выше максимума (в воде он ниже)
      if (this.vx > runMax) this.vx = runMax;
      if (this.vx < -runMax) this.vx = -runMax;
    } else {
      // кнопки отпущены — плавно тормозим до нуля
      const brake = decel * dt;
      if (this.vx > brake) this.vx -= brake;
      else if (this.vx < -brake) this.vx += brake;
      else this.vx = 0;
    }

    // ---------- ПРЫЖОК ----------
    // Буфер: нажатие запоминается на несколько кадров
    if (Input.wasPressed('jump')) this.jumpBuffer = CONFIG.BUFFER_FRAMES;
    else if (this.jumpBuffer > 0) this.jumpBuffer--;

    // Койот: несколько кадров после схода с края ещё "стоим на земле"
    if (this.onGround) this.coyote = CONFIG.COYOTE_FRAMES;
    else if (this.coyote > 0) this.coyote--;

    if (this.inWater && this.jumpBuffer > 0 && this.stun <= 0) {
      // В воде прыжок превращается в гребок — можно грести сколько угодно
      this.vy = -CONFIG.SWIM_STROKE;
      this.jumpBuffer = 0;
      this.jumpHeld = false;
      this.riding = null;
      Sfx.splash();
    } else if (this.jumpBuffer > 0 && this.stun <= 0) {
      if (this.coyote > 0) {
        // Обычный прыжок с земли (или с платформы)
        this.vy = -CONFIG.JUMP_SPEED;
        this.jumpBuffer = 0;
        this.coyote = 0;
        this.jumpHeld = true;
        this.riding = null;
        Sfx.jump();
      } else if (this.airJumpsLeft > 0) {
        // ДВОЙНОЙ ПРЫЖОК: ещё один рывок вверх прямо в воздухе
        this.vy = -CONFIG.AIR_JUMP_SPEED;
        this.airJumpsLeft--;
        this.jumpBuffer = 0;
        this.jumpHeld = true;
        Sfx.doubleJump();
      }
    }

    // Переменная высота: отпустил кнопку рано — прыжок "обрезается"
    if (this.jumpHeld && this.vy < 0 && !Input.isDown('jump')) {
      this.vy *= CONFIG.JUMP_CUT;
      this.jumpHeld = false;
    }
    if (this.vy >= 0) this.jumpHeld = false;

    // ---------- ГРАВИТАЦИЯ ----------
    // В воде тянет заметно слабее и погружаешься медленно
    const gravity = this.inWater ? CONFIG.GRAVITY * CONFIG.WATER_GRAVITY : CONFIG.GRAVITY;
    const fallMax = this.inWater ? CONFIG.WATER_FALL_MAX : CONFIG.FALL_MAX;
    this.vy += gravity * dt;
    if (this.vy > fallMax) this.vy = fallMax;

    // ---------- ДВИЖЕНИЕ С КОЛЛИЗИЯМИ ----------
    this.moveAndCollide(dt, level, platforms);

    // ---------- ЛАВА ОБЖИГАЕТ ----------
    if (level.overlapsLava(this)) {
      const wasInvuln = this.invuln > 0;
      const fromX = this.x + this.w / 2 + this.facing * 8; // отбрасывает назад
      this.hurt(fromX);
      if (this.stun > 0) this.vy = -CONFIG.LAVA_DAMAGE_KNOCK * 0.6; // выбрасывает вверх
      if (!wasInvuln) Sfx.burn();
    }

    // ---------- ВСПЛЕСК ПРИ ВХОДЕ В ВОДУ ----------
    if (this.inWater && !this.wasInWater) Sfx.splash();
    this.wasInWater = this.inWater;

    // На земле и в воде запас воздушных прыжков восстанавливается
    if (this.onGround || this.inWater) this.airJumpsLeft = CONFIG.AIR_JUMPS;

    // ---------- АНИМАЦИЯ ХОДЬБЫ ----------
    // Таймер идёт, только когда бежим по земле; иначе сбрасывается
    if (this.onGround && Math.abs(this.vx) > 10) this.animTime += dt;
    else this.animTime = 0;

    // ---------- ПАДЕНИЕ В ПРОПАСТЬ ----------
    if (this.y > level.pixelH + CONFIG.FALL_DEATH_MARGIN && !this.dead) {
      // Падение в пропасть убивает сразу, независимо от сердец
      this.hearts = 0;
      this.dead = true;
      Sfx.playerDeath();
    }
  }

  // Враг коснулся героя (fromX — центр врага, от него отлетаем)
  hurt(fromX) {
    if (this.invuln > 0) return; // мигаем — неуязвимы
    this.hearts--;
    Sfx.hurt();
    this.invuln = CONFIG.HURT_INVULN;
    this.stun = CONFIG.HURT_STUN;
    this.climbing = false;
    this.riding = null;
    this.attackTimer = 0;
    // Отлетаем в сторону ОТ врага и чуть вверх
    const dir = (this.x + this.w / 2) < fromX ? -1 : 1;
    this.vx = dir * CONFIG.HURT_KNOCKBACK_X;
    this.vy = CONFIG.HURT_KNOCKBACK_Y;
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.dead = true;      // main.js покажет экран смерти
      Sfx.playerDeath();
    }
  }

  // Призрак напугал героя: сердце не отнимается, но его отшвыривает НАЗАД
  scare() {
    if (this.invuln > 0) return;
    this.invuln = CONFIG.GHOST_INVULN;
    this.stun = CONFIG.GHOST_STUN;
    this.climbing = false;
    this.riding = null;
    this.attackTimer = 0;
    // Назад — это против направления взгляда героя
    this.vx = -this.facing * CONFIG.GHOST_PUSH_X;
    this.vy = CONFIG.GHOST_PUSH_Y;
  }

  // Прямоугольник, в котором меч наносит урон (null — если маха нет)
  attackHitbox() {
    if (this.attackTimer <= 0) return null;
    const r = CONFIG.SWORD_RANGE;
    return {
      x: this.facing > 0 ? this.x + this.w : this.x - r,
      y: this.y - 8,           // мах начинается над головой...
      w: r,
      h: this.h + 12,          // ...и заканчивается у ног
    };
  }

  // Отдельная логика, пока висим на лиане
  updateClimbing(dt, level) {
    const climb = (Input.isDown('down') ? 1 : 0) - (Input.isDown('up') ? 1 : 0);
    this.vy = climb * CONFIG.CLIMB_SPEED;
    this.vx = 0;

    // Прыжок соскакивает с лианы (можно сразу рулить в сторону)
    if (Input.wasPressed('jump')) {
      this.climbing = false;
      this.vy = -CONFIG.JUMP_SPEED;
      this.jumpHeld = true;
      return;
    }

    this.moveAndCollide(dt, level, []);

    // Долезли вниз до земли — слезаем
    if (this.onGround) this.climbing = false;
  }

  // Двигаемся сначала по X, потом по Y, каждый раз упираясь в твёрдые тайлы
  moveAndCollide(dt, level, platforms) {
    // --- По горизонтали ---
    this.x += this.vx * dt;
    const top = Math.floor(this.y / T);
    const bottom = Math.floor((this.y + this.h - 0.01) / T);

    if (this.vx > 0) {
      const col = Math.floor((this.x + this.w) / T);
      for (let row = top; row <= bottom; row++) {
        if (level.isSolidAt(col, row)) {
          this.x = col * T - this.w; // прижимаемся к левой грани блока
          this.vx = 0;
          break;
        }
      }
    } else if (this.vx < 0) {
      const col = Math.floor(this.x / T);
      for (let row = top; row <= bottom; row++) {
        if (level.isSolidAt(col, row)) {
          this.x = (col + 1) * T; // прижимаемся к правой грани блока
          this.vx = 0;
          break;
        }
      }
    }

    // --- По вертикали ---
    const prevBottom = this.y + this.h; // где были ноги ДО сдвига
    this.y += this.vy * dt;
    this.onGround = false;
    this.riding = null;
    const left = Math.floor(this.x / T);
    const right = Math.floor((this.x + this.w - 0.01) / T);

    if (this.vy > 0) {
      // падаем: ищем пол под ногами
      const row = Math.floor((this.y + this.h) / T);
      for (let col = left; col <= right; col++) {
        const solid = level.isSolidAt(col, row);
        // На платформу '=' встаём, только если ноги были НАД её верхом
        const platform = level.isOneWayAt(col, row) && prevBottom <= row * T + 0.01;
        if (solid || platform) {
          this.y = row * T - this.h;
          this.vy = 0;
          this.onGround = true;
          break;
        }
      }
    } else if (this.vy < 0) {
      // летим вверх: проверяем потолок
      const row = Math.floor(this.y / T);
      for (let col = left; col <= right; col++) {
        if (level.isSolidAt(col, row)) {
          this.y = (row + 1) * T; // стукнулись головой
          this.vy = 0;
          break;
        }
      }
    }

    // --- Движущиеся платформы (встаём только сверху) ---
    if (this.vy >= 0) {
      const newBottom = this.y + this.h;
      for (const plat of platforms) {
        const overlapX = this.x + this.w > plat.x && this.x < plat.x + plat.w;
        // Ноги были над платформой (учитываем, что она сама могла подняться)
        const wasAbove = prevBottom <= plat.prevTop + 0.01;
        if (overlapX && wasAbove && newBottom >= plat.y) {
          this.y = plat.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.riding = plat;
          break;
        }
      }
    }
  }

  draw(ctx, camera) {
    if (this.hidden) return; // зашёл в замок — не рисуем

    const x = Math.round(this.x - camera.x);
    const y = Math.round(this.y - camera.y);

    // После урона мигаем: через кадр не рисуем тело
    const blinking = this.invuln > 0 && Math.floor(this.invuln * 12) % 2 === 1;

    // Спрайт 16x24 чуть больше хитбокса 12x20: сдвигаем на 2 влево и 4 вверх,
    // чтобы ноги стояли ровно на земле, а голова торчала сверху
    const sx = x - 2;
    let sy = y - 4;

    // Выбираем кадр
    let frame = KNIGHT_IDLE;
    if (this.sitting) {
      frame = KNIGHT_SIT;
    } else if (!this.onGround && !this.climbing) {
      frame = KNIGHT_JUMP;
    } else if (this.animTime > 0) {
      // Цикл ходьбы: кадр меняется каждые 0.11 сек
      const step = KNIGHT_WALK_CYCLE[Math.floor(this.animTime / 0.11) % KNIGHT_WALK_CYCLE.length];
      frame = step.frame;
      sy += step.dy; // лёгкое покачивание вверх-вниз
    }

    if (!blinking) {
      drawSprite(ctx, frame, sx, sy, this.facing < 0);

      // У костра меч воткнут в землю рядом — герой отдыхает
      if (this.sitting) {
        const stx = this.facing > 0 ? sx - 3 : sx + 18;
        ctx.fillStyle = '#dfe7ee';        // клинок в земле
        ctx.fillRect(stx, sy + 6, 1, 17);
        ctx.fillStyle = '#c9a227';        // перекрестье
        ctx.fillRect(stx - 1, sy + 8, 3, 1);
        ctx.fillStyle = '#8a6a3f';        // рукоять
        ctx.fillRect(stx, sy + 4, 1, 4);
      }

      // Серебряный меч ДЕРЖИТСЯ ВВЕРХ, наизготовку (когда не машем им)
      if (!this.sitting && this.attackTimer <= 0) {
        const bx = this.facing > 0 ? sx + 13 : sx + 2;
        ctx.fillStyle = '#8a6a3f'; // рукоять в кулаке
        ctx.fillRect(bx, sy + 12, 1, 3);
        ctx.fillStyle = '#c9a227'; // золотое перекрестье
        ctx.fillRect(bx - 1, sy + 11, 3, 1);
        ctx.fillStyle = '#dfe7ee'; // клинок вверх, выше головы
        ctx.fillRect(bx, sy - 2, 1, 13);
        ctx.fillStyle = '#f4f8fb'; // блик на острие
        ctx.fillRect(bx, sy - 2, 1, 2);
      }
    }

    // ---------- МЕЧ ----------
    if (this.attackTimer > 0) {
      // Прогресс маха: 0 — только начали (меч вверху), 1 — закончили (меч внизу)
      const t = 1 - this.attackTimer / CONFIG.ATTACK_TIME;
      const f = this.facing;
      const shoulderX = f > 0 ? x + this.w : x; // точка "плеча"
      const shoulderY = y + 8;

      ctx.fillStyle = '#e9ecef'; // сталь клинка
      if (t < 0.35) {
        // Фаза 1: меч поднят вверх-вперёд (диагональ ступеньками)
        for (let i = 0; i < 5; i++) {
          const px = f > 0 ? shoulderX + i * 3 : shoulderX - i * 3 - 3;
          ctx.fillRect(px, shoulderY - 4 - i * 3, 3, 3);
        }
      } else if (t < 0.7) {
        // Фаза 2: меч выпрямлен вперёд
        const bx = f > 0 ? shoulderX : shoulderX - CONFIG.SWORD_RANGE;
        ctx.fillRect(bx, shoulderY, CONFIG.SWORD_RANGE, 2);
        // остриё
        ctx.fillRect(f > 0 ? bx + CONFIG.SWORD_RANGE - 2 : bx, shoulderY - 1, 2, 4);
      } else {
        // Фаза 3: меч опущен вниз-вперёд
        for (let i = 0; i < 5; i++) {
          const px = f > 0 ? shoulderX + i * 3 : shoulderX - i * 3 - 3;
          ctx.fillRect(px, shoulderY + 4 + i * 3, 3, 3);
        }
      }
      // Рукоять у плеча
      ctx.fillStyle = '#a5673f';
      ctx.fillRect(f > 0 ? shoulderX - 1 : shoulderX - 2, shoulderY - 1, 3, 4);
    }
  }
}
