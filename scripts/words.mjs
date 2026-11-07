#!/usr/bin/env node
/* The film's own words, checked before a render: narration and on-screen text.
   node scripts/words.mjs [film.json] [--strict]

   Tells are questions, not bans: phrases that make words read as generated or as an ad, stock clichés, bureaucratic
   Russian, sales language, long sentences the narrator cannot carry, rhetorical questions and exclamation marks.
   Keep one with a reason when it is the film's own voice (a quote, a name). --strict exits 1 when any tell is found.
   Pattern families after sarpstar/cinecode tools/words_check.py (MIT), rewritten for Russian and for this film. */
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const file = path.resolve(argv.find((a) => !a.startsWith('--')) || 'film.json');
const STRICT = argv.includes('--strict');
const film = JSON.parse(fs.readFileSync(file, 'utf8'));

// [pattern, label]; Russian stems are matched without a right boundary, so every ending matches
const TELLS = [
  // staged run-ups and stock framings
  [/в мире,? где/i, 'клише: «в мире, где»'],
  [/(^|[\s«])представьте(\s+себе)?/i, 'разгон: «представьте»'],
  [/давайте\s+(разбер|посмотр|поговор|представ)/i, 'разгон: «давайте разберёмся»'],
  [/не просто [^.!?,]{1,40}, а /i, 'конструкция «не просто X, а Y»'],
  [/вопрос не в том,[^.!?]{1,60}, а в том/i, 'конструкция «вопрос не в том, а в том»'],
  [/(это|и это) только начало/i, 'клише: «это только начало»'],
  [/ничто (уже )?не будет (как )?прежн/i, 'клише: «ничто не будет прежним»'],
  [/будущее (уже )?(здесь|наступил)/i, 'клише: «будущее уже здесь»'],
  [/правила игры|игра (меняется|изменилась)|меняет правила/i, 'клише: «правила игры»'],
  [/новая эра|новую эру|на пороге/i, 'клише: «новая эра», «на пороге»'],
  [/в (современном|нашем быстро меняющемся) мире/i, 'клише: «в современном мире»'],
  [/это меняет вс[её]/i, 'клише: «это меняет всё»'],
  [/(сила|мощь) (данных|ИИ|искусственного)/i, 'клише: «сила данных/ИИ»'],
  [/путешестви/i, 'клише: путешествие как метафора'],
  // inflated and sales words
  [/революцион|беспрецедент|поистине|невероятн|поразительн|потрясающ|уникальн|инновацион/i, 'раздутое слово'],
  [/открыва\S* (новые |широкие )?возможност|раскры\S* потенциал/i, 'рекламный оборот: «открывает возможности»'],
  [/не упустите|успейте|прямо сейчас|только сегодня/i, 'язык продаж'],
  [/без преувеличения|стоит отметить|важно (понимать|отметить|подчеркнуть)|следует отметить/i, 'пустая связка'],
  [/на самом деле|по сути|буквально|в сущности/i, 'слово-подпорка (проверьте, нужно ли)'],
  // bureaucratic Russian the narrator stumbles on
  [/(^|\s)являет(ся|ся)|осуществля|в рамках|с целью|(^|\s)данн(ый|ая|ое) |в данном |в условиях|посредством|на сегодняшний день/i, 'канцелярит'],
  // English (films in English)
  [/\bin a world where\b|\bimagine\b|\bgame[- ]changer\b|\bunlock\b|\bjourney\b|\btapestry\b|\bvibrant\b|\bseamless\b|\brevolutioni[sz]e\b|\bunprecedented\b/i, 'EN tell'],
  [/\bnot (just|only) [^.!?,]{1,40}, but\b/i, 'EN: "not just X, but Y"'],
];

const SKIP_KEYS = new Set(['type', 'file', 'url', 'source', 'sources', 'id', 'side', 'style', 'format', 'accent', 'focus', 'act', 'camera', 'sound', 'edge_voice', 'rate', 'provider', 'language']);
function strings(node, out, key = '') {
  if (typeof node === 'string') { if (!SKIP_KEYS.has(key) && /\p{L}{3}/u.test(node) && !/^https?:/.test(node)) out.push({ key, text: node }); }
  else if (Array.isArray(node)) node.forEach((x) => strings(x, out, key));
  else if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) if (!SKIP_KEYS.has(k)) strings(v, out, k);
  return out;
}

const found = [];
let words = 0, longest = 0;
(film.scenes || []).forEach((s, i) => {
  const at = `сцена ${i + 1} (${s.type})`;
  for (const { key, text } of strings(s, [])) {
    for (const [re, label] of TELLS) { const m = text.match(re); if (m) found.push(`${at} ${key}: ${label} — «${m[0].trim()}»`); }
    if (key === 'narration') {
      words += text.split(/\s+/).filter(Boolean).length;
      for (const sent of text.split(/(?<=[.!?…])\s+/)) {
        const n = sent.split(/\s+/).filter(Boolean).length; longest = Math.max(longest, n);
        if (n > 24) found.push(`${at} narration: длинная фраза (${n} слов), диктору нужен вдох — «${sent.slice(0, 60)}…»`);
        if (/\?\s*$/.test(sent) && s.type !== 'questions' && s.type !== 'end') found.push(`${at} narration: риторический вопрос — «${sent.slice(0, 60)}»`);
      }
    }
    if (/!!|!\s*$/.test(text) && key !== 'narration') found.push(`${at} ${key}: восклицательный знак на экране`);
    else if (/!/.test(text)) found.push(`${at} ${key}: восклицательный знак`);
  }
});

found.forEach((f) => console.log('tell  ' + f));
console.log(`\n${found.length} tells · narration ${words} words, longest sentence ${longest} words`);
console.log('A tell is a question: replace it with a concrete thing from this company, or keep it with a reason.');
process.exit(STRICT && found.length ? 1 : 0);
