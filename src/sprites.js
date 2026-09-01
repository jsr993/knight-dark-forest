// ============================================================
// СПРАЙТЫ.
// Каждый спрайт — список строк, где КАЖДЫЙ СИМВОЛ = один пиксель.
// Точка = прозрачность, буква = цвет из палитры PALETTE.
// Можно редактировать прямо в текстовом редакторе: меняешь буквы —
// меняется картинка (F5 в браузере).
//
// Функция drawSprite() — ЕДИНСТВЕННОЕ место отрисовки спрайтов.
// Если когда-нибудь захочется перейти на PNG-спрайтшит,
// достаточно будет переписать только её внутренности.
// ============================================================

export const PALETTE = {
  H: '#e6d28e', // волосы: светлая солома
  h: '#c2a763', // волосы: тень
  F: '#e8b48c', // лицо
  B: '#2b2f3a', // тёмное: глаза, перчатки, сапоги
  A: '#cfd6de', // латы: светлое серебро
  a: '#939fb0', // латы: тень
  d: '#5b6570', // латы: тёмная кромка, пояс
  // --- тёмный рыцарь ---
  N: '#3a4250', // тёмные латы
  n: '#252b36', // тёмные латы: кромка/тень
  L: '#5a6475', // блик на тёмных латах
  R: '#ff3131', // светящиеся красные глаза
  r: '#8f1622', // тёмно-красное: ореол глаз, пряжка
  E: '#d62828', // алые сапоги тёмного рыцаря
  // --- огр-босс ---
  O: '#b03a2e', // красная кожа
  o: '#7d2820', // кожа: тень
  P: '#c9553f', // кожа: блик
  Y: '#ffd23f', // горящие жёлтые глаза
  T: '#efe9d2', // клыки и когти
  U: '#4a3a28', // набедренная повязка
  K: '#160b0c', // чёрная обводка силуэта (как в AI-концепте)
  // --- привидение ---
  W: '#e8f1f5', // саван: светлое
  w: '#a9c2d0', // саван: тень
  v: '#7d9aac', // саван: рваный край
  X: '#101018', // провалы глаз и рта
};

// ---------- РЫЦАРЬ 16x24: без шлема, волосы до плеч ----------

// Стоит на месте (это же — кадр "ноги вместе" при ходьбе)
export const KNIGHT_IDLE = [
  '....HHHHHH......',
  '...HHHHHHHH.....',
  '..HHHHHHHHHH....',
  '..HHFFFFFFHH....',
  '..HhFFFFBFhH....',
  '..HhFFFFFFhH....',
  '..HHhFFFFhHH....',
  '..HH..FF..HH....',
  '.HHaaAAAAaaHH...',
  '.HHaAAAAAAaHH...',
  '..haAAAAAAah....',
  '...aAAAAAAa.....',
  '...aAAddAAa.....',
  '...BAAddAAB.....',
  '....AAAAAA......',
  '....aAAAAa......',
  '....aa..aa......',
  '....aa..aa......',
  '....aa..aa......',
  '....aa..aa......',
  '....Aa..aA......',
  '....Ba..aB......',
  '...BBB..BBB.....',
  '...BBB..BBB.....',
];

// Шаг широкий (ноги расставлены)
export const KNIGHT_WALK1 = [
  '....HHHHHH......',
  '...HHHHHHHH.....',
  '..HHHHHHHHHH....',
  '..HHFFFFFFHH....',
  '..HhFFFFBFhH....',
  '..HhFFFFFFhH....',
  '..HHhFFFFhHH....',
  '..HH..FF..HH....',
  '.HHaaAAAAaaHH...',
  '.HHaAAAAAAaHH...',
  '..haAAAAAAah....',
  '...aAAAAAAa.....',
  '...aAAddAAa.....',
  '...BAAddAAB.....',
  '....AAAAAA......',
  '....aAAAAa......',
  '....aa..aa......',
  '....aa...aa.....',
  '...aa.....aa....',
  '...aa.....aa....',
  '..Aa.......aA...',
  '..Ba.......aB...',
  '.BBB.......BBB..',
  '.BBB.......BBB..',
];

// Шаг поуже (другая фаза)
export const KNIGHT_WALK2 = [
  '....HHHHHH......',
  '...HHHHHHHH.....',
  '..HHHHHHHHHH....',
  '..HHFFFFFFHH....',
  '..HhFFFFBFhH....',
  '..HhFFFFFFhH....',
  '..HHhFFFFhHH....',
  '..HH..FF..HH....',
  '.HHaaAAAAaaHH...',
  '.HHaAAAAAAaHH...',
  '..haAAAAAAah....',
  '...aAAAAAAa.....',
  '...aAAddAAa.....',
  '...BAAddAAB.....',
  '....AAAAAA......',
  '....aAAAAa......',
  '....aa..aa......',
  '....aa..aa......',
  '...aa....aa.....',
  '...aa....aa.....',
  '...Aa....aA.....',
  '...Ba....aB.....',
  '..BBB....BBB....',
  '..BBB....BBB....',
];

// Сидит у костра: колени подтянуты, греется
export const KNIGHT_SIT = [
  '................',
  '................',
  '................',
  '................',
  '....HHHHHH......',
  '...HHHHHHHH.....',
  '..HHHHHHHHHH....',
  '..HHFFFFFFHH....',
  '..HhFFFFBFhH....',
  '..HhFFFFFFhH....',
  '..HHhFFFFhHH....',
  '..HH..FF..HH....',
  '.HHaaAAAAaaHH...',
  '.HHaAAAAAAaHH...',
  '..haAAAAAAah....',
  '...aAAAAAAa.....',
  '...aAAddAAa.....',
  '...aAAAAAAaa....',
  '...aAAAAAAAAa...',
  '...aAAAaaaAAa...',
  '...aaaa...aAa...',
  '...BB.....aAB...',
  '..BBBB....BBB...',
  '..BBBB....BBB...',
];

// В прыжке / падении: колени поджаты
export const KNIGHT_JUMP = [
  '....HHHHHH......',
  '...HHHHHHHH.....',
  '..HHHHHHHHHH....',
  '..HHFFFFFFHH....',
  '..HhFFFFBFhH....',
  '..HhFFFFFFhH....',
  '..HHhFFFFhHH....',
  '..HH..FF..HH....',
  '.HHaaAAAAaaHH...',
  '.HHaAAAAAAaHH...',
  '..haAAAAAAah....',
  '...aAAAAAAa.....',
  '...aAAddAAa.....',
  '...BAAddAAB.....',
  '....AAAAAA......',
  '....aAAAAa......',
  '....aa..aa......',
  '...aaa..aaa.....',
  '...Aa....aA.....',
  '...Ba....aB.....',
  '..BBB....BBB....',
  '..BBB....BBB....',
  '................',
  '................',
];

// Цикл ходьбы: широкий шаг -> ноги вместе -> узкий шаг -> ноги вместе
// (кадры "ноги вместе" рисуются на 1 пиксель выше — лёгкое покачивание)
export const KNIGHT_WALK_CYCLE = [
  { frame: KNIGHT_WALK1, dy: 0 },
  { frame: KNIGHT_IDLE, dy: -1 },
  { frame: KNIGHT_WALK2, dy: 0 },
  { frame: KNIGHT_IDLE, dy: -1 },
];

// ---------- ТЁМНЫЙ РЫЦАРЬ 16x24: закрытый шлем, красные глаза ----------

// Стоит (щель шлема с двумя горящими глазами — строка 4)
export const DARK_IDLE = [
  '.....nnnnn......',
  '....nNNNNNn.....',
  '....nNLNNNn.....',
  '....nNNNNNn.....',
  '....nBRBRBn.....',
  '....nNNNNNn.....',
  '.....nnnnn......',
  '......nn........',
  '..nnnNNNNnnn....',
  '..nnNLNNNNnn....',
  '...nNNNNNNn.....',
  '...nNNNNNNn.....',
  '...nNNrrNNn.....',
  '...BNNrrNNB.....',
  '....NNNNNN......',
  '....nNNNNn......',
  '....nn..nn......',
  '....nn..nn......',
  '....nn..nn......',
  '....nn..nn......',
  '....Nn..nN......',
  '....Bn..nB......',
  '...EEE..EEE.....',
  '...EEE..EEE.....',
];

// Шаг широкий
export const DARK_WALK1 = [
  '.....nnnnn......',
  '....nNNNNNn.....',
  '....nNLNNNn.....',
  '....nNNNNNn.....',
  '....nBRBRBn.....',
  '....nNNNNNn.....',
  '.....nnnnn......',
  '......nn........',
  '..nnnNNNNnnn....',
  '..nnNLNNNNnn....',
  '...nNNNNNNn.....',
  '...nNNNNNNn.....',
  '...nNNrrNNn.....',
  '...BNNrrNNB.....',
  '....NNNNNN......',
  '....nNNNNn......',
  '....nn..nn......',
  '....nn...nn.....',
  '...nn.....nn....',
  '...nn.....nn....',
  '..Nn.......nN...',
  '..Bn.......nB...',
  '.EEE.......EEE..',
  '.EEE.......EEE..',
];

// Шаг поуже
export const DARK_WALK2 = [
  '.....nnnnn......',
  '....nNNNNNn.....',
  '....nNLNNNn.....',
  '....nNNNNNn.....',
  '....nBRBRBn.....',
  '....nNNNNNn.....',
  '.....nnnnn......',
  '......nn........',
  '..nnnNNNNnnn....',
  '..nnNLNNNNnn....',
  '...nNNNNNNn.....',
  '...nNNNNNNn.....',
  '...nNNrrNNn.....',
  '...BNNrrNNB.....',
  '....NNNNNN......',
  '....nNNNNn......',
  '....nn..nn......',
  '....nn..nn......',
  '...nn....nn.....',
  '...nn....nn.....',
  '...Nn....nN.....',
  '...Bn....nB.....',
  '..EEE....EEE....',
  '..EEE....EEE....',
];

// В прыжке: колени поджаты
export const DARK_JUMP = [
  '.....nnnnn......',
  '....nNNNNNn.....',
  '....nNLNNNn.....',
  '....nNNNNNn.....',
  '....nBRBRBn.....',
  '....nNNNNNn.....',
  '.....nnnnn......',
  '......nn........',
  '..nnnNNNNnnn....',
  '..nnNLNNNNnn....',
  '...nNNNNNNn.....',
  '...nNNNNNNn.....',
  '...nNNrrNNn.....',
  '...BNNrrNNB.....',
  '....NNNNNN......',
  '....nNNNNn......',
  '....nn..nn......',
  '...nnn..nnn.....',
  '...Nn....nN.....',
  '...Bn....nB.....',
  '..EEE....EEE....',
  '..EEE....EEE....',
  '................',
  '................',
];

// Присед-замах перед рывком: сжался, глаза горят (строка 9)
export const DARK_CROUCH = [
  '................',
  '................',
  '................',
  '................',
  '................',
  '................',
  '.....nnnnn......',
  '....nNNNNNn.....',
  '....nNLNNNn.....',
  '....nBRBRBn.....',
  '....nNNNNNn.....',
  '..nnnnnnnnnn....',
  '..nnNNNNNNnn....',
  '...nNNNNNNn.....',
  '...nNNrrNNn.....',
  '...BNNrrNNB.....',
  '...nNNNNNNn.....',
  '..nnnNNNNnnn....',
  '..nn......nn....',
  '..Nn......nN....',
  '..Bn......nB....',
  '..Bn......nB....',
  '.EEE......EEE...',
  '.EEE......EEE...',
];

// Цикл ходьбы тёмного рыцаря
export const DARK_WALK_CYCLE = [
  { frame: DARK_WALK1, dy: 0 },
  { frame: DARK_IDLE, dy: -1 },
  { frame: DARK_WALK2, dy: 0 },
  { frame: DARK_IDLE, dy: -1 },
];

// ---------- ОГР-БОСС 32x40: громадный красный огр ----------
// Руки всегда подняты — он держит молот НАД ГОЛОВОЙ двумя руками.
// Сам молот рисуется кодом (boss.js), чтобы им можно было махать.

// Обычная стойка: руки опущены вдоль тела, молот держится внизу
export const OGRE_IDLE = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '.............KKKKKKK............',
  '............KOOOOOOOK...........',
  '...........KOOOOOOOOOK..........',
  '...........KOOPPPPPOOK..........',
  '...........KOOPPPPPOOK..........',
  '...........KOOOOOOOOOK..........',
  '...........KOKYYOYYKOK..........',
  '...........KOYYYOYYYOK..........',
  '...........KOOOOOOOOOK..........',
  '...........KOOTTKTTOOK..........',
  '...........KOOTTKTTOOK..........',
  '...........KOOTTOTTOOK..........',
  '.....KKKKKKKOOOOOOOOOKKKKKK.....',
  '....KOOOOOOOOOOOOOOOOOOOOOOK....',
  '....KOOOOOOOOOOOOOOOOOOOOOOK....',
  '....KOOOOOOOOOOOOOOOOOOOOOOK....',
  '..KKKOOOOOOOOOOOOOOOOOOOOOOKKK..',
  '.KOOOOOKOPPPPOOOOOOPPPPOKOOOOOK.',
  '.KOOOOOKOPPPPOOOOOOPPPPOKOOOOOK.',
  '.KOOOOOKOPPPPOOOOOOPPPPOKOOOOOK.',
  '.KOOOOOKOPPPPOOOOOOPPPPOKOOOOOK.',
  '.KOOOOOKOOOOOOOOOOOOOOOOKOOOOOK.',
  '.KOOOOOKOOOOOOOOOOOOOOOOKOOOOOK.',
  'KOOOOOOKUUUUUUUUUUUUUUUUKOOOOOOK',
  'KOPPPOOKUUUUUUUUUUUUUUUUKOOPPPOK',
  'KOPPPOOKUUUUUUUUUUUUUUUUKOOPPPOK',
  'KOOOOOOKUOOOOOOUUOOOOOOUKOOOOOOK',
  'KOOOOOOKKOOOOOOKKOOOOOOKKOOOOOOK',
  'KOOOOOOKKOOOOOOKKOOOOOOKKOOOOOOK',
  '.KKKKKK.KOOOOOOKKOOOOOOK.KKKKKK.',
  '.......KTTTTTTOKKOTTTTTTK.......',
  '.......KTTTTTTOKKOTTTTTTK.......',
];

// Шаг: ноги расставлены шире
export const OGRE_WALK = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '.............KKKKKKK............',
  '............KOOOOOOOK...........',
  '...........KOOOOOOOOOK..........',
  '...........KOOPPPPPOOK..........',
  '...........KOOPPPPPOOK..........',
  '...........KOOOOOOOOOK..........',
  '...........KOKYYOYYKOK..........',
  '...........KOYYYOYYYOK..........',
  '...........KOOOOOOOOOK..........',
  '...........KOOTTKTTOOK..........',
  '...........KOOTTKTTOOK..........',
  '...........KOOTTOTTOOK..........',
  '.....KKKKKKKOOOOOOOOOKKKKKK.....',
  '....KOOOOOOOOOOOOOOOOOOOOOOK....',
  '....KOOOOOOOOOOOOOOOOOOOOOOK....',
  '....KOOOOOOOOOOOOOOOOOOOOOOK....',
  '..KKKOOOOOOOOOOOOOOOOOOOOOOKKK..',
  '.KOOOOOKOPPPPOOOOOOPPPPOKOOOOOK.',
  '.KOOOOOKOPPPPOOOOOOPPPPOKOOOOOK.',
  '.KOOOOOKOPPPPOOOOOOPPPPOKOOOOOK.',
  '.KOOOOOKOPPPPOOOOOOPPPPOKOOOOOK.',
  '.KOOOOOKOOOOOOOOOOOOOOOOKOOOOOK.',
  '.KOOOOOKOOOOOOOOOOOOOOOOKOOOOOK.',
  'KOOOOOOKUUUUUUUUUUUUUUUUKOOOOOOK',
  'KOPPPOOKUUUUUUUUUUUUUUUUKOOPPPOK',
  'KOPPPOOKUUUUUUUUUUUUUUUUKOOPPPOK',
  'KOOOOOOOOOOOOOUUUUOOOOOOOOOOOOOK',
  'KOOOOOOOOOOOOOKKKKOOOOOOOOOOOOOK',
  'KOOOOOOOOOOOOOK..KOOOOOOOOOOOOOK',
  '.KKKKKKOOOOOOOK..KOOOOOOOKKKKKK.',
  '.....KTTTTTTTOK..KOTTTTTTTK.....',
  '.....KTTTTTTTOK..KOTTTTTTTK.....',
];

// Замах: руки взлетают вверх, занося молот над головой
export const OGRE_RAISE = [
  '..KOOOOOOK............KOOOOOOK..',
  '..KOPPPOOK............KOOPPPOK..',
  '..KOPPPOOK............KOOPPPOK..',
  '..KOOOOOOK............KOOOOOOK..',
  '..KOOOOOOK............KOOOOOOK..',
  '...KOOOOOK............KOOOOOK...',
  '...KOOOOOK............KOOOOOK...',
  '...KOOOOOK............KOOOOOK...',
  '...KOOOOOK...KKKKKKK..KOOOOOK...',
  '...KOOOOOK..KOOOOOOOK.KOOOOOK...',
  '...KOOOOOK.KOOOOOOOOOKKOOOOOK...',
  '...KOOOOOK.KOOPPPPPOOKKOOOOOK...',
  '...KOOOOOK.KOOPPPPPOOKKOOOOOK...',
  '...KOOOOOK.KOOOOOOOOOKKOOOOOK...',
  '...KOOOOOOKKOKYYOYYKOKOOOOOOK...',
  '...KOOOOOOKKOYYYOYYYOKOOOOOOK...',
  '...KOOOOOOKKOOOOOOOOOKOOOOOOK...',
  '...KOOOOOOKKOOTTKTTOOKOOOOOOK...',
  '...KOOOOOOKKOOTTKTTOOKOOOOOOK...',
  '...KOOOOOOKKOOTTOTTOOKOOOOOOK...',
  '...KOOOOOOKKOOOOOOOOOKOOOOOOK...',
  '....KKOOOOOOOOOOOOOOOOOOOOKK....',
  '....KOOOOOOOOOOOOOOOOOOOOOOK....',
  '....KOOPPPPOOOOOOOOOOPPPPOOK....',
  '....KOOPPPPOOOOOOOOOOPPPPOOK....',
  '....KOOPPPPOOOOOOOOOOPPPPOOK....',
  '....KOOPPPPOOOOOOOOOOPPPPOOK....',
  '....KOOOOOOOOOOOOOOOOOOOOOOK....',
  '.....KOOOOOOOOOOOOOOOOOOOOK.....',
  '.....KOOOOOOOOOOOOOOOOOOOOK.....',
  '.....KOOOOOOOOOOOOOOOOOOOOK.....',
  '......KOUUUUUUUUUUUUUUUUOK......',
  '.......KUUUUUUUUUUUUUUUUK.......',
  '.......KUUUUUUUUUUUUUUUUK.......',
  '.......KUOOOOOOUUOOOOOOUK.......',
  '........KOOOOOOKKOOOOOOK........',
  '........KOOOOOOKKOOOOOOK........',
  '........KOOOOOOKKOOOOOOK........',
  '.......KTTTTTTOKKOTTTTTTK.......',
  '.......KTTTTTTOKKOTTTTTTK.......',
];

// Удар: руки опущены вперёд-вниз, ведут молот в землю
export const OGRE_SMASH = [
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '................................',
  '.............KKKKKKK............',
  '............KOOOOOOOK...........',
  '...........KOOOOOOOOOK..........',
  '...........KOOPPPPPOOK..........',
  '...........KOOPPPPPOOK..........',
  '...........KOOOOOOOOOK..........',
  '...........KOKYYOYYKOK..........',
  '...........KOYYYOYYYOK..........',
  '...........KOOOOOOOOOK..........',
  '...........KOOTTKTTOOK..........',
  '...........KOOTTKTTOOK..........',
  '...........KOOTTOTTOOKKKKK......',
  '......KKKKKKOOOOOOOOOOOOOOK.....',
  '.....KOOOOOOOOOOOOOOOOOOOOK.....',
  '....KOOOOOOOOOOOOOOOOOOOOOOKK...',
  '....KOOPPPPOOOOOOOOOOPPPPOOOOK..',
  '....KOOPPPPOOOOOOOOOOPPPPOOOOK..',
  '....KOOPPPPOOOOOOOOOOPPPPOOOOKK.',
  '....KOOPPPPOOOOOOOOOOPPPPOOOOOOK',
  '....KOOOOOOOOOOOOOOOOOOOOOOOOOOK',
  '.....KOOOOOOOOOOOOOOOOOOOOOOOOOK',
  '.....KOOOOOOOOOOOOOOOOOOOOOOOOOO',
  '.....KOOOOOOOOOOOOOOOOOOOOOPPPOO',
  '......KOUUUUUUUUUUUUUUUUOKOPPPOO',
  '.......KUUUUUUUUUUUUUUUUKKOOOOOO',
  '.......KUUUUUUUUUUUUUUUUKKOOOOOO',
  '.......KUOOOOOOUUOOOOOOUK.KKKKKK',
  '........KOOOOOOKKOOOOOOK........',
  '........KOOOOOOKKOOOOOOK........',
  '........KOOOOOOKKOOOOOOK........',
  '.......KTTTTTTOKKOTTTTTTK.......',
  '.......KTTTTTTOKKOTTTTTTK.......',
];

export const OGRE_WALK_CYCLE = [
  { frame: OGRE_WALK, dy: 0 },
  { frame: OGRE_IDLE, dy: -1 },
];

// ---------- ПРИВИДЕНИЕ 16x22: воющий призрак с рваным подолом ----------

export const GHOST1 = [
  '.....wwwww......',
  '...wwWWWWWww....',
  '..wWWWWWWWWWw...',
  '..wWWWWWWWWWw...',
  '.wWXXWWWWWXXWw..',
  '.wWXXXWWWXXXWw..',
  '.wWWXXXWXXXWWw..',
  '.wWWXXWWWXXWWw..',
  '.wWWWWWWWWWWWw..',
  '.wWWWWXXXWWWWw..',
  '.wWWWXXXXXWWWw..',
  '.wWWWXXXXXWWWw..',
  '.wWWWWXXXWWWWw..',
  '.wWWWWWWWWWWWw..',
  '.wWWWWWWWWWWWw..',
  '.wWWWWWWWWWWWw..',
  '..wWWWWWWWWWw...',
  '..vwWWWWWWWwv...',
  '..v.vwWWWwv.v...',
  '..v..v.w.v..v...',
  '.....v...v......',
  '................',
];

// Вторая фаза: подол колышется в другую сторону
export const GHOST2 = [
  '.....wwwww......',
  '...wwWWWWWww....',
  '..wWWWWWWWWWw...',
  '..wWWWWWWWWWw...',
  '.wWXXWWWWWXXWw..',
  '.wWXXXWWWXXXWw..',
  '.wWWXXXWXXXWWw..',
  '.wWWXXWWWXXWWw..',
  '.wWWWWWWWWWWWw..',
  '.wWWWWXXXWWWWw..',
  '.wWWWXXXXXWWWw..',
  '.wWWWXXXXXWWWw..',
  '.wWWWWXXXWWWWw..',
  '.wWWWWWWWWWWWw..',
  '.wWWWWWWWWWWWw..',
  '..wWWWWWWWWWw...',
  '..wWWWWWWWWWw...',
  '..vwWWWWWWWwv...',
  '..v..vwWWWv.v...',
  '.....v.w..v.....',
  '......v.........',
  '................',
];

export const GHOST_FRAMES = [GHOST1, GHOST2];

// ---------- ОТРИСОВКА ----------
// Каждая матрица один раз переводится в невидимый канвас (обычный
// и зеркальный), дальше рисуется мгновенно.
const cache = new Map();

function renderMatrix(matrix, flip) {
  const h = matrix.length;
  const w = matrix[0].length;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      const ch = matrix[row][flip ? w - 1 - col : col];
      if (ch === '.') continue;
      const color = PALETTE[ch];
      if (!color) continue; // неизвестная буква — пропускаем
      ctx.fillStyle = color;
      ctx.fillRect(col, row, 1, 1);
    }
  }
  return c;
}

// Нарисовать спрайт. flip=true — отзеркалить (смотрит влево)
export function drawSprite(ctx, matrix, x, y, flip = false) {
  let entry = cache.get(matrix);
  if (!entry) {
    entry = { normal: renderMatrix(matrix, false), flipped: renderMatrix(matrix, true) };
    cache.set(matrix, entry);
  }
  ctx.drawImage(flip ? entry.flipped : entry.normal, Math.round(x), Math.round(y));
}
