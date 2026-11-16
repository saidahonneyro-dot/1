# Театр пива — Акт I «Дар Нинкаси» (ролик)

Вертикальный ролик 1080×1920, 30 fps, 59,5 с по сценарию экскурсии «Театр пива: великая мистерия в камне».

- `output/teatr-piva-akt1-dar-ninkasi.mp4` — готовый ролик
- `assets/voiceover.mp3` — озвучка
- `src/relief.js` — барельеф (SVG-карта высот + освещение)
- `src/wall.js` — фон-кладка
- `src/scene.html` — сцена: камера, свет, искры, субтитры, заставка
- `src/render.js` — покадровый рендер (Playwright → ffmpeg)
- `src/audio.py` — синтез звуковой подложки

Сборка: `npm i && node src/relief.js && node src/wall.js && node src/render.js && python3 src/audio.py`, затем сведение ffmpeg.
