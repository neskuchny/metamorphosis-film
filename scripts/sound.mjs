/* Sound design for the film, generated in code (no samples, no licences, deterministic: the same film gives the same track).
   Ideas after sarpstar/cinecode (MIT, references/sound.md): the voice leads, beds duck under it, hits sit on the cuts that
   carry meaning, silence before the biggest moments, events locked to what the picture does.

   Identity: "an office after hours that slowly turns into a machine room".
     bed      room tone, the same space all film long (band-limited pink noise, seeded drift)
     body     low weight under the film, grows act by act (22-90 Hz plus the 70-250 Hz harmonics a phone can play)
     machine  fans of a machine room, enter in the last act (slow pulsing band noise)
     music    the old two-note drone, quiet, ducked (film.sound.music:false turns it off)
     hits     on chapter titles and statements; whoosh peaking on chapter cuts
     ticks    the year counter's mechanical tick: the film's signature, on every year change the picture shows
     taps     soft contacts on the moments the picture moves (measured from the rendered video)
     silence  the beds drop away before the "moment" and "end" scenes, then a hit (or room tone) brings them back

   designSound({ film, timeline, total, years, onsets, out }) writes a 48 kHz stereo 32-bit float WAV. */
import fs from 'node:fs';

const SR = 48000;

function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// RBJ biquad; f may change during a run (coefficients are refreshed every 32 samples)
function biquad(type, f, q = 0.707) {
  let b0, b1, b2, a1, a2, x1 = 0, x2 = 0, y1 = 0, y2 = 0, cur = -1;
  const set = (fr) => {
    cur = fr; const w = 2 * Math.PI * Math.min(fr, SR * 0.45) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let n0, n1, n2; const d0 = 1 + al;
    if (type === 'lp') { n0 = (1 - c) / 2; n1 = 1 - c; n2 = (1 - c) / 2; }
    else if (type === 'hp') { n0 = (1 + c) / 2; n1 = -(1 + c); n2 = (1 + c) / 2; }
    else { n0 = al; n1 = 0; n2 = -al; }                                   // band-pass, 0 dB peak
    b0 = n0 / d0; b1 = n1 / d0; b2 = n2 / d0; a1 = -2 * c / d0; a2 = (1 - al) / d0;
  };
  set(f);
  return (x, fr) => {
    if (fr !== undefined && fr !== cur) set(fr);
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y; return y;
  };
}
function pinkGen(r) { let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0; return () => { const w = r() * 2 - 1; b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; const o = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926; return o * 0.11; }; }
function brownGen(r) { let l = 0; return () => { l = (l + 0.02 * (r() * 2 - 1)) * 0.998; return l * 3.5; }; }

// piecewise-linear envelope over [t, v] points, sampled per sample index
function envelope(points, n) {
  const e = new Float32Array(n); const P = [...points].sort((a, b) => a[0] - b[0]);
  if (!P.length) return e.fill(1);
  let k = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    while (k < P.length - 1 && P[k + 1][0] <= t) k++;
    if (t <= P[0][0]) e[i] = P[0][1];
    else if (k >= P.length - 1) e[i] = P[P.length - 1][1];
    else { const [t0, v0] = P[k], [t1, v1] = P[k + 1]; e[i] = t1 > t0 ? v0 + (v1 - v0) * (t - t0) / (t1 - t0) : v1; }
  }
  return e;
}

// small Freeverb-style room for the event bus (4 combs + 2 all-passes per channel)
function reverb(L, R, wet = 0.22, room = 0.78, damp = 0.35) {
  const combsL = [1116, 1188, 1277, 1356], combsR = combsL.map((x) => x + 23), aps = [556, 441];
  const run = (inp, lens, apl) => {
    const out = new Float32Array(inp.length);
    const cb = lens.map((l) => ({ b: new Float32Array(l), i: 0, f: 0 }));
    const ab = apl.map((l) => ({ b: new Float32Array(l), i: 0 }));
    for (let n = 0; n < inp.length; n++) {
      const x = inp[n] * 0.03; let s = 0;
      for (const c of cb) { const y = c.b[c.i]; c.f = y * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * room; c.i = (c.i + 1) % c.b.length; s += y; }
      for (const a of ab) { const y = a.b[a.i]; a.b[a.i] = s + y * 0.5; a.i = (a.i + 1) % a.b.length; s = y - s; }
      out[n] = s;
    }
    return out;
  };
  const wl = run(L, combsL, aps), wr = run(R, combsR, aps.map((x) => x + 23));
  for (let n = 0; n < L.length; n++) { L[n] += wl[n] * wet * 3; R[n] += wr[n] * wet * 3; }
}

// ---------- events (mono voices written into a stereo bus) ----------
function addHit(L, R, t, gain, seed) {
  const s0 = Math.round(t * SR), n = Math.round(1.8 * SR), r = rng(seed), lp = biquad('lp', 3000);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < L.length; i++) {
    const tt = i / SR, f = 140 * Math.pow(42 / 140, Math.min(1, tt / 0.18));
    ph += 2 * Math.PI * f / SR;
    const kick = Math.sin(ph);
    const ke = Math.min(1, tt / 0.003) * Math.exp(-tt / 0.16);
    const ne = Math.min(1, tt / 0.002) * Math.exp(-tt / 0.45);
    const nz = i % 32 === 0 ? lp(r() * 2 - 1, 3000 * Math.pow(200 / 3000, Math.min(1, tt / 1.2))) : lp(r() * 2 - 1);
    const v = gain * (kick * ke + 0.35 * nz * ne);
    if (s0 + i >= 0) { L[s0 + i] += v; R[s0 + i] += v; }
  }
}
// a low swell peaking at `peak` (put the peak on the cut), gone 0.3 s after
function addWhoosh(L, R, peak, dur, gain, seed) {
  const t0 = peak - dur / 2, s0 = Math.round(t0 * SR), n = Math.round((dur / 2 + 0.3) * SR), r = rng(seed);
  const body = biquad('lp', 140, 0.7), harm = biquad('bp', 220, 1.2), air = biquad('bp', 2800, 0.8);
  for (let i = 0; i < n; i++) {
    const tt = i / SR, u = tt - dur / 2;
    const e = u < 0 ? Math.pow(Math.max(0, 1 + u / (dur / 2)), 3) : Math.exp(-u / 0.08);
    const w = r() * 2 - 1, b = body(w) * 1.6, h = harm(w) * 0.6, a = air(w) * 0.05;
    const k = s0 + i; if (k < 0 || k >= L.length) continue;
    L[k] += gain * e * (b + h + a * 0.4); R[k] += gain * e * (b + h + a * 1.6);
  }
}
// the year counter's tick: a short click with a small resonant body
function addTick(L, R, t, gain, seed) {
  const s0 = Math.round(t * SR), n = Math.round(0.08 * SR), r = rng(seed), hp = biquad('hp', 3500), bd = biquad('bp', 2100, 9);
  for (let i = 0; i < n; i++) {
    const tt = i / SR, k = s0 + i; if (k < 0 || k >= L.length) continue;
    const w = r() * 2 - 1, v = gain * (hp(w) * Math.exp(-tt / 0.004) + 1.4 * bd(w) * Math.exp(-tt / 0.018));
    L[k] += v * 0.9; R[k] += v;
  }
}
// a soft contact (paper, a card landing): band noise, short
function addTap(L, R, t, gain, seed, pan) {
  const s0 = Math.round(t * SR), n = Math.round(0.12 * SR), r = rng(seed), hp = biquad('hp', 350), lp = biquad('lp', 2400);
  for (let i = 0; i < n; i++) {
    const tt = i / SR, k = s0 + i; if (k < 0 || k >= L.length) continue;
    const v = gain * lp(hp(r() * 2 - 1)) * Math.min(1, tt / 0.002) * Math.exp(-tt / 0.03);
    L[k] += v * (1 - pan); R[k] += v * (1 + pan);
  }
}

// ---------- picture events ----------
// onsets from per-frame motion (mean luma difference, 0-255): a rise well above the moving background
export function motionOnsets(yavg, fps, cuts) {
  const m = yavg.map((_, i) => { const a = [yavg[i - 1] ?? yavg[i], yavg[i], yavg[i + 1] ?? yavg[i]].sort((x, y) => x - y); return a[1]; });
  const out = []; let last = -9;
  for (let i = 4; i < m.length; i++) {
    const t = i / fps, prev = (m[i - 1] + m[i - 2] + m[i - 3] + m[i - 4]) / 4;
    if (m[i] < 0.35 || m[i] < prev * 1.8 + 0.12) continue;
    if (t - last < 0.35) continue;
    if (cuts.some((c) => t > c - 0.45 && t < c + 0.6)) continue;   // the fade through black at every cut is not an event
    out.push({ t: Math.max(0, t - 1 / fps), m: m[i] }); last = t;
  }
  return out;
}

export function designSound({ film, timeline, total, years = [], onsets = [], out }) {
  const N = Math.ceil((total + 0.5) * SR);
  const opts = film.sound || {};
  const sc = film.scenes;
  const starts = timeline.map((x) => x.start);
  const chapters = sc.map((s, i) => (s.type === 'chapter' ? i : -1)).filter((i) => i >= 0);
  const drops = sc.map((s, i) => ((s.sound === 'drop' || (s.sound !== 'none' && (s.type === 'moment' || s.type === 'end'))) ? i : -1)).filter((i) => i > 0);
  // intensity per scene: how far the film has come, counted in chapters
  const inten = sc.map((_, i) => 0.3 + 0.7 * (chapters.filter((c) => c <= i).length / Math.max(1, chapters.length)));

  // ---- beds: envelopes ----
  const speech = timeline.map((x) => [x.start + x.speechStart, x.start + x.speechEnd]).filter(([a, b]) => b - a > 0.2);
  const duckPts = [[0, 1]];
  for (const [a, b] of speech) duckPts.push([Math.max(0, a - 0.15), 1], [a, 0.5], [b, 0.5], [b + 0.4, 1]);
  const bodyPts = [], machPts = [], roomPts = [[0, 0], [0.3, 1]];
  timeline.forEach((x, i) => {
    const v = inten[i], next = timeline[i + 1];
    bodyPts.push([x.start + 0.3, v], [x.start + x.dur - 0.3, v]);
    machPts.push([x.start + 0.5, Math.max(0, (v - 0.72) / 0.28)], [x.start + x.dur - 0.5, Math.max(0, (v - 0.72) / 0.28)]);
    if (next && drops.includes(i + 1)) {          // silence before the biggest moment: the room empties, then the cut
      const c = next.start;
      bodyPts.push([c - 1.2, v], [c - 0.4, 0.02]); machPts.push([c - 1.2, 0.5], [c - 0.4, 0]);
      roomPts.push([c - 1.2, 1], [c - 0.4, 0.25], [c + 0.1, 0.25], [c + 0.6, 1]);
      if (sc[i + 1].type === 'end') { bodyPts.push([c + 0.1, 0.02], [c + 3, 0.15]); }
    }
  });
  const fadeOut = (T) => [[0, 1], [Math.max(0, total - 4), 1], [total, 0]];
  const dk = envelope(duckPts, N), ro = envelope(roomPts, N), bo = envelope(bodyPts, N), ma = envelope(machPts, N), fo = envelope(fadeOut(), N);

  const L = new Float32Array(N), R = new Float32Array(N);
  const g = (db) => Math.pow(10, db / 20);
  // room tone (two decorrelated channels)
  {
    const pl = pinkGen(rng(11)), pr = pinkGen(rng(12)), hl = biquad('hp', 140), hr = biquad('hp', 140), ll = biquad('lp', 1500), lr = biquad('lp', 1500);
    const r = rng(13); let drift = 1, target = 1;
    const G = g(opts.room_db ?? -24) * 4;
    for (let i = 0; i < N; i++) {
      if (i % (SR / 2) === 0) target = 1 - 0.12 * r();
      drift += (target - drift) * 0.00002;
      const e = G * drift * ro[i] * dk[i] * fo[i];
      L[i] += e * ll(hl(pl())); R[i] += e * lr(hr(pr()));
    }
  }
  // low body + its phone-audible harmonics
  {
    const b = brownGen(rng(21)), lo1 = biquad('hp', 22), lo2 = biquad('lp', 90), h1 = biquad('hp', 70), h2 = biquad('lp', 250);
    const G = g(opts.body_db ?? -18);
    for (let i = 0; i < N; i++) {
      const x = lo2(lo1(b())), hh = h2(h1(Math.tanh(x * 6))) * 0.4;
      const v = G * (x + hh) * bo[i] * (0.55 + 0.45 * dk[i]) * fo[i];
      L[i] += v; R[i] += v;
    }
  }
  // machine room fans (last act)
  {
    const p = pinkGen(rng(31)), bp = biquad('bp', 520, 0.9), bp2 = biquad('bp', 1250, 2);
    const G = g(opts.machine_db ?? -27) * 5;
    for (let i = 0; i < N; i++) {
      const t = i / SR, puls = 0.8 + 0.2 * Math.sin(2 * Math.PI * t * 0.37) * Math.sin(2 * Math.PI * t * 0.11 + 1);
      const w = p(), v = G * (bp(w) + 0.35 * bp2(w)) * puls * ma[i] * dk[i] * fo[i];
      L[i] += v * 0.85; R[i] += v;
    }
  }
  // the quiet drone (music); film.sound.music: false turns it off
  if (opts.music !== false) {
    const G = g(opts.music_db ?? -25), lp = biquad('lp', 700), lp2 = biquad('lp', 700);
    for (let i = 0; i < N; i++) {
      const t = i / SR;
      const l = 0.5 * Math.sin(2 * Math.PI * 55 * t) * (0.55 + 0.45 * Math.sin(2 * Math.PI * t / 23)) + 0.35 * Math.sin(2 * Math.PI * 82.5 * t + Math.sin(2 * Math.PI * t / 7)) * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / 31 + 1));
      const r = 0.5 * Math.sin(2 * Math.PI * 55.2 * t) * (0.55 + 0.45 * Math.sin(2 * Math.PI * t / 23 + 0.5)) + 0.35 * Math.sin(2 * Math.PI * 82.4 * t + Math.sin(2 * Math.PI * t / 7 + 1)) * (0.5 + 0.5 * Math.sin(2 * Math.PI * t / 29));
      const e = G * dk[i] * fo[i] * Math.min(1, t / 3) * (0.6 + 0.4 * bo[i]);
      L[i] += e * lp(l); R[i] += e * lp2(r);
    }
  }

  // ---- events bus (shares one room) ----
  const EL = new Float32Array(N), ER = new Float32Array(N);
  const cues = [];
  addHit(EL, ER, 0.02, g(-10), 1); cues.push([0, 'hit']);                       // the hook sounds from frame 1
  timeline.forEach((x, i) => {
    const s = sc[i];
    if (s.sound === 'none') return;
    if (s.type === 'chapter') { addWhoosh(EL, ER, x.start + 0.05, 1.0, g(-9), 100 + i); addHit(EL, ER, x.start + 0.35, g(-11), 200 + i); cues.push([x.start, 'whoosh+hit']); }
    else if (s.type === 'statement') { addHit(EL, ER, x.start + 0.45, g(-15), 300 + i); cues.push([x.start + 0.45, 'hit']); }
    else if (drops.includes(i) && s.type !== 'end') { addHit(EL, ER, x.start + 0.15, g(-8), 400 + i); cues.push([x.start + 0.15, 'hit']); }
    else if (s.type === 'end') { addHit(EL, ER, x.start + 0.6, g(-12), 500 + i); cues.push([x.start + 0.6, 'hit']); }
  });
  const busy = cues.map((c) => c[0]);
  years.forEach((t, k) => { addTick(EL, ER, t, g(-15), 600 + k); busy.push(t); });
  let nt = 0;
  for (const o of onsets) {
    if (busy.some((b) => Math.abs(b - o.t) < 0.25)) continue;
    const lvl = -30 + Math.min(8, (o.m - 0.35) * 5);
    addTap(EL, ER, o.t, g(lvl), 700 + nt, ((nt * 37) % 11) / 11 * 0.6 - 0.3); nt++;
  }
  reverb(EL, ER, opts.room_wet ?? 0.22);
  for (let i = 0; i < N; i++) { L[i] += EL[i] * fo[i]; R[i] += ER[i] * fo[i]; }

  writeWav(out, L, R);
  return { cues: cues.length, ticks: years.length, taps: nt, drops: drops.length };
}

function writeWav(file, L, R) {
  const n = L.length, data = Buffer.alloc(n * 8), hdr = Buffer.alloc(44);
  for (let i = 0; i < n; i++) { data.writeFloatLE(L[i], i * 8); data.writeFloatLE(R[i], i * 8 + 4); }
  hdr.write('RIFF', 0); hdr.writeUInt32LE(36 + data.length, 4); hdr.write('WAVE', 8); hdr.write('fmt ', 12);
  hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(3, 20); hdr.writeUInt16LE(2, 22); hdr.writeUInt32LE(SR, 24);
  hdr.writeUInt32LE(SR * 8, 28); hdr.writeUInt16LE(8, 32); hdr.writeUInt16LE(32, 34); hdr.write('data', 36); hdr.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([hdr, data]));
}
