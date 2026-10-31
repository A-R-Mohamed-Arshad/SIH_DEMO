// The seven chapters of the walkthrough (70–190 s), the window's screens over the whole film, the painted
// world (the form, the numeral, colleges, the letter, the architecture), the HUD (chapter pill, ×N tag,
// keystrokes, spotlight, brush wipe). Screens are live-DOM snapshots of the real app: nothing here is invented UI.
import { W, WE, END, VO, ev, cam, cut, at, pt, clamp, lerp, seg, ss, eio, eo, hash } from './core.js';
import { WINDOW, FULL } from './film.js';
import * as PT from './paint.js';
import { sparkle, tick, cross, bang, dots, ringPulse, paint as paintMascot, SAFF, SAFF_D, NAVY, INK } from './mascot.js';

const SC = () => globalThis.__screens;
const screens = () => Object.keys(SC());
/** Find a screen by snapshot name; tolerant of small naming differences, never silently wrong. */
export function scr(prefix, label) {
  const all = screens(), exact = `${prefix}__${label}`;
  if (all.includes(exact)) return exact;
  const l = label.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const near = all.find(k => k.startsWith(prefix + '__') && k.toLowerCase().includes(l));
  if (near) return near;
  console.warn('missing screen', exact); return all.find(k => k.startsWith(prefix + '__')) || all[0];
}
const meas = (screen, key) => globalThis.__measure(screen, key);
const worldOf = r => ({ x: WINDOW.x + r.x + r.w / 2, y: WINDOW.y + 40 + r.y + r.h / 2, w: r.w, h: r.h });

// ───────── shots: the window's content over time
export const SHOTS = [];          // {t0, t1, id, url?, scroll?}
const shot = (t0, id, o = {}) => { SHOTS.push({ t0, id, ...o }); SHOTS.sort((a, b) => a.t0 - b.t0); };
export const CHAPTERS = [];       // {no, nm, t0, t1}
export const RAMPS = [];          // {t0, t1, x, what}
export const SPOTS = [];          // {t0, t1, key}
export const KEYS = [];           // {t0, keys, label, press}
export const OKS = [];            // success ticks {t, key}
export const FAILS = [];          // failure marks {t, key}
export const SEALS = [];          // painted ring pulses {t, key}

/** Camera focus on an element of a screen. */
function focus(t, screen, key, z, d = 1.1, e = 'eio') {
  const r = meas(screen, key); if (!r) { console.warn('no anchor', screen, key); return; }
  const w = worldOf(r); cam(t, d, [w.x, w.y, z], e);
}

export function buildChapters(ctx) {
  const { T, M, M2, CUR } = ctx;
  SHOTS.length = 0; CHAPTERS.length = 0; RAMPS.length = 0; SPOTS.length = 0; KEYS.length = 0; OKS.length = 0; FAILS.length = 0; SEALS.length = 0;
  const home = scr('s01_national', 'start');

  // ── opening + turn windows
  T.winHome = home;
  shot(T.win0, home, { url: 'apaar-student-register.vercel.app/#/aicte', open: true });
  shot(20, null);
  shot(T.crack + .2, scr('s03_dashboard', 'figures'), { url: 'apaar-student-register.vercel.app/#/inst', open: true });

  // ═══ 01 National register (70–86) ═══
  const c1 = scr('s01_national', 'figures'), c1b = scr('s01_national', 'alert');
  CHAPTERS.push({ no: '01', nm: 'National register', t0: 70, t1: 86 });
  shot(70, home, { url: 'apaar-student-register.vercel.app/#/aicte' });
  const a1 = W('s4a_dashboard', 'figure') - .2, a2 = W('s4a_dashboard', 'Narmada') - .25;
  shot(a1, c1); shot(a2, c1b);
  cam(70.6, 1.2, FULL, 'eio'); focus(a1, c1, 'figures', 1.5, 1.2); focus(a2, c1b, 'alert', 1.9, 1.3);
  SPOTS.push({ t0: W('s4a_dashboard', 'sixty-eight') - .2, t1: END('s4a_dashboard') + .5, key: 'alert' });
  CUR.show(a1 - .5, 85.4).move(a1 - .5, a1 - .5, pt(1500, 700)).move(a1 - .45, a1 + .7, at('figures', .7, .5), 40).move(a2 - .4, a2 + .4, at('alert', .8, .4), 40);
  M.hide(69.6, 70.4).jump(70.4, 71.1, pt(1180, 20), at('figures', .08, 0), 80)
   .walk(a1 + .3, a2 - .2, at('figures', .08, 0), at('figures', .92, 0), { eyes: 'd' })
   .jump(a2 - .2, a2 + .45, at('figures', .92, 0), at('alert', .28, 0), 70)
   .stand(a2 + .45, 86, at('alert', .28, 0), { eyes: t => t < W('s4a_dashboard', 'sixty-eight') ? 'wide' : 'worry', arms: t => t > W('s4a_dashboard', 'sixty-eight') ? 'point' : 'down' });

  // ═══ 02 Upload and validation (86–109) ═══
  CHAPTERS.push({ no: '02', nm: 'Upload and validation', t0: 86, t1: 109 });
  const u0 = scr('s04_upload', 'template'), u1 = scr('s04_upload', 'counts');
  const f1 = scr('s05_fix', 'suggestion'), f2 = scr('s05_fix', 'accepted'), f3 = scr('s05_fix', 'ready');
  const k0 = scr('s06_commit_inst', 'projection'), k1 = scr('s06_commit_inst', 'dialog'), k2 = scr('s06_commit_inst', 'committed');
  shot(86, u0, { url: 'apaar-student-register.vercel.app/#/inst/upload' });
  const b1 = W('s4b_upload', 'Twenty-six') - .3, b2 = W('s4b_upload', 'mistyped') - .3, b3 = W('s4b_upload', 'Staff') - .1, b4 = W('s4b_upload', 'never') - .3;
  shot(b1, u1); shot(b2, f1); shot(W('s4b_upload', 'did-you-mean') + .6, f2); shot(b3, f2); shot(b4, f3);
  const ff0 = b3 + .2, ff1 = b4 - .3; RAMPS.push({ t0: ff0, t1: ff1, x: 8, what: 'six more fixes' });
  shot(b4 + 4.2, k0); shot(b4 + 6.2, k1); shot(b4 + 8.4, k2);
  focus(b1, u1, 'counts', 1.5); focus(b2, f1, 'suggestion', 1.8); cam(b3 - .2, 1.0, [960, 560, 1.25], 'eio'); focus(b4, f3, 'counts', 1.45); focus(b4 + 4.2, k0, 'projection', 1.4);
  focus(b4 + 6.2, k1, 'dialog', 1.5); focus(b4 + 8.4, k2, 'projection', 1.25);
  SPOTS.push({ t0: b2 + .6, t1: b2 + 3.4, key: 'suggestion' });
  T.fixOk = W('s4b_upload', 'did-you-mean') + 1.1; OKS.push({ t: T.fixOk, key: 'suggestion' });
  CUR.show(86.5, 108).move(86.5, 86.5, pt(1400, 800)).move(86.6, b1 - .4, at('template', .5, .5), 40).click(b1 - .15)
   .move(b2, b2 + .9, at('suggestion', .85, .6), 35).click(T.fixOk - .35)
   .move(b3 + 1, b4 - .4, at('counts', .9, .5), 30)
   .move(b4 + 3.4, b4 + 4.1, at('click:Commit 15 rows', .5, .5), 40).click(b4 + 4.3, 'click')
   .move(b4 + 5.6, b4 + 6.1, at('click:confirm commit', .5, .5), 25).click(b4 + 6.4);
  M.hide(85.6, 86.4).jump(86.4, 87.1, pt(1180, 20), at('template', .1, 0), 90)
   .walk(b1 - .6, b1 + 1.6, at('template', .1, 0), at('counts', .9, 0), { eyes: 'd' })
   .stand(b1 + 1.6, b2, at('counts', .9, 0), { eyes: 'u', arms: 'up' })
   .jump(b2, b2 + .5, at('counts', .9, 0), at('suggestion', .2, 0), 70)
   .stand(b2 + .5, T.fixOk, at('suggestion', .2, 0), { eyes: 'd' })
   .stand(T.fixOk, b3 + .3, at('suggestion', .2, 0), { eyes: 'happy', arms: 'up' })
   .walk(b3 + .3, b3 + 2.6, at('suggestion', .2, 0), at('counts', .1, 0), { eyes: 'd' })
   .stand(b3 + 2.6, b4 + 3.6, at('counts', .1, 0), { eyes: 'r', arms: t => t > b4 ? 'hold' : 'down' })
   .jump(b4 + 3.6, b4 + 4.2, at('counts', .1, 0), at('projection', .12, 0), 60)
   .stand(b4 + 4.2, b4 + 6.5, at('projection', .12, 0), { eyes: 'wide' })
   .stand(b4 + 6.5, 109, at('projection', .12, 0), { eyes: 'happy', arms: 'up' });
  T.committed = b4 + 8.4; OKS.push({ t: T.committed, key: 'projection' });

  // ═══ 03 Seat check (109–121) ═══
  CHAPTERS.push({ no: '03', nm: 'Seat check', t0: 109, t1: 121 });
  const s0 = scr('s07_seatcheck', 'start'), s1 = scr('s07_seatcheck', 'result');
  shot(109, s0, { url: 'apaar-student-register.vercel.app/#/inst/seat-check' });
  const c3 = W('s4c_seat', 'run') - .2, c3b = W('s4c_seat', 'cross') - .6;
  shot(c3b, s1);
  cam(109.6, 1.0, FULL, 'eio'); focus(c3b + .1, s1, 'result', 1.55, 1.1);
  SPOTS.push({ t0: W('s4c_seat', 'cross') - .1, t1: END('s4c_seat') + .5, key: 'result' });
  CUR.show(109.4, 120.4).move(109.4, 109.4, pt(1300, 760)).move(109.5, c3b - .8, at('click:Seat category', .5, .5), 35).click(c3b - .55, 'toggle').move(c3b - .5, c3b - .1, at('click:Check seats', .5, .5), 30).click(c3b);
  KEYS.push({ t0: c3b - .7, keys: ['⏎'], label: 'check seats', press: [c3b] });
  M.hide(108.6, 109.4).jump(109.4, 110.1, pt(1180, 20), at('click:Seat category', .9, 0), 80)
   .stand(110.1, c3b, at('click:Seat category', .9, 0), { eyes: 'd' })
   .jump(c3b + .1, c3b + .7, at('click:Seat category', .9, 0), at('result', .15, 0), 70)
   .stand(c3b + .7, 121, at('result', .15, 0), { eyes: 'happy', arms: 'point' });

  // ═══ 04 Duplicates (121–138) ═══
  CHAPTERS.push({ no: '04', nm: 'The same student, two colleges', t0: 121, t1: 138 });
  const d0 = scr('s09_privacy_inst', 'evidence'), d1 = scr('s11_priority', 'weights');
  shot(121, d0, { url: 'apaar-student-register.vercel.app/#/issues' });
  const d_w = W('s4d_duplicate', 'name') - .3;
  shot(d_w, d1, { url: 'apaar-student-register.vercel.app/#/aicte/identity' });
  focus(121.6, d0, 'evidence', 1.5, 1.2); focus(d_w + .2, d1, 'weights', 1.5, 1.2);
  SPOTS.push({ t0: W('s4d_duplicate', 'withheld') - .3, t1: W('s4d_duplicate', 'withheld') + 2.2, key: 'evidence' });
  CUR.show(121.4, 137.4).move(121.4, 121.4, pt(1200, 800)).move(121.6, 122.6, at('evidence', .5, .5), 30).move(d_w + .4, d_w + 1.2, at('weights', .5, .5), 25);
  M.hide(120.6, 121.4).jump(121.4, 122.1, pt(1180, 20), at('evidence', .08, 0), 80)
   .stand(122.1, W('s4d_duplicate', 'withheld') - .2, at('evidence', .08, 0), { eyes: 'r' })
   .stand(W('s4d_duplicate', 'withheld') - .2, d_w - .2, at('evidence', .08, 0), { eyes: 'shut', arms: 'hold' })
   .jump(d_w - .2, d_w + .5, at('evidence', .08, 0), at('weights', .1, 0), 70)
   .stand(d_w + .5, 138, at('weights', .1, 0), { eyes: 'd' });

  // ═══ 05 Signed records and verification (138–164) ═══
  CHAPTERS.push({ no: '05', nm: 'Signed records, checked in order', t0: 138, t1: 164 });
  const e0 = scr('s12_issue_student', 'claims'), e1 = scr('s12_issue_student', 'shared'), e2 = scr('s13_verify', 'checks'), e3 = scr('s13_verify', 'tampered'), e4 = scr('s14_consent_student', 'fields');
  shot(138, e0, { url: 'apaar-student-register.vercel.app/#/me/record' });
  const v_sh = W('s4e_verify', 'chooses') - .3, v_em = W('s4e_verify', 'employer') - .3, v_ch = W('s4e_verify', 'six') - .1, v_tm = W('s4e_verify', 'Change') - .5, v_cn = W('s4e_verify', 'Consent-based') - .2;
  shot(v_sh, e1); shot(v_em, e2, { url: 'apaar-student-register.vercel.app/#/verify' }); shot(v_tm, e3); shot(v_cn, e4, { url: 'apaar-student-register.vercel.app/#/me' });
  focus(138.6, e0, 'claims', 1.45); focus(v_sh, e1, 'qr', 1.6); focus(v_em + .5, e2, 'checks', 1.5, 1.2); focus(v_tm + .4, e3, 'failed', 1.55); focus(v_cn + .3, e4, 'fields', 1.5);
  SEALS.push({ t: v_sh + 1.2, key: 'qr' });
  OKS.push({ t: v_ch + 3.0, key: 'checks' }); FAILS.push({ t: v_tm + .9, key: 'failed' });
  SPOTS.push({ t0: v_tm + .6, t1: v_tm + 3.4, key: 'failed' });
  CUR.show(138.5, 163.6).move(138.5, 138.5, pt(1250, 800)).move(138.7, 140.2, at('claims', .45, .4), 30)
   .move(v_sh - 1.2, v_sh - .2, at('click:Create share token', .5, .5), 30).click(v_sh - .2)
   .move(v_em, v_em + 1.0, at('click:Verify record', .5, .5), 35).click(v_em + 1.1)
   .move(v_tm - .8, v_tm - .1, at('click:tamper', .5, .5), 35).click(v_tm)
   .move(v_cn + .6, v_cn + 1.6, at('fields', .5, .6), 30);
  KEYS.push({ t0: v_em - .1, keys: ['Ctrl', 'V'], label: 'paste the token', press: [v_em + .4] });
  M.hide(137.6, 138.4).jump(138.4, 139.1, pt(1180, 20), at('claims', .1, 0), 80)
   .stand(139.1, v_sh, at('claims', .1, 0), { eyes: 'r' })
   .jump(v_sh, v_sh + .6, at('claims', .1, 0), at('qr', .5, 0), 60)
   .stand(v_sh + .6, v_em, at('qr', .5, 0), { eyes: 'happy', arms: 'hold' })
   .jump(v_em, v_em + .7, at('qr', .5, 0), at('checks', .08, 0), 90)
   .stand(v_em + .7, v_tm + .4, at('checks', .08, 0), { eyes: t => t > v_ch + 3 ? 'happy' : 'd', arms: t => t > v_ch + 3 ? 'up' : 'down' })
   .stand(v_tm + .4, v_cn - .1, at('failed', .08, 0), { eyes: t => t < v_tm + 3.2 ? 'worry' : 'n', smudge: t => .8 * (1 - seg(t, v_tm + 2.6, v_tm + 4.2)) * seg(t, v_tm + .5, v_tm + 1.0) })
   .jump(v_cn - .1, v_cn + .6, at('failed', .08, 0), at('fields', .1, 0), 80)
   .stand(v_cn + .6, 164, at('fields', .1, 0), { eyes: 'r' });

  // ═══ 06 Under 18 (164–175) ═══
  CHAPTERS.push({ no: '06', nm: 'Students under 18', t0: 164, t1: 175 });
  const m0 = scr('s16_minor', 'held');
  shot(164, m0, { url: 'apaar-student-register.vercel.app/#/me' });
  const mh = W('s4f_minor', 'hold') - .3;
  focus(164.4, m0, 'share', 1.3, 1.0); focus(mh, m0, 'held', 1.7, 1.0);
  SPOTS.push({ t0: mh, t1: END('s4f_minor') + .6, key: 'held' });
  CUR.show(164.3, 174.6).move(164.3, 164.3, pt(1300, 800)).move(164.5, 165.6, at('share', .4, .5), 30).move(mh - .5, mh + .2, at('held', .7, .5), 30);
  M.hide(163.4, 164.3).jump(164.3, 165.0, pt(1180, 20), at('share', .06, 0), 80)
   .stand(165.0, mh, at('share', .06, 0), { eyes: 'r' })
   .jump(mh, mh + .55, at('share', .06, 0), at('held', .1, 0), 60)
   .stand(mh + .55, 175, at('held', .1, 0), { eyes: 'worry', arms: 'hold' });

  // ═══ 07 Audit and honesty (175–190) ═══
  CHAPTERS.push({ no: '07', nm: 'Audit and honesty', t0: 175, t1: 190 });
  const z0 = scr('s15_close', 'intact'), z1 = scr('s17_status', 'counts'), z2 = scr('s17_status', 'simulated');
  shot(175, z0, { url: 'apaar-student-register.vercel.app/#/audit' });
  const g1 = W('s4g_audit', 'hash-chained') - .3, g2 = W('s4g_audit', 'public') - .4, g3 = W('s4g_audit', 'simulated') - .3;
  shot(g2, z1, { url: 'apaar-student-register.vercel.app/#/status' }); shot(g3, z2);
  focus(175.5, z0, 'chain', 1.5, 1.1); focus(g2 + .3, z1, 'counts', 1.35); focus(g3 + .2, z2, 'counts', 1.0, 1.0);
  OKS.push({ t: g1 + 1.4, key: 'chain' });
  CUR.show(175.3, 189.4).move(175.3, 175.3, pt(1300, 800)).move(175.5, 176.6, at('chain', .6, .5), 30).move(g2 + .4, g2 + 1.4, at('counts', .5, .5), 30);
  M.hide(174.6, 175.4).jump(175.4, 176.1, pt(1180, 20), at('chain', .05, 0), 80)
   .stand(176.1, g1, at('chain', .05, 0), { eyes: 'r' })
   .walk(g1, g1 + 2.6, at('chain', .05, 0), at('chain', .92, 0), { eyes: 'd', ease: x => x })
   .stand(g1 + 2.6, g2, at('chain', .92, 0), { eyes: 'happy', arms: 'up' })
   .jump(g2, g2 + .6, at('chain', .92, 0), at('counts', .1, 0), 90)
   .stand(g2 + .6, 190, at('counts', .1, 0), { eyes: 'r' });

  // closing window screen: the verified record the mascot sleeps on
  shot(220.0, e2, { url: 'apaar-student-register.vercel.app/#/verify', open: true });
  shot(238.4, null);
  CHAPTERS.forEach(c => { ev(c.t0 - .1, 'whoosh', { d: 1 }); ev(c.t0 + .25, 'wipe'); });
  OKS.forEach(o => ev(o.t, 'ding', { v: .8 })); FAILS.forEach(o => ev(o.t, 'thunk', { v: .9 })); SEALS.forEach(o => ev(o.t, 'seal', { v: .8 }));
  RAMPS.forEach(r => { ev(r.t0, 'ffon'); for (let t = r.t0; t < r.t1; t += .22) ev(t, 'ffkey', { v: .35 }); });
  T.ch = CHAPTERS;
  // chapter transitions: camera returns to the full window under the wipe
  CHAPTERS.slice(1).forEach(c => { cam(c.t0 + .3, .5, FULL, 'whip'); });
}

// ───────── the window over time
export function winAt(t, T) {
  const sh = SHOTS.filter(s => s.t0 <= t).pop(); if (!sh || !sh.id) return null;
  const sc = SC()[sh.id];
  let op = 1, s = 1, origin = '50% 50%';
  // pop-in when a shot is flagged `open`
  if (sh.open) { const k = clamp((t - sh.t0) / .8); const e = 1 - Math.pow(1 - k, 3);
    op = clamp(k * 6); s = .55 + .45 * (1 + .12 * Math.sin(k * Math.PI)) * e + .0; s = lerp(.55, 1, eo(k)) + .03 * Math.sin(k * Math.PI);
    origin = `${(PT.HERO.x - WINDOW.x) / WINDOW.w * 100}% ${(PT.HERO.y - WINDOW.y) / WINDOW.h * 100}%`; }
  // fade out where the next shot is empty (null)
  const nx = SHOTS.find(x => x.t0 > t); if (nx && !nx.id) { const k = clamp((nx.t0 - t) / .5); op = Math.min(op, k); s *= lerp(.96, 1, k); }
  // closing: the window dims behind the sleeping mascot
  const dim = t > 233 ? seg(t, 233, 238.2) : 0;
  return { id: sh.id, url: sh.url || sc.url, scroll: sc.scroll, op, s, origin, dim };
}

/** Per-frame touches on the real DOM: highlight, typed text and the like are already in the snapshot; nothing to add. */
export function mutate() {}
export function find(doc, key) {
  let el = doc.querySelector(`[data-a="${CSS.escape(key)}"]`);
  if (el) return el;
  const FALL = { brand: '.brandline .en', strip: '.seatstrip', 'row-hero': '.seatstrip svg rect', figures: '.figs', counts: '.figs', alert: '.prog-grid > div', chain: '.banner.ok' };
  return FALL[key] ? doc.querySelector(FALL[key]) : null;
}

// ───────── painted world
const R = { op: 1 };
export function paintUnder(c, t, T, A) {
  // opening: the form, the typed total, the numeral growing out of it
  const typedTxt = t < 1.35 ? '' : t < 1.62 ? '6' : '60';
  const formOp = clamp(1 - seg(t, T.grow0 + .6, T.grow0 + 2.4));
  PT.form(c, t, { op: formOp, typed: typedTxt, caret: Math.floor(t * 2.4) % 2 === 0 && t < 3 });
  const showNumeral = t < T.win0 + .2 || (t >= 19.5 && t < T.crack + 4);
  if (showNumeral) {
    const grow = t < T.win0 ? seg(t, T.grow0, T.grow1) : 1;
    const opN = t < T.win0 ? 1 : t < T.win0 + .2 ? 1 - seg(t, T.win0, T.win0 + .2) : 1;
    const crack = t >= T.crack ? seg(t, T.crack + .1, T.fly1) : 0;
    const overflow = seg(t, T.over0, T.over0 + 1.6) ;
    const squeeze = seg(t, T.squeeze, T.squeeze + .4) * (1 - seg(t, T.over0, T.over0 + .5));
    PT.numeral(c, t, { op: opN, grow, overflow, mark: true, squeeze, crack,
      targets: i => { const st = A('strip', 0, .5); if (!st) return null; const n = PT.SLIPS.length; return { x: st.x - st.w / 2 + (i / n) * st.w, y: st.y, s: .22 }; } });
    if (t >= T.win0 && t < T.win0 + .8) { /* the window covers the numeral as it opens */ }
  }
  // two colleges, the same student in both
  if (t >= T.two - .8 && t < T.letter + 1.2) {
    const op = clamp(seg(t, T.two - .8, T.two - .2) * (1 - seg(t, T.letter + .2, T.letter + 1.2)));
    PT.college(c, t, 2830, 552 + 4, 'College A', op, 1); PT.college(c, t, 3470, 556, 'College B', op, 2);
  }
  // the letter and the long wait
  if (t >= T.letter - .6 && t < 50.1) {
    PT.letter(c, t, { op: clamp(seg(t, T.letter - .6, T.letter) * (1 - seg(t, 49.5, 50.1))), x: 3150, y: 1880, cx: 3520, cy: 1830, sweep: seg(t, T.letter, 50) });
  }
  // architecture
  if (t >= 190 && t < 221) {
    const p = seg(t, 190.6, 197.5), op = clamp(seg(t, 190, 190.6) * (1 - seg(t, 219.4, 220.4)));
    PT.arch(c, t, { op, p, pulses: t > 196 });
  }
}
export function paintOver(c, t, T, A) {
  SEALS.forEach(s => { const k = (t - s.t) / 1.1; if (k < 0 || k > 1) return; const p = A(s.key, .5, .5); if (!p) return;
    for (let i = 0; i < 2; i++) { const kk = clamp(k - i * .18); if (kk > 0) ringPulse(c, p.x, p.y, 26 + 110 * eo(kk), (1 - kk) * .85, t, i ? NAVY : SAFF); } });
}
export function props(c, t, T, m, A, second) {
  const top = m.y - 94 * m.s;
  OKS.forEach(o => { const k = (t - o.t) / 1.6; if (k >= 0 && k < 1) { tick(c, m.x + 38 * m.s, top - 10 - k * 24, 1.0, 1 - seg(t, o.t + 1.1, o.t + 1.6), t); sparkle(c, m.x - 40 * m.s, top + 8 - k * 20, .9, (1 - k) * .9); } });
  FAILS.forEach(o => { const k = (t - o.t) / 1.8; if (k >= 0 && k < 1) cross(c, m.x + 38 * m.s, top - 10, 1.0, 1 - seg(t, o.t + 1.3, o.t + 1.8), t); });
  if (t > T.squeeze && t < T.squeeze + 1.4 && !second) bang(c, m.x + 36 * m.s, top - 6, 1.0, 1 - seg(t, T.squeeze + 1, T.squeeze + 1.4), t);
}

// ───────── HUD
export function hudAt(t, T, A, C) {
  const H = {};
  const ch = CHAPTERS.find(c => t >= c.t0 + .2 && t < c.t1 - .1);
  if (ch) H.chap = { no: ch.no, nm: ch.nm, op: Math.min(seg(t, ch.t0 + .5, ch.t0 + .8), 1 - seg(t, ch.t1 - .45, ch.t1 - .1)) };
  const rp = RAMPS.find(r => t >= r.t0 && t < r.t1);
  if (rp) H.ramp = { op: Math.min(seg(t, rp.t0, rp.t0 + .2), 1 - seg(t, rp.t1 - .2, rp.t1)), blink: Math.floor(t * 4) % 2, x: rp.x, what: rp.what };
  const sp = SPOTS.find(s => t >= s.t0 && t < s.t1); if (sp) H.spot = { key: sp.key, op: Math.min(seg(t, sp.t0, sp.t0 + .3), 1 - seg(t, sp.t1 - .3, sp.t1)) };
  if (t < 2.4) H.keys = { keys: ['6', '0'], label: 'declared admissions', op: seg(t, 1.25, 1.35) * (1 - seg(t, 2.1, 2.4)), dn: (t > 1.35 && t < 1.45) || (t > 1.62 && t < 1.72), y: 0 };
  for (const k of KEYS) if (t >= k.t0 && t < k.t0 + 1.8) H.keys = { keys: k.keys, label: k.label, op: Math.min(seg(t, k.t0, k.t0 + .2), 1 - seg(t, k.t0 + 1.5, k.t0 + 1.8)), dn: k.press.some(p => t >= p && t < p + .18), y: (1 - Math.min(1, seg(t, k.t0, k.t0 + .3))) * 16 };
  // brush wipe at every chapter seam, and at the turn
  for (const c of CHAPTERS) if (t >= c.t0 - .1 && t < c.t0 + .9) H.wipe = wipe((t - (c.t0 - .1)) / 1.0, c.no, c.nm);
  if (t > T.fade) H.fade = seg(t, T.fade, 239.6);
  return H;
}
function wipe(p, no, nm) {
  // a navy sheet pulled across by a saffron brush edge; title shown at the middle, then pulled off the same way
  const cover = ss(clamp(p / .42)), reveal = ss(clamp((p - .58) / .42));
  const left = reveal * 1920, right = cover * 1920;
  if (right <= left) return '';
  const edge = (x, seed) => { let pts = ''; for (let y = 0; y <= 1080; y += 60) pts += `${x + (hash(seed + y) - .5) * 40}px ${y}px,`; return pts; };
  const poly = `polygon(${left}px 0, ${edge(right, 3)} ${right}px 1080px, ${left}px 1080px)`;
  const lo = clamp(Math.min((p - .3) / .14, (.82 - p) / .14));
  return `<div style="position:absolute;inset:0;background:${NAVY};clip-path:${poly}"></div>
  <div style="position:absolute;inset:0;clip-path:${poly}"><div style="position:absolute;left:${right - 46}px;top:0;width:46px;height:1080px;background:${SAFF};opacity:.95"></div></div>
  <div class="f-wlabel" style="opacity:${lo};transform:translate(-50%,calc(-50% + ${(1 - lo) * 18}px))"><div class="no">${no}</div><div class="nm">${nm}</div></div>`;
}
export function texts(t) { return []; }
