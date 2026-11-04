#!/usr/bin/env node
// Checks film.json against the contract the player expects. Usage: node scripts/validate.mjs [film.json]
// The rules live in player/validate.js, shared with the browser player.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const core = (() => { const ctx = {}; vm.createContext(ctx); for (const f of ['model.js', 'validate.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'player', f), 'utf8'), ctx); return ctx.FilmValidate; })();

export function validate(film, baseDir) {
  return core.validate(film, baseDir ? { exists: (f) => fs.existsSync(path.resolve(baseDir, f)) } : undefined);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const file = process.argv[2] || 'film.json';
  let film;
  try { film = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { console.error(`Cannot read ${file}: ${e.message}`); process.exit(1); }
  const r = validate(film, path.dirname(path.resolve(file)));
  r.warnings.forEach((w) => console.log('warn  ' + w));
  r.errors.forEach((e) => console.log('ERROR ' + e));
  console.log(r.errors.length ? `\n${r.errors.length} error(s). Fix them before rendering.` : `\nOK. Estimated length ~${Math.round(r.estimatedSeconds / 6) / 10} min.`);
  process.exit(r.errors.length ? 1 : 0);
}
