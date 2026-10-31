// "One record's journey": the timeline. Voice lines sit at fixed times; every visual beat hangs on a spoken
// word (W). Camera moves, the mascot's performance, the cursor, the app window's screens and sound events.
import { VO, W, WE, END, EV, ev, typing, typed, cam, cut, camAt, camReset, Actor, Cursor, at, pt, B, BAR, bar,
  clamp, lerp, seg, ss, eio, eo, hash } from './core.js';
import { HERO, SLIPS, FORM } from './paint.js';
import { CHAPTERS, buildChapters } from './chapters.js';

export const DUR = 240;
export const T = {};
export let M, M2, CUR, TY = {};
export const SUBS = [];
export const WINDOW = { x: 240, y: 110, w: 1440, h: 850 };       // the browser window in world coordinates (viewport 1440×810 under a 40 px bar)
export const FULL = [960, 535, 1.2];                            // camera framing the whole window

// captions: split each line into phrases of ≤ 7 words at punctuation, timed by character share
function phrases(id, text, t0, dur) {
  const words = text.split(/\s+/), out = []; let cur = [];
  words.forEach((w, i) => { cur.push(w); const end = /[.,;:?!]$/.test(w) || cur.length >= 7; if (end && (cur.length >= 3 || /[.?!]$/.test(w)) || i === words.length - 1) { out.push(cur.join(' ')); cur = []; } });
  const total = out.reduce((a, p) => a + p.length, 0); let t = t0;
  return out.map(p => { const d = dur * p.length / total, r = { id, t0: t, t1: t + d, text: p }; t += d; return r; });
}

export function build(lines) {
  EV.length = 0; SUBS.length = 0; camReset([1120, 600, 1.55]);
  M = new Actor(.62, 1); M2 = new Actor(.62, 2); CUR = new Cursor();
  for (const l of lines) { ev(VO[l.id], 'vo', { id: l.id }); SUBS.push(...phrases(l.id, l.display || l.text, VO[l.id] - .05, END(l.id) - VO[l.id] + .2)); }
  // each caption holds ≥ 1.8 s (and until the next one starts when lines run long)
  SUBS.forEach((s, i) => { const nx = SUBS[i + 1]; s.t1 = Math.max(s.t1, s.t0 + 1.8); if (nx && nx.t0 < s.t1 && nx.id === s.id) nx.t0 = s.t1; });

  SUBS.forEach(s => ev(s.t0, 'sub', { t1: +s.t1.toFixed(3), text: s.text }));   // (after timing is final, below)
  // ═══ A. Opening (0–20): a total is typed; inside it, one student wakes; the register opens ═══
  T.click0 = .9; T.keys = [1.35, 1.62]; T.keys.forEach(k => ev(k, 'key', { v: 1 }));
  CUR.show(.2, 2.3).move(.2, .2, pt(1400, 860)).move(.25, T.click0 - .03, pt(FORM.field.x + 60, FORM.field.y + 4)).click(T.click0);
  T.grow0 = W('s1_open', 'lakhs') - .3; T.grow1 = T.grow0 + 3.2;
  cam(T.grow0 - .4, 3.6, [980, 560, 1.0], 'eio');                                   // pull back: the number fills the world
  T.wake = W('s1_open', 'record'); ev(T.wake, 'blink');
  cam(W('s1_open', 'behind'), 2.6, [HERO.x, HERO.y - 40, 2.3], 'eio');               // push in through the zero to one slip
  T.win0 = W('s1_open', 'this') - .4; T.win1 = T.win0 + .8; ev(T.win0, 'winopen');
  cam(T.win0 - .2, 1.6, FULL, 'eio');                                                // pull out to the window
  T.titleLand = Math.max(T.win1 + .25, W('s1_open', 'register') - .05); ev(T.titleLand, 'hit');
  M.hide(0, T.wake - .2)
   .stand(T.wake - .2, T.win0 + .2, pt(HERO.x, HERO.y + 22), { s: .62, legs: 'sit', eyes: t => t < T.wake ? 'shut' : t < T.wake + .9 ? 'wide' : 'u', still: true })
   .jump(T.win0 + .2, T.titleLand, pt(HERO.x, HERO.y + 22), at('brand', .62, 0, 0, 0), 260, { big: true })
   .stand(T.titleLand, 19.2, at('brand', .62, 0), { eyes: t => t < T.titleLand + .8 ? 'happy' : 'r', arms: t => t < T.titleLand + .8 ? 'up' : 'down' });
  T.out1 = 19.1; ev(T.out1, 'whoosh', { d: -1 });

  // ═══ B. Problem (20–50) ═══
  cut(19.6, [980, 560, 1.02]); cam(20, 8, [980, 590, 1.12], 'ss');
  T.squeeze = W('s2_problem', 'totals'); ev(T.squeeze, 'squash');
  T.over0 = W('s2_problem', 'excess') - .1; T.over1 = W('s2_problem', 'numbers', 0, true) + .2;
  for (let i = 0; i < 9; i++) ev(T.over0 + i * .07 * (T.over1 - T.over0) / .9, 'paper', { v: .5 });
  cam(T.over0 - .2, 2.2, [1260, 560, 1.25], 'eio');
  T.two = W('s2_problem', 'same') - .45; ev(T.two, 'whoosh', { d: 1 });
  cam(T.two, .5, [3150, 520, 1.05], 'whip');                                        // whip to the two colleges
  T.split = W('s2_problem', 'two') - .05; ev(T.split, 'pop');
  T.letter = W('s2_problem', 'employer') - .4;
  M.hide(19.2, 19.6)
   .stand(19.6, T.two - .1, pt(HERO.x, HERO.y + 22), { legs: 'sit', still: true, eyes: t => t < T.squeeze ? 'n' : t < T.over0 ? 'worry' : 'wide', sq: t => .22 * ss(seg(t, T.squeeze, T.squeeze + .4)) * (1 - seg(t, T.over0, T.over0 + .4)) })
   .hide(T.two - .1, T.two + .5)
   .stand(T.two + .5, T.letter - .2, pt(2830, 552), { eyes: t => t < T.split ? 'r' : t < T.split + .6 ? 'wide' : 'r' });
  M2.hide(0, T.split).stand(T.split, W('s2_problem', 'employer') - .3, pt(3470, 552), { op: t => eo(seg(t, T.split, T.split + .3)), eyes: t => t < T.split + .5 ? 'wide' : 'l', flip: true }).hide(W('s2_problem', 'employer') - .3, 50);
  ev(T.letter, 'whoosh', { d: 1 });
  cam(T.letter, 1.2, [3150, 1930, 1.1], 'eio');                                     // tilt down to the letter
  T.wait = W('s2_problem', 'wait');
  M.jump(T.letter - .2, T.letter + .9, pt(2830, 552), pt(3030, 1764), 160)
   .stand(T.letter + .9, 50.2, pt(3030, 1764), { legs: 'sit', eyes: t => t < T.wait ? 'r' : 'shut', arms: 'down', sq: t => t > T.wait ? .04 * Math.sin(t * 6) : 0 });
  for (let t = T.letter + 1; t < 48.4; t += .5) ev(t, 'tick', { v: t > T.wait ? .35 : .6 });
  cam(T.wait, 4, [3180, 1900, 1.25], 'ss');

  // ═══ C. The turn (50–70): the number cracks into rows; one register ═══
  T.crack = 50.0; ev(T.crack, 'crack');                                              // the first sound after the near-silence
  cut(T.crack, [980, 560, 1.0]);
  T.fly0 = T.crack + .3; T.fly1 = W('s3_solution', 'register') + .4;
  ev(T.fly0 + .2, 'cascade', { d: T.fly1 - T.fly0 });
  T.winC = T.crack + .2;
  cam(T.fly0, T.fly1 - T.fly0 + .6, FULL, 'eio');
  M.hide(50.2, T.fly0).path(T.fly0, T.fly1, (u, A) => { const tg = A('row-hero', .5, 0); if (!tg) return null;
      const k = eio(u); return { x: lerp(HERO.x, tg.x + 360, k), y: lerp(HERO.y + 22, tg.y, k) - Math.sin(k * Math.PI) * 220, legs: 'tuck' }; })
   .stand(T.fly1, W('s3_solution', 'checked') - .2, at('row-hero', .5, 0, 360, 0), { eyes: 'happy', arms: t => t < T.fly1 + .6 ? 'up' : 'down' });
  T.seat = W('s3_solution', 'seat') - .3;
  cam(T.seat, 1.6, [800, 520, 1.6], 'eio');
  M.walk(W('s3_solution', 'checked') - .2, T.seat + 1.4, at('row-hero', .5, 0, 360, 0), at('strip', .1, 0), { eyes: 'r' })
   .walk(T.seat + 1.4, W('s3_solution', 'declared') + .3, at('strip', .1, 0), at('strip', .62, 0), { eyes: 'd', ease: x => x })
   .stand(W('s3_solution', 'declared') + .3, 69.4, at('strip', .62, 0), { eyes: 'happy' });
  cam(W('s3_solution', 'declared') - .2, 1.8, FULL, 'eio');

  // ═══ D. The walkthrough (70–190): seven chapters in the real app ═══
  buildChapters({ T, M, M2, CUR, TY, FULL });

  // ═══ E. Architecture (190–220) ═══
  T.arch = 190.0; ev(T.arch, 'whoosh', { d: -1 });
  cut(T.arch + .4, [960, 600, .98]);
  cam(T.arch + .5, 6, [960, 560, 1.0], 'ss');
  T.ride0 = W('s5_architecture', 'validation') - .3; T.ride1 = W('s5_architecture', 'postgresql') + .3;
  T.sim = W('s5_architecture', 'simulated');
  cam(T.sim - .4, 1.0, [1500, 360, 1.7], 'eio');
  cam(END('s5_architecture') + .2, 1.4, [960, 560, 1.0], 'eio');
  M.hide(189, T.arch + 1.2).jump(T.arch + 1.2, T.arch + 1.8, pt(1230, 40), pt(1230, 130), 30)
   .stand(T.arch + 1.8, T.ride0, pt(1230, 130), { eyes: 'd' })
   .path(T.ride0, T.ride1, (u) => { const { spine } = globalThis.__paint; const p = spine(u); return { ...p, legs: 'tuck' }; }, { eyes: 'd', arms: 'up' })
   .stand(T.ride1, T.sim - .2, pt(1190, 960), { eyes: 'r' })
   .jump(T.sim - .2, T.sim + .5, pt(1190, 960), pt(1560, 290), 200)
   .stand(T.sim + .5, 219.4, pt(1560, 290), { eyes: 'd', arms: 'point' });

  // ═══ F. Close (220–240): the record, verified; the mascot sleeps on it ═══
  T.close = 220.0; ev(T.close, 'whoosh', { d: 1 });
  cut(T.close + .3, [820, 520, 1.25]);
  cam(T.close + .4, 8, [900, 540, 1.0], 'ss');
  T.motto = W('s6_close', 'every') - .1; T.sih = W('s6_close', 'smart') - .1;
  M.hide(219.4, T.close + 1).jump(T.close + 1, T.close + 1.6, pt(700, 60), at('checks', .3, 0), 120)
   .stand(T.close + 1.6, T.close + 7, at('checks', .3, 0), { eyes: 'happy' })
   .stand(T.close + 7, 241, at('checks', .3, 0), { legs: 'sit', eyes: 'shut', still: true, sq: t => .03 * Math.sin(t * 2.4) });
  T.fade = 237.2;
}

export { CHAPTERS };
