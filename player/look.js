/* The film's look: fonts, colours, layout and motion chosen for this company, so two films never share a face.
   FilmLook.resolve(film) -> { pairing, mode, palette{css vars}, fonts[], L, R, flags{...}, variants{type: name}, transition }
   Deterministic: the seed comes from the company's name (or film.look.seed); the company's colour (film.look.brand,
   else film.world.light) becomes "you" everywhere, and the challenger gets a colour that fights it.
   Anything in film.look overrides the choice: { brand, seed, pairing, mode, align, cards, bg, decor, transition,
   captions, case, variants: { cold_open, chapter, statement, dossier, end, questions, case } }.
   A named style (editorial, poster, sketch) keeps its own colours and fonts; layout, variants and motion still vary.
   Works in the browser (window.FilmLook) and in Node (module.exports). */
(function (root) {
  const strSeed = (s) => { let h = 2166136261; for (const ch of String(s || '')) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const mix = (x) => { x >>>= 0; x ^= x >>> 16; x = Math.imul(x, 0x7feb352d); x ^= x >>> 15; x = Math.imul(x, 0x846ca68b); x ^= x >>> 16; return x >>> 0; };
  const pickBy = (seed, salt, arr) => arr[mix(mix(seed) ^ strSeed(salt)) % arr.length];

  // type pairings: heading / body / mono, with weights; all Latin + Cyrillic (player/fonts.css)
  const PAIRINGS = {
    grotesk:   { head: 'Inter', hw: 800, body: 'Inter', mono: 'JetBrains Mono', track: '-.03em', mood: 'neutral' },
    geometric: { head: 'Unbounded', hw: 700, body: 'Onest', mono: 'JetBrains Mono', track: '-.02em', mood: 'bold' },
    classic:   { head: 'Playfair Display', hw: 700, body: 'IBM Plex Sans', mono: 'IBM Plex Mono', track: '-.01em', mood: 'premium' },
    editorial: { head: 'Source Serif 4', hw: 600, body: 'Source Serif 4', mono: 'JetBrains Mono', track: '-.01em', mood: 'calm' },
    news:      { head: 'Oswald', hw: 700, body: 'IBM Plex Sans', mono: 'IBM Plex Mono', track: '0', mood: 'urgent', upper: true },
    friendly:  { head: 'Rubik', hw: 700, body: 'Rubik', mono: 'JetBrains Mono', track: '-.02em', mood: 'warm' },
    russian:   { head: 'PT Serif', hw: 700, body: 'PT Sans', mono: 'IBM Plex Mono', track: '-.01em', mood: 'classic' },
    modern:    { head: 'Montserrat', hw: 800, body: 'Montserrat', mono: 'JetBrains Mono', track: '-.02em', mood: 'confident' },
    tech:      { head: 'Exo 2', hw: 800, body: 'Exo 2', mono: 'IBM Plex Mono', track: '-.01em', mood: 'tech' },
    elegant:   { head: 'Yeseva One', hw: 400, body: 'Raleway', mono: 'IBM Plex Mono', track: '0', mood: 'refined' },
  };
  const FALLBACK = { serif: '"Noto Serif",Georgia,serif', sans: '"Noto Sans","Segoe UI",system-ui,sans-serif' };
  const isSerif = (f) => /Serif|Playfair|Yeseva/.test(f);

  // colour helpers
  const hex2hsl = (hex) => { const n = parseInt(hex.slice(1), 16); let r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; }
    return [h, s * 100, l * 100]; };
  const hsl = (h, s, l, a) => { h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)); l = Math.max(0, Math.min(100, l));
    return a == null ? `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}%)` : `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${l.toFixed(0)}% / ${a})`; };

  const hsl2hex = (h, s, l) => { s /= 100; l /= 100; const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))).toString(16).padStart(2, '0'); return '#' + f(0) + f(8) + f(4); };
  // palette modes: where the brand colour lives
  function palette(mode, brand, seed) {
    const [bh, bs0] = hex2hsl(brand); const bs = Math.max(bs0, 35);
    const th = bh + pickBy(seed, 'them', [150, 165, 180, 195, 210]);   // the challenger: across the wheel from the company
    const P = {
      night: () => ({ '--bg': hsl(bh, 14, 6), '--ink': hsl(bh, 12, 92), '--muted': hsl(bh, 8, 60), '--dim': hsl(bh, 8, 32), '--line': hsl(bh, 12, 90, 0.13),
        '--you': hsl(bh, Math.min(bs, 75), 62), '--them': hsl(th, 85, 60), '--amber': hsl(42, 80, 60), '--ok': hsl(140, 40, 65), '--capbg': hsl(bh, 14, 6, 0.8), '--card': hsl(bh, 12, 90, 0.04) }),
      paper: () => ({ '--bg': hsl(bh, 12, 94), '--ink': hsl(bh, 25, 10), '--muted': hsl(bh, 10, 38), '--dim': hsl(bh, 12, 72), '--line': hsl(bh, 25, 10, 0.18),
        '--you': hsl(bh, Math.min(bs, 80), 36), '--them': hsl(th, 80, 42), '--amber': hsl(36, 75, 40), '--ok': hsl(145, 40, 32), '--capbg': hsl(bh, 25, 97), '--card': hsl(bh, 25, 10, 0.035) }),
      field: () => ({ '--bg': hsl(bh, Math.min(bs, 70), 16), '--ink': hsl(bh, 20, 95), '--muted': hsl(bh, 25, 74), '--dim': hsl(bh, 30, 40), '--line': hsl(bh, 20, 95, 0.18),
        '--you': hsl(bh, Math.min(bs, 85), 72), '--them': hsl(th, 90, 62), '--amber': hsl(45, 90, 62), '--ok': hsl(140, 50, 70), '--capbg': hsl(bh, Math.min(bs, 70), 12, 0.85), '--card': hsl(bh, 20, 95, 0.06) }),
      snow: () => ({ '--bg': hsl(bh, 10, 97), '--ink': hsl(220, 25, 12), '--muted': hsl(220, 10, 42), '--dim': hsl(220, 10, 78), '--line': hsl(220, 25, 12, 0.14),
        '--you': hsl(bh, Math.min(bs, 85), 42), '--them': hsl(th, 85, 45), '--amber': hsl(36, 85, 42), '--ok': hsl(150, 45, 32), '--capbg': '#FFFFFF', '--card': hsl(220, 30, 50, 0.05) }),
      ink: () => ({ '--bg': '#050505', '--ink': '#F5F5F2', '--muted': '#9A9A96', '--dim': '#3C3C3A', '--line': 'rgba(245,245,242,.14)',
        '--you': hsl(bh, Math.max(bs, 70), 58), '--them': hsl(th, 95, 58), '--amber': hsl(45, 90, 58), '--ok': hsl(140, 45, 62), '--capbg': 'rgba(5,5,5,.82)', '--card': 'rgba(245,245,242,.045)' }),
    };
    const p = (P[mode] || P.night)();
    p['--fadec'] = p['--bg']; p['--halo'] = p['--bg']; p['--faint'] = p['--line']; p['--grat'] = p['--line']; p['--coast'] = p['--muted']; p['--leader'] = p['--muted'];
    p['--land'] = mode === 'paper' || mode === 'snow' ? hsl(bh, 15, 84) : hsl(bh, 14, 14); p['--acc2'] = p['--you'];
    return p;
  }

  // layout variants per scene type (film.js draws each)
  const VARIANTS = {
    cold_open: ['stack', 'center', 'number'],
    chapter: ['numeral', 'center', 'split'],
    statement: ['left', 'center', 'split'],
    dossier: ['grid', 'ledger', 'hero'],
    end: ['left', 'center', 'block'],
    questions: ['list', 'cards'],
    case: ['right', 'below'],
  };

  function resolve(film) {
    film = film || {}; const o = film.look || {};
    const seed = Number.isFinite(o.seed) ? o.seed : strSeed((film.company && film.company.name) || 'company');
    const named = ['editorial', 'poster', 'sketch'].includes(film.style);
    const brand = /^#[0-9a-f]{6}$/i.test(o.brand || '') ? o.brand : /^#[0-9a-f]{6}$/i.test((film.world && film.world.light) || '') ? film.world.light : hsl2hex(seed % 360, 55, 45);
    const pairing = PAIRINGS[o.pairing] ? o.pairing : pickBy(seed, 'pair', Object.keys(PAIRINGS));
    const mode = o.mode || pickBy(seed, 'mode', ['night', 'paper', 'field', 'snow', 'ink']);
    const pf = PAIRINGS[pairing];
    const margin = pickBy(seed, 'margin', [[160, 1760], [210, 1710], [130, 1790], [260, 1700]]);
    const flags = {
      align: o.align || pickBy(seed, 'align', ['left', 'left', 'center', 'offset']),
      cards: o.cards || pickBy(seed, 'cards', ['rule', 'box', 'fill', 'bar']),
      bg: o.bg || pickBy(seed, 'bg', ['grid', 'dots', 'plain', 'diagonal', 'glow']),
      decor: o.decor || pickBy(seed, 'decor', ['none', 'corner', 'bar', 'ring', 'watermark']),
      captions: o.captions || pickBy(seed, 'cap', ['box', 'bar', 'plain']),
      upper: o.case === 'upper' ? true : o.case === 'normal' ? false : !!pf.upper,
      numeral: pickBy(seed, 'numeral', ['outline', 'solid', 'brand']),
    };
    const variants = {};
    for (const [type, list] of Object.entries(VARIANTS)) variants[type] = (o.variants && list.includes(o.variants[type])) ? o.variants[type] : pickBy(seed, 'v-' + type, list);
    const transition = o.transition || pickBy(seed, 'tr', ['dip', 'wipe', 'slide', 'dissolve']);
    const css = named ? {} : Object.assign(palette(mode, brand, seed), {
      '--sans': `"${pf.body}",${isSerif(pf.body) ? FALLBACK.serif : FALLBACK.sans}`,
      '--head': `"${pf.head}",${isSerif(pf.head) ? FALLBACK.serif : FALLBACK.sans}`,
      '--mono': `"${pf.mono}","DejaVu Sans Mono",ui-monospace,monospace`,
      '--head-w': String(pf.hw), '--head-track': pf.track, '--brand': brand,
    });
    const fonts = named ? [] : [...new Set([`${pf.hw} 40px "${pf.head}"`, `400 40px "${pf.body}"`, `${pf.body === pf.head ? pf.hw : 600} 40px "${pf.body}"`, `400 20px "${pf.mono}"`, `600 20px "${pf.mono}"`])];
    return { seed, named, brand, pairing, mode: named ? film.style : mode, css, fonts, L: margin[0], R: margin[1], flags, variants, transition, families: named ? [] : [pf.head, pf.body, pf.mono] };
  }

  const api = { resolve, PAIRINGS, VARIANTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FilmLook = api;
})(typeof self !== 'undefined' ? self : this);
