// ============================================================
// СУНДУКИ И МОНЕТЫ.
// Сундук стоит в пещере. Бей по нему мечом — из него
// выскакивают золотые монеты, они падают на землю,
// и герой подбирает их, проходя мимо.
// ============================================================

import { CONFIG } from '../config.js';

const T = CONFIG.TILE;

// ---------- МОНЕТА ----------
export class Coin {
  constructor(x, y, vx, vy) {
    this.w = 8;
    this.h = 8;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.spin = Math.random() * 4;  // фаза вращения
    this.life = CONFIG.COIN_LIFE;   // сколько лежит, прежде чем исчезнуть
    this.settleDelay = 0.25;        // защита от мгновенного подбора при вылете
    this.taken = false;
  }

  update(dt, level, player) {
    if (this.taken) return;
    this.spin += dt * 9;
    this.life -= dt;
    if (this.settleDelay > 0) this.settleDelay -= dt;

    // Гравитация и полёт
    this.vy += CONFIG.GRAVITY * 0.8 * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Трение о воздух — монета быстро теряет горизонтальный разгон
    this.vx *= 0.96;

    // Приземление: ищем пол под монетой
    const col = Math.floor((this.x + this.w / 2) / T);
    const row = Math.floor((this.y + this.h) / T);
    if (level.isSolidAt(col, row) || level.isOneWayAt(col, row)) {
      this.y = row * T - this.h;
      if (this.vy > 40) this.vy = -this.vy * 0.35; // подпрыгивает
      else { this.vy = 0; this.vx *= 0.7; }
    }
    // Стенки: не проваливаемся сквозь бока
    const sideCol = Math.floor((this.x + (this.vx > 0 ? this.w : 0)) / T);
    const midRow = Math.floor((this.y + this.h / 2) / T);
    if (level.isSolidAt(sideCol, midRow)) this.vx = -this.vx * 0.5;

    // Магнит: рядом с героем монета сама подлетает к нему,
    // чтобы не приходилось выцеливать каждую
    if (this.settleDelay <= 0) {
      const dx = (player.x + player.w / 2) - (this.x + this.w / 2);
      const dy = (player.y + player.h / 2) - (this.y + this.h / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < CONFIG.COIN_MAGNET) {
        const pull = CONFIG.COIN_MAGNET_PULL * dt;
        this.x += (dx / dist) * pull;
        this.y += (dy / dist) * pull;
      }
    }

    // Подбор героем
    if (this.settleDelay <= 0 &&
        this.x < player.x + player.w && this.x + this.w > player.x &&
        this.y < player.y + player.h && this.y + this.h > player.y) {
      this.taken = true;
      player.coins++;
    }
    if (this.life <= 0) this.taken = true;
  }

  draw(ctx, camera) {
    if (this.taken) return;
    const x = Math.round(this.x - camera.x);
    const y = Math.round(this.y - camera.y);

    // Перед исчезновением монета мигает
    if (this.life < 1.2 && Math.floor(this.life * 10) % 2 === 0) return;

    // Вращение: монета то широкая, то ребром
    const phase = Math.floor(this.spin) % 4;
    const widths = [7, 4, 1, 4];
    const w = widths[phase];
    const ox = Math.round((7 - w) / 2);

    ctx.fillStyle = '#8a6a12';           // тёмный ободок
    ctx.fillRect(x + ox, y, w, 8);
    ctx.fillStyle = '#f2c14e';           // золото
    ctx.fillRect(x + ox, y + 1, w, 6);
    if (w > 2) {
      ctx.fillStyle = '#fff1b8';         // блик
      ctx.fillRect(x + ox + 1, y + 2, Math.max(1, w - 3), 2);
    }
  }
}

// ---------- СУНДУК ----------
export class Chest {
  constructor(col, row) {
    this.w = 16;
    this.h = 13;
    this.spawnX = col * T;
    this.spawnY = (row + 1) * T - this.h;
    this.reset();
  }

  reset() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.coinsLeft = CONFIG.CHEST_COINS; // сколько монет ещё внутри
    this.shake = 0;          // тряска после удара
    this.lastHitSwing = -1;  // один мах меча — один удар
    this.dead = false;       // поле для общего цикла (сундук не исчезает)
    this.dying = 0;
  }

  get empty() {
    return this.coinsLeft <= 0;
  }

  update(dt) {
    if (this.shake > 0) this.shake -= dt;
  }

  // Удар мечом: выбиваем монету. Возвращает её или null, если пусто
  hurt() {
    if (this.empty) return null;
    this.coinsLeft--;
    this.shake = 0.18;
    // Монета вылетает вверх, слегка в случайную сторону
    const vx = (Math.random() - 0.5) * 55;
    const vy = -CONFIG.COIN_POP_SPEED - Math.random() * 40;
    return new Coin(this.x + 4, this.y - 6, vx, vy);
  }

  draw(ctx, camera) {
    let x = Math.round(this.x - camera.x);
    const y = Math.round(this.y - camera.y);
    // От удара сундук вздрагивает
    if (this.shake > 0) x += Math.round(Math.sin(this.shake * 60) * 2);

    const WOOD = '#7a4b28';
    const WOOD_DARK = '#4e2f19';
    const WOOD_LIGHT = '#96603a';
    const GOLD = '#d9a441';
    const GOLD_DARK = '#8a6a12';

    if (this.empty) {
      // Пустой сундук: крышка откинута назад
      ctx.fillStyle = WOOD_DARK;
      ctx.fillRect(x, y + 4, this.w, 9);
      ctx.fillStyle = '#241408';           // тёмное нутро
      ctx.fillRect(x + 2, y + 5, this.w - 4, 4);
      ctx.fillStyle = WOOD;
      ctx.fillRect(x + 1, y - 1, this.w - 2, 4); // откинутая крышка
      ctx.fillStyle = GOLD_DARK;
      ctx.fillRect(x + 1, y + 2, this.w - 2, 1);
      ctx.fillRect(x, y + 11, this.w, 2);
      return;
    }

    // Целый сундук: округлая крышка, доски, золотые оковки
    ctx.fillStyle = WOOD;
    ctx.fillRect(x, y + 5, this.w, 8);       // корпус
    ctx.fillRect(x + 1, y + 1, this.w - 2, 4); // крышка
    ctx.fillRect(x + 3, y, this.w - 6, 1);     // скруглённый верх
    // Тени и блики досок
    ctx.fillStyle = WOOD_DARK;
    ctx.fillRect(x, y + 11, this.w, 2);
    ctx.fillRect(x, y + 5, this.w, 1);
    ctx.fillStyle = WOOD_LIGHT;
    ctx.fillRect(x + 1, y + 2, this.w - 2, 1);
    // Золотые оковки по бокам и посередине
    ctx.fillStyle = GOLD;
    ctx.fillRect(x + 1, y + 1, 2, 12);
    ctx.fillRect(x + this.w - 3, y + 1, 2, 12);
    ctx.fillStyle = GOLD_DARK;
    ctx.fillRect(x + 1, y + 12, 2, 1);
    ctx.fillRect(x + this.w - 3, y + 12, 2, 1);
    // Замок
    ctx.fillStyle = GOLD;
    ctx.fillRect(x + 6, y + 5, 4, 4);
    ctx.fillStyle = GOLD_DARK;
    ctx.fillRect(x + 7, y + 6, 2, 2);
  }
}
