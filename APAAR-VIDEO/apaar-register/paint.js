// The painted world: the paper the problem lives in (form, the numeral made of students, colleges, a letter),
// and the architecture diagram. Drawn on the canvas in world coordinates; the camera is applied by the caller.
import { clamp, lerp, seg, eo, eio, ss, hash, mulberry } from '/core/lib.js';
import { paint, brushLine, quad, SAFF, SAFF_D, SAFF_L, CREAM, INK, NAVY } from './mascot.js';

const FONT = '"Atkinson Hyperlegible", sans-serif', MONO = '"IBM Plex Mono", monospace';
const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${clamp(a)})`; };

// ── the form: an annual return that reports a number ─────────────────────────────
export const FORM = { x: 600, y: 300, w: 720, h: 470, field: { x: 1020, y: 610, w: 200, h: 86 } };
export function form(c, t, o) {
  if (o.op <= 0) return;
  c.save(); c.globalAlpha = o.op; c.translate(FORM.x + FORM.w / 2, FORM.y + FORM.h / 2); c.rotate(-.018); c.translate(-FORM.w / 2, -FORM.h / 2);
  c.fillStyle = 'rgba(60,40,10,.14)'; c.fillRect(10, 14, FORM.w, FORM.h);
  c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, FORM.w, FORM.h);
  c.strokeStyle = 'rgba(120,100,60,.25)'; c.lineWidth = 2; c.strokeRect(0, 0, FORM.w, FORM.h);
  c.fillStyle = INK; c.font = `700 34px ${FONT}`; c.fillText('Annual return', 48, 76);
  c.font = `22px ${MONO}`; c.fillStyle = '#5f6e82';
  c.fillText('Institution', 48, 150); c.fillText('Programme', 48, 222); c.fillText('Admissions reported', 48, 330);
  brushLine(c, quad(250, 156, 450, 152, 640, 157, 8), 2.4, '#8a7b60', .55, 3); brushLine(c, quad(250, 228, 450, 225, 640, 229, 8), 2.4, '#8a7b60', .55, 4);
  c.font = `20px ${MONO}`; c.fillStyle = '#8a7b60'; c.fillText('(total for the year)', 48, 362);
  const f = FORM.field, fx = f.x - FORM.x, fy = f.y - FORM.y;
  c.fillStyle = '#fff'; c.fillRect(fx, fy - 40, f.w, f.h); c.strokeStyle = '#8a7b60'; c.lineWidth = 2.5; c.strokeRect(fx, fy - 40, f.w, f.h);
  c.fillStyle = INK; c.font = `700 60px ${MONO}`; c.fillText(o.typed || '', fx + 34, fy + 26);
  if (o.caret) { c.fillRect(fx + 34 + c.measureText(o.typed || '').width + 4, fy - 20, 4, 50); }
  c.restore();
}

// ── the numeral "60", made of student slips ───────────────────────────────────────
// digit centre-lines (world coordinates), stroke half-width HW
const HW = 62;
const SIX = [...Array(48)].map((_, i) => { const a = Math.PI * .5 + i / 47 * Math.PI * 2; return [770 + Math.cos(a) * 165, 700 + Math.sin(a) * 165]; })
  .concat(quad(930, 250, 690, 330, 640, 640, 24));
const ZERO = [...Array(72)].map((_, i) => { const a = i / 71 * Math.PI * 2; return [1190 + Math.cos(a) * 175, 560 + Math.sin(a) * 305]; });
const distTo = (pts, x, y) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1;
  const u = clamp(((x - ax) * dx + (y - ay) * dy) / L), px = ax + dx * u, py = ay + dy * u; d = Math.min(d, Math.hypot(x - px, y - py)); } return d; };
export const SLIPS = [];
{ const R = mulberry(60); for (let y = 200; y <= 900; y += 50) for (let x = 520; x <= 1420; x += 44) {
    const jx = x + (y / 50 % 2) * 22, d = Math.min(distTo(SIX, jx, y), distTo(ZERO, jx, y));
    if (d < HW) SLIPS.push({ x: jx + (R() - .5) * 6, y: y + (R() - .5) * 6, r: (R() - .5) * .12, tone: R(), k: R() }); } }
// the protagonist: the slip at the bottom of the zero
export const HERO = SLIPS.reduce((b, s) => (Math.hypot(s.x - 1190, s.y - 860) < Math.hypot(b.x - 1190, b.y - 860) ? s : b), SLIPS[0]);
// slips that do not fit inside the declared total: the hidden excess
export const EXCESS = [...Array(9)].map((_, i) => { const a = -1.0 + i * .26; return { a, x: 1190 + Math.cos(a) * 250, y: 560 + Math.sin(a) * 400, r: (hash(i) - .5) * .5 }; });

function slip(c, x, y, rot, col, op, s = 1, seed = 1) {
  const R = mulberry(seed); c.save(); c.globalAlpha = op; c.translate(x, y); c.rotate(rot); c.scale(s, s);
  c.fillStyle = col; c.beginPath();
  const pts = [[-19, -24], [12, -24], [19, -17], [19, 24], [-19, 24]];
  pts.forEach(([px, py], i) => (i ? c.lineTo : c.moveTo).call(c, px + (R() - .5) * 1.5, py + (R() - .5) * 1.5)); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(27,42,65,.55)'; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = 'rgba(255,244,227,.9)'; c.fillRect(-11, -16, 22, 11);
  c.fillStyle = 'rgba(18,56,122,.6)'; for (let i = 0; i < 3; i++) c.fillRect(-12 + i * 9, 2, 6, 3);
  c.restore();
}
const toneCol = k => k < .5 ? SAFF : k < .8 ? SAFF_L : '#e9873f';

/** The numeral. o: {op, grow (0..1 painted-in), wobble, squeeze (0..1 pressing the hero), overflow (0..1), crack (0..1), targets: fn(i) → world point} */
export function numeral(c, t, o) {
  if (o.op <= 0) return;
  const boil = Math.floor(t * 15);
  // ink wash behind the slips: the numeral as one block of ink
  c.save(); c.globalAlpha = o.op * (1 - (o.crack || 0));
  for (const [pts, sd] of [[SIX, 11], [ZERO, 12]]) {
    const n = Math.max(2, Math.floor(pts.length * clamp(o.grow ?? 1)));
    if (n > 2) brushLine(c, pts.slice(0, n), HW * 2.25, NAVY, .9, sd + boil * 0, 6);
  }
  c.restore();
  const crack = o.crack || 0;
  SLIPS.forEach((s, i) => {
    if (s === HERO) return;
    const appear = clamp(((o.grow ?? 1) * 1.15 - s.k * .15 - (s.x - 520) / 1100 * .3) / .2);
    if (appear <= 0) return;
    let x = s.x, y = s.y, r = s.r, sc = 1;
    if (o.squeeze) { const d = Math.hypot(x - HERO.x, y - HERO.y); if (d < 160) { y += (1 - d / 160) * 14 * o.squeeze; } }
    if (crack > 0 && o.targets) { const tg = o.targets(i); const k = eio(clamp((crack - s.k * .35) / .65));
      if (tg) { x = lerp(x, tg.x, k) + Math.sin(k * Math.PI) * (hash(i * 3.1) - .5) * 160; y = lerp(y, tg.y, k) - Math.sin(k * Math.PI) * 120 * hash(i * 1.7); r = lerp(r, 0, k); sc = lerp(1, tg.s ?? .5, k); }
      if (k >= 1) return; }
    slip(c, x, y, r + Math.sin(t * 2 + i) * .01, toneCol(s.tone), o.op * appear, sc * (.6 + .4 * appear), i * 7 + boil);
  });
  // the excess: slips that spill out of the declared number, washed grey (not counted)
  if (o.overflow > 0) EXCESS.forEach((e, i) => {
    const k = eo(clamp((o.overflow - i * .07) / .45)); if (k <= 0) return;
    const out = 40 + 120 * k, x = 1190 + Math.cos(e.a) * (175 + out) * (1 + i % 2 * .1), y = 560 + Math.sin(e.a) * (305 + out * .6);
    slip(c, x, y, e.r * k, '#c9bfae', o.op * k * (1 - crack), 1, 300 + i * 3 + boil);
    if (k > .9 && o.mark) { c.save(); c.globalAlpha = o.op * (1 - crack) * .9; c.font = `700 22px ${FONT}`; c.fillStyle = '#8a5208'; c.fillText('?', x + 22, y - 18); c.restore(); }
  });
}

// ── two colleges, the same student in both ─────────────────────────────────────
export function college(c, x, y, label, op, t, seed) {
  if (op <= 0) return;
  c.save(); c.globalAlpha = op; c.translate(x, y);
  const boil = Math.floor(t * 15) + seed;
  brushLine(c, quad(-210, -290, 0, -380, 210, -290, 8), 16, NAVY, .9, boil);
  c.fillStyle = rgba(NAVY, .86); c.beginPath(); c.moveTo(-200, -290); c.lineTo(0, -372); c.lineTo(200, -290); c.closePath(); c.fill();
  c.fillStyle = rgba('#1d4a94', .9); c.fillRect(-190, -290, 380, 290);
  for (let i = 0; i < 5; i++) { const cx = -150 + i * 75; brushLine(c, quad(cx, -270, cx + 2, -140, cx, -10, 8), 18, CREAM, .85, boil + i); }
  c.fillStyle = rgba('#0a2556', .95); c.fillRect(-48, -120, 96, 120);
  c.fillStyle = '#fbf6ea'; c.fillRect(-120, -330, 240, 40); c.fillStyle = INK; c.font = `700 24px ${FONT}`; c.textAlign = 'center'; c.fillText(label, 0, -302);
  brushLine(c, quad(-240, 2, 0, 6, 240, 2, 8), 8, '#8a7b60', .6, boil + 9);
  c.restore();
}

// ── the letter and the wait ───────────────────────────────────────────────────
export function letter(c, t, o) {
  if (o.op <= 0) return;
  const boil = Math.floor(t * 15);
  c.save(); c.globalAlpha = o.op; c.translate(o.x, o.y); c.rotate(-.04);
  c.fillStyle = 'rgba(60,40,10,.14)'; c.fillRect(-196, -112, 400, 240);
  c.fillStyle = '#fbf3e1'; c.fillRect(-200, -120, 400, 240);
  brushLine(c, [[-200, -120], [0, 20], [200, -120]], 4, '#8a7b60', .7, boil);
  brushLine(c, [[-200, 120], [-40, 0]], 3, '#8a7b60', .5, boil + 1); brushLine(c, [[200, 120], [40, 0]], 3, '#8a7b60', .5, boil + 2);
  c.font = `20px ${MONO}`; c.fillStyle = '#5f6e82'; c.fillText('Re: verification of degree', -180, 92);
  c.restore();
  // a clock whose hand keeps sweeping: days, not seconds
  c.save(); c.globalAlpha = o.op; c.translate(o.cx, o.cy);
  c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(0, 0, 110, 0, Math.PI * 2); c.fill();
  brushLine(c, [...Array(41)].map((_, i) => [Math.cos(i / 40 * Math.PI * 2) * 110, Math.sin(i / 40 * Math.PI * 2) * 110]), 9, NAVY, .9, boil + 3);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.fillStyle = INK; c.fillRect(Math.cos(a) * 90 - 3, Math.sin(a) * 90 - 3, 6, 6); }
  const a1 = -Math.PI / 2 + o.sweep * Math.PI * 2 * 6, a2 = -Math.PI / 2 + o.sweep * Math.PI * 2 * .5;
  brushLine(c, [[0, 0], [Math.cos(a2) * 55, Math.sin(a2) * 55]], 10, INK, .95, boil + 4);
  brushLine(c, [[0, 0], [Math.cos(a1) * 82, Math.sin(a1) * 82]], 6, SAFF_D, .95, boil + 5);
  c.restore();
}

// ── the architecture: layers of the system, honestly labelled ─────────────────
export const ARCH = [
  { id: 'ui', x: 960, y: 170, w: 520, t: 'React interface', s: '7 roles · 23 screens' },
  { id: 'api', x: 960, y: 330, w: 520, t: 'FastAPI service', s: 'one API for every role' },
  { id: 'eng', x: 960, y: 500, w: 600, t: 'Validation engine', s: '26 rules · the only writer of student records', core: true },
  { id: 'seat', x: 520, y: 680, w: 360, t: 'Seat ledger', s: 'counted from records' },
  { id: 'id', x: 960, y: 680, w: 360, t: 'Identity matching', s: 'flags, never merges' },
  { id: 'cred', x: 1400, y: 680, w: 360, t: 'Signed credentials', s: 'selective disclosure' },
  { id: 'audit', x: 960, y: 850, w: 600, t: 'Audit chain', s: 'every step, hash-chained' },
  { id: 'db', x: 960, y: 1000, w: 520, t: 'PostgreSQL', s: 'Neon in the demo' },
  { id: 'reg', x: 1560, y: 330, w: 330, t: 'APAAR registry', s: 'Simulated until official access', sim: true },
];
export const EDGES = [['ui', 'api'], ['api', 'eng'], ['eng', 'seat'], ['eng', 'id'], ['eng', 'cred'], ['seat', 'audit'], ['id', 'audit'], ['cred', 'audit'], ['audit', 'db'], ['api', 'reg']];
export const node = id => ARCH.find(n => n.id === id);
export function arch(c, t, o) {
  if (o.op <= 0) return;
  const boil = Math.floor(t * 15);
  c.save(); c.globalAlpha = o.op;
  EDGES.forEach(([a, b], i) => { const A = node(a), Bn = node(b), k = clamp((o.p * 1.6 - i * .08) / .3); if (k <= 0) return;
    const y0 = A.y + 40, y1 = Bn.y - 40, x0 = A.x + (b === 'reg' ? A.w / 2 : 0), x1 = Bn.x - (b === 'reg' ? Bn.w / 2 : 0);
    const pts = b === 'reg' ? quad(x0, A.y, (x0 + x1) / 2, A.y, x1, Bn.y, 10) : quad(x0, y0, x0, (y0 + y1) / 2, x1, y1, 10);
    const n = Math.max(2, Math.round(pts.length * k));
    if (b === 'reg') { c.setLineDash([10, 8]); c.strokeStyle = rgba('#8a5208', .8); c.lineWidth = 3; c.beginPath(); pts.slice(0, n).forEach(([x, y], j) => j ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); c.setLineDash([]); }
    else brushLine(c, pts.slice(0, n), 5, NAVY, .75, boil + i);
  });
  ARCH.forEach((n, i) => {
    const k = eo(clamp((o.p * 1.4 - i * .07) / .25)); if (k <= 0) return;
    c.save(); c.globalAlpha = o.op * k; c.translate(n.x, n.y + (1 - k) * 24);
    const w = n.w, h = 80;
    c.fillStyle = 'rgba(16,32,64,.10)'; c.beginPath(); c.roundRect(-w / 2 + 3, -h / 2 + 6, w, h, 10); c.fill();
    c.fillStyle = n.sim ? '#fbf0df' : '#fff'; c.beginPath(); c.roundRect(-w / 2, -h / 2, w, h, 10); c.fill();
    if (n.sim) { c.setLineDash([9, 7]); c.strokeStyle = '#8a5208'; c.lineWidth = 2.5; } else { c.strokeStyle = n.core ? SAFF : '#b9c6c2'; c.lineWidth = n.core ? 3.5 : 2; }
    c.stroke(); c.setLineDash([]);
    if (n.core) { c.fillStyle = SAFF; c.fillRect(-w / 2, -h / 2 + 10, 5, h - 20); }
    c.textAlign = 'center'; c.fillStyle = n.sim ? '#8a5208' : '#12387a'; c.font = `700 27px ${FONT}`; c.fillText(n.t, 0, -4);
    c.fillStyle = n.sim ? '#8a5208' : '#4a5a70'; c.font = `20px ${FONT}`; c.fillText(n.s, 0, 24);
    if (n.sim) { c.fillStyle = '#8a5208'; c.beginPath(); c.roundRect(w / 2 - 118, -h / 2 - 16, 106, 30, 15); c.fill(); c.fillStyle = '#fff'; c.font = `700 17px ${FONT}`; c.fillText('Simulated', w / 2 - 65, -h / 2 + 5); }
    c.restore();
  });
  // data pulses down the spine
  if (o.pulses) for (let j = 0; j < 4; j++) { const ph = ((t * .5 + j / 4) % 1);
    const chain = ['ui', 'api', 'eng', ['seat', 'id', 'cred'][j % 3], 'audit', 'db'].map(node), segi = Math.min(chain.length - 2, Math.floor(ph * (chain.length - 1))), u = ph * (chain.length - 1) - segi;
    const a = chain[segi], b = chain[segi + 1], x = lerp(a.x, b.x, u), y = lerp(a.y + 40, b.y - 40, u);
    c.fillStyle = SAFF; c.globalAlpha = o.op * .9 * Math.sin(Math.PI * clamp(u)); c.beginPath(); c.arc(x, y, 9, 0, Math.PI * 2); c.fill(); }
  c.restore();
}
/** Point on the spine of the architecture at progress u∈[0,1], for the mascot to ride. */
export function spine(u) {
  const chain = ['ui', 'api', 'eng', 'id', 'audit', 'db'].map(node), n = chain.length - 1, i = Math.min(n - 1, Math.floor(u * n)), k = u * n - i;
  const a = chain[i], b = chain[i + 1];
  return { x: lerp(a.x, b.x, k) + 230, y: lerp(a.y - 40, b.y - 40, ss(k)) };
}

/** A slip that becomes the mascot: hero slip in the numeral, painted with the mascot's face once it wakes. */
export function heroSlip(c, t, o) {
  if (o.op <= 0) return;
  paint(c, o.x, o.y + 24, { s: o.s ?? .62, t, eyes: o.eyes, legs: o.legs ?? 'sit', arms: o.arms, op: o.op, sq: o.sq || 0, shadow: false, seed: 3 });
}
export { slip };
