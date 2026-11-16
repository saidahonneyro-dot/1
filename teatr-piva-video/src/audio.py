"""Звуковая подложка (синтез): низкий гул, колокол в начале и на заставке, лёгкий перезвон на «магии».
Запуск: python3 src/audio.py  ->  build/ambient.wav
"""
import os
import wave
import numpy as np

SR, DUR = 44100, 59.5
t = np.arange(int(SR * DUR)) / SR
rng = np.random.default_rng(4)


def bell(t0, f0, amp, tau=5.0):
    """Колокол: негармонические обертоны с разным затуханием."""
    x = np.zeros_like(t)
    tt = t - t0
    m = tt >= 0
    for ratio, a, d in [(0.5, 0.5, 1.4), (1.0, 1.0, 1.0), (1.19, 0.55, 0.8), (1.56, 0.35, 0.6), (2.0, 0.5, 0.5),
                        (2.51, 0.22, 0.35), (2.66, 0.18, 0.3), (3.01, 0.14, 0.25), (4.1, 0.08, 0.18)]:
        x[m] += a * np.sin(2 * np.pi * f0 * ratio * tt[m] + rng.uniform(0, 6.28)) * np.exp(-tt[m] / (tau * d))
    x[m] *= np.minimum(1, tt[m] / 0.004)
    return amp * x


# низкий гул (как варган / орган)
drone = np.zeros_like(t)
for f, a, lf in [(55.0, 0.55, 0.07), (82.5, 0.32, 0.11), (110.3, 0.26, 0.05), (165.2, 0.10, 0.13), (220.5, 0.05, 0.09)]:
    drone += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * (0.75 + 0.25 * np.sin(2 * np.pi * lf * t + rng.uniform(0, 6.28)))
# «воздух» зала: отфильтрованный шум
noise = rng.standard_normal(len(t))
k = np.exp(-np.arange(400) / 60.0)
air = np.convolve(noise, k / k.sum(), mode='same')
drone = drone * 0.05 + air * 0.035
env = np.minimum(1, t / 2.5) * np.minimum(1, (DUR - t) / 2.5)
# подъём к финалу
swell = 1 + 0.9 * np.clip((t - 49.5) / 3.0, 0, 1) * np.clip((58.5 - t) / 2.5, 0, 1)
mix = drone * env * swell

mix += bell(0.05, 110.0, 0.085, 5.5)
mix += bell(54.95, 110.0, 0.11, 5.0)
mix += bell(54.95, 220.0, 0.03, 3.0)
# перезвон на «там рождается магия» и «божественного чуда»
for t0, notes in [(22.75, [880, 1108.7, 1318.5, 1760]), (28.85, [987.8, 1318.5, 1975.5]), (33.1, [1318.5, 1760])]:
    for i, f in enumerate(notes):
        mix += bell(t0 + i * 0.16, f, 0.012, 1.3)

mix = np.clip(mix, -1, 1)
out = os.path.join(os.path.dirname(__file__), '..', 'build', 'ambient.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print('ok', out)
