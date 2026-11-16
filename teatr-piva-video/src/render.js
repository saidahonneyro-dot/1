// Покадровый рендер сцены через Chromium -> ffmpeg.
// node src/render.js            — весь ролик (build/video_silent.mp4)
// node src/render.js stills 3 8 — контрольные кадры на указанных секундах
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const FPS = 30, DUR = 59.5;
const root = path.join(__dirname, '..');

(async () => {
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(root, 'src', 'scene.html'));
  await page.evaluate(() => window.ready);
  await page.evaluate(() => document.fonts.load('600 40px CG').then(() => document.fonts.load('700 40px CSC')));

  if (process.argv[2] === 'stills') {
    fs.mkdirSync(path.join(root, 'build', 'stills'), { recursive: true });
    for (const s of process.argv.slice(3).map(Number)) {
      await page.evaluate((f) => window.setFrame(f), Math.round(s * FPS));
      await page.screenshot({ path: path.join(root, 'build', 'stills', `t${String(s).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 80 });
    }
    await browser.close();
    return;
  }

  const total = Math.round(FPS * DUR);
  const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(root, 'build', 'video_silent.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  const t0 = Date.now();
  for (let f = 0; f < total; f++) {
    await page.evaluate((n) => window.setFrame(n), f);
    const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) console.log(`${f}/${total} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log('done');
})();
