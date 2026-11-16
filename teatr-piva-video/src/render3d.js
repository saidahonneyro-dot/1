// Покадровый рендер 3D-сцены (three.js в Chromium, программный WebGL) -> ffmpeg.
// node src/render3d.js stills 3 8 21     — контрольные кадры
// node src/render3d.js range 0 600 a     — кадры [0,600) в build/part_a.mp4 (для параллельного рендера)
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const FPS = 30, DUR = 59.5;
const root = path.join(__dirname, '..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.json': 'application/json' };

(async () => {
  const server = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.text().slice(0, 300)); });
  page.on('pageerror', (e) => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/src/scene3d.html?${process.env.Q || ''}`);
  await page.evaluate(() => window.ready);

  const mode = process.argv[2];
  if (mode === 'stills') {
    fs.mkdirSync(path.join(root, 'build', 'stills3d'), { recursive: true });
    for (const s of process.argv.slice(3).map(Number)) {
      const t0 = Date.now();
      await page.evaluate((f) => window.setFrame(f), Math.round(s * FPS));
      await page.screenshot({ path: path.join(root, 'build', 'stills3d', `t${s.toFixed(1).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 85 });
      console.log(s, Date.now() - t0, 'ms');
    }
  } else {
    const a = Number(process.argv[3] || 0), b = Number(process.argv[4] || Math.round(FPS * DUR)), tag = process.argv[5] || 'all';
    const ff = spawn('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '12', '-pix_fmt', 'yuv420p', '-r', String(FPS), path.join(root, 'build', `part_${tag}.mp4`)], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = a; f < b; f++) {
      await page.evaluate((n) => window.setFrame(n), f);
      const buf = await page.screenshot({ type: 'jpeg', quality: 96 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((f - a) % 30 === 0) console.log(`${tag} ${f - a}/${b - a} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log('done', tag);
  }
  await browser.close();
  server.close();
})();
