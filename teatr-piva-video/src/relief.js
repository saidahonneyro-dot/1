// Генерирует SVG «каменного барельефа» Акта I (карта высот + освещение) и сохраняет PNG.
// Запуск: node src/relief.js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const W = 3000, H = 1920;
const g = (v) => `rgb(${v},${v},${v})`; // уровень высоты -> серый
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

const el = [];
const add = (s) => el.push(s);
const line = (pts, w, lv, extra = '') =>
  add(`<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${g(lv)}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`);
const poly = (pts, lv, extra = '') =>
  add(`<polygon points="${pts.map((p) => p.join(',')).join(' ')}" fill="${g(lv)}" ${extra}/>`);
const circ = (x, y, r, lv, extra = '') => add(`<circle cx="${x}" cy="${y}" r="${r}" fill="${g(lv)}" ${extra}/>`);
const ell = (x, y, rx, ry, lv, extra = '') => add(`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${g(lv)}" ${extra}/>`);
const rect = (x, y, w, h, lv, extra = '') => add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${g(lv)}" ${extra}/>`);
const pathS = (d, lv, extra = '') => add(`<path d="${d}" fill="${g(lv)}" ${extra}/>`);
const pathL = (d, w, lv, extra = '') =>
  add(`<path d="${d}" fill="none" stroke="${g(lv)}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`);

const BG = 78;

// ---------- фон и рама ----------
rect(0, 0, W, H, BG);
// карниз с клинописью
rect(60, 60, W - 120, 200, 128);
rect(60, 60, W - 120, 16, 170);
rect(60, 244, W - 120, 16, 170);
function wedge(x, y, len, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const hw = 9;
  const p = [
    [x - s * hw, y + c * hw],
    [x + s * hw, y - c * hw],
    [x + c * 14, y + s * 14],
  ];
  poly(p, 52);
  line([[x + c * 8, y + s * 8], [x + c * len, y + s * len]], 5, 52);
}
for (let row = 0; row < 3; row++) {
  for (let x = 110; x < W - 130; x += 62) {
    const y = 100 + row * 52;
    const n = 2 + Math.floor(rnd() * 4);
    for (let i = 0; i < n; i++) {
      const t = Math.floor(rnd() * 3);
      const ang = t === 0 ? Math.PI / 2 : t === 1 ? 0 : Math.PI / 4;
      wedge(x + rnd() * 34, y + rnd() * 16, 16 + rnd() * 14, ang);
    }
  }
}

// ---------- земля, реки, предел с оружием ----------
rect(60, 1640, W - 120, 34, 168);
// воды Тигра и Евфрата (слева и в центре)
for (let r = 0; r < 5; r++) {
  const y = 1715 + r * 34;
  let d = `M 70 ${y}`;
  for (let x = 70; x < 1840; x += 60) d += ` q 15 ${r % 2 ? -22 : 22} 30 0 t 30 0`;
  pathL(d, 11, 138);
}
// разделитель
rect(1850, 1674, 26, 186, 150);
// предел: сложенное оружие
rect(1876, 1674, W - 1936, 186, 96);
// копьё
line([[1960, 1742], [2820, 1742]], 16, 172);
poly([[2820, 1716], [2910, 1742], [2820, 1768]], 190);
// топор
line([[1960, 1812], [2330, 1812]], 16, 165);
pathS('M 2260 1780 Q 2360 1770 2380 1812 Q 2360 1850 2260 1842 Z', 190);
// кинжал
poly([[2450, 1800], [2660, 1812], [2450, 1826]], 185);
rect(2400, 1800, 50, 26, 160);
rect(2440, 1786, 14, 54, 180);
// лук
pathL('M 2700 1792 Q 2790 1850 2890 1792', 13, 172);
line([[2700, 1792], [2890, 1792]], 4, 150);

// нижняя кромка
rect(60, 1860, W - 120, 20, 170);

// ---------- тростник по краям ----------
function reed(x, h, lean) {
  const topx = x + lean, topy = 1640 - h;
  pathL(`M ${x} 1640 Q ${x + lean * 0.2} ${1640 - h * 0.5} ${topx} ${topy}`, 10, 140);
  ell(topx, topy - 28, 9, 34, 160, `transform="rotate(${lean * 0.25} ${topx} ${topy})"`);
  pathL(`M ${x + lean * 0.15} ${1640 - h * 0.45} q ${lean > 0 ? 50 : -50} -60 ${lean > 0 ? 70 : -70} -150`, 7, 132);
}
[[100, 520, -10], [140, 700, 14], [185, 430, 30]].forEach((a) => reed(...a));
[[2885, 560, -18], [2925, 760, 6]].forEach((a) => reed(...a));

// ---------- солнце ----------
const SX = 600, SY = 500;
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4 - Math.PI / 2;
  const a2 = a + Math.PI / 8;
  // острые лучи
  poly(
    [
      [SX + Math.cos(a - 0.16) * 130, SY + Math.sin(a - 0.16) * 130],
      [SX + Math.cos(a) * 262, SY + Math.sin(a) * 262],
      [SX + Math.cos(a + 0.16) * 130, SY + Math.sin(a + 0.16) * 130],
    ],
    176
  );
  // волнистые лучи
  let d = '';
  for (let k = 0; k <= 10; k++) {
    const r = 140 + k * 10;
    const off = Math.sin(k * 1.3) * 0.07;
    d += `${k ? 'L' : 'M'} ${SX + Math.cos(a2 + off) * r} ${SY + Math.sin(a2 + off) * r} `;
  }
  pathL(d, 11, 150);
}
circ(SX, SY, 138, 196);
circ(SX, SY, 104, 150);
circ(SX, SY, 92, 215);
circ(SX, SY, 30, 165);

// ---------- зиккурат ----------
const ZX = 600;
const tiers = [[840, 1640, 1500, 140], [690, 1500, 1360, 152], [540, 1360, 1220, 164], [400, 1220, 1085, 176], [270, 1085, 960, 188]];
tiers.forEach(([w, yb, yt, lv]) => {
  poly([[ZX - w / 2 - 14, yb], [ZX - w / 2 + 10, yt], [ZX + w / 2 - 10, yt], [ZX + w / 2 + 14, yb]], lv);
  rect(ZX - w / 2 + 6, yt, w - 12, 14, lv + 22);
  for (let x = ZX - w / 2 + 38; x < ZX + w / 2 - 30; x += 44) {
    if (Math.abs(x - ZX) < 70) continue;
    rect(x, yt + 34, 12, yb - yt - 50, lv - 34);
  }
});
// святилище на вершине
rect(ZX - 84, 868, 168, 92, 200);
rect(ZX - 96, 852, 192, 18, 222);
rect(ZX - 22, 896, 44, 64, 120);
// парадная лестница
poly([[ZX - 62, 1640], [ZX - 34, 960], [ZX + 34, 960], [ZX + 62, 1640]], 206);
for (let y = 990; y < 1640; y += 26) {
  const k = (y - 960) / 680;
  line([[ZX - 30 - 26 * k, y], [ZX + 30 + 26 * k, y]], 5, 150);
}

// ---------- звезда-дингир над жрицей ----------
function star(x, y, r, lv) {
  const p = [];
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rr = i % 2 ? r * 0.36 : r;
    p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  poly(p, lv);
  circ(x, y, r * 0.22, lv + 25);
}
star(1290, 470, 96, 178);

// ---------- пар над чаном ----------
[[1600, 0], [1680, 1], [1760, 0]].forEach(([x, f]) => {
  let d = `M ${x} 1240`;
  for (let k = 0; k < 4; k++) d += ` q ${(k + f) % 2 ? 60 : -60} -80 0 -160`;
  pathL(d, 15, 128);
});
// завиток-спираль (дух брожения)
pathL('M 1680 590 q 70 -10 70 -70 q 0 -60 -60 -60 q -50 0 -50 46 q 0 34 34 34', 14, 140);

// ---------- жрица Нинкаси ----------
// весло-мешалка (за руками, уходит в чан)
line([[1452, 800], [1612, 1420]], 24, 214);
ell(1456, 790, 22, 30, 214);
// платье
pathS('M 1218 950 Q 1290 915 1362 950 L 1392 1160 L 1418 1608 L 1168 1608 L 1196 1160 Z', 170);
// ярусы каунакеса
for (let k = 0; k < 5; k++) {
  const y = 1180 + k * 88;
  const half = 100 + (y - 1160) * 0.055 + 8;
  let d = `M ${1293 - half} ${y}`;
  const n = 9;
  const step = (2 * half) / n;
  for (let i = 0; i < n; i++) d += ` q ${step / 2} 34 ${step} 0`;
  pathL(d, 8, 112);
}
// пояс и ворот
rect(1196, 1140, 196, 26, 198);
pathL('M 1236 962 Q 1290 1010 1344 962', 9, 120);
// ступни
ell(1250, 1626, 52, 18, 186);
ell(1350, 1626, 52, 18, 186);
// шея, голова
rect(1266, 880, 50, 70, 186);
circ(1294, 836, 64, 196);
// волосы: пучок и пряди на спину
circ(1226, 846, 40, 182);
pathS('M 1232 800 Q 1196 900 1210 1010 L 1246 1010 Q 1238 900 1262 836 Z', 180);
// нос, глаз, губы
poly([[1348, 820], [1374, 850], [1348, 860]], 196);
pathS('M 1306 824 q 22 -14 40 0 q -18 14 -40 0 Z', 120);
line([[1346, 878], [1362, 878]], 5, 130);
// рогатая тиара богини
rect(1244, 756, 106, 30, 214);
pathS('M 1250 760 Q 1297 690 1344 760 Z', 204);
pathL('M 1240 760 Q 1210 720 1232 680', 13, 214);
pathL('M 1354 760 Q 1384 720 1362 680', 13, 214);
// руки
line([[1330, 985], [1420, 1075], [1500, 1015]], 44, 190);
line([[1300, 990], [1384, 1112], [1536, 1170]], 44, 186);
circ(1504, 1012, 27, 200);
circ(1540, 1172, 27, 200);
// браслеты
line([[1470, 1022], [1486, 1046]], 9, 222);

// ---------- глиняный чан ----------
pathS('M 1470 1300 Q 1400 1470 1520 1640 L 1740 1640 Q 1860 1470 1790 1300 Z', 184);
// пена
[[1500, 1288, 34], [1552, 1272, 40], [1612, 1264, 44], [1676, 1270, 40], [1732, 1282, 36], [1770, 1294, 26], [1586, 1240, 26], [1650, 1236, 28]].forEach(([x, y, r]) => circ(x, y, r, 222));
// венчик
add(`<rect x="1452" y="1296" width="356" height="34" rx="17" fill="${g(214)}"/>`);
// орнамент
let zz = 'M 1448 1420';
for (let i = 0; i < 12; i++) zz += ` l 15.5 -34 l 15.5 34`;
pathL(zz, 8, 126, 'clip-path="url(#vatclip)"');
pathL('M 1440 1372 H 1820', 7, 130, 'clip-path="url(#vatclip)"');
pathL('M 1440 1446 H 1820', 7, 130, 'clip-path="url(#vatclip)"');
pathL('M 1440 1560 H 1820', 7, 130, 'clip-path="url(#vatclip)"');
// ручки
pathL('M 1444 1400 q -52 30 -6 84', 16, 190);
pathL('M 1816 1400 q 52 30 6 84', 16, 190);

// ---------- ячмень ----------
function barley(x, top, lean) {
  const tx = x + lean, ty = top;
  pathL(`M ${x} 1640 Q ${x} ${(1640 + top) / 2} ${tx} ${ty + 250}`, 9, 150);
  const ang = Math.atan2(lean, 250 + 300) * 0;
  for (let k = 0; k < 9; k++) {
    const y = ty + 250 - k * 28;
    const xx = tx + (lean * 0.12 * k) / 9;
    ell(xx - 16, y, 11, 22, 186, `transform="rotate(-28 ${xx - 16} ${y})"`);
    ell(xx + 16, y, 11, 22, 186, `transform="rotate(28 ${xx + 16} ${y})"`);
    line([[xx - 22, y - 16], [xx - 44, y - 62]], 3, 150);
    line([[xx + 22, y - 16], [xx + 44, y - 62]], 3, 150);
  }
  ell(tx + lean * 0.12, ty - 8, 11, 24, 190);
}
barley(1880, 700, 0);
barley(1880, 820, -36);
barley(1880, 820, 36);

// ---------- сосуд с пивом ----------
const VX = 2400;
poly([[VX - 70, 1500], [VX + 70, 1500], [VX + 110, 1640], [VX - 110, 1640]], 160);
line([[VX - 84, 1560], [VX + 84, 1560]], 7, 118);
ell(VX, 1340, 158, 176, 188);
rect(VX - 62, 1140, 124, 70, 188);
add(`<rect x="${VX - 84}" y="1124" width="168" height="30" rx="15" fill="${g(214)}"/>`);
// орнамент сосуда
pathL(`M ${VX - 150} 1300 Q ${VX} 1340 ${VX + 150} 1300`, 7, 128);
pathL(`M ${VX - 156} 1370 Q ${VX} 1412 ${VX + 156} 1370`, 7, 128);
for (let i = -3; i <= 3; i++) circ(VX + i * 40, 1352 - Math.abs(i) * 3, 9, 128);
// полумесяц и звезда над сосудом (небеса)
pathS(`M ${VX - 96} 560 A 100 100 0 1 0 ${VX + 96} 560 A 112 84 0 1 1 ${VX - 96} 560 Z`, 180);
star(VX, 520, 54, 196);

// ---------- сидящие фигуры ----------
function seated(x, king) {
  // табурет
  rect(x - 96, 1440, 176, 200, 150);
  line([[x - 86, 1452], [x + 70, 1628]], 7, 112);
  line([[x + 70, 1452], [x - 86, 1628]], 7, 112);
  rect(x - 104, 1428, 192, 22, 176);
  // торс
  add(`<rect x="${x - 80}" y="1042" width="140" height="330" rx="50" fill="${g(180)}"/>`);
  // юбка-каунакес: бёдра и голени
  pathS(`M ${x - 80} 1296 L ${x + 150} 1296 Q ${x + 186} 1300 ${x + 186} 1340 L ${x + 178} 1604 L ${x + 52} 1604 L ${x + 52} 1428 L ${x - 80} 1428 Z`, 172);
  for (let k = 0; k < 3; k++) {
    const y = 1440 + k * 60;
    let d = `M ${x + 56} ${y}`;
    for (let i = 0; i < 4; i++) d += ` q 15 26 30 0`;
    pathL(d, 7, 114);
  }
  let d2 = `M ${x - 70} 1372`;
  for (let i = 0; i < 8; i++) d2 += ` q 15 26 30 0`;
  pathL(d2, 7, 114);
  ell(x + 150, 1624, 56, 18, 186);
  // шея, голова
  rect(x - 20, 1000, 50, 60, 186);
  circ(x + 6, 960, 60, 196);
  poly([[x + 58, 944], [x + 82, 974], [x + 56, 984]], 196);
  pathS(`M ${x + 16} 948 q 22 -14 40 0 q -18 14 -40 0 Z`, 120);
  if (king) {
    // борода
    pathS(`M ${x + 2} 990 L ${x + 70} 992 Q ${x + 84} 1060 ${x + 50} 1108 L ${x + 6} 1100 Z`, 186);
    for (let k = 0; k < 4; k++) pathL(`M ${x + 12} ${1014 + k * 22} q 14 12 28 0 q 12 -10 24 0`, 5, 126);
    // волосы-пучок и венец
    circ(x - 56, 972, 36, 184);
    rect(x - 54, 888, 116, 32, 216);
    for (let i = 0; i < 4; i++) poly([[x - 50 + i * 29, 890], [x - 36 + i * 29, 846], [x - 22 + i * 29, 890]], 210);
    rect(x - 54, 912, 116, 8, 150);
  } else {
    // слуга: бритая голова, простая повязка
    line([[x - 46, 926], [x + 58, 926]], 7, 140);
  }
  // рука к трубке
  line([[x + 18, 1092], [x + 104, 1170], [x + 166, 1056]], 42, 190);
  circ(x + 168, 1052, 26, 200);
  // тростниковая трубка: от рта к горлу сосуда
  line([[x + 66, 982], [x + 312, 1150]], 11, 222);
}
add('<g>');
seated(2060, true);
add('</g>');
add(`<g transform="translate(${2 * VX},0) scale(-1,1)">`);
seated(2060, false);
add('</g>');

// внешняя рама
add(`<rect x="30" y="30" width="${W - 60}" height="${H - 60}" fill="none" stroke="${g(205)}" stroke-width="60"/>`);
add(`<rect x="66" y="66" width="${W - 132}" height="${H - 132}" fill="none" stroke="${g(120)}" stroke-width="8"/>`);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <clipPath id="vatclip"><path d="M 1470 1300 Q 1400 1470 1520 1640 L 1740 1640 Q 1860 1470 1790 1300 Z"/></clipPath>
  <filter id="relief" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.6" result="soft"/>
    <feColorMatrix in="soft" type="luminanceToAlpha" result="hA"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="fine"/>
    <feColorMatrix in="fine" type="luminanceToAlpha" result="fineA"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="11" result="coarse"/>
    <feColorMatrix in="coarse" type="luminanceToAlpha" result="coarseA"/>
    <feComposite in="hA" in2="fineA" operator="arithmetic" k1="0" k2="1" k3="0.035" k4="0" result="h1"/>
    <feComposite in="h1" in2="coarseA" operator="arithmetic" k1="0" k2="1" k3="0.10" k4="0" result="hmap"/>
    <feDiffuseLighting in="hmap" surfaceScale="26" diffuseConstant="1.25" lighting-color="#e9cfa2" result="diff">
      <feDistantLight azimuth="232" elevation="34"/>
    </feDiffuseLighting>
    <feSpecularLighting in="hmap" surfaceScale="26" specularConstant="0.28" specularExponent="18" lighting-color="#fff2d6" result="spec">
      <feDistantLight azimuth="232" elevation="42"/>
    </feSpecularLighting>
    <feComposite in="diff" in2="spec" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="lit"/>
    <!-- затемнение низких участков: фигуры читаются светлее фона -->
    <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="ao"/>
    <feColorMatrix in="ao" type="matrix" values="0.75 0 0 0 0.42  0 0.75 0 0 0.40  0 0 0.75 0 0.36  0 0 0 0 1" result="aoc"/>
    <feBlend in="lit" in2="aoc" mode="multiply" result="shaded"/>
    <!-- пятна камня -->
    <feTurbulence type="fractalNoise" baseFrequency="0.004 0.009" numOctaves="5" seed="23" result="mot"/>
    <feColorMatrix in="mot" type="matrix" values="0.5 0.3 0 0 0.55  0.45 0.3 0 0 0.52  0.4 0.3 0 0 0.46  0 0 0 0 1" result="motc"/>
    <feBlend in="shaded" in2="motc" mode="multiply"/>
  </filter>
</defs>
<g filter="url(#relief)">
${el.join('\n')}
</g>
</svg>`;

(async () => {
  const out = path.join(__dirname, '..', 'build');
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'relief.svg'), svg);
  if (process.env.HEIGHT) {
    // чистая карта высот (без освещения) для 3D-версии
    const hsvg = svg.replace('<g filter="url(#relief)">', '<g>');
    const b2 = await chromium.launch();
    const pg = await b2.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await pg.setContent(`<html><body style="margin:0;background:#000">${hsvg}</body></html>`);
    await pg.screenshot({ path: path.join(out, 'height_raw.png') });
    await b2.close();
    console.log('height ok');
    return;
  }
  const scale = Number(process.env.SCALE || 1.5);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  await page.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);
  await page.screenshot({ path: path.join(out, 'relief.png') });
  // уменьшенный предпросмотр
  const p2 = await browser.newPage({ viewport: { width: 1500, height: 960 } });
  await p2.setContent(`<html><body style="margin:0;background:#000"><img src="file://${path.join(out, 'relief.png')}" style="width:1500px"></body></html>`);
  await p2.screenshot({ path: path.join(out, 'relief_preview.png') });
  await browser.close();
  console.log('ok');
})();
