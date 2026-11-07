#!/usr/bin/env node
/* film.json -> MP4.
   node scripts/render.mjs [film.json] [--out out/film.mp4] [--res 1080|720] [--fps 30]
                           [--preview] [--no-voice] [--no-sound] [--sound-only] [--workers N]
   Sound: a bed, hits and picture-locked events designed in code (scripts/sound.mjs), mastered to -14 LUFS.
   Voice: ELEVENLABS_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY (free tier) if set, otherwise free edge-tts (pip install edge-tts),
   otherwise a silent film with captions. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import { validate } from './validate.mjs';
import { designSound, motionOnsets } from './sound.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const VALUE_OPTS = ['--out', '--res', '--fps', '--workers'];
const filmPath = path.resolve(argv.find((a, i) => !a.startsWith('--') && !VALUE_OPTS.includes(argv[i - 1])) || 'film.json');
const FPS = +opt('fps', 30);
const RES = +opt('res', 1080);
const PREVIEW = flag('preview');
const SOUND_ONLY = flag('sound-only');
const NO_VOICE = flag('no-voice');
const NO_SOUND = flag('no-sound') || flag('no-music');
const WORKERS = Math.max(1, +opt('workers', Math.min(4, os.cpus().length)));
const BUILD = path.join(ROOT, 'build');
const log = (...a) => console.log('[film]', ...a);

// ---------- tools ----------
function findFfmpeg() {
  if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH;
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  try { const p = require('ffmpeg-static'); if (p) return p; } catch {}
  console.error('ffmpeg not found. Install it (brew install ffmpeg / apt install ffmpeg / winget install ffmpeg) or run: npm i ffmpeg-static');
  process.exit(1);
}
const FFMPEG = findFfmpeg();
const run = (args, quiet = true) => new Promise((res, rej) => {
  const p = spawn(FFMPEG, ['-hide_banner', '-loglevel', quiet ? 'error' : 'info', '-y', ...args], { stdio: ['ignore', 'inherit', 'inherit'] });
  p.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg failed: ' + args.join(' ')))));
});
function mediaDuration(file) {
  const r = spawnSync(FFMPEG, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = (r.stderr || '').match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}

// ---------- voice ----------
const EDGE_VOICES = {
  ru: 'ru-RU-DmitryNeural', en: 'en-US-AndrewNeural', uz: 'uz-UZ-SardorNeural', kk: 'kk-KZ-DauletNeural', ja: 'ja-JP-KeitaNeural',
  zh: 'zh-CN-YunjianNeural', de: 'de-DE-ConradNeural', fr: 'fr-FR-HenriNeural', es: 'es-ES-AlvaroNeural', pt: 'pt-BR-AntonioNeural',
  it: 'it-IT-DiegoNeural', tr: 'tr-TR-AhmetNeural', ar: 'ar-SA-HamedNeural', hi: 'hi-IN-MadhurNeural', ko: 'ko-KR-InJoonNeural',
  pl: 'pl-PL-MarekNeural', id: 'id-ID-ArdiNeural', vi: 'vi-VN-NamMinhNeural', az: 'az-AZ-BabekNeural', uk: 'uk-UA-OstapNeural',
  he: 'he-IL-AvriNeural', nl: 'nl-NL-MaartenNeural', sv: 'sv-SE-MattiasNeural', th: 'th-TH-NiwatNeural', ka: 'ka-GE-GiorgiNeural',
  ms: 'ms-MY-OsmanNeural', fa: 'fa-IR-FaridNeural', ro: 'ro-RO-EmilNeural', cs: 'cs-CZ-AntoninNeural', el: 'el-GR-NestorasNeural',
};
function edgeCmd() {
  for (const c of [['edge-tts'], ['python3', '-m', 'edge_tts'], ['python', '-m', 'edge_tts'], ['py', '-m', 'edge_tts']]) {
    const r = spawnSync(c[0], [...c.slice(1), '--help'], { encoding: 'utf8' });
    if (r.status === 0) return c;
  }
  return null;
}
// Offline fallback (no network after the first download): https://huggingface.co/rhasspy/piper-voices
const PIPER_VOICES = {
  ru: 'ru/ru_RU/ruslan/medium/ru_RU-ruslan-medium', en: 'en/en_US/ryan/high/en_US-ryan-high', de: 'de/de_DE/thorsten/high/de_DE-thorsten-high',
  kk: 'kk/kk_KZ/issai/high/kk_KZ-issai-high', uk: 'uk/uk_UA/ukrainian_tts/medium/uk_UA-ukrainian_tts-medium', es: 'es/es_ES/davefx/medium/es_ES-davefx-medium',
  fr: 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium', pt: 'pt/pt_BR/faber/medium/pt_BR-faber-medium', pl: 'pl/pl_PL/darkman/medium/pl_PL-darkman-medium',
  tr: 'tr/tr_TR/dfki/medium/tr_TR-dfki-medium', zh: 'zh/zh_CN/huayan/medium/zh_CN-huayan-medium', ka: 'ka/ka_GE/natia/medium/ka_GE-natia-medium',
  vi: 'vi/vi_VN/vais1000/medium/vi_VN-vais1000-medium', ar: 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium',
};
function piperCmd() {
  for (const c of [['piper'], ['python3', '-m', 'piper'], ['python', '-m', 'piper'], ['py', '-m', 'piper']]) {
    if (spawnSync(c[0], [...c.slice(1), '--help'], { encoding: 'utf8' }).status === 0) return c;
  }
  return null;
}
async function piperModel(film) {
  if (process.env.PIPER_MODEL) return process.env.PIPER_MODEL;
  const rel = film.voice?.piper_voice || PIPER_VOICES[film.language];
  if (!rel) return null;
  const dir = path.join(BUILD, 'voices'); fs.mkdirSync(dir, { recursive: true });
  const f = path.join(dir, path.basename(rel) + '.onnx');
  for (const [src, dst] of [[rel + '.onnx', f], [rel + '.onnx.json', f + '.json']]) {
    if (fs.existsSync(dst) && fs.statSync(dst).size > 1000) continue;
    log('downloading offline voice', path.basename(dst));
    const r = spawnSync('curl', ['-sSLf', '-o', dst, `https://huggingface.co/rhasspy/piper-voices/resolve/main/${src}`]);
    if (r.status !== 0) {
      const res = await fetch(`https://huggingface.co/rhasspy/piper-voices/resolve/main/${src}`).catch(() => null);
      if (!res?.ok) return null;
      fs.writeFileSync(dst, Buffer.from(await res.arrayBuffer()));
    }
  }
  return f;
}
// Ordered list of providers to try; the render falls through to the next one if a provider fails mid-way.
async function providerChain(film) {
  if (NO_VOICE || film.voice?.provider === 'none') return [{ name: 'none' }];
  const want = process.env.TTS_PROVIDER || film.voice?.provider;
  const chain = [];
  const add = (name, fn) => { if (!want || want === name) { const p = fn(); if (p) chain.push(p); } };
  add('elevenlabs', () => process.env.ELEVENLABS_API_KEY && { name: 'elevenlabs', voice: film.voice?.elevenlabs_voice_id || process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB' });
  add('openai', () => process.env.OPENAI_API_KEY && { name: 'openai', voice: film.voice?.openai_voice || 'onyx' });
  add('gemini', () => process.env.GEMINI_API_KEY && { name: 'gemini', voice: film.voice?.gemini_voice || 'Charon', model: film.voice?.gemini_model || process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts', style: film.voice?.style || 'calm, low documentary narrator, measured pace, serious, no hype' });
  add('edge', () => { const cmd = edgeCmd(); return cmd && { name: 'edge', cmd, voice: film.voice?.edge_voice || EDGE_VOICES[film.language] || EDGE_VOICES.en, rate: film.voice?.rate || '+0%' }; });
  if (!want || want === 'piper') {
    const cmd = piperCmd();
    if (cmd) { const model = await piperModel(film); if (model) chain.push({ name: 'piper', cmd, voice: path.basename(model), model }); }
  }
  if (!chain.length) log('No TTS available (set ELEVENLABS_API_KEY / OPENAI_API_KEY, or `pip install edge-tts` / `pip install piper-tts`). Rendering a silent film with captions.');
  chain.push({ name: 'none' });
  return chain;
}
async function tts(pr, text, out) {
  if (pr.name === 'piper') {
    const r = spawnSync(pr.cmd[0], [...pr.cmd.slice(1), '-m', pr.model, '-f', out, '--length-scale', String(1.0 / (pr.speed || 1)), '--sentence-silence', '0.3'], { input: text, encoding: 'utf8' });
    if (r.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 1000) return;
    throw new Error('piper failed: ' + (r.stderr || '').slice(-200));
  }
  if (pr.name === 'edge') {
    // the free service drops requests now and then: retry with growing pauses, then fall back to one sentence at a time,
    // so a film keeps one neural voice instead of switching to the offline one
    const once = async (txt, file, tries) => {
      for (let k = 0; k < tries; k++) {
        const r = spawnSync(pr.cmd[0], [...pr.cmd.slice(1), '--voice', pr.voice, `--rate=${pr.rate}`, '--text', txt, '--write-media', file], { encoding: 'utf8', timeout: 60000 });
        if (r.status === 0 && fs.existsSync(file) && fs.statSync(file).size > 1000) return true;
        await new Promise((res) => setTimeout(res, 2000 * (k + 1)));
      }
      return false;
    };
    if (await once(text, out, 5)) return;
    const parts = text.match(/[^.!?…]+[.!?…]+["»”)]*\s*|[^.!?…]+$/g)?.map((x) => x.trim()).filter(Boolean) || [];
    if (parts.length > 1) {
      const files = [];
      for (let j = 0; j < parts.length; j++) {
        const f = out.replace(/\.mp3$/, `.part${j}.mp3`);
        if (!(await once(parts[j], f, 6))) { files.length = 0; break; }
        files.push(f);
      }
      if (files.length) {
        const list = out + '.txt';
        fs.writeFileSync(list, files.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
        const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', out]);
        files.forEach((f) => fs.rmSync(f, { force: true })); fs.rmSync(list, { force: true });
        if (r.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 1000) return;
      }
    }
    throw new Error('edge-tts failed: ' + text.slice(0, 60));
  }
  if (pr.name === 'gemini') {
    // Gemini TTS (free tier with a key from aistudio.google.com): 24 kHz mono 16-bit, WAV or raw PCM
    for (let k = 0; k < 4; k++) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${pr.model}:generateContent`, {
        method: 'POST', headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text, speech_metadata: { style: pr.style } }] }],
          generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice: pr.voice } } } }),
      });
      if (r.status === 429 || r.status >= 500) { await new Promise((res) => setTimeout(res, 4000 * (k + 1))); continue; }
      if (!r.ok) throw new Error(`gemini TTS ${r.status}: ${(await r.text()).slice(0, 200)}`);
      const j = await r.json();
      const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
      const d = part && (part.inlineData || part.inline_data);
      if (!d?.data) throw new Error('gemini TTS: no audio in the response');
      const buf = Buffer.from(d.data, 'base64');
      if (buf.slice(0, 4).toString() === 'RIFF') { fs.writeFileSync(out, buf); return; }
      const raw = out + '.pcm'; fs.writeFileSync(raw, buf);
      const rate = (String(d.mimeType || d.mime_type).match(/rate=(\d+)/) || [])[1] || '24000';
      const c = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', rate, '-ac', '1', '-i', raw, out]);
      fs.rmSync(raw, { force: true });
      if (c.status === 0) return;
      throw new Error('gemini TTS: could not convert the audio');
    }
    throw new Error('gemini TTS: rate limited');
  }
  let res;
  if (pr.name === 'elevenlabs') {
    res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${pr.voice}?output_format=mp3_44100_128`, {
      method: 'POST', headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 } }),
    });
  } else if (pr.name === 'openai') {
    res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST', headers: { authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: pr.voice, input: text, response_format: 'mp3', instructions: 'Calm, low, documentary narrator. Measured pace, serious, no hype.' }),
    });
  }
  if (!res.ok) throw new Error(`${pr.name} TTS ${res.status}: ${(await res.text()).slice(0, 200)}`);
  fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
}

// ---------- timeline (same code runs in the browser player) ----------
const FilmTimeline = (() => { const ctx = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'player', 'timeline.js'), 'utf8'), ctx); return ctx.FilmTimeline; })();

async function main() {
  const film = JSON.parse(fs.readFileSync(filmPath, 'utf8'));
  const v = validate(film, path.dirname(filmPath));
  v.warnings.forEach((w) => log('warn:', w));
  if (v.errors.length) { v.errors.forEach((e) => console.error('ERROR', e)); process.exit(1); }
  fs.mkdirSync(path.join(BUILD, 'audio'), { recursive: true });

  // 1) narration audio
  const chain = PREVIEW ? [{ name: 'none' }] : await providerChain(film);
  let audio;
  for (const pr of chain) {
    log('voice:', pr.name + (pr.voice ? ` (${pr.voice})` : ''));
    try {
      audio = [];
      for (let i = 0; i < film.scenes.length; i++) {
        const text = film.scenes[i].narration;
        if (!text || pr.name === 'none') { audio.push(null); continue; }
        const key = crypto.createHash('sha1').update([pr.name, pr.voice, pr.rate, ...(pr.style ? [pr.style, pr.model] : []), text].join('|')).digest('hex').slice(0, 16);
        const f = path.join(BUILD, 'audio', `${key}.${['piper', 'gemini'].includes(pr.name) ? 'wav' : 'mp3'}`);
        if (!fs.existsSync(f)) { process.stdout.write(`[film] tts ${i + 1}/${film.scenes.length}\r`); await tts(pr, text, f); }
        audio.push({ file: f, dur: mediaDuration(f) });
      }
      break;
    } catch (e) {
      log(`voice "${pr.name}" failed (${e.message.slice(0, 120)}), trying the next option`);
    }
  }

  // 2) timeline
  const clipFiles = film.scenes.map((sc) => (sc.type === 'clip' ? path.resolve(path.dirname(filmPath), sc.file) : null));
  const clipDur = clipFiles.map((f) => (f ? mediaDuration(f) : 0));
  const { timeline, total } = FilmTimeline.build(film, audio.map((x) => x?.dur ?? null), clipDur);
  fs.writeFileSync(path.join(BUILD, 'film.data.js'), `window.FILM = ${JSON.stringify({ ...film, timeline, timeline_total: total })};`);
  fs.writeFileSync(path.join(BUILD, 'timeline.json'), JSON.stringify(timeline.map((x, i) => ({ i: i + 1, type: film.scenes[i].type, start: +x.start.toFixed(2), dur: +x.dur.toFixed(2) })), null, 1));
  log(`length ${Math.floor(total / 60)}:${String(Math.round(total % 60)).padStart(2, '0')}, ${film.scenes.length} scenes`);

  // 3) browser
  const browser = await launchBrowser();
  const scale = RES / 1080;
  const pageUrl = pathToFileURL(path.join(ROOT, 'player', 'index.html')).href;
  const newPage = async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
    page.on('pageerror', (e) => console.error('[player error]', e.message));
    await page.goto(pageUrl);
    await page.waitForFunction('window.__ready === true', null, { timeout: 30000 });
    return page;
  };

  if (PREVIEW) {
    const dir = path.join(BUILD, 'preview');
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
    const page = await newPage();
    for (let i = 0; i < timeline.length; i++) {
      const x = timeline[i];
      const at = x.start + Math.min(x.dur - 0.5, Math.max(x.speechEnd, x.dur * 0.7));
      await page.evaluate((tt) => window.__seek(tt), at);
      await page.screenshot({ path: path.join(dir, `f${String(i + 1).padStart(2, '0')}.png`) });
    }
    await browser.close();
    const cols = 3, rows = Math.ceil(timeline.length / cols);
    await run(['-framerate', '1', '-i', path.join(dir, 'f%02d.png'), '-vf', `scale=640:-1,tile=${cols}x${rows}:padding=6:color=white`, '-frames:v', '1', path.join(dir, 'sheet.jpg')]);
    log(`preview: ${dir}/sheet.jpg (+ one PNG per scene). Look at it before the full render.`);
    return;
  }

  // 4) picture events for the sound: every year change the counter shows (frame-exact, in the page itself)
  const SOUND = !NO_SOUND && film.sound !== false;
  let years = [];
  if (SOUND) {
    const page = await newPage();
    years = await page.evaluate(({ total, fps }) => {
      const el = document.querySelector('#hud-year .val'), out = []; let prev = null;
      for (let f = 0; f < Math.ceil(total * fps); f++) { window.__seek(f / fps); const y = el ? el.textContent : null; if (prev !== null && y !== prev) out.push(f / fps); prev = y; }
      return out;
    }, { total, fps: FPS });
    await page.close();
  }

  const slug = (film.company.short_name || film.company.name).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  const out = path.resolve(opt('out', path.join(ROOT, 'out', `${slug || 'film'}.mp4`)));
  const pictureNote = path.join(BUILD, 'picture.json');
  let videoFile;
  const t0 = Date.now();
  if (SOUND_ONLY) {
    // a sound revision never re-renders the picture: reuse the last picture of this same timeline
    const pic = fs.existsSync(pictureNote) ? JSON.parse(fs.readFileSync(pictureNote, 'utf8')) : null;
    if (!pic || !fs.existsSync(pic.file) || Math.abs(pic.total - total) > 0.05) { console.error(`--sound-only: no picture of this timeline in build/ (render once without it)${pic ? ` [picture ${pic.total.toFixed(2)} s, timeline ${total.toFixed(2)} s]` : ''}`); process.exit(1); }
    videoFile = pic.file; await browser.close();
    log('sound only: picture reused from ' + path.relative(ROOT, videoFile));
  } else {
    // 5) frames -> segments in parallel
    const frames = Math.ceil(total * FPS);
    const per = Math.ceil(frames / WORKERS);
    let done = 0, lastPct = -1;
    const segs = [];
    await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
      const a = w * per, b = Math.min(frames, a + per);
      if (a >= b) return;
      const seg = path.join(BUILD, `seg-${w}.mp4`); segs[w] = seg;
      const page = await newPage();
      const cdp = await page.context().newCDPSession(page);
      const ff = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', String(FPS), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
      const closed = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg segment failed')))));
      for (let f = a; f < b; f++) {
        await page.evaluate((tt) => window.__seek(tt), f / FPS);
        const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true, ...(RES !== 1080 ? { clip: { x: 0, y: 0, width: 1920, height: 1080, scale: RES / 1080 } } : {}) });   // raw CDP ignores deviceScaleFactor, so --res needs the clip scale
        if (!ff.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => ff.stdin.once('drain', r));
        done++;
        const pct = Math.floor((done / frames) * 100);
        if (pct !== lastPct && pct % 5 === 0) { lastPct = pct; const el = (Date.now() - t0) / 1000; log(`frames ${pct}%  (${Math.round(el)}s elapsed, ~${Math.round(el / done * (frames - done))}s left)`); }
      }
      ff.stdin.end();
      await closed;
      await page.close();
    }));
    await browser.close();

    // 6) mux
    const list = path.join(BUILD, 'segments.txt');
    fs.writeFileSync(list, segs.filter(Boolean).map((s) => `file '${s.replace(/'/g, "'\\''")}'`).join('\n'));
    fs.mkdirSync(path.dirname(out), { recursive: true });
    // "clip" scenes (video made elsewhere: generated footage, HyperFrames, anything) replace the whole frame for their time slot
    const clips = film.scenes.map((sc, i) => (sc.type === 'clip' ? { file: clipFiles[i], start: timeline[i].start, dur: timeline[i].dur } : null)).filter(Boolean);
    const base = path.join(BUILD, 'video-base.mp4');
    await run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', base]);
    videoFile = base;
    if (clips.length) {
      const withClips = path.join(BUILD, 'video-clips.mp4');
      const OW = Math.round(1920 * RES / 1080), OH = RES;
      const inputs = ['-i', base], parts = []; let prev = '[0:v]';
      clips.forEach((c, k) => {
        inputs.push('-i', c.file);
        parts.push(`[${k + 1}:v]fps=${FPS},scale=${OW}:${OH}:force_original_aspect_ratio=decrease,pad=${OW}:${OH}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,tpad=stop_mode=clone:stop_duration=${c.dur.toFixed(2)},trim=duration=${c.dur.toFixed(3)},setpts=PTS-STARTPTS+${c.start.toFixed(3)}/TB[c${k}]`);
        parts.push(`${prev}[c${k}]overlay=eof_action=pass:enable='between(t,${c.start.toFixed(3)},${(c.start + c.dur).toFixed(3)})'[v${k}]`);
        prev = `[v${k}]`;
      });
      await run([...inputs, '-filter_complex', parts.join(';'), '-map', prev, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', String(FPS), withClips]);
      videoFile = withClips;
      log(`clips: ${clips.length} inserted`);
    }
    fs.writeFileSync(pictureNote, JSON.stringify({ file: videoFile, total }));
  }

  // 7) sound: designed bed and events locked to the picture, the narration on top, one master
  let design = null;
  if (SOUND) {
    const yf = path.join(BUILD, 'motion.txt');
    await run(['-i', videoFile, '-vf', `scale=160:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=${yf.replace(/:/g, '\\:')}`, '-an', '-f', 'null', '-']);
    const yavg = fs.readFileSync(yf, 'utf8').split('\n').filter((l) => l.includes('YAVG=')).map((l) => +l.split('=')[1]);
    const onsets = motionOnsets([0, ...yavg], FPS, timeline.map((x) => x.start));
    design = path.join(BUILD, 'design.wav');
    const st = designSound({ film, timeline, total, years, onsets, out: design });
    log(`sound: ${st.cues} hits, ${st.ticks} year ticks, ${st.taps} taps on the picture, ${st.drops} silences`);
  }
  const voiceTrack = path.join(BUILD, 'track.m4a');
  await buildAudio(audio, timeline, total, voiceTrack, design);
  await run(['-i', videoFile, '-i', voiceTrack, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out]);
  log(`done: ${out}  (${Math.round(fs.statSync(out).size / 1e6)} MB, rendered in ${Math.round((Date.now() - t0) / 1000)}s)`);
}

async function buildAudio(audio, timeline, total, out, design) {
  const inputs = [], filters = [], labels = [];
  // the narration is never raw TTS: high-pass, de-ess, a little presence, gentle compression (after cinecode voice_treat.py "clean")
  const CLEAN = 'highpass=f=80,deesser=i=0.35,equalizer=f=300:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1:g=2,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=150:makeup=3dB';
  audio.forEach((a, i) => {
    if (!a) return;
    inputs.push('-i', a.file);
    const ms = Math.round((timeline[i].start + timeline[i].speechStart) * 1000);
    const k = labels.length;
    filters.push(`[${inputs.length / 2 - 1}:a]aresample=48000,${CLEAN},aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${k}]`);
    labels.push(`[v${k}]`);
  });
  const T = total.toFixed(2);
  const parts = [...filters];
  let voice = null;
  if (labels.length) { parts.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:dropout_transition=0,apad=whole_dur=${T}[voice]`); voice = '[voice]'; }
  if (design) { inputs.push('-i', design); parts.push(`[${inputs.length / 2 - 1}:a]aresample=48000,aformat=channel_layouts=stereo[bed]`); }
  const mixIn = [voice, design ? '[bed]' : null].filter(Boolean);
  if (!mixIn.length) { await run(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', T, '-c:a', 'aac', out]); return; }
  // pre-master: sum, a safety limiter, a 24-bit WAV
  const pre = path.join(BUILD, 'premaster.wav');
  parts.push(`${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=longest,atrim=0:${T},alimiter=limit=0.7:level=false[out]`);
  await run([...inputs, '-filter_complex', parts.join(';'), '-map', '[out]', '-c:a', 'pcm_s24le', pre]);
  // master: bring it near -14 LUFS under a lookahead limiter, then a two-pass LINEAR normalisation (the mix keeps its dynamics)
  const measure = (f) => { const m = spawnSync(FFMPEG, ['-hide_banner', '-nostdin', '-i', f, '-af', 'loudnorm=I=-14:TP=-2:LRA=20:print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }); return JSON.parse((m.stderr.match(/\{[\s\S]*?\}/g) || ['{}']).pop()); };
  let j = measure(pre);
  if (j.input_i && +j.input_i < -15) {
    const near = path.join(BUILD, 'premaster-near.wav');
    await run(['-i', pre, '-af', `volume=${(-13.6 - +j.input_i).toFixed(2)}dB,alimiter=limit=0.56:attack=5:release=60:level=false`, '-c:a', 'pcm_s24le', near]);
    fs.renameSync(near, pre); j = measure(pre);
  }
  const ln = j.input_i ? `loudnorm=I=-14:TP=-2:LRA=20:linear=true:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}` : 'loudnorm=I=-14:TP=-2:LRA=20';
  await run(['-i', pre, '-af', `${ln},aresample=48000`, '-c:a', 'aac', '-b:a', '192k', out]);
  if (j.input_i) log(`master: ${j.input_i} LUFS, ${j.input_tp} dBTP -> -14 LUFS`);
}

async function launchBrowser() {
  let pw;
  for (const m of ['playwright', 'playwright-core']) { try { pw = await import(m); break; } catch {} }
  if (!pw) { try { pw = require('playwright'); } catch {} }
  if (!pw) { console.error('Playwright not found. Run: npm install && npx playwright install chromium'); process.exit(1); }
  const chromium = pw.chromium || pw.default?.chromium;
  const tries = [
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : null,
    {}, { channel: 'chrome' }, { channel: 'msedge' },
  ].filter(Boolean);
  for (const o of tries) {
    try { return await chromium.launch({ ...o, args: ['--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none'] }); } catch (e) { var last = e; }
  }
  console.error('Could not start Chromium. Run: npx playwright install chromium\n' + last?.message);
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
