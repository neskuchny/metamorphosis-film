#!/usr/bin/env node
/* Renders a style-pack HTML scene (examples/styles/*.html) to an MP4 you can drop into film.json as a "clip" scene.
   node scripts/clip.mjs examples/styles/sketch.html --secs 11.5 --out work/acme/sketch.mp4 [--text '{"title":"..."}' | --text file.json] [--res 1080|720] [--fps 30]
   node scripts/clip.mjs examples/styles/sketch.html --still 9 --out work/acme/sketch-9s.png      (one frame: look at it before rendering)
   Every style page exposes window.__seek(t) and window.__ready; text defaults live in its TEXT object and are overridden by --text. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const VALUE = ['--secs', '--out', '--text', '--res', '--fps', '--still'];
const file = argv.find((a, i) => !a.startsWith('--') && !VALUE.includes(argv[i - 1]));
if (!file || !opt('out')) { console.error('usage: node scripts/clip.mjs <style.html> --secs N --out file.mp4 [--text json|file] [--still T] [--res 720] [--fps 30]'); process.exit(1); }
const out = path.resolve(opt('out')), FPS = +opt('fps', 30), RES = +opt('res', 1080), STILL = opt('still', null);
const secs = +opt('secs', 10);
let text = opt('text', null);
if (text && fs.existsSync(text)) text = fs.readFileSync(text, 'utf8');
const TEXT = text ? JSON.parse(text) : {};

const ffmpeg = process.env.FFMPEG_PATH || (spawnSync('ffmpeg', ['-version']).status === 0 ? 'ffmpeg' : (() => { try { return require('ffmpeg-static'); } catch { return null; } })());
if (!ffmpeg && STILL === null) { console.error('ffmpeg not found'); process.exit(1); }

let pw; for (const m of ['playwright', 'playwright-core']) { try { pw = await import(m); break; } catch {} }
if (!pw) { try { pw = require('playwright'); } catch {} }
if (!pw) { console.error('Playwright not found. Run: npm install && npx playwright install chromium'); process.exit(1); }
const chromium = pw.chromium || pw.default?.chromium;
let browser, last;
for (const o of [process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : null, {}, { channel: 'chrome' }, { channel: 'msedge' }].filter(Boolean)) {
  try { browser = await chromium.launch({ ...o, args: ['--force-color-profile=srgb', '--hide-scrollbars'] }); break; } catch (e) { last = e; }
}
if (!browser) { console.error('Could not start Chromium: ' + last?.message); process.exit(1); }

const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('[page error]', e.message));
await page.addInitScript((t) => { window.TEXT = t; }, TEXT);
await page.goto(pathToFileURL(path.resolve(file)).href);
await page.waitForFunction('window.__ready === true', null, { timeout: 20000 });
await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(300);
fs.mkdirSync(path.dirname(out), { recursive: true });
const cdp = await page.context().newCDPSession(page);
const shot = async () => (await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true, ...(RES !== 1080 ? { clip: { x: 0, y: 0, width: 1920, height: 1080, scale: RES / 1080 } } : {}) })).data;

if (STILL !== null) {
  await page.evaluate((t) => window.__seek(t), +STILL);
  await page.screenshot({ path: out });
  console.log('[clip] still', out);
} else {
  const N = Math.round(secs * FPS), tmp = out.replace(/\.mp4$/, '') + '.tmp.mp4';
  const ff = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg failed')))));
  const t0 = Date.now();
  for (let f = 0; f < N; f++) {
    await page.evaluate((t) => window.__seek(t), f / FPS);
    const data = await shot();
    if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await done;
  fs.renameSync(tmp, out);
  console.log(`[clip] ${out} (${N} frames, ${Math.round((Date.now() - t0) / 1000)} s)`);
}
await browser.close();
