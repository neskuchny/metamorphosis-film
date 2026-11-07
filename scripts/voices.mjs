#!/usr/bin/env node
/* Voice audition: the same line read by several voices, one short file each, so the voice is chosen by ear.
   node scripts/voices.mjs [film.json] [--scene N] [--text "..."] [--voices edge:ru-RU-DmitryNeural,edge:en-US-AndrewMultilingualNeural,gemini:Charon]
   Free by default (edge-tts voices, including Microsoft's multilingual ones that also read Russian).
   gemini:<voice> needs GEMINI_API_KEY. Writes out/voices/<n>-<voice>.mp3 and one joined file with a beep between takes.
   After cinecode (MIT): "the voice is chosen by ear, by the user: 2-3 candidates reading the same line". */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf('--' + n); return i >= 0 ? argv[i + 1] : d; };
const filmPath = argv.find((a, i) => !a.startsWith('--') && !['--scene', '--text', '--voices', '--rate'].includes(argv[i - 1]));
const film = filmPath ? JSON.parse(fs.readFileSync(filmPath, 'utf8')) : { scenes: [] };
const text = opt('text') || film.scenes[+opt('scene', 0) - 1]?.narration || film.scenes.find((s) => s.type === 'statement')?.narration;
if (!text) { console.error('give --text "..." or a film.json with --scene N'); process.exit(2); }
const rate = opt('rate', film.voice?.rate || '+0%');
const ru = (film.language || 'ru') === 'ru';
const voices = (opt('voices') || (ru
  ? 'edge:ru-RU-DmitryNeural,edge:en-US-AndrewMultilingualNeural,edge:en-US-BrianMultilingualNeural,edge:de-DE-FlorianMultilingualNeural,edge:fr-FR-RemyMultilingualNeural,edge:ru-RU-SvetlanaNeural,edge:en-US-AvaMultilingualNeural'
  : 'edge:en-US-AndrewNeural,edge:en-US-AndrewMultilingualNeural,edge:en-US-BrianMultilingualNeural')).split(',');
const dir = path.join(ROOT, 'out', 'voices');
fs.mkdirSync(dir, { recursive: true });
const edge = ['edge-tts'].concat([]);
const made = [];
for (const [n, v] of voices.entries()) {
  const [engine, voice] = v.split(':');
  const out = path.join(dir, `${n + 1}-${voice}.mp3`);
  if (engine === 'edge') {
    let ok = false;
    for (let k = 0; k < 4 && !ok; k++) {
      const r = spawnSync(edge[0], ['--voice', voice, `--rate=${rate}`, '--text', text, '--write-media', out], { encoding: 'utf8', timeout: 60000 });
      ok = r.status === 0 && fs.existsSync(out) && fs.statSync(out).size > 1000;
    }
    if (!ok) { console.log(`${n + 1}. ${v}: failed`); continue; }
  } else if (engine === 'gemini') {
    if (!process.env.GEMINI_API_KEY) { console.log(`${n + 1}. ${v}: skipped (no GEMINI_API_KEY)`); continue; }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts'}:generateContent`, {
      method: 'POST', headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text, speech_metadata: { style: film.voice?.style || 'calm, low documentary narrator, measured pace, serious, no hype' } }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { voice } } } }),
    });
    if (!r.ok) { console.log(`${n + 1}. ${v}: ${r.status}`); continue; }
    const d = (await r.json()).candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData;
    const buf = Buffer.from(d?.data || '', 'base64'), raw = out + '.raw';
    fs.writeFileSync(raw, buf);
    spawnSync('ffmpeg', ['-v', 'error', '-y', ...(buf.slice(0, 4).toString() === 'RIFF' ? [] : ['-f', 's16le', '-ar', '24000', '-ac', '1']), '-i', raw, out]);
    fs.rmSync(raw, { force: true });
  } else { console.log(`${n + 1}. ${v}: unknown engine (edge or gemini)`); continue; }
  const d = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out], { encoding: 'utf8' }).stdout.trim();
  console.log(`${n + 1}. ${v}  ${(+d).toFixed(1)} s  ${path.relative(process.cwd(), out)}`);
  made.push(out);
}
if (made.length > 1) {
  const beep = path.join(dir, '.beep.wav');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=f=880:d=0.15', '-af', 'volume=0.2,apad=pad_dur=0.6', '-ar', '24000', '-ac', '1', beep]);
  const list = path.join(dir, '.list.txt'), parts = [];
  made.forEach((f, k) => { const w = path.join(dir, `.take${k}.wav`); spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', f, '-ar', '24000', '-ac', '1', w]); parts.push(beep, w); });
  fs.writeFileSync(list, parts.map((f) => `file '${f}'`).join('\n'));
  const all = path.join(dir, 'all-voices.mp3');
  spawnSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'libmp3lame', '-q:a', '3', all]);
  fs.readdirSync(dir).filter((f) => f.startsWith('.')).forEach((f) => fs.rmSync(path.join(dir, f)));
  console.log(`all takes in order, a beep before each: ${path.relative(process.cwd(), all)}`);
}
