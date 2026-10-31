// Engine primitives: voice word anchors, sound events, camera, the mascot actor, the cursor, typing.
// Structure follows the Living Screencast demo engine (Lemo-Opuscar, MIT); rewritten for this film.
import { clamp, lerp, seg, ss, eio, eo, hash } from '/core/lib.js';

export const BPM = 96, B = 60 / BPM, BAR = 4 * B;        // 0.625 s beat, 2.5 s bar
export const bar = n => (n - 1) * BAR;                   // bar n (1-based) starts at…

// ───────── voice: start times are fixed by the narration plan; word times come from whisper (words.json)
export const VO = {}, DURS = {}, TEXT = {};
let WORDS = {};
const nrm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
export function loadVoice(lines, words, durs) {
  for (const l of lines) { VO[l.id] = l.start; TEXT[l.id] = l.text; DURS[l.id] = durs[l.id] ?? l.window; }
  WORDS = words || {};
}
/** Start of the n-th occurrence of `word` in line `id` (absolute seconds). Falls back to a character-share estimate. */
export function W(id, word, n = 0, end = false) {
  const ws = WORDS[id];
  if (ws && ws.length) { let k = 0; for (const [w, a, b] of ws) if ((nrm(w) === nrm(word) || (nrm(word).length > 3 && nrm(w).startsWith(nrm(word)))) && k++ === n) return VO[id] + Math.max(0, end ? b : a); }
  const text = TEXT[id] || '', toks = text.split(/\s+/); let k = 0, chars = 0; const total = text.length || 1;
  for (const w of toks) { if (nrm(w).startsWith(nrm(word)) && k++ === n) return VO[id] + (DURS[id] || 5) * ((chars + (end ? w.length : 0)) / total); chars += w.length + 1; }
  throw new Error(`word "${word}" not in ${id}`);
}
export const WE = (id, word, n = 0) => W(id, word, n, true);
export const END = id => VO[id] + (DURS[id] || 0);

// ───────── sound events
export const EV = [];
export const ev = (t, type, o = {}) => EV.push({ t: +(+t).toFixed(3), type, ...o });

// ───────── typing with a human rhythm (deterministic jitter) → times per character
export function typing(t0, text, cps = 12, seed = 1, kind = 'key') {
  const T = []; let t = t0;
  for (let i = 0; i < text.length; i++) { const r = hash(seed * 31 + i * 7.3); t += (1 / cps) * (.6 + r * .8) + (text[i] === ' ' ? .03 : 0); T.push(t); ev(t, kind, { v: .55 + r * .4 }); }
  return T;
}
export const typed = (T, text, t) => { let n = 0; while (n < T.length && T[n] <= t) n++; return text.slice(0, n); };

// ───────── camera: one take; each move starts from wherever the previous ones left it
const EASE = { eio, ss, eo, lin: x => clamp(x), whip: x => { x = clamp(x); return x < .5 ? 16 * x ** 5 : 1 - (-2 * x + 2) ** 5 / 2; } };
let CAM0 = [960, 540, 1], MOVES = [];
export function camReset(c0) { CAM0 = c0; MOVES = []; }
export const cam = (t0, d, to, e = 'eio') => { MOVES.push({ t0, d, to, e }); MOVES.sort((a, b) => a.t0 - b.t0); };
export const cut = (t, to) => cam(t - .0005, .001, to, 'lin');
export function camAt(t) {
  let v = [CAM0[0], CAM0[1], Math.log(CAM0[2])];
  for (const m of MOVES) { if (t <= m.t0) break; const p = EASE[m.e]((t - m.t0) / m.d);
    v = [lerp(v[0], m.to[0], p), lerp(v[1], m.to[1], p), lerp(v[2], Math.log(m.to[2]), p)]; }
  return [v[0] + Math.sin(t * .7) * 1.4, v[1] + Math.sin(t * .53 + 1) * 1.0, Math.exp(v[2])];   // a hand on the trackpad
}

// ───────── the mascot actor (positions are world coordinates of its feet)
export class Actor {
  constructor(s = .8, seed = 0) { this.s = s; this.seed = seed; this.segs = []; this.jumps = []; }
  add(x) { this.segs.push(x); this.segs.sort((a, b) => a.t0 - b.t0); return this; }
  stand(t0, t1, at, o = {}) { return this.add({ k: 'stand', t0, t1, at, ...o }); }
  walk(t0, t1, from, to, o = {}) { for (let t = t0 + .05; t < t1; t += .16) ev(t, 'step', { v: .45 }); return this.add({ k: 'walk', t0, t1, from, to, ...o }); }
  jump(t0, t1, from, to, h = 100, o = {}) { this.jumps.push({ t0, t1 }); ev(t0 - .03, 'hop', { d: t1 - t0 }); ev(t1, 'land', { v: o.big ? 1 : .6 }); return this.add({ k: 'jump', t0, t1, from, to, h, ...o }); }
  path(t0, t1, fn, o = {}) { return this.add({ k: 'path', t0, t1, fn, ...o }); }        // free motion (riding a pulse, flying into a row)
  hide(t0, t1) { return this.add({ k: 'hide', t0, t1 }); }
  seg(t) { let s = null; for (const x of this.segs) { if (x.t0 <= t && t < x.t1) return x; } return s; }
  eval(t, A) {
    const s = this.seg(t); if (!s || s.k === 'hide') return null;
    const P = f => typeof f === 'function' ? f(A, t) : f;
    let pos, legs = 'stand', flip = s.flip || false, sq = 0, rot = 0, arms = 'down', eyes = 'n';
    if (s.k === 'stand') pos = P(s.at);
    if (s.k === 'walk') { const a = P(s.from), b = P(s.to); if (!a || !b) return null; const p = (s.ease || ss)(seg(t, s.t0, s.t1));
      pos = { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p) }; legs = Math.floor(t * 7) % 2 ? 'walkA' : 'walkB'; flip = b.x < a.x; }
    if (s.k === 'jump') { const a = P(s.from), b = P(s.to); if (!a || !b) return null; const p = seg(t, s.t0, s.t1);
      const ap = Math.min(a.y, b.y) - s.h, cy = 2 * ap - (a.y + b.y) / 2;
      pos = { x: lerp(a.x, b.x, p), y: (1 - p) ** 2 * a.y + 2 * (1 - p) * p * cy + p * p * b.y };
      legs = 'tuck'; arms = 'up'; flip = b.x < a.x - 2 ? true : b.x > a.x + 2 ? false : flip; sq = p < .5 ? -.2 * (1 - p * 2) : -.1 * (p * 2 - 1); }
    if (s.k === 'path') { const r = s.fn(seg(t, s.t0, s.t1), A, t); if (!r) return null; pos = r; if (r.legs) legs = r.legs; if (r.rot) rot = r.rot; if (r.flip !== undefined) flip = r.flip; }
    if (!pos) return null;
    for (const j of this.jumps) {
      if (t >= j.t0 - .16 && t < j.t0) sq = Math.max(sq, .26 * ss(seg(t, j.t0 - .16, j.t0)));                       // anticipation
      if (t >= j.t1 && t < j.t1 + .26) { const k = seg(t, j.t1, j.t1 + .26); sq = .3 * (1 - k) * Math.cos(k * 7); }   // landing squash, damped
    }
    if (s.k === 'stand' && !s.still) { const bp = ((t % B) + B) % B; if (bp < .14) sq += .05 * Math.sin(bp / .14 * Math.PI); }   // breathes on the beat
    const bl = Math.floor(t / 3.1), bt = t - bl * 3.1 - hash(bl * 3.7 + this.seed) * 2.2;
    if (bt > 0 && bt < .1) eyes = 'blink';
    const pick = v => typeof v === 'function' ? v(t) : v;
    if (s.eyes) { const e = pick(s.eyes); if (e && !(eyes === 'blink' && ['n', 'l', 'r', 'u', 'd'].includes(e))) eyes = e; }
    if (s.arms) arms = pick(s.arms); if (s.legs) legs = pick(s.legs);
    if (s.sq) sq += s.sq(t);
    return { x: pos.x, y: pos.y, s: pick(s.s) ?? this.s, flip, sq, rot, legs, arms, eyes, op: s.op ? s.op(t) : 1, smudge: s.smudge ? s.smudge(t) : 0, seed: this.seed };
  }
}

// ───────── the cursor (the user's hand): smoothed arcs, a press on click, never teleports
export class Cursor {
  constructor() { this.moves = []; this.clicks = []; this.vis = []; }
  show(t0, t1) { this.vis.push([t0, t1]); return this; }
  move(t0, t1, to, arc = 30) { this.moves.push({ t0, t1, to, arc }); this.moves.sort((a, b) => a.t0 - b.t0); return this; }
  click(t, kind = 'click') { this.clicks.push(t); ev(t, kind); return this; }
  eval(t, A) {
    let op = 0; for (const [a, b] of this.vis) op = Math.max(op, Math.min(seg(t, a, a + .15), 1 - seg(t, b - .2, b)));
    if (op <= 0) return null;
    let p = null, prev = null;
    for (const m of this.moves) { const to = m.to(A, t); if (!to) continue; if (t < m.t0) break;
      if (!prev) { p = to; prev = to; continue; }
      const k = seg(t, m.t0, m.t1), e = eio(k), from = prev, dx = to.x - from.x, dy = to.y - from.y, L = Math.hypot(dx, dy) || 1;
      p = { x: lerp(from.x, to.x, e) - dy / L * m.arc * Math.sin(Math.PI * e), y: lerp(from.y, to.y, e) + dx / L * m.arc * Math.sin(Math.PI * e) };
      prev = k >= 1 ? to : from; if (k < 1) break; }
    if (!p) return null;
    let sc = 1, ring = 0; for (const c of this.clicks) { if (t >= c && t < c + .1) sc = .84; if (t >= c && t < c + .45) ring = seg(t, c, c + .45); }
    return { ...p, op, sc, ring };
  }
}

// anchor helpers: a point on a DOM element (by selector key) in world coordinates; remembers its last position
export const at = (key, fx = .5, fy = 0, dx = 0, dy = 0) => { let last = null; return A => { const p = A(key, fx, fy); if (p) last = { x: p.x + dx, y: p.y + dy }; return last; }; };
export const pt = (x, y) => () => ({ x, y });
export { clamp, lerp, seg, ss, eio, eo, hash };
