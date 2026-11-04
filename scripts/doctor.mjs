#!/usr/bin/env node
/* Probes what this environment can do and prints the launch tier.
     web     no command line, or Node / Chromium / ffmpeg missing -> browser player (player/web.html), no MP4
     render  Node + Chromium + ffmpeg                               -> MP4 from film.json (the default pipeline)
     studio  render + room for heavier engines                      -> render, plus optional extras (see SKILL.md, Step 0)
   The tier is decided by what works here, never by the name of the app the agent runs in.
   Usage: node scripts/doctor.mjs [--json] */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const JSON_OUT = process.argv.includes('--json');
const sh = (cmd, args, ms = 8000) => spawnSync(cmd, args, { encoding: 'utf8', timeout: ms });
const reach = async (url, ms = 4000) => {
  try { const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(ms) }); return r.status < 500; } catch { return false; }
};

const checks = {};
const fix = [];

// Node
const major = +process.versions.node.split('.')[0];
checks.node = { ok: major >= 18, version: process.versions.node, hyperframes_ok: major >= 22 };
if (!checks.node.ok) fix.push('Install Node 18 or newer (22 for HyperFrames).');

// ffmpeg
{
  let found = null;
  if (process.env.FFMPEG_PATH) found = process.env.FFMPEG_PATH;
  else if (sh('ffmpeg', ['-version']).status === 0) found = 'ffmpeg';
  else { try { found = require('ffmpeg-static') || null; } catch {} }
  checks.ffmpeg = { ok: !!found, path: found };
  if (!found) fix.push('Install ffmpeg (brew install ffmpeg / apt install ffmpeg / winget install ffmpeg) or run: npm i ffmpeg-static');
}

// Chromium via Playwright
{
  let ok = false, why = '';
  try {
    let pw; for (const m of ['playwright', 'playwright-core']) { try { pw = await import(m); break; } catch {} }
    if (!pw) { try { pw = require('playwright'); } catch {} }
    if (!pw) why = 'playwright is not installed';
    else {
      const chromium = pw.chromium || pw.default?.chromium;
      const tries = [process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : null, {}, { channel: 'chrome' }, { channel: 'msedge' }].filter(Boolean);
      for (const o of tries) {
        try { const b = await chromium.launch(o); await b.close(); ok = true; break; } catch (e) { why = String(e.message).split('\n')[0]; }
      }
    }
  } catch (e) { why = String(e.message).split('\n')[0]; }
  checks.chromium = { ok, ...(ok ? {} : { why }) };
  if (!ok) fix.push('npm install && npx playwright install chromium');
}

// Voice
{
  const edge = [['edge-tts'], ['python3', '-m', 'edge_tts'], ['python', '-m', 'edge_tts']].some((c) => sh(c[0], [...c.slice(1), '--help']).status === 0);
  const piper = [['piper'], ['python3', '-m', 'piper'], ['python', '-m', 'piper']].some((c) => sh(c[0], [...c.slice(1), '--help']).status === 0);
  const eleven = !!process.env.ELEVENLABS_API_KEY, openai = !!process.env.OPENAI_API_KEY;
  const edgeNet = edge ? await reach('https://speech.platform.bing.com') : false;
  checks.voice = { elevenlabs: eleven, openai, edge_tts: edge, edge_tts_reachable: edgeNet, piper };
  checks.voice.ok = eleven || openai || (edge && edgeNet) || piper;
  checks.voice.best = eleven ? 'elevenlabs' : openai ? 'openai' : edge && edgeNet ? 'edge-tts' : piper ? 'piper' : 'none';
  if (!checks.voice.ok) fix.push('For a voiced film: pip install edge-tts (needs internet) or pip install piper-tts (offline). Without it the film is silent with captions.');
}

// Network and heavier engines
{
  const npm = await reach('https://registry.npmjs.org/');
  const gh = await reach('https://github.com');
  let hf = 'unavailable';
  if (sh('npx', ['--no-install', 'hyperframes', '--version'], 15000).status === 0) hf = 'installed';
  else if (npm && checks.node.hyperframes_ok) hf = 'installable';
  checks.network = { npm, github: gh };
  checks.engines = { hyperframes: hf, remotion: 'off by default (source-available licence, see SKILL.md)' };
}

// Tier
const renderOk = checks.node.ok && checks.ffmpeg.ok && checks.chromium.ok;
const premiumVoice = checks.voice.elevenlabs || checks.voice.openai;
const studioExtras = checks.engines.hyperframes !== 'unavailable' || premiumVoice;
const tier = !renderOk ? 'web' : studioExtras ? 'studio' : 'render';

const can = {
  mp4: renderOk,
  voiced_mp4: renderOk && checks.voice.ok,
  browser_player: true,
  clip_scenes: renderOk,
  hyperframes_hero_scenes: renderOk && checks.engines.hyperframes !== 'unavailable',
  premium_voice: premiumVoice,
};
const result = { tier, can, checks, cpus: os.cpus().length, free_mem_gb: +(os.freemem() / 1e9).toFixed(1), fix, player: path.join(ROOT, 'player', 'web.html'), bundle: fs.existsSync(path.join(ROOT, 'dist', 'film-player.html')) ? path.join(ROOT, 'dist', 'film-player.html') : null };

if (JSON_OUT) { console.log(JSON.stringify(result, null, 2)); process.exit(0); }

const mark = (b) => (b ? 'ok ' : '-- ');
console.log(`tier: ${tier}`);
console.log(`  ${mark(checks.node.ok)}node ${checks.node.version}`);
console.log(`  ${mark(checks.ffmpeg.ok)}ffmpeg${checks.ffmpeg.path ? ' (' + checks.ffmpeg.path + ')' : ''}`);
console.log(`  ${mark(checks.chromium.ok)}chromium${checks.chromium.ok ? '' : ' (' + checks.chromium.why + ')'}`);
console.log(`  ${mark(checks.voice.ok)}voice: ${checks.voice.best}`);
console.log(`  ${mark(checks.network.npm)}npm registry   ${mark(checks.network.github)}github`);
console.log(`  hyperframes: ${checks.engines.hyperframes}`);
if (tier === 'web') console.log('\nNo MP4 from here. Fall back to the browser player: output film.json, open player/web.html (or dist/film-player.html), paste, press Watch.');
if (tier === 'render') console.log('\nMP4 pipeline is ready: node scripts/render.mjs <film.json>');
if (tier === 'studio') console.log('\nMP4 pipeline is ready. Extras here: clip scenes' + (can.hyperframes_hero_scenes ? ', HyperFrames hero scenes (' + checks.engines.hyperframes + ')' : '') + (can.premium_voice ? ', premium voice' : '') + ' (see SKILL.md, Step 0).');
if (fix.length) console.log('\nTo improve this environment:\n' + fix.map((f) => '  - ' + f).join('\n'));
