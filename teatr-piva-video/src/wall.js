// Фон: тёмная каменная кладка (1080x1920) + перевод рельефа в JPEG.
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const W = 1080, H = 1920;
let seams = '';
const rowH = 240;
for (let r = 0; r <= H / rowH; r++) {
  const y = r * rowH;
  seams += `<rect x="0" y="${y - 4}" width="${W}" height="8" fill="rgb(40,40,40)"/>`;
  const off = r % 2 ? 0 : 270;
  for (let x = off; x <= W; x += 540) seams += `<rect x="${x - 4}" y="${y}" width="8" height="${rowH}" fill="rgb(40,40,40)"/>`;
}
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<defs><filter id="f" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="s"/>
  <feColorMatrix in="s" type="luminanceToAlpha" result="hA"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="2" seed="5" result="n1"/>
  <feColorMatrix in="n1" type="luminanceToAlpha" result="n1a"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="4" seed="9" result="n2"/>
  <feColorMatrix in="n2" type="luminanceToAlpha" result="n2a"/>
  <feComposite in="hA" in2="n1a" operator="arithmetic" k2="1" k3="0.05" result="h1"/>
  <feComposite in="h1" in2="n2a" operator="arithmetic" k2="1" k3="0.14" result="h"/>
  <feDiffuseLighting in="h" surfaceScale="22" diffuseConstant="1.1" lighting-color="#5b4630">
    <feDistantLight azimuth="232" elevation="36"/>
  </feDiffuseLighting>
</filter></defs>
<g filter="url(#f)"><rect width="${W}" height="${H}" fill="rgb(120,120,120)"/>${seams}</g>
</svg>`;

(async () => {
  const out = path.join(__dirname, '..', 'build');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(`<html><body style="margin:0;background:#000">${svg}</body></html>`);
  await page.screenshot({ path: path.join(out, 'wall.png') });
  await browser.close();
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(out, 'wall.png'), '-q:v', '2', path.join(out, 'wall.jpg')]);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', path.join(out, 'relief.png'), '-q:v', '2', path.join(out, 'relief.jpg')]);
  console.log('ok');
})();
