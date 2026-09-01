// ============================================================
// КЛАВИАТУРА.
// Переводит физические клавиши в игровые "действия" (влево, прыжок...).
// Игра спрашивает: Input.isDown('jump') — держат ли прыжок,
// Input.wasPressed('jump') — нажали ли прыжок ИМЕННО в этом кадре.
// ============================================================

// Какая клавиша какое действие означает (event.code)
const KEYMAP = {
  ArrowLeft: 'left',  KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',  KeyS: 'down',
  Space: 'jump',      KeyW: 'jump',
  KeyJ: 'attack',     KeyX: 'attack',
  KeyK: 'throw',      KeyC: 'throw',
  Escape: 'back',     KeyP: 'pause',
  KeyM: 'mute',        // выключить весь звук
  KeyN: 'muteMusic',   // выключить только музыку
  Enter: 'start',
};

const down = new Set();     // действия, которые сейчас удерживаются
const pressed = new Set();  // действия, нажатые в текущем кадре

// Браузер включает звук только после первого действия игрока
let onFirstKey = null;

export const Input = {
  // callback вызовется один раз при самом первом нажатии — там мы будим звук
  init(firstKeyCallback) {
    onFirstKey = firstKeyCallback || null;
    window.addEventListener('keydown', (e) => {
      if (onFirstKey) { onFirstKey(); onFirstKey = null; }
      const action = KEYMAP[e.code];
      if (!action) return;
      e.preventDefault(); // чтобы пробел и стрелки не скроллили страницу
      if (!down.has(action)) pressed.add(action); // без автоповтора
      down.add(action);
    });
    window.addEventListener('keyup', (e) => {
      const action = KEYMAP[e.code];
      if (!action) return;
      down.delete(action);
    });
    // Если окно потеряло фокус — отпускаем все клавиши, чтобы ничего не "залипло"
    window.addEventListener('blur', () => { down.clear(); pressed.clear(); });
  },

  isDown(action) { return down.has(action); },
  wasPressed(action) { return pressed.has(action); },

  // Вызывается в конце каждого шага игры: "свежие нажатия" живут один кадр
  endFrame() { pressed.clear(); },
};
