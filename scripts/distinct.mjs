#!/usr/bin/env node
/* Is this film its own, or a template with other numbers?
   node scripts/distinct.mjs work/<slug>/film.json [--against a.json,b.json] [--strict]

   Compares the film with every example film under examples/, every other film in work/ and anything passed with
   --against, skipping films of the same company (theme variants). Measures what a viewer who saw a friend's film
   would notice: shared sentences, the same chapter titles, the same cases and parallels, the same order of scenes,
   the same world and look, the same moment. And how much of the film speaks in this company's own words
   (concept.specifics). FAIL exits 1; --strict also fails on WARN. See data/film-architectures.md. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
const file = path.resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--against') || '');
if (!fs.existsSync(file)) { console.error('usage: node scripts/distinct.mjs work/<slug>/film.json [--against a.json,b.json]'); process.exit(2); }
const STRICT = argv.includes('--strict');
const load = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const film = load(file);
const company = (f) => String(f?.company?.name || '').toLowerCase().trim();

// the films to compare with
const found = [];
const walk = (d) => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/^film.*\.json$/.test(e.name)) found.push(p); } };
walk(path.join(ROOT, 'examples')); walk(path.join(ROOT, 'work'));
for (const a of (opt('against') || '').split(',').filter(Boolean)) found.push(path.resolve(a));
const others = [...new Set(found)].filter((f) => path.resolve(f) !== file).map((f) => ({ f, j: load(f) })).filter((o) => o.j && o.j.scenes && company(o.j) !== company(film));

// text of a film: narration and screen strings, as sentences
const SKIP = new Set(['type', 'file', 'url', 'source', 'sources', 'tag', 'side', 'accent', 'focus', 'camera', 'sound', 'beat', 'when', 'year', 'unit', 'prefix', 'decimals']);
function texts(f) {
  const out = [];
  const rec = (n, k) => { if (typeof n === 'string') { if (!SKIP.has(k) && /\p{L}{3}/u.test(n) && !/^https?:/.test(n)) out.push(n); } else if (Array.isArray(n)) n.forEach((x) => rec(x, k)); else if (n && typeof n === 'object') for (const [kk, v] of Object.entries(n)) if (!SKIP.has(kk)) rec(v, kk); };
  (f.scenes || []).forEach((s) => rec(s, ''));
  return out;
}
const norm = (s) => s.toLowerCase().replace(/[«»"“”„'’()\[\]—–\-:;,.!?…·]/g, ' ').replace(/\d[\d\s.,]*/g, ' 0 ').replace(/\s+/g, ' ').trim();
const sentences = (f) => texts(f).flatMap((t) => t.split(/(?<=[.!?…])\s+/)).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 4);
const shingles = (f, n = 5) => { const set = new Set(); for (const s of sentences(f)) { const w = norm(s).split(' ').filter(Boolean); for (let i = 0; i + n <= w.length; i++) set.add(w.slice(i, i + n).join(' ')); } return set; };
const titles = (f) => (f.scenes || []).filter((s) => ['chapter', 'world'].includes(s.type) && s.title).map((s) => norm(s.title));
const acts = (f) => [...new Set((f.scenes || []).map((s) => s.act).filter(Boolean).map(norm))];
const cases = (f) => [...new Set((f.scenes || []).flatMap((s) => (s.type === 'case' ? [s.name] : s.type === 'parallels' ? (s.rows || []).map((r) => r.field + ' ' + (r.what || '').split(/[,.]/)[0]) : [])).filter(Boolean).map((x) => norm(x).split(' ').slice(0, 3).join(' ')))];
const caseNames = (f) => [...new Set((f.scenes || []).filter((s) => s.type === 'case').map((s) => norm(s.name || '')))].filter(Boolean);
const seq = (f) => (f.scenes || []).map((s) => s.type);
function lev(a, b) { const d = Array.from({ length: a.length + 1 }, (_, i) => [i]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; }
const worldKey = (f) => f.world ? [f.world.kit || 'factory', f.world.time || 'night', f.world.look || 'night'].join('/') : null;

let fails = 0, warns = 0;
const say = (lvl, name, msg) => { if (lvl === 'FAIL') fails++; if (lvl === 'WARN') warns++; console.log(`${lvl.padEnd(4)}  ${name.padEnd(10)} ${msg}`); };
console.log(`${film.company?.name || path.basename(file)} against ${others.length} other film(s): ${others.map((o) => path.relative(ROOT, o.f)).join(', ') || '—'}\n`);

// concept
const c = film.concept || {};
if (!film.concept) say('FAIL', 'concept', 'no concept: write the film\'s own idea first (data/film-architectures.md)');
else say(c.idea && c.architecture && c.central_image ? 'PASS' : 'WARN', 'concept', `${(c.architecture || '?').split(/[—-]/)[0].trim()} · ${c.central_image || 'no central image'}`);

const mine = shingles(film), mySent = sentences(film);
for (const o of others) {
  const name = path.relative(ROOT, o.f);
  const theirs = shingles(o.j); let shared = 0; for (const s of mine) if (theirs.has(s)) shared++;
  const pct = mine.size ? shared / mine.size : 0;
  const theirSent = new Set(sentences(o.j).map(norm)), same = mySent.filter((s) => s.split(/\s+/).length >= 6 && theirSent.has(norm(s)));
  say(same.length ? 'FAIL' : pct > 0.08 ? 'FAIL' : pct > 0.03 ? 'WARN' : 'PASS', 'sentences', `${(pct * 100).toFixed(1)}% of five-word runs shared with ${name}${same.length ? `; identical: «${same.slice(0, 3).join('» «')}»` : ''}`);
  const tt = titles(o.j), sameT = titles(film).filter((t) => tt.includes(t));
  say(sameT.length >= 2 ? 'FAIL' : sameT.length ? 'WARN' : 'PASS', 'titles', sameT.length ? `same chapter titles as ${name}: ${sameT.join(' · ')}` : 'chapter titles are this film\'s own');
  const aa = acts(o.j), sameA = acts(film).filter((a) => aa.includes(a));
  if (sameA.length >= 3) say('WARN', 'acts', `act labels shared with ${name}: ${sameA.join(' · ')}`);
  const cc = caseNames(o.j), sameC = caseNames(film).filter((x) => cc.includes(x));
  const pp = cases(o.j), sameP = cases(film).filter((x) => pp.includes(x));
  const nCases = caseNames(film).length;
  say(nCases && sameC.length === nCases ? 'FAIL' : sameC.length + sameP.length >= 3 ? 'WARN' : 'PASS', 'cases', sameC.length || sameP.length ? `shared with ${name}: ${[...sameC, ...sameP].join(' · ')}` : 'cases and parallels differ');
  const sa = new Set(seq(film)), sb = new Set(seq(o.j)), jac = [...sa].filter((x) => sb.has(x)).length / new Set([...sa, ...sb]).size;
  say(jac > 0.9 ? 'WARN' : 'PASS', 'scenes', `${(jac * 100).toFixed(0)}% of scene types shared with ${name}${jac > 0.9 ? ' — tell some functions with other scene types (film-architectures 3b)' : ''}`);
  const a = seq(film), b = seq(o.j), sim = 1 - lev(a, b) / Math.max(a.length, b.length);
  say(sim > 0.9 ? 'WARN' : 'PASS', 'order', `scene order ${(sim * 100).toFixed(0)}% like ${name}${sim > 0.9 ? ' — the architecture looks borrowed (Step 2c)' : ''}`);
  if (worldKey(film) && worldKey(film) === worldKey(o.j)) say('WARN', 'world', `same world (${worldKey(film)}) as ${name}: change the time, the kit or the look if the business allows`);
  if ((film.style || 'default') === (o.j.style || 'default') && (film.world?.light || '') === (o.j.world?.light || '')) say('WARN', 'look', `same style (${film.style || 'default'}) and light as ${name}`);
  const m1 = (film.scenes || []).find((s) => s.type === 'moment'), m2 = (o.j.scenes || []).find((s) => s.type === 'moment');
  if (m1 && m2 && norm(m1.channel || '') === norm(m2.channel || '') && norm(m1.from || '').split(' ')[0] === norm(m2.from || '').split(' ')[0]) say('WARN', 'moment', `the moment comes through the same channel and sender as in ${name}`);
}

// the look: the same fonts and colours as a friend's film read as the same template
{
  const vm = await import('node:vm'); const ctx = { self: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'player', 'look.js'), 'utf8'), ctx);
  const LK = ctx.self.FilmLook, mine = LK.resolve(film);
  for (const o of others) {
    const th = LK.resolve(o.j), name = path.relative(ROOT, o.f);
    const used = new Set([...seq(film), ...seq(o.j)]), keys = Object.keys(mine.variants).filter((k) => used.has(k));   // only the scene types these films show
    const sameV = keys.filter((k) => mine.variants[k] === th.variants[k]).length;
    if (mine.pairing === th.pairing && mine.mode === th.mode) say('WARN', 'look', `same fonts (${mine.pairing}) and colour mode (${mine.mode}) as ${name}: set look.pairing or look.mode`);
    else say(sameV > keys.length / 2 ? 'WARN' : 'PASS', 'look', `${mine.pairing}/${mine.mode} vs ${th.pairing}/${th.mode}; ${sameV} of ${keys.length} scene layouts shared with ${name}${sameV > keys.length / 2 ? ' — set look.variants on purpose' : ''}`);
  }
}

// this company's own words
const spec = (c.specifics || []).map((w) => String(w).toLowerCase()).filter(Boolean);
const stem = (w) => (w.length > 6 ? w.slice(0, w.length - 2) : w);
const has = (s) => { const t = JSON.stringify(s).toLowerCase(); return spec.some((w) => t.includes(stem(w))); };
const spoken = (film.scenes || []).filter((s) => s.narration && s.type !== 'clip');
const withSpec = spoken.filter(has).length, share = spoken.length ? withSpec / spoken.length : 0;
if (spec.length) say(share < 0.5 ? 'FAIL' : share < 0.7 ? 'WARN' : 'PASS', 'specifics', `${withSpec} of ${spoken.length} scenes use this company's own words (${(share * 100).toFixed(0)}%; aim for 70%+)`);
const open = (film.scenes || [])[0];
if (open && spec.length && !has(open)) say('WARN', 'cold open', 'the first scene has no fact only this company has');

console.log(`\n${fails} fail, ${warns} warn`);
process.exit(fails || (STRICT && warns) ? 1 : 0);
