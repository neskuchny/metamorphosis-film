#!/usr/bin/env node
/* Packs the browser player into ONE html file (fonts and scripts inlined) that works offline from a double click.
   node scripts/bundle.mjs                       -> dist/film-player.html (empty player, paste film.json)
   node scripts/bundle.mjs film.json [--autoload] [--out file.html]
                                                 -> the film embedded; with --autoload it opens by itself */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (f) => path.join(ROOT, 'player', f);
const read = (f) => fs.readFileSync(P(f), 'utf8');
const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : null; };
const filmArg = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--out');
const out = path.resolve(opt('out') || (filmArg ? filmArg.replace(/film\.json$|\.json$/, '') + 'player.html' : path.join(ROOT, 'dist', 'film-player.html')));
const safeScript = (s) => s.replace(/<\/script/gi, '<\\/script');

// fonts -> data URIs
const fontsCss = read('fonts.css').replace(/url\(\s*['"]?([^'")]+\.woff2)['"]?\s*\)/g, (_, u) => {
  const b = fs.readFileSync(path.join(P(''), u.replace(/^\.?\//, '')));
  return `url(data:font/woff2;base64,${b.toString('base64')})`;
});

let html = read('web.html');
const sheets = { 'fonts.css': fontsCss, 'style.css': read('style.css'), 'web.css': read('web.css') };
for (const [name, css] of Object.entries(sheets)) html = html.replace(`<link rel="stylesheet" href="${name}">`, () => `<style>\n${css}\n</style>`);

let embedded = '';
if (filmArg) {
  const film = JSON.parse(fs.readFileSync(path.resolve(filmArg), 'utf8'));
  embedded = `<script type="application/json" id="example-film"${flag('autoload') ? ' data-autoload' : ''}>${JSON.stringify(film).replace(/</g, '\\u003c')}</script>\n`;
}
const scripts =
  `${embedded}<script type="text/plain" id="film-js">${safeScript(read('film.js'))}</script>\n` +
  `<script>${safeScript(read('timeline.js'))}</script>\n<script>${safeScript(read('validate.js'))}</script>\n<script>${safeScript(read('model.js'))}</script>\n<script>${safeScript(read('map-data.js'))}</script>\n<script>${safeScript(read('web.js'))}</script>`;
html = html.replace(/<script src="timeline\.js"><\/script>\s*<script src="validate\.js"><\/script>\s*<script src="model\.js"><\/script>\s*<script src="map-data\.js"><\/script>\s*<script src="web\.js"><\/script>/, () => scripts);

if (/(href|src)="(fonts\.css|style\.css|web\.css|timeline\.js|validate\.js|model\.js|map-data\.js|web\.js|film\.js)"/.test(html)) { console.error('bundle: a local reference is left in the output'); process.exit(1); }
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`[bundle] ${out} (${(html.length / 1024).toFixed(0)} KB)${filmArg ? ' with ' + path.basename(filmArg) + (flag('autoload') ? ', opens automatically' : '') : ''}`);
