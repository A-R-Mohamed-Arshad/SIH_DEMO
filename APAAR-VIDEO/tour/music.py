"""Warm background score for the detailed demo (original composition, sampled instruments, CC0 except where noted).
D major, 90 bpm. Upright piano arpeggios, cello/violin pads, vibraphone melody, pizzicato bass, a soft shaker.
Builds gently over the first minute, stays light under the voice (ducking happens in the edit), resolves at the end.

  LIB=/root/lemo-opuscar $LIB/.venv/bin/python APAAR-VIDEO/tour/music.py <seconds> <out.wav>
"""
import os
import sys

import numpy as np
import soundfile as sf

LIB = os.environ.get("LIB", "/root/lemo-opuscar"); sys.path.insert(0, LIB)
from core.audio import sampler as S  # noqa: E402

DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 540.0
OUT = sys.argv[2] if len(sys.argv) > 2 else "warm.wav"
S.seed(26263)
BPM = 90; B = 60 / BPM; BAR = 4 * B
# chords: (bass root, chord tones for piano/pads)
PROG_A = [("D2", ["D3", "F#3", "A3", "D4"]), ("B1", ["B2", "D3", "F#3", "B3"]), ("G1", ["G2", "B2", "D3", "G3"]), ("A1", ["A2", "C#3", "E3", "A3"])]
PROG_B = [("D2", ["D3", "F#3", "A3", "D4"]), ("A1", ["C#3", "E3", "A3", "C#4"]), ("B1", ["B2", "D3", "F#3", "B3"]), ("G1", ["G2", "B2", "D3", "G3"])]
MEL = [["F#5", "E5", "D5", "A4"], ["D5", "B4", "A4", "F#4"], ["G4", "B4", "D5", "B4"], ["A4", "C#5", "E5", "D5"]]

ev = []
def N(t, inst, p, d, v, pan=0.0, g=1.0, **kw):
    e = {"t": t, "inst": inst, "pitch": p, "dur": d, "vel": v, "pan": pan, "gain": g}; e.update(kw); ev.append(e)

nbars = int(DUR / BAR) + 1
for n in range(nbars):
    t0 = n * BAR
    sec = (n // 16) % 2                                  # alternate the progression every 16 bars
    root, tones = (PROG_A if sec == 0 else PROG_B)[n % 4]
    build = min(1.0, n / 24)                              # first minute: gentle build
    last = n >= nbars - 4
    # piano: broken chord in eighths, softer on off-beats
    for k in range(8):
        tone = tones[[0, 2, 1, 3, 2, 1, 3, 2][k]]
        N(t0 + k * B / 2, "upright", S.midi(tone) + 12, B * 1.4, .42 if k % 2 == 0 else .3, -.2)
    # pads: cellos on the root, violins on the third/fifth once the build passes halfway
    N(t0, "cellos", S.midi(tones[1]), BAR + .3, .22 + .1 * build, -.3, attack=.35, gain=.7)
    if build > .5 and not last:
        N(t0, "violins", tones[2].replace("3", "4"), BAR + .3, .22 * build, .3, attack=.5)
    # bass: pizzicato on 1 and 3
    if n >= 4:
        N(t0, "contrabass_pizz", root, B, .45, 0, g=.6)
        N(t0 + 2 * B, "contrabass_pizz", root.replace("1", "2") if "1" in root else root, B, .35, 0, g=.6)
    # shaker eighths after the intro, light
    if 8 <= n < nbars - 2:
        for k in range(8):
            N(t0 + k * B / 2 + .01, "shaker", None, .2, .22 if k % 2 else .3, .25)
    # vibraphone melody every other 4-bar phrase
    if n >= 8 and (n // 4) % 2 == 1 and not last:
        for k, p in enumerate(MEL[n % 4]):
            N(t0 + k * B, "vibraphone", p, B * 1.6, .38, .35)
# final chord
end = nbars * BAR
for p in ["D3", "F#3", "A3", "D4"]:
    N(end - 2.5, "upright", p, 3.0, .35, -.1)

events = []
for e in ev:
    if e["pitch"] is None:
        events.append((e["t"], e["inst"], None, e["dur"], e["vel"], e["pan"], e["gain"]))
    else:
        d = {"t": e["t"], "inst": e["inst"], "pitch": e["pitch"], "dur": e["dur"], "vel": e["vel"], "pan": e["pan"], "gain": e["gain"]}
        if "attack" in e: d["attack"] = e["attack"]
        events.append(d)
# the sampler takes unpitched hits as pitch=None tuples via hit(); render them separately for clarity
pitched = [x for x in events if isinstance(x, dict)]
mix = S.render(pitched, dur=DUR + 2)
for (t, inst, _, d, v, pan, g) in [x for x in events if not isinstance(x, dict)]:
    h = S.hit(inst, "down" if int(t / (B / 2)) % 2 == 0 else "up", vel=v, dur=d)
    i = int(t * 48000)
    if i + len(h) <= len(mix):
        h = h if h.ndim == 1 else h.mean(1)
        mix[i:i + len(h), 0] += h * g * (1 - max(0, pan)) * 1.4
        mix[i:i + len(h), 1] += h * g * (1 + min(0, pan)) * 1.4
from scipy.signal import butter, sosfilt
hp = butter(2, 70, "high", fs=48000, output="sos")
mix = np.stack([sosfilt(hp, mix[:, 0]), sosfilt(hp, mix[:, 1])], 1)
mix = S.room(mix, size=.45, mix=.18)
peak = np.abs(mix).max(); mix = mix / peak * 0.7
fade = np.ones(len(mix)); n = int(3 * 48000); fade[-n:] = np.linspace(1, 0, n); mix *= fade[:, None]
sf.write(OUT, mix.astype(np.float32), 48000, subtype="PCM_16")
print("music", OUT, round(len(mix) / 48000, 1), "s")
print("\n".join(S.credits(["upright", "cellos", "violins", "contrabass_pizz", "shaker", "vibraphone"])))
