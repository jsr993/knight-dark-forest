// ============================================================
// ЗВУК И МУЗЫКА.
// Ни одного звукового файла: всё синтезируется через Web Audio API —
// квадратные волны (как на Dendy/NES), треугольный бас и шум.
//
// Браузер разрешает звук только после первого нажатия клавиши,
// поэтому звук «просыпается» при первом же действии игрока.
// Клавиша M — выключить/включить звук.
// ============================================================

import { CONFIG } from './config.js';

let ctx = null;        // Web Audio контекст (создаётся при первом действии)
let master = null;     // общая громкость
let musicGain = null;  // громкость музыки отдельно
let muted = false;     // выключен ВЕСЬ звук (клавиша M)
let musicMuted = false; // выключена только музыка, звуки играют (клавиша N)

// ---------- НОТЫ ----------
// Частоты в герцах. Названия: C4 — до первой октавы и т.д.
const NOTE = {
  0: 0, // пауза
  C2: 65.41, D2: 73.42, DS2: 77.78, E2: 82.41, F2: 87.31, G2: 98.0, GS2: 103.83, A2: 110.0, AS2: 116.54, B2: 123.47,
  C3: 130.81, D3: 146.83, DS3: 155.56, E3: 164.81, F3: 174.61, G3: 196.0, GS3: 207.65, A3: 220.0, AS3: 233.08, B3: 246.94,
  C4: 261.63, D4: 293.66, DS4: 311.13, E4: 329.63, F4: 349.23, G4: 392.0, GS4: 415.3, A4: 440.0, AS4: 466.16, B4: 493.88,
  C5: 523.25, D5: 587.33, DS5: 622.25, F5: 698.46, G5: 783.99, A5: 880.0,
};

// ---------- СОЗДАНИЕ КОНТЕКСТА ----------
export function initAudio() {
  if (ctx) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : CONFIG.VOLUME_MASTER;
  master.connect(ctx.destination);

  musicGain = ctx.createGain();
  musicGain.gain.value = musicMuted ? 0 : CONFIG.VOLUME_MUSIC;
  musicGain.connect(master);

  // Лёгкое эхо на музыке: повторы затухают и мелодия звучит мягче,
  // будто играют в лесу. Звуковых эффектов эхо не касается.
  const delay = ctx.createDelay(1.0);
  delay.delayTime.value = CONFIG.MUSIC_ECHO_TIME;
  const feedback = ctx.createGain();
  feedback.gain.value = CONFIG.MUSIC_ECHO_FEEDBACK;
  const echoLevel = ctx.createGain();
  echoLevel.gain.value = CONFIG.MUSIC_ECHO_MIX;
  // Приглушаем высокие в эхе — так повторы звучат дальше и мягче
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 1800;

  musicGain.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);   // повторы затухают по кругу
  delay.connect(echoTone);
  echoTone.connect(echoLevel);
  echoLevel.connect(master);
}

// Браузер мог «заморозить» звук — будим его
function wake() {
  if (!ctx) initAudio();
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return !!ctx;
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : CONFIG.VOLUME_MASTER;
  return muted;
}

export function isMuted() {
  return muted;
}

// Выключить/включить ТОЛЬКО музыку — звуки боя при этом остаются
export function toggleMusic() {
  musicMuted = !musicMuted;
  if (musicGain) {
    // Плавно, чтобы не щёлкало
    const now = ctx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(musicMuted ? 0 : CONFIG.VOLUME_MUSIC, now + 0.3);
  }
  return musicMuted;
}

export function isMusicMuted() {
  return musicMuted;
}

// Состояние звука — чтобы можно было проверить, что всё работает
export function audioState() {
  return {
    контекст: ctx ? ctx.state : 'не создан',
    звукВыключен: muted,
    музыкаВыключена: musicMuted,
    громкостьМузыки: musicGain ? +musicGain.gain.value.toFixed(3) : null,
    трек: current,
    гудокВолынки: !!droneOsc,
  };
}

// ---------- КИРПИЧИКИ ЗВУКА ----------

// Тон заданной формы: freq -> freqTo за time секунд
function tone({ freq, freqTo, time = 0.12, type = 'square', vol = 0.3, delay = 0 }) {
  if (!wake() || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqTo && freqTo !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + time);
  }
  // Резкая атака и спад — характерный «щелчок» 8-битных звуков
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + time);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + time + 0.02);
}

// Шум — для ударов, всплесков и взрывов
function noise({ time = 0.12, vol = 0.25, filterFrom = 3000, filterTo = 300, delay = 0 }) {
  if (!wake() || muted) return;
  const t0 = ctx.currentTime + delay;
  const len = Math.max(1, Math.floor(ctx.sampleRate * time));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFrom, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(60, filterTo), t0 + time);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + time);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
  src.stop(t0 + time + 0.02);
}

// ---------- ЗВУКИ ИГРЫ ----------

export const Sfx = {
  jump() {
    tone({ freq: 220, freqTo: 620, time: 0.16, vol: 0.22 });
  },
  doubleJump() {
    tone({ freq: 320, freqTo: 780, time: 0.14, vol: 0.2, type: 'square' });
  },
  land() {
    noise({ time: 0.06, vol: 0.1, filterFrom: 900, filterTo: 180 });
  },
  sword() {
    // Свист клинка: короткий шум сверху вниз
    noise({ time: 0.1, vol: 0.16, filterFrom: 6000, filterTo: 900 });
    tone({ freq: 700, freqTo: 260, time: 0.09, vol: 0.12, type: 'sawtooth' });
  },
  hitEnemy() {
    noise({ time: 0.09, vol: 0.22, filterFrom: 2200, filterTo: 200 });
    tone({ freq: 180, freqTo: 90, time: 0.1, vol: 0.2 });
  },
  enemyDie() {
    tone({ freq: 400, freqTo: 60, time: 0.3, vol: 0.2, type: 'square' });
    noise({ time: 0.25, vol: 0.16, filterFrom: 1800, filterTo: 120 });
  },
  hurt() {
    // Диссонанс: две расстроенные ноты вниз
    tone({ freq: 380, freqTo: 120, time: 0.28, vol: 0.26 });
    tone({ freq: 260, freqTo: 90, time: 0.3, vol: 0.18, type: 'sawtooth', delay: 0.02 });
  },
  coin() {
    // Классические две ноты вверх
    tone({ freq: NOTE.B4, time: 0.07, vol: 0.2 });
    tone({ freq: NOTE.E5 || 659.25, time: 0.16, vol: 0.2, delay: 0.07 });
  },
  // УДАР ПО СУНДУКУ: глухой стук дерева и звон золотых оковок
  chestHit() {
    tone({ freq: 160, freqTo: 65, time: 0.13, vol: 0.24, type: 'triangle' });
    noise({ time: 0.09, vol: 0.16, filterFrom: 1400, filterTo: 220 });
    tone({ freq: 1180, freqTo: 900, time: 0.1, vol: 0.09, type: 'square', delay: 0.02 });
  },

  // МОНЕТА ВЫПРЫГИВАЕТ ИЗ СУНДУКА: звонкий взлёт вверх
  coinPop() {
    tone({ freq: 700, freqTo: 1400, time: 0.12, vol: 0.16, type: 'square' });
    tone({ freq: 1050, freqTo: 1700, time: 0.1, vol: 0.09, type: 'square', delay: 0.04 });
  },
  splash() {
    noise({ time: 0.28, vol: 0.2, filterFrom: 5000, filterTo: 400 });
  },
  burn() {
    // Шипение лавы
    noise({ time: 0.4, vol: 0.24, filterFrom: 1400, filterTo: 200 });
    tone({ freq: 120, freqTo: 50, time: 0.35, vol: 0.16, type: 'sawtooth' });
  },
  ghost() {
    // Вой призрака: медленный вой вверх-вниз
    tone({ freq: 300, freqTo: 700, time: 0.5, vol: 0.12, type: 'sine' });
    tone({ freq: 700, freqTo: 240, time: 0.5, vol: 0.1, type: 'sine', delay: 0.45 });
  },

  // РЫЧАНИЕ ЗОМБИ: утробное, дрожащее, с бульканьем
  zombieGrowl() {
    if (!wake() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();   // дрожь голоса
    const lfoGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(78, t0);
    osc.frequency.linearRampToValueAtTime(58, t0 + 0.75);
    lfo.type = 'sine';
    lfo.frequency.value = 11;             // частая дрожь = рычание
    lfoGain.gain.value = 14;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.08);
    gain.gain.setValueAtTime(0.2, t0 + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.8);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0); lfo.start(t0);
    osc.stop(t0 + 0.85); lfo.stop(t0 + 0.85);
    // хрип в горле
    noise({ time: 0.5, vol: 0.07, filterFrom: 600, filterTo: 120 });
  },

  // КРИК РЫЦАРЯ: боевой возглас при рывке
  knightShout() {
    tone({ freq: 330, freqTo: 430, time: 0.1, vol: 0.16, type: 'sawtooth' });
    tone({ freq: 430, freqTo: 200, time: 0.22, vol: 0.18, type: 'square', delay: 0.09 });
    noise({ time: 0.2, vol: 0.07, filterFrom: 1800, filterTo: 500, delay: 0.05 });
  },

  // ПРЕДСМЕРТНЫЙ КРИК РЫЦАРЯ
  knightDeathCry() {
    tone({ freq: 400, freqTo: 130, time: 0.45, vol: 0.2, type: 'sawtooth' });
    tone({ freq: 300, freqTo: 90, time: 0.5, vol: 0.14, type: 'square', delay: 0.06 });
    noise({ time: 0.4, vol: 0.12, filterFrom: 1500, filterTo: 150 });
  },

  // СКРИП ДВЕРИ ИЗБЫ: старые петли
  doorCreak() {
    if (!wake() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420, t0);
    osc.frequency.linearRampToValueAtTime(700, t0 + 0.55); // скрипит всё выше
    lfo.type = 'square';
    lfo.frequency.value = 26;             // прерывистость скрипа
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0); lfo.start(t0);
    osc.stop(t0 + 0.65); lfo.stop(t0 + 0.65);
    // глухой стук закрывшейся двери
    tone({ freq: 120, freqTo: 60, time: 0.12, vol: 0.2, type: 'triangle', delay: 0.6 });
  },

  // ТРЕСК КОСТРА: щелчки поленьев (вызывается периодически у огня)
  fireCrackle() {
    noise({ time: 0.05, vol: 0.09, filterFrom: 5000, filterTo: 1200 });
    if (Math.random() < 0.4) {
      noise({ time: 0.04, vol: 0.07, filterFrom: 3500, filterTo: 800, delay: 0.08 });
    }
  },

  bossRoar() {
    // Низкий рык огра
    tone({ freq: 110, freqTo: 55, time: 0.7, vol: 0.3, type: 'sawtooth' });
    tone({ freq: 70, freqTo: 40, time: 0.8, vol: 0.22, type: 'square', delay: 0.05 });
    noise({ time: 0.6, vol: 0.18, filterFrom: 800, filterTo: 90 });
  },

  // РЫЧАНИЕ ОГРА ОТ БОЛИ: короткое, злое, с надрывом
  ogreHurt() {
    if (!wake() || muted) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, t0);
    osc.frequency.exponentialRampToValueAtTime(85, t0 + 0.4);
    lfo.type = 'sine';
    lfo.frequency.value = 17;             // злая дрожь
    lfoGain.gain.value = 22;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.45);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0); lfo.start(t0);
    osc.stop(t0 + 0.5); lfo.stop(t0 + 0.5);
    noise({ time: 0.3, vol: 0.12, filterFrom: 1000, filterTo: 120 });
  },
  bossSmash() {
    // Молот врезается в землю
    noise({ time: 0.3, vol: 0.3, filterFrom: 1600, filterTo: 80 });
    tone({ freq: 90, freqTo: 40, time: 0.3, vol: 0.28, type: 'square' });
  },
  heal() {
    // Отдых в домике: тёплый восходящий аккорд
    tone({ freq: NOTE.C4, time: 0.18, vol: 0.18 });
    tone({ freq: NOTE.E4 || 329.63, time: 0.18, vol: 0.18, delay: 0.12 });
    tone({ freq: NOTE.G4, time: 0.3, vol: 0.18, delay: 0.24 });
  },
  rest() {
    // Привал у костра: спокойная нисходящая фраза
    tone({ freq: NOTE.G4, time: 0.22, vol: 0.16, type: 'triangle' });
    tone({ freq: NOTE.E4 || 329.63, time: 0.22, vol: 0.16, type: 'triangle', delay: 0.2 });
    tone({ freq: NOTE.C4, time: 0.5, vol: 0.16, type: 'triangle', delay: 0.4 });
  },
};

// ============================================================
// МУЗЫКА: средневековые наигрыши, зацикленные.
//
// Звучит по-средневековому за счёт трёх вещей:
//  1. ДОРИЙСКИЙ ЛАД (ре-дорийский: D E F G A B C) — типичный лад
//     менестрелей, звучит строго и старинно, без «попсовой» терции;
//  2. ВОЛЫНОЧНЫЙ ДРОН — тянущаяся квинта в басу, как гудок волынки,
//     он не меняется весь такт;
//  3. ОТКРЫТЫЕ КВИНТЫ вместо привычных аккордов (средневековый органум).
//
// Каждая нота — [частота, длительность в шагах].
// ============================================================

// Тема леса: певучая баллада менестреля в ре-дорийском.
// Построена как разговор: фраза-вопрос идёт вверх и повисает,
// фраза-ответ спускается и разрешается в тонику.
const FOREST_LEAD = [
  // Вопрос: подъём к ля и мягкое зависание
  [NOTE.D4, 4], [NOTE.F4, 2], [NOTE.G4, 2],
  [NOTE.A4, 6], [NOTE.G4, 2],
  [NOTE.F4, 4], [NOTE.E4, 4],
  [NOTE.D4, 6], [0, 2],
  // Ответ: взлетает выше и спокойно спускается домой
  [NOTE.A4, 4], [NOTE.C5, 2], [NOTE.D5, 2],
  [NOTE.C5, 6], [NOTE.A4, 2],
  [NOTE.G4, 4], [NOTE.F4, 2], [NOTE.E4, 2],
  [NOTE.D4, 8],
  // Светлое завершение — распев на терции
  [NOTE.F4, 4], [NOTE.G4, 2], [NOTE.A4, 2],
  [NOTE.G4, 4], [NOTE.F4, 4],
  [NOTE.E4, 6], [NOTE.D4, 2],
  [NOTE.D4, 8],
];
// Бас ходит открытыми квинтами: ре — ля, до — соль
const FOREST_BASS = [
  [NOTE.D3, 8], [NOTE.A2, 8],
  [NOTE.F2, 8], [NOTE.C3, 8],
  [NOTE.D3, 8], [NOTE.A2, 8],
  [NOTE.G2, 8], [NOTE.A2, 8],
];
// Гудок волынки: тянется бесконечно на тонике
const FOREST_DRONE = NOTE.D2;

// Тема босса: боевая эстампи — резкий средневековый танец в ми-эолийском
const BOSS_LEAD = [
  [NOTE.E4, 2], [NOTE.E4, 1], [NOTE.F4, 1], [NOTE.G4, 2], [NOTE.E4, 2],
  [NOTE.A4, 2], [NOTE.G4, 1], [NOTE.F4, 1], [NOTE.E4, 4],
  [NOTE.E4, 2], [NOTE.G4, 1], [NOTE.A4, 1], [NOTE.B4, 2], [NOTE.A4, 2],
  [NOTE.G4, 2], [NOTE.F4, 2], [NOTE.E4, 4],
];
const BOSS_BASS = [
  [NOTE.E2, 4], [NOTE.B2, 4], [NOTE.E2, 4], [NOTE.B2, 4],
  [NOTE.C3, 4], [NOTE.G2, 4], [NOTE.E2, 4], [NOTE.B2, 4],
];
const BOSS_DRONE = NOTE.E2;

const TRACKS = {
  // Лес: мягкий треугольный голос, неспешный шаг — звучит тепло и певуче
  forest: {
    lead: FOREST_LEAD, bass: FOREST_BASS, drone: FOREST_DRONE,
    step: 0.2, leadWave: 'triangle', leadVol: 0.26, droneVol: 0.05,
  },
  // Босс: жёсткая квадратная волна и быстрый шаг — тревожно
  boss: {
    lead: BOSS_LEAD, bass: BOSS_BASS, drone: BOSS_DRONE,
    step: 0.14, leadWave: 'square', leadVol: 0.17, droneVol: 0.08,
  },
};

let current = null;      // название играющего трека
let timer = null;        // таймер планировщика
let nextTime = 0;        // на какое время уже запланированы ноты
let leadIdx = 0, bassIdx = 0;
let leadUntil = 0, bassUntil = 0;
let droneOsc = null;     // гудок волынки — тянется, пока играет трек
let droneOsc2 = null;    // вторая труба, квинтой выше
let droneGain = null;

// Одна нота мелодии.
// Мягкая огибающая (плавный вход и долгий спад) плюс лёгкое вибрато
// на длинных нотах — от этого мелодия звучит певуче, а не «пищаще».
function playNote(freq, dur, when, type, vol, singing = false) {
  if (!freq) return; // пауза
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);

  // Приглушаем резкие верхние призвуки квадратной волны
  const soft = ctx.createBiquadFilter();
  soft.type = 'lowpass';
  soft.frequency.value = singing ? 2400 : 1200;

  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(vol, when + 0.035);      // мягкий вход
  gain.gain.setValueAtTime(vol, when + dur * 0.55);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + dur * 0.98); // долгий спад

  osc.connect(soft);
  soft.connect(gain);
  gain.connect(musicGain);

  // Вибрато — только на распевных длинных нотах
  let vib = null;
  if (singing && dur > 0.5) {
    vib = ctx.createOscillator();
    const vibGain = ctx.createGain();
    vib.frequency.value = 5.2;
    vibGain.gain.setValueAtTime(0, when);
    vibGain.gain.linearRampToValueAtTime(freq * 0.008, when + dur * 0.4);
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);
    vib.start(when);
    vib.stop(when + dur);
  }

  osc.start(when);
  osc.stop(when + dur);
}

// Планировщик: заранее раскладывает ноты по времени, чтобы не «дёргалось»
function scheduler() {
  if (!ctx || !current) return;
  const track = TRACKS[current];
  const horizon = ctx.currentTime + 0.35;

  while (nextTime < horizon) {
    // Мелодия — поёт мягким голосом с вибрато
    if (nextTime >= leadUntil) {
      const [freq, len] = track.lead[leadIdx % track.lead.length];
      const dur = len * track.step;
      playNote(freq, dur, nextTime, track.leadWave, track.leadVol, true);
      leadUntil = nextTime + dur;
      leadIdx++;
    }
    // Бас
    if (nextTime >= bassUntil) {
      const [freq, len] = track.bass[bassIdx % track.bass.length];
      const dur = len * track.step;
      playNote(freq, dur * 0.95, nextTime, 'triangle', 0.19);
      bassUntil = nextTime + dur;
      bassIdx++;
    }
    nextTime += track.step;
  }
}

// Гудок волынки: две тянущиеся трубы — тоника и квинта над ней.
// Приглушён фильтром, чтобы гудел тепло на фоне, а не жужжал.
function startDrone(freq, vol) {
  stopDrone();
  droneGain = ctx.createGain();
  droneGain.gain.setValueAtTime(0.0001, ctx.currentTime);
  droneGain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + 1.2);

  const warm = ctx.createBiquadFilter();
  warm.type = 'lowpass';
  warm.frequency.value = 420;   // срезаем весь «писк», оставляя мягкий гул
  droneGain.connect(warm);
  warm.connect(musicGain);

  droneOsc = ctx.createOscillator();
  droneOsc.type = 'sawtooth';
  droneOsc.frequency.value = freq;
  droneOsc.connect(droneGain);
  droneOsc.start();

  droneOsc2 = ctx.createOscillator();
  droneOsc2.type = 'triangle';
  droneOsc2.frequency.value = freq * 1.5; // чистая квинта — средневековый органум
  droneOsc2.detune.value = 4;             // лёгкая расстройка — «живой» звук
  droneOsc2.connect(droneGain);
  droneOsc2.start();
}

function stopDrone() {
  if (droneOsc) { try { droneOsc.stop(); } catch (e) { /* уже остановлен */ } droneOsc = null; }
  if (droneOsc2) { try { droneOsc2.stop(); } catch (e) { /* уже остановлен */ } droneOsc2 = null; }
  droneGain = null;
}

// Включить трек ('forest' или 'boss'). Повторный вызов того же — ничего не делает
export function playMusic(name) {
  if (!wake()) return;
  if (current === name) return;
  current = name;
  leadIdx = 0; bassIdx = 0;
  nextTime = ctx.currentTime + 0.05;
  leadUntil = 0; bassUntil = 0;
  startDrone(TRACKS[name].drone, TRACKS[name].droneVol);
  if (!timer) timer = setInterval(scheduler, 60);
}

export function stopMusic() {
  current = null;
  stopDrone();
  if (timer) { clearInterval(timer); timer = null; }
}
