"""Score, foley and voice -> out/mix.wav. Everything is read from events.json (exported from the page), so sound
and picture share one timeline. The score is original: felt piano, kalimba, upright bass and brushed percussion,
all synthesized here (numpy/scipy). The voice is the Chatterbox narration, placed at the line start times.
Structure (96 bpm, 2.5 s bars):  opening: sparse piano, the kalimba motif arrives with the title  ->  problem: low and
dry, a near-silence before the paper cracks  ->  the turn: band enters  ->  walkthrough: half energy under the voice,
a fill at each chapter seam, drums drop out under the failed verification  ->  architecture: kalimba pulses  ->
close: a second near-silence, then the motif once more."""
import json, os, sys
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB', '/root/lemo-opuscar'); sys.path.insert(0, LIB)
from core.audio.sfx import SR, bp, lp, hp, noise, add, compress, limit, whoosh as sfx_whoosh, thump, pop as sfx_pop, ding as sfx_ding  # noqa: E402

EVJ = json.load(open(os.path.join(HERE, 'events.json'))); E = EVJ['ev']; DUR = EVJ['dur']
LINES = json.load(open(os.path.join(HERE, 'voices', 'lines.json')))
VDUR = json.load(open(os.path.join(HERE, 'voices', 'dur.json')))
rng = np.random.default_rng(26263)
NS = int((DUR + 1.5) * SR)
BPM = 96; B = 60 / BPM; BAR = 4 * B
def tt(d): return np.arange(int(round(d * SR))) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)
NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}
def midi(s): return 12 * (int(s[-1]) + 1) + NOTE[s[:-1]]
def ev_all(tp): return [e for e in E if e['type'] == tp]

# ───────── instruments
def kalimba(f, d=1.6, v=1.0):
    t = tt(d); x = np.zeros_like(t)
    for ratio, a, tau in [(1, 1, .55), (5.93, .32, .12), (16.6, .1, .04)]:
        x += a * np.sin(2 * np.pi * f * ratio * t + rng.random() * 6) * np.exp(-t / tau)
    tick = np.zeros_like(t); n = int(.012 * SR); tick[:n] = hp(noise(.012), 2500) * np.exp(-tt(.012) / .003) * .25
    return ((x + tick) * v * .5).astype(np.float32)
def felt(f, d=2.4, v=1.0):
    t = tt(d); x = np.zeros_like(t)
    for k, a in [(1, 1), (2, .45), (3, .22), (4, .1), (5, .05)]:
        x += a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / (1.3 / (1 + .6 * k)))
    x *= np.minimum(1, t / .006)
    x = lp(x, 2600) * .5 * v
    return x.astype(np.float32)
def bass(f, d=1.0, v=1.0):
    t = tt(d); x = np.sin(2 * np.pi * f * t) * np.exp(-t / .5) + .4 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / .25) + .15 * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t / .12)
    x *= np.minimum(1, t / .004)
    return (lp(x, 900) * .7 * v).astype(np.float32)
def pad(f, d, v=1.0):
    t = tt(d); x = sum(np.sin(2 * np.pi * f * m * t + rng.random() * 6) for m in (1, 1.003, .997, 2.0)) / 4
    e = np.minimum(1, t / (d * .35)) * np.minimum(1, (d - t) / (d * .4)).clip(0)
    return (lp(x, 1400) * e * .3 * v).astype(np.float32)
def brush(d=.45, v=1.0, lo=2200, hi=9000):
    x = bp(noise(d), lo, hi); t = tt(d); e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.6
    return (x * e * .18 * v).astype(np.float32)
def kick(v=1.0): return (thump(v, 58) * .6).astype(np.float32)
def tap(v=1.0, f=1800, tau=.012):
    d = .08; t = tt(d); return ((hp(noise(d), 1200) * np.exp(-t / .006) * .6 + np.sin(2 * np.pi * f * t) * np.exp(-t / tau) * .35) * v).astype(np.float32)

# ───────── buses
music = np.zeros((NS, 2), np.float32); fol = np.zeros((NS, 2), np.float32); voice = np.zeros((NS, 2), np.float32)
def put(bus, x, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= NS or i < 0: return
    x = x[:max(0, min(len(x), NS - i))]
    bus[i:i + len(x), 0] += x * g * (1 - max(0, pan)); bus[i:i + len(x), 1] += x * g * (1 + min(0, pan))

# ───────── score
CH = {  # chord per bar-in-4: (bass root, triad notes, scale for kalimba)
    'A': ('D2', ['D3', 'F#3', 'A3', 'C#4'], 'D'), 'B': ('A1', ['E3', 'G3', 'A3', 'C#4'], 'A'), 'C': ('B1', ['D3', 'F#3', 'A3', 'B3'], 'B'), 'D': ('G1', ['D3', 'G3', 'B3', 'D4'], 'G')}
PROG = ['A', 'B', 'C', 'D']
PENT = [midi(n) for n in ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6']]
def bar_t(n): return (n - 1) * BAR
def section(t):  # which part of the film are we in
    if t < 20: return 'open'
    if t < 50: return 'problem'
    if t < 70: return 'turn'
    if t < 190: return 'walk'
    if t < 220: return 'arch'
    return 'close'
VO_RANGES = [(l['start'], l['start'] + VDUR[l['id']]) for l in LINES]
def under_voice(t): return any(a - .2 <= t <= b + .2 for a, b in VO_RANGES)
TAMPER = next((e['t'] for e in E if e['type'] == 'thunk'), None)

for n in range(1, int(DUR / BAR) + 2):
    t0 = bar_t(n); sec = section(t0)
    if t0 >= DUR: break
    root, tri, _ = CH[PROG[(n - 1) % 4]]
    vv = {'open': .5, 'problem': .45, 'turn': .8, 'walk': .6, 'arch': .6, 'close': .5}[sec]
    quiet = 49.0 <= t0 + BAR and t0 >= 47.5 and t0 < 50.0          # the first near-silence
    quiet2 = 230.0 <= t0 < 232.6                                    # the second
    if quiet or quiet2: continue
    # felt piano: soft broken chord, sparse in open/problem
    pat = [0, 2, 1, 3, 2, 1] if sec in ('turn', 'walk', 'arch') else [0, 2, 3]
    step = B / 2 if sec in ('turn', 'walk', 'arch') else B
    tn = t0
    for k, i in enumerate(pat * 3):
        if tn >= t0 + BAR - 1e-6: break
        put(music, felt(hz(midi(tri[i % 4]))), tn, .55 * vv * (1.0 if k % 3 == 0 else .7), -.15); tn += step
    if sec != 'problem' or n % 2:  # bass on the downbeat (and the third beat when the band is in)
        put(music, bass(hz(midi(root))), t0, .8 * vv, 0)
        if sec in ('turn', 'walk', 'arch'): put(music, bass(hz(midi(root)) * 1.5), t0 + 2 * B, .5 * vv, 0)
    if sec == 'problem': put(music, pad(hz(midi(tri[0]) - 12), BAR + .6), t0, .6, 0)
    # brushed percussion in the turn / walkthrough / architecture
    if sec in ('turn', 'walk', 'arch'):
        tamper_drop = TAMPER is not None and TAMPER - 1.5 <= t0 <= TAMPER + 5.0
        for beat in range(4):
            tb = t0 + beat * B
            if beat in (0, 2) and not tamper_drop: put(music, kick(.55), tb, .5, 0)
            put(music, brush(.3 if beat % 2 else .45, .8), tb + (0 if beat % 2 else .0), .7 if beat % 2 == 0 else .5, .1 if beat % 2 else -.1)
            if sec == 'arch': put(music, brush(.12, .6, 6000, 12000), tb + B / 2, .35, 0)
    # kalimba motif: the mascot's voice; a figure on bars 5-6 of the opening (the title), then every 4th bar
    if (sec == 'open' and 5 <= n <= 8) or (sec in ('turn', 'walk', 'arch', 'close') and n % 4 == 1) or (sec == 'close' and n >= 89):
        mot = [0, 2, 3, 2, 4, 3] if (n // 4) % 2 else [2, 3, 5, 3, 2, 0]
        for j, m in enumerate(mot):
            put(music, kalimba(hz(PENT[m]), 1.4), t0 + j * B / 2 + (0 if sec != 'open' else 0), .5 * (1.0 if sec != 'walk' else .6), .3)
# the opening has keyboard-click rhythm only before the title; add a low swell into the title and a held pad at the close
put(music, pad(hz(midi('D3')), 4.0), 8.2, .9); put(music, pad(hz(midi('D3')), 6.0), 232.6, 1.0)
# title: impact + kalimba D
for e in ev_all('hit'):
    put(music, kalimba(hz(midi('D6')), 2.2), e['t'], .9, .2); put(music, kick(1), e['t'], .7)

# ───────── foley
SND = {}
def S(name, fn): SND[name] = fn
def key_thock(v=1.0, f=1.0):
    d = .07; t = tt(d); return ((hp(noise(d), 900) * np.exp(-t / .006) * .5 + np.sin(2 * np.pi * 150 * f * t) * np.exp(-t / .018) * .5) * v).astype(np.float32)
def paper(v=1.0, d=.28):
    t = tt(d); x = bp(noise(d), 1800, 7000); x *= (np.abs(np.sin(t * 90 + rng.random() * 3)) * .6 + .4) * np.exp(-t / (d * .45)); return (x * .5 * v).astype(np.float32)
def rip(d=1.6):
    t = tt(d); x = bp(noise(d), 700, 9000) * (np.abs(np.sin(t * 160)) * .7 + .3) * np.exp(-t / .5); x *= np.minimum(1, t / .02)
    cr = np.zeros_like(t)
    for _ in range(120):
        i = int(rng.random() * len(t) * .7); n = min(int(.004 * SR), len(t) - i); cr[i:i + n] += hp(noise(.004), 2500)[:n] * rng.random() * .6
    return ((x * .45 + cr * .5)).astype(np.float32)
def squeak(v=1.0):
    d = .22; t = tt(d); f = 520 + 380 * np.sin(np.pi * t / d); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12) * .25 * v).astype(np.float32)
def thunk(v=1.0):
    d = .6; t = tt(d); x = np.sin(2 * np.pi * 70 * t) * np.exp(-t / .2) + .5 * np.sin(2 * np.pi * 103 * t) * np.exp(-t / .15) + hp(noise(d), 1000) * np.exp(-t / .01) * .3
    return (lp(x, 800) * .8 * v).astype(np.float32)
def seal(v=1.0):
    d = 1.4; t = tt(d); x = sum(a * np.sin(2 * np.pi * f * t) for f, a in [(392, 1), (588, .5), (784, .3)]) * np.exp(-t / .5) * np.minimum(1, t / .04)
    return (x * .3 * v).astype(np.float32)
def tick_clock(v=1.0):
    d = .05; t = tt(d); return ((hp(noise(d), 2500) * np.exp(-t / .003) * .6 + np.sin(2 * np.pi * 3200 * t) * np.exp(-t / .01) * .3) * v).astype(np.float32)
def hop(v=1.0, d=.2):
    t = tt(d); f = 330 * (1 + 1.6 * t / d); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .09) * .2 * v).astype(np.float32)
def land(v=1.0):
    a, b = tap(.8 * v, 900, .02), lp(thump(.4 * v, 90), 400) * .5
    out = np.zeros(max(len(a), len(b)), np.float32); out[:len(a)] += a; out[:len(b)] += b
    return out
def blip(v=1.0):
    d = .07; t = tt(d); return (np.sign(np.sin(2 * np.pi * 1400 * t)) * np.exp(-t / .03) * .12 * v).astype(np.float32)

for e in E:
    t, tp, v = e['t'], e['type'], e.get('v', 1.0)
    if tp in ('key', 'tkey', 'rkey'): put(fol, key_thock(v, 1.0 + .1 * rng.random()), t, .9, rng.uniform(-.1, .1))
    elif tp in ('click', 'toggle'): put(fol, tap(1.0, 2200 if tp == 'click' else 1500), t, 1.0)
    elif tp == 'tick': put(fol, tick_clock(v), t, .5, .25)
    elif tp == 'hop': put(fol, hop(1.0, e.get('d', .2)), t, .9)
    elif tp == 'land': put(fol, land(v), t, .9)
    elif tp == 'step': put(fol, tap(.5, 1200, .02), t, .6)
    elif tp == 'whoosh': put(fol, sfx_whoosh(.5, 1.0), t - (.2 if e.get('d', 1) < 0 else 0), .55)
    elif tp == 'winopen': put(fol, sfx_pop(1.0), t, .9); put(fol, paper(1, .4), t, .6)
    elif tp == 'paper': put(fol, paper(v), t, .9, rng.uniform(-.3, .3))
    elif tp == 'squash': put(fol, squeak(1.0), t, .9)
    elif tp == 'crack': put(fol, rip(1.7), t, 1.1); put(fol, thump(.8, 55), t, .5)
    elif tp == 'cascade':
        for k in range(int(e.get('d', 3) * 9)): put(fol, tap(.5, 1000 + 400 * rng.random(), .02), t + k / 9 + rng.random() * .05, .5, rng.uniform(-.4, .4))
    elif tp == 'pop': put(fol, sfx_pop(1.0), t, .8)
    elif tp == 'blink': put(fol, blip(1.0), t, .8)
    elif tp == 'wipe': put(fol, brush(.6, 1.0, 1500, 7000), t - .35, 1.0)
    elif tp == 'ding': put(fol, kalimba(hz(midi('A6')), 1.6), t, .8, .2)
    elif tp == 'thunk': put(fol, thunk(v), t, 1.0)
    elif tp == 'seal': put(fol, seal(v), t, .9)
    elif tp == 'ffon': put(fol, brush(.4, 1.0, 3000, 12000), t, .6)
    elif tp == 'ffkey': put(fol, tap(.4, 2600, .008), t, .5)
# a low room tone under the walkthrough (very quiet) so the near-silences are audible as silences
room = lp(noise(DUR + 1.5), 380) * .004; put(fol, room.astype(np.float32), 0, 1.0)
for a, b in [(48.4, 50.0), (230.0, 232.6)]:           # the silences: take the room tone away too
    i0, i1 = int(a * SR), int(b * SR); fol[i0:i1] *= .15

# ───────── voice
import soundfile as _sf
for l in LINES:
    x, sr = _sf.read(os.path.join(HERE, 'voices', f"{l['id']}.wav"))
    if x.ndim > 1: x = x.mean(1)
    if sr != SR:
        import soxr; x = soxr.resample(x, sr, SR)
    x = compress(x.astype(np.float32), thr=.2, ratio=3.0)
    put(voice, x * 1.0, l['start'], 1.0, 0)

# ───────── duck music + foley under the voice, then mix
env = np.zeros(NS, np.float32)
for a, b in VO_RANGES: env[max(0, int((a - .35) * SR)):min(NS, int((b + .5) * SR))] = 1
k = int(.25 * SR); env = np.convolve(env, np.ones(k) / k, 'same')
duck_m = 1 - .72 * env; duck_f = 1 - .35 * env
mixL = music[:, 0] * duck_m * .55 + fol[:, 0] * duck_f * .9 + voice[:, 0] * 1.0
mixR = music[:, 1] * duck_m * .55 + fol[:, 1] * duck_f * .9 + voice[:, 1] * 1.0
mix = np.stack([mixL, mixR], 1)
# gentle master: fade in/out, limit
fi = np.minimum(1, np.arange(NS) / (.4 * SR)); fo = np.minimum(1, (NS - np.arange(NS)) / (1.2 * SR)); mix *= (fi * fo)[:, None]
mix = np.stack([compress(mix[:, 0], thr=.18, ratio=3.2), compress(mix[:, 1], thr=.18, ratio=3.2)], 1)
mix = mix * 1.7
mix = np.stack([limit(mix[:, 0], .84), limit(mix[:, 1], .84)], 1).astype(np.float32)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
sf.write(os.path.join(HERE, 'out', 'mix.wav'), mix, SR, subtype='PCM_24')
print('mix.wav', round(len(mix) / SR, 1), 's  peak', round(float(np.abs(mix).max()), 2))
