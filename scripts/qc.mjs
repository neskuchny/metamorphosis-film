#!/usr/bin/env node
/* Measured checks on a finished film, before anyone watches it.
   node scripts/qc.mjs out/<slug>.mp4 [--timeline build/timeline.json] [--sheet out/<slug>-sheet.jpg]

   hook      the first 2 s move from frame 1 (mean frame difference; a held title or a fade from black fails)
   black     no stretch of black longer than 0.9 s (the dips between scenes are shorter)
   freeze    no frozen picture longer than 4 s
   silence   no dead air longer than 2.5 s (a hard silence reads as a fault; a designed drop keeps room tone)
   loudness  integrated about -14 LUFS, true peak under -1 dBTP, the last 15 s not collapsing
   scenes    loudness per scene, so one scene does not jump out
   sheet     one frame per scene in a grid, for the cold review (the jury)
   Measures after sarpstar/cinecode tools/qc.py (MIT), rewritten in Node with ffmpeg. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const file = path.resolve(argv.find((a, i) => !a.startsWith('--') && !['--timeline', '--sheet'].includes(argv[i - 1])) || '');
if (!fs.existsSync(file)) { console.error('usage: node scripts/qc.mjs out/<slug>.mp4'); process.exit(2); }
const tlFile = path.resolve(opt('timeline', path.join(ROOT, 'build', 'timeline.json')));
const sheet = path.resolve(opt('sheet', file.replace(/\.mp4$/, '-sheet.jpg')));
const ff = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostdin', ...args], { encoding: 'utf8', maxBuffer: 1 << 28 }).stderr || '';
const dur = +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout.trim();
let fails = 0, warns = 0;
const say = (lvl, name, msg) => { if (lvl === 'FAIL') fails++; if (lvl === 'WARN') warns++; console.log(`${lvl.padEnd(4)}  ${name.padEnd(9)} ${msg}`); };

// hook
{
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-t', '2', '-i', file, '-vf', 'scale=160:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-an', '-f', 'null', '-'], { encoding: 'utf8' });
  const v = (r.stdout || '').split('\n').filter((l) => l.includes('YAVG=')).map((l) => +l.split('=')[1]);
  const mean = v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
  say(mean >= 0.5 ? 'PASS' : 'FAIL', 'hook', `mean motion ${mean.toFixed(2)} in the first 2 s (needs >= 0.5: open on movement, not a still title)`);
}
// black, freeze, silence
{
  const b = [...ff(['-i', file, '-vf', 'blackdetect=d=0.9:pix_th=0.06', '-an', '-f', 'null', '-']).matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  say(b.length ? 'WARN' : 'PASS', 'black', b.length ? b.map(([a, e]) => `${a.toFixed(1)}–${e.toFixed(1)} s`).join(', ') : 'no black stretch over 0.9 s');
  const f = [...ff(['-i', file, '-vf', 'scale=320:-2,freezedetect=n=-55dB:d=4', '-an', '-f', 'null', '-']).matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  say(f.length ? 'WARN' : 'PASS', 'freeze', f.length ? f.map(([a, e]) => `${a.toFixed(1)}–${e.toFixed(1)} s`).join(', ') : 'nothing frozen over 4 s');
  const s = [...ff(['-i', file, '-af', 'silencedetect=n=-55dB:d=2.5', '-vn', '-f', 'null', '-']).matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((m) => [+m[1], +m[2]]);
  say(s.length ? 'WARN' : 'PASS', 'silence', s.length ? s.map(([a, e]) => `${a.toFixed(1)}–${e.toFixed(1)} s`).join(', ') : 'no dead air over 2.5 s');
}
// loudness
{
  const o = ff(['-i', file, '-af', 'ebur128=peak=true', '-vn', '-f', 'null', '-']);
  const sum = o.slice(o.lastIndexOf('Summary'));
  const I = +(sum.match(/I:\s+(-?[\d.]+)/) || [])[1], LRA = +(sum.match(/LRA:\s+(-?[\d.]+)/) || [])[1], TP = +(sum.match(/Peak:\s+(-?[\d.]+)/) || [])[1];
  say(Math.abs(I + 14) <= 1 ? 'PASS' : 'WARN', 'loudness', `${I} LUFS integrated (aim -14), LRA ${LRA} LU`);
  say(TP <= -1 ? 'PASS' : 'WARN', 'peak', `${TP} dBTP (under -1)`);
  const e = ff(['-ss', String(Math.max(0, dur - 15)), '-i', file, '-af', 'ebur128', '-vn', '-f', 'null', '-']);
  const Ie = +(e.slice(e.lastIndexOf('Summary')).match(/I:\s+(-?[\d.]+)/) || [])[1];
  say(Ie > I - 8 ? 'PASS' : 'WARN', 'ending', `last 15 s at ${Ie} LUFS`);
}
// per scene
let tl = null;
if (fs.existsSync(tlFile)) {
  tl = JSON.parse(fs.readFileSync(tlFile, 'utf8'));
  const tot = tl[tl.length - 1].start + tl[tl.length - 1].dur;
  if (Math.abs(tot - dur) > 1.5) { say('WARN', 'scenes', `timeline (${tot.toFixed(1)} s) is not this film (${dur.toFixed(1)} s): per-scene checks skipped`); tl = null; }
}
if (tl) {
  const rows = tl.map((x) => {
    const o = ff(['-ss', String(x.start), '-t', String(x.dur), '-i', file, '-af', 'ebur128', '-vn', '-f', 'null', '-']);
    return { ...x, I: +(o.slice(o.lastIndexOf('Summary')).match(/I:\s+(-?[\d.]+)/) || [])[1] };
  });
  const med = [...rows].map((r) => r.I).sort((a, b) => a - b)[Math.floor(rows.length / 2)];
  const odd = rows.filter((r) => Math.abs(r.I - med) > 4);
  say(odd.length ? 'WARN' : 'PASS', 'scenes', odd.length ? 'louder or quieter than the rest by > 4 LU: ' + odd.map((r) => `#${r.i} ${r.type} ${r.I}`).join(', ') : `all scenes within 4 LU of ${med} LUFS`);
  // contact sheet: one frame per scene, at 70% of its length
  const tmp = fs.mkdtempSync(path.join(path.dirname(sheet), '.sheet-'));
  rows.forEach((x, k) => ff(['-v', 'error', '-ss', String(x.start + x.dur * 0.7), '-i', file, '-frames:v', '1', '-vf', 'scale=480:-2', path.join(tmp, `f${String(k + 1).padStart(2, '0')}.jpg`)]));
  ff(['-v', 'error', '-y', '-framerate', '1', '-i', path.join(tmp, 'f%02d.jpg'), '-vf', `tile=5x${Math.ceil(rows.length / 5)}:padding=4:color=black`, '-frames:v', '1', '-q:v', '3', sheet]);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (fs.existsSync(sheet)) console.log(`      sheet     ${path.relative(process.cwd(), sheet)}`);
}
console.log(`\n${fails} fail, ${warns} warn · ${Math.floor(dur / 60)}:${String(Math.round(dur % 60)).padStart(2, '0')}`);
process.exit(fails ? 1 : 0);
