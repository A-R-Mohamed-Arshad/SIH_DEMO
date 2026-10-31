// render(t): camera → wallpaper, painted layers, the app window (real DOM), the mascot, the cursor, the HUD.
import { clamp, seg, eo, eio, back, hash } from '/core/lib.js';
import { loadVoice, camAt, EV, VO } from './core.js';
import * as FM from './film.js';
import * as CH from './chapters.js';
import * as PT from './paint.js';
import { paint, sparkle, tick, cross, bang, dots, ringPulse, HEIGHT } from './mascot.js';

globalThis.__paint = PT;
const Q = new URLSearchParams(location.search), NOSUBS = Q.has('nosubs');
const $ = id => document.getElementById(id);
const walll = $('walll'), world = $('world'), wins = $('wins'), under = $('under').getContext('2d'), over = $('paint').getContext('2d'), hudEl = $('hud');

const j = async p => (await fetch(p)).json();
const lines = await j('voices/lines.json');
let words = {}, durs = {};
try { words = await j('voices/words.json'); } catch (_) {}
try { durs = await j('voices/dur.json'); } catch (_) {}
const SCREENS = await j('screens.json');
loadVoice(lines, words, durs);
globalThis.__screens = SCREENS;


// ── the app window: one DOM, screens swapped only when they change
const win = document.createElement('div'); win.className = 'f-win';
win.innerHTML = `<div class="f-bar"><span><i></i><i></i><i></i></span><div class="f-url"><svg width="12" height="14" viewBox="0 0 12 14"><rect x="1" y="6" width="10" height="7" rx="1.5" fill="#4a5a70"/><path d="M3.5 6V4.2a2.5 2.5 0 015 0V6" stroke="#4a5a70" stroke-width="1.5" fill="none"/></svg><b></b></div><span style="width:70px"></span></div><div class="f-vp"><div class="f-doc"></div></div>`;
wins.appendChild(win);
const urlEl = win.querySelector('.f-url b'), doc = win.querySelector('.f-doc');
let curScreen = null;
function setScreen(id) {
  if (id === curScreen) return;
  const s = SCREENS[id]; if (!s) throw new Error('no screen ' + id);
  doc.innerHTML = s.html; curScreen = id; doc.dataset.base = '1';
}

const SPAN = {};   // per screen: the document-space extent of every anchor the film uses, so scroll can be chosen to show them
globalThis.__scrollFix = {};
globalThis.__measure = (id, key) => {
  setScreen(id);
  const base = SCREENS[id].scroll || 0;
  Object.assign(win.style, { display: '', left: FM.WINDOW.x + 'px', top: FM.WINDOW.y + 'px', width: FM.WINDOW.w + 'px', height: FM.WINDOW.h + 'px', transform: 'none', opacity: 1 });
  doc.style.transform = `translateY(${-base}px)`; doc.style.setProperty('--scroll', base + 'px');
  const el = CH.find(doc, key); if (!el) return null;
  const r = el.getBoundingClientRect(), v = win.querySelector('.f-vp').getBoundingClientRect();
  const top = r.top - v.top + base, bot = top + r.height;                  // document space
  const s = SPAN[id] = SPAN[id] ? { top: Math.min(SPAN[id].top, top), bot: Math.max(SPAN[id].bot, bot) } : { top, bot };
  let sc = base;
  if (top - base < 24 || bot - base > 786) {                                // not comfortably in view: choose a scroll that shows the extent
    const h = s.bot - s.top; sc = h <= 740 ? Math.max(0, s.top - (810 - h) / 2) : Math.max(0, s.top - 40);
  }
  globalThis.__scrollFix[id] = sc;
  return { x: r.left - v.left, y: top - sc, w: r.width, h: r.height };
};
FM.build(lines); FM.build(lines);   // first pass learns every anchor extent (scroll choice), second is final
window.DUR = FM.DUR;
window.EV = EV.slice().sort((a, b) => a.t - b.t);
window.SUBS = FM.SUBS;
window.T = FM.T;
const tf = ([cx, cy, z]) => `translate(960px,540px) scale(${z}) translate(${-cx}px,${-cy}px)`;
const toScreen = ([cx, cy, z], x, y) => ({ x: (x - cx) * z + 960, y: (y - cy) * z + 540 });

function render(t) {
  const C = camAt(t), [cx, cy, z] = C;
  walll.style.transform = world.style.transform = tf(C);
  // ── window
  const Wn = CH.winAt(t, FM.T);
  if (Wn && Wn.op > 0) {
    setScreen(Wn.id);
    const s = Wn.s ?? 1, x = Wn.x ?? FM.WINDOW.x, y = Wn.y ?? FM.WINDOW.y;
    Object.assign(win.style, { display: '', left: x + 'px', top: y + 'px', width: FM.WINDOW.w + 'px', height: FM.WINDOW.h + 'px', opacity: Wn.op,
      transform: `scale(${s})`, transformOrigin: Wn.origin || '50% 50%', filter: Wn.dim ? `brightness(${1 - Wn.dim * .45})` : '' });
    urlEl.textContent = Wn.url || 'apaar-student-register.vercel.app';
    { const sc = globalThis.__scrollFix[Wn.id] ?? SCREENS[Wn.id].scroll ?? 0; doc.style.transform = `translateY(${-sc}px)`; doc.style.setProperty('--scroll', sc + 'px'); }
    CH.mutate(doc, Wn, t, FM.T);
  } else win.style.display = 'none';

  // anchor: world coordinates of a point on an element inside the window
  const cache = {};
  const A = (key, fx = .5, fy = 0) => {
    if (win.style.display === 'none') return null;
    const el = cache[key] !== undefined ? cache[key] : (cache[key] = CH.find(doc, key));
    if (!el) return null; const r = el.getBoundingClientRect();
    return { x: (r.left + r.width * fx - 960) / z + cx, y: (r.top + r.height * fy - 540) / z + cy, w: r.width / z, h: r.height / z };
  };

  // ── painted layers (world coordinates through the camera)
  for (const c of [under, over]) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 1920, 1080); c.setTransform(z, 0, 0, z, 960 - cx * z, 540 - cy * z); }
  CH.paintUnder(under, t, FM.T, A);
  CH.paintOver(over, t, FM.T, A);
  // ── the mascot(s)
  for (const act of [FM.M, FM.M2]) { const m = act.eval(t, A); if (!m) continue;
    paint(over, m.x, m.y, { s: m.s, t, flip: m.flip, sq: m.sq, rot: m.rot, legs: m.legs, arms: m.arms, eyes: m.eyes, op: m.op, smudge: m.smudge, seed: m.seed });
    // landing puffs of paper dust
    for (const jmp of act.jumps) if (t >= jmp.t1 && t < jmp.t1 + .35) { const k = seg(t, jmp.t1, jmp.t1 + .35); over.save(); over.globalAlpha = (1 - k) * .5; over.fillStyle = '#d9cdb5';
      for (let i = 0; i < 6; i++) { const a = Math.PI + i / 5 * Math.PI; over.beginPath(); over.arc(m.x + Math.cos(a) * (20 + 30 * k) * m.s * 1.6, m.y - 4 + Math.sin(a) * 6 * k, 4 * m.s * (1 - k * .5) * 1.6, 0, Math.PI * 2); over.fill(); } over.restore(); }
    CH.props(over, t, FM.T, m, A, act === FM.M2);
  }
  // ── cursor and HUD (screen space)
  over.setTransform(1, 0, 0, 1, 0, 0);
  const cu = FM.CUR.eval(t, A);
  if (cu) { const p = toScreen(C, cu.x, cu.y);
    if (cu.ring > 0) { over.save(); over.globalAlpha = (1 - cu.ring) * .9; over.strokeStyle = '#f37021'; over.lineWidth = 3.5; over.beginPath(); over.arc(p.x, p.y, 8 + 30 * eo(cu.ring), 0, Math.PI * 2); over.stroke(); over.restore(); }
    cursor(over, p.x, p.y, cu.sc, cu.op); }
  hud(t, C, A);
}

function cursor(c, x, y, sc, op) {
  const s = 1.7 * sc; c.save(); c.globalAlpha = op; c.translate(x - 2 * s, y - 2 * s); c.scale(s, s);
  c.shadowColor = 'rgba(0,0,0,.3)'; c.shadowBlur = 4; c.shadowOffsetY = 2;
  const p = new Path2D('M2 2 L2 24 L7.5 18.5 L11 27 L15 25.2 L11.6 17 L19 17 Z'); c.fillStyle = '#111'; c.fill(p); c.shadowColor = 'transparent';
  c.lineWidth = 1.6; c.strokeStyle = '#fff'; c.lineJoin = 'round'; c.stroke(p); c.restore();
}

function hud(t, C, A) {
  const H = CH.hudAt(t, FM.T, A, C); let h = '';
  const scr = p => toScreen(C, p.x, p.y);
  if (H.spot) { const p = A(H.spot.key, .5, .5); if (p) { const s = scr(p), r = Math.max(p.w, p.h) * C[2] * .7 + 50;
    h += `<div class="f-spot" style="opacity:${H.spot.op};background:radial-gradient(ellipse ${r * 1.7}px ${r * 1.1}px at ${s.x}px ${s.y}px, transparent 62%, rgba(10,22,46,.55) 100%)"></div>`; } }
  if (H.chap) h += `<div class="f-chap" style="opacity:${H.chap.op};transform:translateY(${(1 - H.chap.op) * -10}px)"><b>${H.chap.no}</b>${H.chap.nm}<s></s></div>`;
  if (H.ramp) h += `<div class="f-ramp" style="opacity:${H.ramp.op}">${H.ramp.blink ? '▶▶' : '▷▷'} ${H.ramp.x}× · ${H.ramp.what}</div>`;
  if (H.keys) h += `<div class="f-keys" style="opacity:${H.keys.op};transform:translateY(${H.keys.y}px)">${H.keys.keys.map(k => `<i class="${H.keys.dn ? 'dn' : ''}">${k}</i>`).join('')}<span>${H.keys.label}</span></div>`;
  const s = FM.SUBS.find(x => t >= x.t0 && t < x.t1);
  if (s && !NOSUBS) { const op = Math.min(seg(t, s.t0, s.t0 + .12), 1 - seg(t, s.t1 - .15, s.t1));
    h += `<div class="f-cap" style="opacity:${op};transform:translate(-50%,${(1 - eo(seg(t, s.t0, s.t0 + .2))) * 10}px)">${s.text}</div>`; }
  if (H.wipe) h += H.wipe;
  if (H.fade) h += `<div class="f-fade" style="opacity:${H.fade}"></div>`;
  if (t < .4) h += `<div class="f-fade" style="background:#0a2556;opacity:${1 - eo(t / .4)}"></div>`;
  hudEl.innerHTML = h;
}

window.render = render;
window.TEXTS = t => CH.texts ? CH.texts(t, FM.T) : [];
await document.fonts.load('16px "Atkinson Hyperlegible"'); await document.fonts.load('700 16px "Atkinson Hyperlegible"'); await document.fonts.load('16px "IBM Plex Mono"');
render(+(Q.get('t') || 0));
window.READY = true;
