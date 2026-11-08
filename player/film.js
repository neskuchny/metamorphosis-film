/* Deterministic film player: every visual is a pure function of time t.
   The renderer calls window.__seek(t) for each frame and screenshots the stage. */
(function boot() {
  const allText = JSON.stringify(window.FILM.scenes) + (window.FILM.company?.name || '');
  const LK = window.FilmLook ? window.FilmLook.resolve(window.FILM) : null;
  const loads = ['400', '600', '700', '800'].map((w) => document.fonts.load(`${w} 40px Inter`, allText))
    .concat(['400', '600'].map((w) => document.fonts.load(`${w} 20px "JetBrains Mono"`, allText + '0123456789')))
    .concat(window.FILM.style === 'sketch' ? ['400 40px Caveat', '700 40px Caveat', '400 20px Neucha'].map((f) => document.fonts.load(f, allText + '0123456789')) : [])
    .concat(window.FILM.style === 'editorial' ? ['400 40px "Source Serif 4"', '600 40px "Source Serif 4"'].map((f) => document.fonts.load(f, allText + '0123456789')) : [])
    .concat(window.FILM.style === 'poster' ? ['500 40px Oswald', '700 40px Oswald'].map((f) => document.fonts.load(f, allText + '0123456789')) : [])
    .concat(LK ? LK.fonts.map((f) => document.fonts.load(f, allText + '0123456789')) : []);
  Promise.all(loads).catch(() => {}).then(() => document.fonts.ready).then(init);
})();

function init() {
  const F = window.FILM;
  // the film's look (player/look.js): fonts, colours, margins, layout variants and transitions chosen for this company
  const LOOK = window.FilmLook ? window.FilmLook.resolve(F) : null;
  const W = 1920, H = 1080, L = LOOK ? LOOK.L : 160, R = LOOK ? LOOK.R : 1760;
  const STAGE = document.getElementById('stage');
  const V = (type, dflt) => (LOOK && LOOK.variants[type]) || dflt;
  if (LOOK && !LOOK.named) {
    for (const k in LOOK.css) STAGE.style.setProperty(k, LOOK.css[k]);
    const fl = LOOK.flags;
    STAGE.classList.add('lk', 'lk-cards-' + fl.cards, 'lk-bg-' + fl.bg, 'lk-cap-' + fl.captions, 'lk-num-' + fl.numeral, 'lk-mode-' + LOOK.mode);
    if (fl.upper) STAGE.classList.add('lk-upper');
  }
  const SKETCH = F.style === 'sketch';
  const THEME = ['sketch', 'editorial', 'poster'].includes(F.style) ? F.style : 'default';
  if (THEME === 'editorial' || THEME === 'poster') STAGE.classList.add('th-' + THEME);
  // poster theme: every scene gets its own flat colour field; text colours follow it (CSS variables set on the stage at each cut)
  const POSTER = {
    yellow: { '--bg': '#F2C230', '--ink': '#14213D', '--muted': 'rgba(20,33,61,.72)', '--dim': 'rgba(20,33,61,.35)', '--line': 'rgba(20,33,61,.25)', '--them': '#C8102E', '--you': '#1D4E89', '--amber': '#14213D', '--ok': '#14213D', '--acc2': '#14213D' },
    navy: { '--bg': '#14213D', '--ink': '#F6F1E7', '--muted': 'rgba(246,241,231,.72)', '--dim': 'rgba(246,241,231,.35)', '--line': 'rgba(246,241,231,.22)', '--them': '#FF5A5F', '--you': '#7FC8F8', '--amber': '#F2C230', '--ok': '#7BD389', '--acc2': '#F2C230' },
    magenta: { '--bg': '#C2185B', '--ink': '#FFF6E9', '--muted': 'rgba(255,246,233,.78)', '--dim': 'rgba(255,246,233,.4)', '--line': 'rgba(255,246,233,.28)', '--them': '#FFD23F', '--you': '#14213D', '--amber': '#FFD23F', '--ok': '#FFD23F', '--acc2': '#14213D' },
    cream: { '--bg': '#F4EBDC', '--ink': '#14213D', '--muted': 'rgba(20,33,61,.7)', '--dim': 'rgba(20,33,61,.3)', '--line': 'rgba(20,33,61,.18)', '--them': '#C8102E', '--you': '#1D4E89', '--amber': '#D9822B', '--ok': '#2E7D4F', '--acc2': '#F2C230' },
  };
  const posterOf = (s, i) => {
    if (['race', 'map', 'anatomy', 'waves', 'ladder', 'timeline', 'scissors', 'dossier', 'parallels', 'plan', 'attackers', 'case'].includes(s.type)) return i % 2 ? 'cream' : 'navy';
    return ['yellow', 'navy', 'magenta', 'cream'][i % 4];
  };
  const applyPalette = (name) => { const p = POSTER[name]; for (const k in p) STAGE.style.setProperty(k, p[k]); STAGE.style.setProperty('--fadec', p['--bg']); STAGE.style.setProperty('--halo', p['--bg']); STAGE.style.setProperty('--land', name === 'navy' ? '#22335A' : name === 'cream' ? '#E5D8C0' : 'rgba(0,0,0,.12)'); STAGE.style.setProperty('--coast', p['--line']); STAGE.style.setProperty('--grat', p['--line']); STAGE.style.setProperty('--faint', p['--line']); STAGE.style.setProperty('--leader', p['--muted']); STAGE.style.setProperty('--capbg', '#FFFDF7'); };
  // decorations drawn behind each scene's content, per theme: the editorial crimson disc, the poster's geometric blocks
  const DECOR = {
    editorial: (s, root, i) => {
      // the disc sits only where the right side of the frame is free of text
      let where = { chapter: 'big', cold_open: 'edge', end: 'edge' }[s.type];
      if (where === 'big' && String(s.title || '').length > 20) where = 'edge';   // a long title needs the right side
      if (!where) return null;
      const d = document.createElement('div'); d.className = 'ed-sun ' + where;
      root.insertBefore(d, root.firstChild);
      return (t) => { const p = 1 - Math.pow(1 - Math.min(1, Math.max(0, t / 1.6)), 3); d.style.transform = `translate(${(1 - p) * 60}px, 0) scale(${0.85 + 0.15 * p})`; d.style.opacity = p; };
    },
    poster: (s, root, i) => {
      const kind = { chapter: 'disc', cold_open: 'band', end: 'band', moment: 'corner' }[s.type];
      if (!kind) return null;
      const d = document.createElement('div'); d.className = 'pt-shape ' + kind;
      root.insertBefore(d, root.firstChild);
      return (t) => { const p = 1 - Math.pow(1 - Math.min(1, Math.max(0, t / 0.9)), 3); d.style.opacity = p; d.style.transform = kind === 'band' ? `rotate(-8deg) translateX(${(1 - p) * -300}px)` : `scale(${0.6 + 0.4 * p})`; };
    },
  };
  // the look's own decoration on the scenes that carry the film's voice (not on data scenes)
  const lookDecor = (s, root) => {
    if (!LOOK || LOOK.named || LOOK.flags.decor === 'none' || !['cold_open', 'chapter', 'statement', 'end', 'questions', 'moment'].includes(s.type)) return null;
    const kind = LOOK.flags.decor, d = document.createElement('div'); d.className = 'lk-dec ' + kind;
    if (kind === 'watermark') d.textContent = String((F.company && (F.company.short_name || F.company.name)) || '').slice(0, 1);
    root.insertBefore(d, root.firstChild);
    return (t) => { const p = 1 - Math.pow(1 - Math.min(1, Math.max(0, t / 1.2)), 3); d.style.opacity = p; d.style.transform = kind === 'bar' ? `scaleY(${p})` : kind === 'corner' ? `translate(${(1 - p) * 80}px, ${(1 - p) * -80}px)` : `scale(${0.9 + 0.1 * p})`; };
  };
  if (SKETCH) {
    // hand-drawn look: paper, marker ink, and lines that "boil" (three wobble filters swapped 8 times a second, like redrawn frames)
    STAGE.classList.add('th-sketch');
    const f = document.createElement('div');
    f.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    f.innerHTML = '<svg width="0" height="0"><defs>' + [11, 23, 37].map((seed, i) =>
      `<filter id="wob${i}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="2" seed="${seed}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>`).join('') + '</defs></svg>';
    STAGE.appendChild(f);
  }

  // ---------- helpers ----------
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const ease = {
    out: (x) => 1 - Math.pow(1 - x, 3),
    inOut: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    expo: (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  };
  const P = (t, a, d, e = ease.out) => e(clamp((t - a) / Math.max(d, 1e-6)));
  const h = (tag, cls, html, parent) => {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (html != null) el.innerHTML = html;
    if (parent) parent.appendChild(el);
    return el;
  };
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const pos = (el, x, y, w) => { el.style.left = x + 'px'; el.style.top = y + 'px'; if (w) el.style.width = w + 'px'; return el; };
  const show = (el, p, dy = 24, dx = 0) => {
    el.style.opacity = p;
    el.style.transform = `translate(${(1 - p) * dx}px, ${(1 - p) * dy}px)`;
  };
  // shrink font until element fits its box
  function fit(el, maxPx, minPx, maxW, maxH) {
    let s = maxPx;
    el.style.fontSize = s + 'px';
    const prev = { d: el.style.display, w: el.style.width, ws: el.style.whiteSpace };
    if (!maxH) { el.style.display = 'inline-block'; el.style.width = 'auto'; el.style.whiteSpace = 'nowrap'; } // single line: measure the text itself
    else if (maxW) el.style.width = maxW + 'px'; // multi-line: fixed width, check height and long words
    const over = () => (maxW && el.scrollWidth > maxW + 1) || (maxH && el.scrollHeight > maxH + 1);
    while (over() && s > minPx) { s -= 2; el.style.fontSize = s + 'px'; }
    if (!maxH) { el.style.display = prev.d; el.style.width = prev.w; el.style.whiteSpace = prev.ws; }
    return s;
  }
  // animate the first number inside a string ("$1.37 млрд" -> counts up)
  function countText(str, p) {
    const s = String(str ?? '');
    const m = s.match(/\d[\d   ]*(?:[.,]\d+)*/);
    if (!m || p >= 1) return s;
    const raw = m[0].replace(/[\s  ]+$/, '');
    if (/^(19|20)\d\d$/.test(raw)) return s; // a year: never count up
    const compact = raw.replace(/[\s  ]/g, '');
    let intPart = compact, dec = '', decSep = null, grouped = /\d[\s  ]\d/.test(raw);
    const mm = compact.match(/^(\d+(?:[.,]\d{3})*)(?:([.,])(\d{1,2}|\d{4,}))?$/);
    if (mm) {
      intPart = mm[1]; if (mm[2]) { decSep = mm[2]; dec = mm[3]; }
      if (/[.,]\d{3}/.test(intPart)) grouped = true;
      intPart = intPart.replace(/[.,]/g, '');
    } else {
      const k = compact.search(/[.,]\d+$/);
      if (k > 0) { decSep = compact[k]; dec = compact.slice(k + 1); intPart = compact.slice(0, k).replace(/[.,]/g, ''); }
    }
    const n = parseFloat(intPart + (dec ? '.' + dec : ''));
    if (!isFinite(n)) return s;
    let v = (n * p).toFixed(dec.length);
    let [ip, dp] = v.split('.');
    if (grouped) ip = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    v = ip + (dp ? (decSep || '.') + dp : '');
    return s.slice(0, m.index) + v + s.slice(m.index + raw.length);
  }
  const DEFAULT_UI = {
    en: { known: 'Known', estimate: 'Estimate', model: 'Model', year: 'Year', you: 'You', source: 'Source', gap: 'gap', now: 'Now' },
    ru: { known: 'Известно', estimate: 'Оценка', model: 'Модель', year: 'Год', you: 'Вы', source: 'Источник', gap: 'разрыв', now: 'Сейчас' },
  };
  const UI = Object.assign({}, DEFAULT_UI.en, DEFAULT_UI[F.language] || {}, F.ui || {});
  const youName = F.you_label || F.company?.short_name || F.company?.name || UI.you;
  const themName = F.attacker?.name || 'NewCo';

  // ---------- scene builders: build(scene, root) -> update(t, dur, sc) ----------
  const B = {};

  B.cold_open = (s, root) => {
    const v = V('cold_open', 'stack'), mid = (L + R) / 2;
    const k = s.kicker ? pos(h('div', 'kicker abs', esc(s.kicker), root), L, v === 'number' ? 220 : 300) : null;
    if (k && v === 'center') { k.style.left = L + 'px'; k.style.width = (R - L) + 'px'; k.style.textAlign = 'center'; }
    const n = (s.lines || []).length;
    const lines = (s.lines || []).map((txt, i) => {
      let el;
      if (v === 'center') { el = pos(h('div', 'co-line abs', esc(txt), root), L, 470, R - L); el.style.textAlign = 'center'; el.style.whiteSpace = 'normal'; fit(el, 104, 44, R - L, 240); }
      else if (v === 'number' && i === 0) { el = pos(h('div', 'co-line co-hero abs', esc(txt), root), L - 6, 280); fit(el, 190, 60, R - L); }
      else if (v === 'number') { el = pos(h('div', 'co-line co-small abs', esc(txt), root), L, 560 + (i - 1) * 86); fit(el, 64, 34, R - L); }
      else { el = pos(h('div', 'co-line abs', esc(txt), root), L, 380 + i * 118); fit(el, 96, 44, R - L); }
      if (i === n - 1 && s.accent_last !== false) el.style.color = 'var(--them)';
      return el;
    });
    void mid;
    // the hook: the first line arrives word by word from the first frame, so the film opens on movement, not a still title
    const words = lines[0] ? (() => { const el = lines[0]; el.innerHTML = el.textContent.split(/(\s+)/).map((w) => (/^\s*$/.test(w) ? w : `<span class="cw">${esc(w)}</span>`)).join(''); return [...el.querySelectorAll('.cw')]; })() : [];
    return (t, d, sc) => {
      if (k) { show(k, P(t, 0, 0.7), 0); k.style.clipPath = `inset(0 ${(100 * (1 - P(t, 0, 0.9, ease.inOut))).toFixed(1)}% 0 0)`; }
      const span = Math.max(1.5, (sc.speechEnd || d - 1) - 0.6);
      const gap = Math.min(0.32, 1.5 / Math.max(1, words.length));   // the line takes about as long as it is said
      words.forEach((w, j) => { const q = P(t, 0.05 + j * gap, 0.8); w.style.opacity = q; w.style.transform = `translateY(${((1 - q) * 110).toFixed(1)}px)`; w.style.filter = q < 1 ? `blur(${((1 - q) * 10).toFixed(1)}px)` : ''; });
      lines.forEach((el, i) => {
        const at = i === 0 ? 0 : 0.5 + (i * span) / lines.length, next = 0.5 + ((i + 1) * span) / lines.length;
        const p = i === 0 ? 1 : P(t, at, 0.9);
        if (v === 'center') { show(el, p * (i < lines.length - 1 ? 1 - P(t, next - 0.3, 0.3) : 1), 30); return; }   // one line at a time, in the middle
        show(el, p, v === 'number' && i === 0 ? 0 : 40, v === 'number' && i === 0 ? -40 : 0);
        if (v !== 'number' && i < lines.length - 1) el.style.opacity = p * (1 - 0.6 * P(t, next, 0.8));
      });
    };
  };

  B.statement = (s, root) => {
    const v = V('statement', 'left');
    const x = v === 'split' ? L + 470 : L, w = v === 'split' ? R - L - 470 : R - L;
    const k = s.kicker ? pos(h('div', 'kicker abs', esc(s.kicker), root), L, v === 'split' ? 400 : 330, v === 'split' ? 380 : null) : null;
    const rule = v === 'split' ? pos(h('div', 'st-vrule abs', '', root), L + 420, 380) : null;
    const quote = v === 'center' ? pos(h('div', 'st-quote abs', '“', root), (L + R) / 2 - 60, 190) : null;
    const el = pos(h('div', 'stmt abs', esc(s.text), root), x, v === 'center' ? 360 : 390, w);
    if (v === 'center') el.style.textAlign = 'center';
    fit(el, v === 'split' ? 84 : 92, 46, w, 380);
    const sub = s.sub ? pos(h('div', 'end-sub abs', esc(s.sub), root), x, 0, Math.min(1300, w)) : null;
    if (sub) { sub.style.top = (v === 'center' ? 360 : 390) + el.scrollHeight + 40 + 'px'; if (v === 'center') { sub.style.left = L + 'px'; sub.style.width = (R - L) + 'px'; sub.style.textAlign = 'center'; } }
    if (s.accent) el.style.color = 'var(--them)';
    if (rule) rule.style.height = Math.max(200, el.scrollHeight + 60) + 'px';
    return (t, d) => {
      if (k) show(k, P(t, 0.1, 0.7), 10);
      if (quote) show(quote, P(t, 0.0, 0.8), -20);
      if (rule) rule.style.transform = `scaleY(${P(t, 0.1, 0.8, ease.inOut)})`;
      show(el, P(t, 0.3, 1.1), v === 'split' ? 0 : 50, v === 'split' ? 60 : 0);
      if (sub) show(sub, P(t, 1.4, 0.9), 20);
    };
  };

  // video made elsewhere; the renderer overlays the file, this placeholder shows in previews and in the browser player
  B.clip = (s, root) => {
    const el = pos(h('div', 'kicker abs', esc('▶ ' + (s.title || s.file || 'clip')), root), L, 480);
    return (t) => show(el, P(t, 0.2, 0.6), 10);
  };

  B.chapter = (s, root) => {
    const v = V('chapter', 'numeral');
    if (v === 'split') {
      // a panel in the company's colour holds the number; the title stands on the right
      const panel = pos(h('div', 'ch-panel abs', '', root), 0, 0); panel.style.width = '700px'; panel.style.height = '1080px';
      const num = pos(h('div', 'ch-num ch-num-panel abs', esc(s.num ?? ''), root), 90, 330);
      const title = pos(h('div', 'ch-title abs', esc(s.title), root), 800, 400, R - 800);
      fit(title, 108, 52, R - 800, 320);
      const sub = s.sub ? pos(h('div', 'end-sub abs', esc(s.sub), root), 800, 0, R - 800) : null;
      if (sub) sub.style.top = 400 + title.scrollHeight + 36 + 'px';
      return (t) => {
        panel.style.transform = `translateX(${-(1 - P(t, 0, 0.8, ease.inOut)) * 700}px)`;
        show(num, P(t, 0.4, 0.8), 0, -30); show(title, P(t, 0.5, 0.9), 0, 50);
        if (sub) show(sub, P(t, 1.0, 0.8), 16);
      };
    }
    if (v === 'center') {
      const num = pos(h('div', 'kicker ch-num-small abs', esc(s.num ?? ''), root), L, 330, R - L); num.style.textAlign = 'center';
      const title = pos(h('div', 'ch-title abs', esc(s.title), root), L, 420, R - L); title.style.textAlign = 'center';
      fit(title, 120, 56, R - L, 260);
      const rule = pos(h('div', 'ch-rule abs', '', root), (L + R) / 2, 400);
      const sub = s.sub ? pos(h('div', 'end-sub abs', esc(s.sub), root), L, 0, R - L) : null;
      if (sub) { sub.style.top = 420 + title.scrollHeight + 36 + 'px'; sub.style.textAlign = 'center'; }
      return (t) => {
        show(num, P(t, 0.0, 0.7), 10);
        const rw = 260 * P(t, 0.3, 0.9, ease.inOut); rule.style.width = rw + 'px'; rule.style.left = (L + R) / 2 - rw / 2 + 'px';
        show(title, P(t, 0.45, 0.9), 40);
        if (sub) show(sub, P(t, 1.0, 0.8), 16);
      };
    }
    const num = pos(h('div', 'ch-num abs', esc(s.num ?? ''), root), L - 10, 250);
    const title = pos(h('div', 'ch-title abs', esc(s.title), root), L, 520, R - L);
    fit(title, 120, 56, R - L, 260);
    const rule = pos(h('div', 'ch-rule abs', '', root), L, 500);
    const sub = s.sub ? pos(h('div', 'end-sub abs', esc(s.sub), root), L, 0, 1400) : null;
    if (sub) sub.style.top = 520 + title.scrollHeight + 36 + 'px';
    return (t) => {
      show(num, P(t, 0.0, 1.0), 0, -40);
      rule.style.width = 260 * P(t, 0.3, 0.9, ease.inOut) + 'px';
      show(title, P(t, 0.45, 0.9), 40);
      if (sub) show(sub, P(t, 1.0, 0.8), 16);
    };
  };

  // the world: the company as a lit town at night (or a paper diorama), drawn in WebGL by player/world.js.
  // One canvas and one WebGL context for all world scenes; it moves into the scene that is on screen.
  let WORLD = null, worldCanvas = null;
  const worldOf = () => {
    if (WORLD || !window.FilmWorld) return WORLD;
    worldCanvas = document.createElement('canvas'); worldCanvas.className = 'world-canvas';
    const w = F.world || {};
    try { WORLD = window.FilmWorld.create(worldCanvas, { name: (F.company && F.company.name) || '', ...w, look: w.look || 'night', width: 1920, height: 1080 }); }
    catch (e) { console.warn('world: WebGL is not available', e); WORLD = null; }
    return WORLD;
  };
  B.world = (s, root) => {
    const world = worldOf();
    if (!world) h('div', 'world-fallback abs', '', root);
    h('div', 'world-shade abs', '', root);
    const num = s.num ? pos(h('div', 'ch-num world-num abs', esc(s.num), root), L - 6, 590) : null;
    const title = pos(h('div', 'ch-title world-title abs', esc(s.title || ''), root), L, 700, R - L);
    fit(title, 92, 48, R - L, 140);
    const cap = s.caption ? pos(h('div', 'world-cap abs', esc(s.caption), root), L, 0, 1200) : null;
    if (cap) cap.style.top = 700 + title.scrollHeight + 22 + 'px';   // clear of the subtitles below
    return (t, d) => {
      if (world && !window.__probe) { if (worldCanvas.parentNode !== root) root.insertBefore(worldCanvas, root.firstChild); world.render(s.beat || 'open', t, d); }   // __probe: the renderer reads text only
      if (num) show(num, P(t, 0.3, 0.9), 0, -30);
      show(title, P(t, 0.6, 0.9), 30);
      if (cap) show(cap, P(t, 1.3, 0.8), 12);
    };
  };

  B.dossier = (s, root) => {
    const v = V('dossier', 'grid');
    const title = pos(h('div', 'title abs', esc(s.title), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const facts = (s.facts || []).slice(0, 6);
    let cards;
    if (v === 'ledger') {
      // a ledger: label on the left, the number on the right, one row per fact
      const rowH = Math.min(110, 620 / Math.max(1, facts.length));
      cards = facts.map((f, i) => {
        const c = pos(h('div', 'ds-row abs', '', root), L, 300 + i * rowH, R - L); c.style.height = rowH + 'px';
        h('div', 'ds-label', esc(f.label), c);
        if (f.note) h('div', 'ds-note ds-note-row', esc(f.note), c);
        const v2 = h('div', 'ds-value ds-value-row', esc(f.value), c);
        const tag = f.tag || 'known'; h('div', `chip ds-tag-row tag-${tag}`, esc(UI[tag] || tag), c);
        return { c, v: v2, f, scan: null };
      });
    } else if (v === 'hero') {
      // the first fact as the hero on the left, the rest as a list on the right
      cards = facts.map((f, i) => {
        if (i === 0) {
          const c = pos(h('div', 'ds-hero abs', '', root), L, 330, 780);
          h('div', 'ds-label', esc(f.label), c);
          const v2 = h('div', 'ds-value ds-value-hero', esc(f.value), c); fit(v2, 200, 60, 760);
          if (f.note) h('div', 'ds-note', esc(f.note), c);
          return { c, v: v2, f, scan: null };
        }
        const c = pos(h('div', 'ds-item abs', '', root), L + 900, 300 + (i - 1) * 124, R - L - 900);
        h('div', 'ds-label', esc(f.label), c);
        const v2 = h('div', 'ds-value ds-value-item', esc(f.value), c); fit(v2, 54, 28, R - L - 900);
        if (f.note) h('div', 'ds-note ds-note-item', esc(f.note), c);
        return { c, v: v2, f, scan: null };
      });
    } else {
      const cols = 3, cw = 520, gap = (R - L - cols * cw) / (cols - 1);
      cards = facts.map((f, i) => {
        const c = pos(h('div', 'ds-card', '', root), L + (i % cols) * (cw + gap), 320 + Math.floor(i / cols) * 290);
        h('div', 'ds-label', esc(f.label), c);
        const v2 = h('div', 'ds-value', esc(f.value), c);
        fit(v2, 76, 30, cw - 10);
        if (f.note) h('div', 'ds-note', esc(f.note), c);
        const tag = f.tag || 'known';
        h('div', `chip ds-tag tag-${tag}`, esc(UI[tag] || tag), c);
        return { c, v: v2, f, scan: h('div', 'ds-scan', '', c) };
      });
    }
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const span = Math.max(2, (sc.speechEnd || d) * 0.85 - 0.8);
      cards.forEach(({ c, v: val, f, scan }, i) => {
        const at = 0.8 + (i * span) / cards.length;
        const p = P(t, at, 0.7);
        show(c, p, v === 'ledger' ? 0 : 30, v === 'ledger' ? -30 : 0);
        val.textContent = countText(f.value, P(t, at, 1.4, ease.expo));
        if (scan) { const ps = clamp((t - at) / 0.9); scan.style.opacity = ps > 0 && ps < 1 ? 1 : 0; scan.style.top = ps * 230 + 'px'; }
      });
    };
  };

  const parseWhen = (w) => {
    if (typeof w === 'number') return w;
    const m = String(w).match(/(\d{4})(?:\s*[QК](\d))?/i);
    if (!m) return NaN;
    return +m[1] + (m[2] ? (+m[2] - 1) * 0.25 + 0.125 : 0.5);
  };

  B.timeline = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const evs = (s.events || []).map((e) => ({ ...e, x: parseWhen(e.when) }));
    const y0 = Math.floor(Math.min(...evs.map((e) => e.x), s.from ?? 9999));
    const y1 = Math.ceil(Math.max(...evs.map((e) => e.x), s.to ?? 0));
    const X = (y) => 160 + ((y - y0) / Math.max(1, y1 - y0)) * (W - 320);
    h('div', 'tl-axis', '', root);
    for (let y = y0; y <= y1; y++) {
      pos(h('div', 'tl-tickmark', '', root), X(y), 632);
      pos(h('div', 'tl-tick', y, root), X(y), 660);
    }
    const head = h('div', 'tl-head', '', root);
    const colorOf = (side) => (side === 'them' ? 'var(--them)' : side === 'you' ? 'var(--you)' : 'var(--amber)');
    const sorted = evs.sort((a, b) => a.x - b.x);
    const items = sorted.map((e) => {
      const el = h('div', 'tl-ev', `<b>${esc(e.label || e.when)}</b><span>${esc(e.text)}</span>`, root);
      el.style.color = colorOf(e.side);
      const x = Math.min(Math.max(X(e.x) - 8, 160), W - 160 - 340);
      pos(el, x, 0);
      const dot = pos(h('div', 'tl-dot', '', root), X(e.x), 634);
      dot.style.background = colorOf(e.side);
      return { e, el, dot, x, up: e.side !== 'you', hh: el.offsetHeight };
    });
    // greedy lanes: a card goes to the lane nearest the axis where it doesn't collide horizontally
    for (const up of [true, false]) {
      const group = items.filter((it) => it.up === up);
      const laneH = Math.max(0, ...group.map((it) => it.hh)) + 22;
      const right = [];
      group.forEach((it) => {
        let lane = right.findIndex((r) => it.x > r + 16);
        if (lane < 0) lane = right.length < 2 ? right.length : right.indexOf(Math.min(...right));
        right[lane] = it.x + 340;
        it.el.style.top = (up ? 612 - it.hh - lane * laneH : 708 + lane * laneH) + 'px';
      });
    }
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const t0 = 0.8, t1 = Math.max(t0 + 2, (sc.speechEnd || d) - 0.4);
      const yr = y0 + (y1 - y0) * P(t, t0, t1 - t0, (x) => x);
      head.style.left = X(yr) + 'px';
      head.style.opacity = P(t, 0.4, 0.5);
      sc.year = Math.floor(Math.min(yr, y1));
      items.forEach(({ e, el, dot }) => {
        const at = t0 + ((e.x - y0) / Math.max(1, y1 - y0)) * (t1 - t0) - 0.15;
        const p = P(t, at, 0.6);
        show(el, p, e.side === 'you' ? -18 : 18);
        dot.style.opacity = p;
        dot.style.transform = `scale(${0.4 + 0.6 * p})`;
      });
    };
  };

  B.race = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const years = s.years, a = s.you, b = s.them;
    const x0 = 200, x1 = s.gap_label ? 1150 : 1450, yTop = 330, yBot = 800;
    const maxV = Math.max(...a, ...b) * 1.12;
    const X = (i) => x0 + (i / (years.length - 1)) * (x1 - x0);
    const Y = (v) => yBot - (v / maxV) * (yBot - yTop);
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', W); svg.setAttribute('height', H); svg.setAttribute('class', 'rc-svg');
    root.appendChild(svg);
    const mk = (tag, attrs) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); svg.appendChild(e); return e; };
    years.forEach((y, i) => {
      mk('line', { x1: X(i), x2: X(i), y1: yTop - 10, y2: yBot, stroke: 'var(--faint)' });
      const tx = mk('text', { x: X(i), y: yBot + 40, fill: 'var(--muted)', 'font-family': 'var(--mono)', 'font-size': 20, 'text-anchor': 'middle' });
      tx.textContent = y;
    });
    mk('line', { x1: x0, x2: x1, y1: yBot, y2: yBot, stroke: 'var(--dim)', 'stroke-width': 2 });
    const unit = mk('text', { x: x0, y: yTop - 30, fill: 'var(--muted)', 'font-family': 'var(--mono)', 'font-size': 18, 'letter-spacing': 2 });
    unit.textContent = (s.metric || '').toUpperCase() + (s.unit ? ` · ${s.unit}` : '');
    const path = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ');
    const pa = mk('path', { d: path(a), fill: 'none', stroke: 'var(--you)', 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    const pb = mk('path', { d: path(b), fill: 'none', stroke: 'var(--them)', 'stroke-width': 5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    const la = pa.getTotalLength(), lb = pb.getTotalLength();
    [pa, pb].forEach((p, i) => { const l = i ? lb : la; p.style.strokeDasharray = l; p.style.strokeDashoffset = l; });
    const da = mk('circle', { r: 9, fill: 'var(--you)' }), db = mk('circle', { r: 9, fill: 'var(--them)' });
    const fmt = (v) => (s.format === 'int' ? Math.round(v) : (+v).toFixed(s.decimals ?? 0)) + (s.suffix || '');
    const ea = h('div', 'rc-end you', '', root), eb = h('div', 'rc-end them', '', root);
    const gap = s.gap_label ? h('div', 'rc-gap', `${esc(s.gap_label)}<small>${esc(s.gap_caption || '')}</small>`, root) : null;
    if (gap) { gap.style.top = '360px'; fit(gap, 150, 80, 440); }
    const interp = (arr, f) => { const i = Math.min(arr.length - 2, Math.floor(f)); const r = f - i; return arr[i] + (arr[i + 1] - arr[i]) * r; };
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const t0 = 1.0, t1 = Math.max(t0 + 3, (sc.speechEnd || d) - 1.2);
      const f = P(t, t0, t1 - t0, ease.inOut) * (years.length - 1);
      const frac = f / (years.length - 1);
      pa.style.strokeDashoffset = la * (1 - frac);
      pb.style.strokeDashoffset = lb * (1 - frac);
      const va = interp(a, f), vb = interp(b, f), cx = x0 + frac * (x1 - x0);
      da.setAttribute('cx', cx); da.setAttribute('cy', Y(va));
      db.setAttribute('cx', cx); db.setAttribute('cy', Y(vb));
      const vis = P(t, t0, 0.4);
      da.style.opacity = db.style.opacity = vis;
      pos(ea, cx + 26, Y(va)); pos(eb, cx + 26, Y(vb));
      ea.innerHTML = `<small>${esc(youName)}</small>${esc(fmt(va))}`;
      eb.innerHTML = `<small>${esc(themName)}</small>${esc(fmt(vb))}`;
      ea.style.opacity = eb.style.opacity = vis;
      sc.year = years[Math.min(years.length - 1, Math.round(f))];
      if (gap) show(gap, P(t, t1 + 0.1, 0.8), 30);
    };
  };

  B.scissors = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const hy = pos(h('div', 'sc-head you', esc(s.you_label || youName), root), 640, 300);
    const ht = pos(h('div', 'sc-head them', esc(s.them_label || themName), root), 1080, 300);
    const rows = (s.rows || []).slice(0, 5).map((r, i) => {
      const row = pos(h('div', 'sc-row', '', root), L, 350 + i * 112);
      row.style.width = R - L + 'px';
      const lab = h('div', 'sc-label', esc(r.label), row);
      fit(lab, 32, 20, 700, 80);
      const y = h('div', 'sc-you you', '', row), m = h('div', 'sc-them them', '', row);
      const q = h('div', 'sc-ratio', esc(r.ratio || ''), row);
      return { row, r, y, m, q };
    });
    const fmt = (v, r) => {
      const dec = r.decimals ?? (Math.abs(v) < 10 && v % 1 ? 1 : 0);
      let n = (+v).toFixed(dec);
      if (Math.abs(+v) >= 10000) n = n.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return (r.prefix || '') + n + (r.unit ? ' ' + r.unit : '');
    };
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      show(hy, P(t, 0.5, 0.6), 10); show(ht, P(t, 0.5, 0.6), 10);
      const span = Math.max(2, (sc.speechEnd || d) * 0.8 - 1);
      rows.forEach(({ row, r, y, m, q }, i) => {
        const at = 1.0 + (i * span) / rows.length;
        show(row, P(t, at, 0.6), 16);
        const p = P(t, at + 0.3, 1.6, ease.inOut);
        y.textContent = fmt(r.you, r);
        m.textContent = fmt(r.you + (r.them - r.you) * p, r);
        q.style.opacity = P(t, at + 1.6, 0.5);
      });
      if (s.year) sc.year = s.year;
    };
  };

  B.pillars = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const items = (s.items || []).slice(0, 5);
    const n = items.length, cw = 292, gap = (R - L - n * cw) / Math.max(1, n - 1);
    const cols = items.map((it, i) => {
      const c = pos(h('div', 'pl-col', '', root), L + i * (cw + gap), 330, cw);
      const bar = h('div', 'pl-bar', '<i></i>', c);
      h('div', 'pl-num', String(i + 1).padStart(2, '0'), c);
      const nm = h('div', 'pl-name', esc(it.name), c); fit(nm, 36, 24, cw, 84);
      const tx = h('div', 'pl-text', esc(it.attack), c); fit(tx, 30, 20, cw, 400);
      return { c, bar: bar.firstChild, nm, tx };
    });
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const span = Math.max(2, (sc.speechEnd || d) * 0.9 - 0.8);
      cols.forEach(({ c, bar, nm, tx }, i) => {
        const at = 0.7 + (i * span) / cols.length;
        show(c, P(t, at - 0.3, 0.5) * 0.35 + 0.65 * P(t, at, 0.6), 0);
        bar.style.width = 100 * P(t, at, 0.8, ease.inOut) + '%';
        show(tx, P(t, at + 0.2, 0.7), 20);
        nm.style.color = t > at ? 'var(--ink)' : 'var(--muted)';
      });
    };
  };

  B.signals = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title), root), L, 330, 600);
    fit(title, 64, 36, 600, 400);
    const items = (s.items || []).slice(0, 5);
    const cards = items.map((it) => {
      const c = h('div', 'sg-card', `<div class="sg-meta">${esc([it.when, it.from].filter(Boolean).join(' · '))}</div><div class="sg-text">${esc(it.text)}</div>`, root);
      return c;
    });
    const hs = cards.map((c) => c.offsetHeight + 18);
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const span = Math.max(2, (sc.speechEnd || d) * 0.85 - 0.6);
      // stack: newest at the bottom, the block is vertically centred on what's visible
      let shown = [];
      cards.forEach((c, i) => {
        const at = 0.6 + (i * span) / cards.length;
        const p = P(t, at, 0.6);
        shown.push({ c, p, h: hs[i] });
      });
      const total = shown.reduce((acc, x) => acc + x.h * x.p, 0);
      let y = 560 - total / 2;
      shown.forEach(({ c, p, h: hh }) => {
        c.style.top = y + 'px';
        c.style.opacity = p;
        c.style.transform = `translateX(${(1 - p) * 120}px)`;
        y += hh * p;
      });
    };
  };

  B.case = (s, root) => {
    const kk = pos(h('div', 'kicker abs', esc(s.kicker || ''), root), L, 230);
    const nm = pos(h('div', 'cs-name abs', esc(s.name), root), L, 290);
    fit(nm, 118, 48, Math.min(960, 1180 - L - 40));
    const wh = pos(h('div', 'cs-where abs', esc([s.where, s.year].filter(Boolean).join(' · ')), root), L, 430);
    const hd = pos(h('div', 'cs-head abs', esc(s.headline), root), L, 490, 920);
    fit(hd, 40, 26, 920, 300);
    const below = V('case', 'right') === 'below';
    if (below) { hd.style.width = (R - L) + 'px'; fit(hd, 40, 26, R - L, 140); }
    const stats = (s.stats || []).slice(0, 3).map((st, i) => {
      const el = below ? pos(h('div', 'cs-stat cs-stat-below', `<div class="v"></div><div class="l">${esc(st.label)}</div>`, root), L + i * ((R - L) / 3), 690)
        : pos(h('div', 'cs-stat', `<div class="v"></div><div class="l">${esc(st.label)}</div>`, root), 1180, 250 + i * 190);
      const v = el.querySelector('.v');
      v.textContent = st.value; fit(v, 96, 44, 600);
      return { el, v, st };
    });
    const src = s.source ? h('div', 'cs-src', `${esc(UI.source)}: ${esc(s.source)}`, root) : null;
    return (t, d, sc) => {
      show(kk, P(t, 0.1, 0.6), 10);
      show(nm, P(t, 0.3, 0.9), 40);
      show(wh, P(t, 0.7, 0.6), 10);
      show(hd, P(t, 1.0, 0.8), 20);
      const span = Math.max(1.5, (sc.speechEnd || d) * 0.75 - 1.2);
      stats.forEach(({ el, v, st }, i) => {
        const at = 1.4 + (i * span) / Math.max(1, stats.length);
        show(el, P(t, at, 0.6), 24);
        v.textContent = countText(st.value, P(t, at, 1.3, ease.expo));
      });
      if (src) src.style.opacity = P(t, 1.2, 0.8) * 0.9;
    };
  };

  B.fork = (s, root) => {
    const div = pos(h('div', 'fk-div', '', root), 959, 190);
    const mkSide = (side, x, color) => {
      const box = pos(h('div', 'fk-side', '', root), x, 250, 700);
      const tt = h('div', 'fk-title', esc(side.title), box); tt.style.color = color;
      fit(tt, 66, 36, 700, 160);
      const pts = (side.points || []).slice(0, 5).map((p) => h('div', 'fk-pt', esc(p), box));
      return { box, tt, pts };
    };
    const A = mkSide(s.left || {}, L, 'var(--muted)');
    const Bs = mkSide(s.right || {}, 1060, 'var(--ink)');
    A.pts.forEach((p) => (p.style.color = 'var(--muted)'));
    return (t, d, sc) => {
      div.style.height = 640 * P(t, 0.2, 1.0, ease.inOut) + 'px';
      show(A.tt, P(t, 0.6, 0.7), 20); show(Bs.tt, P(t, 0.9, 0.7), 20);
      const all = [];
      const n = Math.max(A.pts.length, Bs.pts.length);
      for (let i = 0; i < n; i++) { if (A.pts[i]) all.push(A.pts[i]); if (Bs.pts[i]) all.push(Bs.pts[i]); }
      const span = Math.max(2, (sc.speechEnd || d) * 0.85 - 1.4);
      all.forEach((el, i) => show(el, P(t, 1.4 + (i * span) / all.length, 0.6), 16));
    };
  };

  B.questions = (s, root) => {
    if (V('questions', 'list') === 'cards') {
      // all questions stay on screen as numbered cards; the one being read lights up
      const items = (s.items || []).slice(0, 4), n = Math.max(1, items.length), gap = 36, w = (R - L - gap * (n - 1)) / n;
      const cards = items.map((q, i) => {
        const c = pos(h('div', 'q-card abs', '', root), L + i * (w + gap), 300, w);
        h('div', 'q-idx', String(i + 1).padStart(2, '0'), c);
        const tx = h('div', 'q-text q-text-card', esc(q), c); tx.style.marginTop = '22px'; fit(tx, 46, 26, w - 40, 420);
        return c;
      });
      return (t, d, sc) => {
        const slots = (sc.slots && sc.slots.length === cards.length) ? sc.slots : cards.map((_, i) => (i * d) / cards.length);
        cards.forEach((c, i) => { const p = P(t, slots[i] + 0.1, 0.6); const on = t >= slots[i] && (i === cards.length - 1 || t < slots[i + 1]);
          show(c, p, 30); c.classList.toggle('on', on); });
      };
    }
    const qs = (s.items || []).slice(0, 6).map((q, i, arr) => {
      const box = pos(h('div', 'abs', '', root), L, 0, R - L);
      h('div', 'q-idx', `${String(i + 1).padStart(2, '0')} / ${String(arr.length).padStart(2, '0')}`, box);
      const tx = h('div', 'q-text', esc(q), box); tx.style.marginTop = '26px';
      fit(tx, 76, 40, R - L, 420);
      box.style.top = 540 - box.offsetHeight / 2 - 30 + 'px';
      return box;
    });
    return (t, d, sc) => {
      const slots = (sc.slots && sc.slots.length === qs.length) ? sc.slots : qs.map((_, i) => (i * d) / qs.length);
      qs.forEach((box, i) => {
        const a = slots[i], b = i < qs.length - 1 ? slots[i + 1] : d + 1;
        const p = P(t, a + 0.1, 0.7) * (1 - P(t, b - 0.45, 0.4));
        show(box, p, 30);
      });
    };
  };

  B.end = (s, root) => {
    const v = V('end', 'left');
    const block = v === 'block' ? pos(h('div', 'end-block abs', '', root), 0, 250) : null;
    if (block) { block.style.width = '1920px'; block.style.height = '420px'; }
    const tt = pos(h('div', 'end-title abs', esc(s.title), root), L, 330, R - L);
    if (v === 'center') tt.style.textAlign = 'center';
    fit(tt, 104, 52, R - L, 300);
    if (v === 'block') tt.style.top = 250 + (420 - tt.scrollHeight) / 2 + 'px';
    const sb = s.subtitle ? pos(h('div', 'end-sub abs', esc(s.subtitle), root), L, 0, v === 'center' ? R - L : 1400) : null;
    if (sb) { sb.style.top = (v === 'block' ? 700 : 330 + tt.scrollHeight + 36) + 'px'; if (v === 'center') sb.style.textAlign = 'center'; }
    const cta = s.cta ? pos(h('div', 'end-cta abs', esc(s.cta), root), L, v === 'block' ? 800 : 760, v === 'center' ? R - L : null) : null;
    if (cta && v === 'center') cta.style.textAlign = 'center';
    return (t) => {
      if (block) block.style.transform = `scaleX(${P(t, 0.0, 0.8, ease.inOut)})`;
      show(tt, P(t, 0.3, 1.0), 40);
      if (sb) show(sb, P(t, 1.0, 0.8), 16);
      if (cta) show(cta, P(t, 1.8, 0.8), 10);
    };
  };

  // ---------- map: dots on a dark map of the land (outlines only, no borders) ----------
  // Land outlines come from player/map-data.js (Natural Earth, public domain). Points are placed with the same
  // Natural Earth projection formula that built the outlines (d3-geo's geoNaturalEarth1, matches to 0.0000 px).
  const MAPD = window.MAP_DATA;
  const natEarth = (lon, lat) => {
    const l = (lon * Math.PI) / 180, p = (lat * Math.PI) / 180, p2 = p * p, p4 = p2 * p2;
    return [
      MAPD.S * l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
      -MAPD.S * p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
    ];
  };
  const SVGNS = 'http://www.w3.org/2000/svg';
  const sv = (tag, attrs, parent) => {
    const el = document.createElementNS(SVGNS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  };

  B.map = (s, root) => {
    const colorOf = (side) => (side === 'them' ? 'var(--them)' : side === 'you' ? 'var(--you)' : 'var(--amber)');
    const title = s.title ? pos(h('div', 'title abs', esc(s.title), root), L, 150, R - L) : null;
    if (title) fit(title, 64, 40, R - L);
    const pts = (s.points || []).map((p) => ({ ...p, side: p.side || 'market', label: p.label || (p.side === 'you' ? youName : '') }));
    // fit the view to the points: keep the map's scale readable (no more than ~3x the whole-world fit, outlines are 1:110m)
    const [bx0, by0] = MAPD.bounds[0], [bx1, by1] = MAPD.bounds[1];
    const kWorld = Math.min(1500 / (bx1 - bx0), 600 / (by1 - by0));
    const raw = pts.map((p) => natEarth(p.lon, p.lat));
    let k = kWorld, cx = (bx0 + bx1) / 2, cy = (by0 + by1) / 2;
    if (raw.length && s.view !== 'world') {
      const xs = raw.map((r) => r[0]), ys = raw.map((r) => r[1]);
      const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
      k = Math.min(1320 / Math.max(maxX - minX, 40), 510 / Math.max(maxY - minY, 40), kWorld * 3);
      cx = (minX + maxX) / 2; cy = (minY + maxY) / 2;
    }
    const tx = 960 - k * cx, ty = 585 - k * cy;
    const X = (r) => tx + k * r[0], Y = (r) => ty + k * r[1];

    const svg = sv('svg', { class: 'mp-svg', width: W, height: 1080, viewBox: `0 0 ${W} 1080` }, root);
    if (title) root.appendChild(title);   // the title sits above the land
    const mapG = sv('g', {}, svg);
    const land = sv('g', { transform: `translate(${tx} ${ty}) scale(${k})` }, mapG);
    const grat = sv('g', { fill: 'none', stroke: 'var(--grat)', 'stroke-width': 1 }, land);
    const line = (coords) => sv('path', { d: 'M' + coords.map((c) => natEarth(c[0], c[1]).map((v) => v.toFixed(1)).join(',')).join('L'), 'vector-effect': 'non-scaling-stroke' }, grat);
    for (let lon = -180; lon <= 180; lon += 30) line(Array.from({ length: 29 }, (_, i) => [lon, -60 + i * 5]));
    for (const lat of [-60, -30, 0, 30, 60]) line(Array.from({ length: 73 }, (_, i) => [-180 + i * 5, lat]));
    sv('path', { d: MAPD.land, fill: 'var(--land)', stroke: 'var(--coast)', 'stroke-width': 1, 'stroke-linejoin': 'round', 'vector-effect': 'non-scaling-stroke' }, land);

    // routes (optional): arcs between two points, drawn on, with a pulse travelling along them
    const routes = (s.routes || []).filter((r) => pts[r.from] && pts[r.to]).map((r) => {
      const a = raw[r.from], b = raw[r.to];
      const ax = X(a), ay = Y(a), bx = X(b), by = Y(b);
      const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
      let nx = dy / len, ny = -dx / len; if (ny > 0) { nx = -nx; ny = -ny; }
      const c = [(ax + bx) / 2 + nx * 0.22 * len, (ay + by) / 2 + ny * 0.22 * len];
      const col = colorOf(pts[r.from].side);
      const path = sv('path', { d: `M${ax},${ay}Q${c[0]},${c[1]} ${bx},${by}`, fill: 'none', stroke: col, 'stroke-width': 3, 'stroke-linecap': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1, opacity: 0.9 }, svg);
      const dot = sv('circle', { r: 6, fill: col, opacity: 0 }, svg);
      return { r, path, dot, total: path.getTotalLength() };
    });

    // dots and rings
    const items = pts.map((p, i) => {
      const x = X(raw[i]), y = Y(raw[i]), rad = p.side === 'you' ? 15 : p.side === 'them' ? 11 : 10, col = colorOf(p.side);
      const ring = sv('circle', { cx: x, cy: y, r: rad, fill: 'none', stroke: col, 'stroke-width': 2, opacity: 0 }, svg);
      const ring2 = p.side === 'you' ? sv('circle', { cx: x, cy: y, r: rad + 14, fill: 'none', stroke: col, 'stroke-width': 2, opacity: 0 }, svg) : null;
      const dot = sv('circle', { cx: x, cy: y, r: rad, fill: p.side === 'you' ? 'var(--ink)' : col, opacity: 0 }, svg);
      const el = h('div', 'mp-lab', `<b>${esc(p.label)}</b>${p.sub ? `<span style="color:${col}">${esc(p.sub)}</span>` : ''}`, root);
      return { p, x, y, rad, ring, ring2, dot, el, w: el.offsetWidth, hh: el.offsetHeight };
    });
    // label placement: eight candidate spots around each dot, take the one that overlaps least
    const taken = [{ x: L - 20, y: 130, w: R - L + 40, h: 110 }, ...items.map((it) => ({ x: it.x - 22, y: it.y - 22, w: 44, h: 44 }))];
    const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    [...items].sort((a, b) => (b.p.side === 'you') - (a.p.side === 'you')).forEach((it) => {
      const { x, y, w, hh } = it;
      const cands = [[x + 28, y - hh / 2, 'l'], [x - 28 - w, y - hh / 2, 'r'], [x + 20, y - hh - 10, 'l'], [x + 20, y + 14, 'l'], [x - 20 - w, y - hh - 10, 'r'], [x - 20 - w, y + 14, 'r'], [x - w / 2, y - hh - 26, 'c'], [x - w / 2, y + 28, 'c']];
      // crowded areas: farther spots, tied back to the dot by the leader tick below
      for (const d of [80, 140]) cands.push([x + d, y - hh / 2, 'l'], [x - d - w, y - hh / 2, 'r'], [x + d * 0.7, y - hh - d * 0.7, 'l'], [x + d * 0.7, y + d * 0.7, 'l'], [x - d * 0.7 - w, y - hh - d * 0.7, 'r'], [x - d * 0.7 - w, y + d * 0.7, 'r'], [x - w / 2, y - hh - d, 'c'], [x - w / 2, y + d, 'c']);
      let best = null;
      for (const [cx2, cy2, al] of cands) {
        const box = { x: cx2, y: cy2, w, h: hh };
        const out = Math.max(0, 60 - box.x) + Math.max(0, box.x + w - 1860) + Math.max(0, 250 - box.y) + Math.max(0, box.y + hh - 900);
        const sc = taken.reduce((a, t2) => a + overlap(box, t2), 0) + out * 4000;
        if (!best || sc < best.sc) best = { sc, box, al };
        if (sc === 0) break;
      }
      pos(it.el, best.box.x, best.box.y); it.el.style.textAlign = best.al === 'r' ? 'right' : best.al === 'c' ? 'center' : 'left';
      taken.push(best.box);
      // leader tick: from the dot's edge to the nearest point of its label, so a dot and its label can never be confused
      const nx = clamp(x, best.box.x, best.box.x + w), ny = clamp(y, best.box.y, best.box.y + hh);
      const dd = Math.hypot(nx - x, ny - y) || 1, ux = (nx - x) / dd, uy = (ny - y) / dd, r0 = it.rad + 4;
      if (dd > r0 + 2) it.lead = sv('line', { x1: x + ux * r0, y1: y + uy * r0, x2: nx - ux * 4, y2: ny - uy * 4, stroke: 'var(--leader)', 'stroke-width': 1.5, opacity: 0 }, svg);
    });

    return (t, d, sc) => {
      if (title) show(title, P(t, 0.1, 0.8), 20);
      mapG.style.opacity = P(t, 0.15, 1.1);
      const span = Math.max(1, (sc.speechEnd || d - 1) * 0.85 - 1.2);
      const gap = clamp(span / Math.max(1, items.length), 0.55, 1.6);
      const at = (i) => 1.2 + i * gap;
      items.forEach((it, i) => {
        const p = P(t, at(i), 0.45), me = it.p.side;
        it.dot.setAttribute('r', (it.rad * (0.3 + 0.7 * p)).toFixed(2)); it.dot.setAttribute('opacity', p);
        show(it.el, p, 10);
        if (it.lead) it.lead.setAttribute('opacity', (0.9 * p).toFixed(3));
        const ph = t > at(i) ? ((t - at(i)) % 2.6) / 2.6 : 1;
        if (me !== 'market') { it.ring.setAttribute('r', (it.rad * (1 + 2.6 * ph)).toFixed(2)); it.ring.setAttribute('opacity', (0.6 * (1 - ph) * p).toFixed(3)); }
        if (it.ring2) it.ring2.setAttribute('opacity', (0.85 * p).toFixed(3));
      });
      routes.forEach((r) => {
        const rt = Math.max(at(r.r.from), at(r.r.to)) + 0.2;
        const pr = P(t, rt, 1.5, ease.inOut);
        r.path.setAttribute('stroke-dashoffset', (1 - pr).toFixed(4));
        if (pr >= 1) {
          const u = ((t - rt - 1.5) % 2.4) / 2.4, pt = r.path.getPointAtLength(Math.max(0, u) * r.total);
          r.dot.setAttribute('cx', pt.x); r.dot.setAttribute('cy', pt.y); r.dot.setAttribute('opacity', 0.95);
        } else r.dot.setAttribute('opacity', 0);
      });
    };
  };


  // three waves over time: what changes around you, then a neighbour adapts, then an AI-native company built from scratch.
  // Each wave is an S-curve, each taller than the last: the picture of inevitability.
  B.waves = (s, root) => {
    const title = s.title ? pos(h('div', 'title abs', esc(s.title), root), L, 150, R - L) : null;
    if (title) fit(title, 64, 40, R - L);
    const ws = (s.waves || []).slice(0, 3);
    const y0 = Math.floor(s.from ?? Math.min(...ws.map((w) => parseWhen(w.from)))), y1 = Math.ceil(s.to ?? Math.max(...ws.map((w) => parseWhen(w.to))));
    const x0 = 820, x1 = 1740, yBase = 840, yTop = 360;
    const X = (y) => x0 + ((y - y0) / Math.max(1, y1 - y0)) * (x1 - x0);
    const sideOf = (w, i) => w.side || ['market', 'neighbour', 'them'][i] || 'them';
    const colorOf = (side) => (side === 'them' ? 'var(--them)' : side === 'neighbour' ? 'var(--you)' : side === 'you' ? 'var(--ink)' : 'var(--amber)');
    const svg = sv('svg', { class: 'mp-svg', width: W, height: H, viewBox: `0 0 ${W} ${H}` }, root);
    for (let y = y0; y <= y1; y++) {
      sv('line', { x1: X(y), x2: X(y), y1: yTop - 20, y2: yBase, stroke: 'var(--faint)', 'stroke-width': 1 }, svg);
      const tx = sv('text', { x: X(y), y: yBase + 44, fill: 'var(--muted)', 'font-family': 'var(--mono)', 'font-size': 22, 'text-anchor': 'middle' }, svg);
      tx.textContent = y;
    }
    sv('line', { x1: x0, x2: x1, y1: yBase, y2: yBase, stroke: 'var(--dim)', 'stroke-width': 2 }, svg);
    const heights = [0.3, 0.6, 1.0];
    const clipId = 'wv' + Math.random().toString(36).slice(2, 8);
    const clip = sv('clipPath', { id: clipId }, sv('defs', {}, svg));
    const clipRect = sv('rect', { x: 0, y: 0, width: 0, height: H }, clip);
    const g = sv('g', { 'clip-path': `url(#${clipId})` }, svg);
    const items = ws.map((w, i) => {
      const a = parseWhen(w.from), b = parseWhen(w.to), mid = (a + b) / 2, k = 8 / Math.max(0.5, b - a);
      const amp = (w.height ?? heights[i] ?? 1) * (yBase - yTop), col = colorOf(sideOf(w, i));
      const curve = (yr) => yBase - amp / (1 + Math.exp(-k * (yr - mid)));
      const pts = [];
      for (let x = x0; x <= x1; x += 8) pts.push([x, curve(y0 + ((x - x0) / (x1 - x0)) * (y1 - y0))]);
      const line = 'M' + pts.map((q) => q[0] + ',' + q[1].toFixed(1)).join('L');
      sv('path', { d: line + `L${x1},${yBase}L${x0},${yBase}Z`, fill: col, opacity: 0.1 }, g);
      sv('path', { d: line, fill: 'none', stroke: col, 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
      // numbered marker on the steep part of the curve, matching the legend on the left
      const mx = X(mid), my = curve(mid);
      const mk = sv('g', { opacity: 0 }, svg);
      sv('circle', { cx: mx, cy: my, r: 21, fill: 'var(--bg)', stroke: col, 'stroke-width': 3 }, mk);
      const mt = sv('text', { x: mx, y: my + 8, fill: col, 'font-family': 'var(--mono)', 'font-size': 22, 'font-weight': 600, 'text-anchor': 'middle' }, mk);
      mt.textContent = i + 1;
      const lab = pos(h('div', 'wv-lab', `<i style="color:${col}">${i + 1}</i><b>${esc(w.title)}</b>${w.text ? `<span>${esc(w.text)}</span>` : ''}${w.when ? `<em style="color:${col}">${esc(w.when)}</em>` : ''}`, root), L, 330 + i * 175, 560);
      return { w, a, mid, lab, mk };
    });
    const nowY = s.now != null ? parseWhen(s.now) : null;
    const nowLine = nowY != null ? sv('line', { x1: X(nowY), x2: X(nowY), y1: yTop - 30, y2: yBase, stroke: 'var(--ink)', 'stroke-width': 2, 'stroke-dasharray': '6 8' }, svg) : null;
    const nowLab = nowY != null ? pos(h('div', 'wv-now', esc(s.now_label || UI.now), root), X(nowY) + 12, yTop - 44) : null;
    const head = sv('line', { x1: 0, x2: 0, y1: yTop - 20, y2: yBase, stroke: 'var(--ink)', 'stroke-width': 2, opacity: 0 }, svg);
    return (t, d, sc) => {
      if (title) show(title, P(t, 0.1, 0.8), 20);
      if (nowLine) { nowLine.setAttribute('opacity', P(t, 0.4, 0.6)); show(nowLab, P(t, 0.5, 0.6), 8); }
      const t0 = 1.0, t1 = Math.max(t0 + 4, (sc.speechEnd || d) - 0.8);
      const f = P(t, t0, t1 - t0, (x) => x), yr = y0 + f * (y1 - y0), hx = X(yr);
      clipRect.setAttribute('width', hx);
      head.setAttribute('x1', hx); head.setAttribute('x2', hx); head.setAttribute('opacity', t > t0 && f < 1 ? 0.5 : 0);
      sc.year = Math.floor(Math.min(yr, y1));
      items.forEach((it) => {
        const at = t0 + ((it.a - y0) / Math.max(1, y1 - y0)) * (t1 - t0);
        show(it.lab, P(t, at, 0.7), 18);
        it.mk.setAttribute('opacity', yr >= it.mid ? P(t, t0 + ((it.mid - y0) / Math.max(1, y1 - y0)) * (t1 - t0), 0.4) : 0);
      });
    };
  };

  // one concrete moment from the future: a message the viewer will one day receive, typed out while the voice reads it
  B.moment = (s, root) => {
    const k = pos(h('div', 'kicker abs', esc([s.when, s.channel].filter(Boolean).join(' · ')), root), L + 200, 250);
    const card = pos(h('div', 'mo-card abs', '', root), L + 200, 310, R - L - 400);
    const head = h('div', 'mo-from', esc(s.from || ''), card);
    const body = h('div', 'mo-text', '', card);
    const caret = h('span', 'mo-caret', '', card);
    const full = String(s.text || '');
    body.textContent = full; fit(body, 52, 30, R - L - 400 - 120, 380); card.style.minHeight = card.offsetHeight + 'px'; body.textContent = '';
    const note = s.note ? pos(h('div', 'mo-note abs', esc(s.note), root), L + 200, 0, R - L - 400) : null;
    if (note) note.style.top = 310 + card.offsetHeight + 40 + 'px';
    return (t, d, sc) => {
      show(k, P(t, 0.1, 0.6), 10);
      show(card, P(t, 0.3, 0.8), 30);
      const t0 = 1.0, dur = Math.max(2, Math.min(full.length / 16, ((sc.speechEnd || d) - 1.6)));
      const n = Math.round(full.length * P(t, t0, dur, (x) => x));
      if (body.textContent.length !== n) body.textContent = full.slice(0, n);
      body.appendChild(caret);
      caret.style.opacity = n < full.length || Math.floor(t * 2) % 2 === 0 ? 1 : 0;
      if (note) show(note, P(t, t0 + dur + 0.4, 0.8), 12);
    };
  };


  // who can come: attacker types for this company, with timing and likelihood; the film's deep dives are marked as focus
  B.attackers = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const items = (s.items || []).slice(0, 8);
    const cols = items.length > 6 ? 4 : 3, gap = 28, cw = (R - L - (cols - 1) * gap) / cols, rows = Math.ceil(items.length / cols);
    const ch = rows > 1 ? 290 : 360;
    const lvl = { low: 1, medium: 2, high: 3 };
    const cards = items.map((it, i) => {
      const c = pos(h('div', 'at-card' + (it.focus ? ' focus' : ''), '', root), L + (i % cols) * (cw + gap), 290 + Math.floor(i / cols) * (ch + gap), cw);
      c.style.height = ch + 'px';
      const n = lvl[it.likelihood] || 0;
      h('div', 'at-head', `<span class="at-num">${String(i + 1).padStart(2, '0')}</span><span class="at-meter">${[1, 2, 3].map((k) => `<i class="${k <= n ? 'on' : ''}"></i>`).join('')}</span>`, c);
      const nm = h('div', 'at-name', esc(it.type), c); fit(nm, 34, 22, cw - 48, 84);
      const tx = h('div', 'at-text', esc(it.text || ''), c); fit(tx, 24, 17, cw - 48, ch - 170);
      h('div', 'at-foot', `${it.when ? `<b>${esc(it.when)}</b>` : ''}${it.takes ? `<span>${esc(it.takes)}</span>` : ''}`, c);
      return c;
    });
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const span = Math.max(2, (sc.speechEnd || d) * 0.85 - 1);
      cards.forEach((c, i) => show(c, P(t, 0.8 + (i * span) / cards.length, 0.6), 24));
    };
  };

  // why they are cheaper: what one unit of price is made of, at you and at an AI-native company
  B.anatomy = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const rows = (s.rows || []).slice(0, 6);
    const sum = (k) => rows.reduce((a, r) => a + (+r[k] || 0), 0);
    const tu = sum('you'), tt = sum('them');
    const yTop = 300, yBot = 880, colW = 230, xa = 560, xb = 1010;
    const scale = (yBot - yTop) / Math.max(tu, tt);
    const head = (x, txt, cls) => pos(h('div', 'an-head ' + cls, esc(txt), root), x, yTop - 46, colW);
    const ha = head(xa, s.you_label || youName, 'you'), hb = head(xb, s.them_label || themName, 'them');
    const segA = [], segB = [], labs = [];
    const shades = ['.92', '.72', '.56', '.42', '.30', '.20'];
    rows.forEach((r, i) => {
      const mk = (x, cls) => { const e = pos(h('div', 'an-seg ' + cls, '', root), x, 0, colW); return e; };
      const a = mk(xa, 'you'), b = mk(xb, 'them');
      a.style.opacity = b.style.opacity = 0;
      a.style.setProperty('--sh', r.margin ? 1 : shades[i] || '.2'); b.style.setProperty('--sh', r.margin ? 1 : shades[i] || '.2');
      if (r.margin) { a.classList.add('margin'); b.classList.add('margin'); }
      a.innerHTML = `<span>${esc(String(r.you))}</span>`; b.innerHTML = `<span>${esc(String(r.them))}</span>`;
      const lab = pos(h('div', 'an-lab', esc(r.label), root), L, 0, xa - L - 30);
      segA.push(a); segB.push(b); labs.push(lab);
    });
    const unit = s.unit ? pos(h('div', 'an-unit', esc(s.unit), root), xa, yBot + 18, xb + colW - xa) : null;
    const pct = Math.round((tt / tu - 1) * 100);
    const gap = pos(h('div', 'rc-gap an-gap', `${esc(s.gap_label || ((pct > 0 ? '+' : '−') + Math.abs(pct) + '%'))}<small>${esc(s.gap_caption || '')}</small>`, root), 0, 380);
    gap.style.right = '120px'; gap.style.left = 'auto'; fit(gap, 150, 80, 470);
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      show(ha, P(t, 0.4, 0.6), 10); show(hb, P(t, 0.4, 0.6), 10);
      const span = Math.max(2, (sc.speechEnd || d) * 0.55 - 1);
      const morph = P(t, 1.2 + span, Math.max(1.5, (sc.speechEnd || d) * 0.25), ease.inOut);
      let ya = yBot, yb = yBot;
      rows.forEach((r, i) => {
        const p = P(t, 1.0 + (i * span) / rows.length, 0.6);
        const ha2 = (+r.you || 0) * scale * p, hb2 = ((+r.you || 0) + ((+r.them || 0) - (+r.you || 0)) * morph) * scale * p;
        ya -= ha2; yb -= hb2;
        Object.assign(segA[i].style, { top: ya + 'px', height: Math.max(0, ha2 - 3) + 'px', opacity: p });
        Object.assign(segB[i].style, { top: yb + 'px', height: Math.max(0, hb2 - 3) + 'px', opacity: p });
        segB[i].firstChild.textContent = String(Math.round((+r.you || 0) + ((+r.them || 0) - (+r.you || 0)) * morph));
        labs[i]._y = ya + ha2 / 2 - 18; labs[i].style.opacity = p;
        segA[i].classList.toggle('thin', ha2 < 30); segB[i].classList.toggle('thin', hb2 < 30);
      });
      let prev = Infinity;
      labs.forEach((lab) => { const y = Math.min(lab._y, prev - 36); lab.style.top = y + 'px'; prev = y; });
      if (unit) show(unit, P(t, 1.0, 0.6), 0);
      show(gap, P(t, 1.2 + span + 0.6 * Math.max(1.5, (sc.speechEnd || d) * 0.25), 0.8), 30);
    };
  };

  // stages of AI maturity as a staircase; markers show where you, the neighbour and the newco stand (a marker may move)
  B.ladder = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const st = (s.stages || []).slice(0, 6), n = st.length || 1;
    const x0 = L, w = (R - L) / n, yBase = 905, yLow = 700, yHigh = 420;
    const steps = st.map((g, i) => {
      const top = yLow - (n > 1 ? (i * (yLow - yHigh)) / (n - 1) : 0);
      const el = pos(h('div', 'ld-step', `<b>${i + 1}</b><span>${esc(g.name)}</span>${g.text ? `<em>${esc(g.text)}</em>` : ''}`, root), x0 + i * w, top, w - 8);
      el.style.height = (yBase - top) + 'px';
      return { el, top, cx: x0 + i * w + (w - 8) / 2 };
    });
    const colorOf = (side) => (side === 'them' ? 'var(--them)' : side === 'neighbour' ? 'var(--you)' : 'var(--ink)');
    const marks = (s.markers || []).map((m) => {
      const el = h('div', 'ld-mark', `<b style="color:${colorOf(m.side)}">${esc(m.label)}</b>${m.when ? `<span>${esc(m.when)}</span>` : ''}<i style="background:${colorOf(m.side)}"></i>`, root);
      el.style.width = (w - 16) + 'px';
      return { m, el, hh: el.offsetHeight };
    });
    // stack markers that stand on the same step
    const slot = {};
    marks.forEach((k) => { const sIdx = Math.max(0, Math.min(n - 1, k.m.to ?? k.m.stage ?? 0)); k.row = (slot[sIdx] = (slot[sIdx] ?? -1) + 1); });
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const span = Math.max(2, (sc.speechEnd || d) * 0.45);
      steps.forEach((g, i) => show(g.el, P(t, 0.6 + (i * span) / n * 0.6, 0.5), 30));
      const mt0 = 0.6 + span * 0.7, mspan = Math.max(2, (sc.speechEnd || d) - mt0 - 1);
      marks.forEach((k, i) => {
        const at = mt0 + (i * mspan) / Math.max(1, marks.length);
        const from = Math.max(0, Math.min(n - 1, k.m.from ?? k.m.stage ?? 0)), to = Math.max(0, Math.min(n - 1, k.m.to ?? k.m.stage ?? 0));
        const mv = P(t, at + 0.5, 1.4, ease.inOut), f = from + (to - from) * mv;
        const i0 = Math.floor(f), fr = f - i0, a = steps[i0], b = steps[Math.min(n - 1, i0 + 1)];
        const cx = a.cx + (b.cx - a.cx) * fr, top = a.top + (b.top - a.top) * fr;
        pos(k.el, cx - (w - 16) / 2, top - k.hh - 4 - k.row * (k.hh + 8));
        show(k.el, P(t, at, 0.5), -20);
      });
    };
  };

  // what the owner is probably thinking, and what answers it: the belief is named first, then met with a fact
  // the customer's path (architecture C): one purchase as a row of steps; each step says who decides it.
  // The same scene comes back later with other owners: the steps that changed hands are the film's argument.
  B.path = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const steps = (s.steps || []).slice(0, 6), n = Math.max(1, steps.length);
    const gap = 26, w = (R - L - gap * (n - 1)) / n, y = 430;
    const line = pos(h('div', 'pa-line abs', '', root), L + w / 2, y + 2, 0);
    const dot = pos(h('div', 'pa-dot abs', '', root), L + w / 2 - 14, y - 12);
    const cards = steps.map((st, i) => {
      const x = L + i * (w + gap);
      const node = pos(h('div', 'pa-node abs side-' + (st.owner || 'you'), '', root), x + w / 2 - 9, y - 6);
      const c = pos(h('div', 'pa-card abs side-' + (st.owner || 'you'), '', root), x, y + 50, w);
      c.innerHTML = `<div class="pa-when">${esc(st.when || '')}</div><div class="pa-label">${esc(st.label || '')}</div><div class="pa-text">${esc(st.text || '')}</div>` +
        (st.who ? `<div class="pa-who">${esc(st.who)}</div>` : '');
      return { node, c };
    });
    const note = s.note ? pos(h('div', 'pa-note abs', esc(s.note), root), L, 900, R - L) : null;
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const span = Math.max(2, (sc.speechEnd || d) - 1.4), each = span / n;
      const prog = clamp((t - 0.9) / span);
      line.style.width = (R - L - w) * prog + 'px';
      dot.style.left = (L + w / 2 - 14 + (R - L - w) * prog) + 'px'; dot.style.opacity = P(t, 0.8, 0.4);
      cards.forEach((k, i) => { const at = 0.9 + i * each; show(k.node, P(t, at, 0.3), 0); show(k.c, P(t, at + 0.1, 0.6), 18); });
      if (note) show(note, P(t, 0.9 + span * 0.85, 0.6), 10);
    };
  };

  // the crowd ("zoo"): every segment of the market is attacked by every kind of player at once, many of each.
  // Small players bite slices everywhere, AI-native newcomers take big pieces, a success is copied; the company's
  // share in each segment (its colour, from the bottom) shrinks until no safe niche is left. Deterministic schedule.
  B.swarm = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const KD = F.language === 'ru'
      ? ['Оптимизируют свой бизнес', 'Перестраивают процессы', 'Переходят на AI-first', 'AI-native с нуля']
      : ['Optimise their business', 'Rebuild their processes', 'Go AI-first', 'AI-native from scratch'];
    const kinds = (s.kinds || KD).slice(0, 4);
    const counts = (s.counts || [18, 11, 6, 3]).slice(0, 4);
    const bite = [0.012, 0.026, 0.05, 0.11], onset = [0.0, 0.15, 0.32, 0.45], SH = ['circle', 'square', 'tri', 'diamond'];
    const segs = (s.segments || []).slice(0, 6), n = Math.max(1, segs.length);
    const endShare = clamp(s.end_share ?? 0.25, 0.05, 0.9);
    const y0 = s.years?.[0] ?? F.start_year ?? 2026, y1 = s.years?.[1] ?? y0 + 5;
    // legend
    const legX = L, legW = 470, fieldX = L + legW + 60, fieldW = R - fieldX, top = 260, bot = 720, colGap = 26, colW = (fieldW - colGap * (n - 1)) / n;
    const leg = kinds.map((k, i) => { const el = pos(h('div', 'sw-leg abs', `<i class="sw-shape ${SH[i]}"></i><span>${esc(k)}</span><b>×0</b>`, root), legX, top + 20 + i * 92, legW); return { el, b: el.querySelector('b') }; });
    const yearEl = pos(h('div', 'sw-year abs', String(y0), root), legX, top + 420);
    const copyNote = pos(h('div', 'sw-note abs', esc(s.copy_note || (F.language === 'ru' ? 'Успех копируют: за первым приходят следующие' : 'Success is copied: the first is followed by others')), root), legX, top + 500, legW);
    // columns
    const R0 = (() => { let a = 7 + (F.company?.name || '').length; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
    const cols = segs.map((sg, j) => {
      const x = fieldX + j * (colW + colGap);
      const box = pos(h('div', 'sw-col abs', '', root), x, top, colW); box.style.height = (bot - top) + 'px';
      const fill = h('div', 'sw-fill', '', box);
      const lab = pos(h('div', 'sw-lab abs', esc(typeof sg === 'string' ? sg : sg.name), root), x, bot + 14, colW);
      const pct = h('div', 'sw-pct', '', box);
      return { x, box, fill, lab, pct, start: (typeof sg === 'object' && sg.share) || 1 };
    });
    // entrants: who, where, when, how big; AI-native successes are copied in other segments
    const ents = [];
    counts.forEach((c, k) => { for (let i = 0; i < c; i++) ents.push({ k, seg: Math.floor(R0() * n), at: onset[k] + (1 - onset[k]) * 0.85 * (i / Math.max(1, c)) + R0() * 0.05, size: bite[k] * (0.7 + 0.6 * R0()) }); });
    ents.filter((e) => e.k === 3).forEach((e) => { for (let c = 0; c < 2; c++) ents.push({ k: 3, copy: true, seg: (e.seg + 1 + c + Math.floor(R0() * (n - 1))) % n, at: Math.min(0.98, e.at + 0.12 + c * 0.08), size: bite[3] * 0.7 }); });
    // scale bites so each segment ends near the company's end share
    const raw = Array(n).fill(0); ents.forEach((e) => (raw[e.seg] += e.size));
    ents.forEach((e) => { e.size *= (1 - endShare) * (0.85 + 0.3 * ((e.seg * 37) % 10) / 10) / Math.max(0.01, raw[e.seg]); });
    const placed = ents.sort((a, b) => a.at - b.at).map((e) => {
      const c = cols[e.seg]; const el = h('i', `sw-shape ${SH[e.k]} sw-tok${e.copy ? ' copy' : ''}`, '', c.box);
      const sz = 14 + Math.min(40, e.size * 260); el.style.width = el.style.height = sz + 'px';
      el.style.left = (8 + R0() * Math.max(10, colW - sz - 16)) + 'px'; e.el = el; e.sz = sz; e.y = R0(); return e;
    });
    const punch = s.punchline ? pos(h('div', 'sw-punch abs', esc(s.punchline), root), fieldX, bot + 80, fieldW) : null;
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      leg.forEach((l, i) => show(l.el, P(t, 0.5 + i * 0.25, 0.6), 0, -20));
      cols.forEach((c, j) => { show(c.box, P(t, 0.6 + j * 0.1, 0.6), 20); show(c.lab, P(t, 0.8 + j * 0.1, 0.6), 10); });
      const span = Math.max(3, (sc.speechEnd || d) - 2.2), u = clamp((t - 1.4) / span);
      yearEl.textContent = String(Math.round(y0 + (y1 - y0) * u)); show(yearEl, P(t, 1.2, 0.6), 10);
      show(copyNote, P(t, 1.4 + span * 0.55, 0.6), 10);
      const taken = Array(n).fill(0), cnt = [0, 0, 0, 0];
      placed.forEach((e) => {
        const p = clamp((u - e.at) / 0.06);
        if (p > 0) { taken[e.seg] += e.size * p; cnt[e.k] += p >= 1 ? 1 : 0; }
        e.el.style.opacity = p; e.el.style.transform = `scale(${0.4 + 0.6 * p})`;
      });
      cols.forEach((c, j) => {
        const share = Math.max(0, 1 - taken[j]), hgt = (bot - top) * share;
        c.fill.style.height = hgt + 'px';
        c.pct.textContent = Math.round(share * 100) + '%'; c.pct.style.bottom = Math.max(6, hgt - 40) + 'px';   // inside the company's own colour
        placed.filter((e) => e.seg === j).forEach((e, q) => { e.el.style.top = Math.max(6, (bot - top - hgt) - e.sz - 6 - ((q * 41 + e.y * 60) % Math.max(20, (bot - top - hgt) * 0.85))) + 'px'; });
      });
      leg.forEach((l, i) => (l.b.textContent = '×' + cnt[i]));
      if (punch) show(punch, P(t, 1.4 + span * 0.9, 0.7), 10);
    };
  };

  B.myths = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const items = (s.items || []).slice(0, 3);
    const rowH = items.length > 2 ? 200 : 260;
    const rows = items.map((it, i) => {
      const y = 300 + i * rowH;
      const b = pos(h('div', 'my-belief', '«' + esc(it.belief) + '»', root), L, y, 680); fit(b, 40, 26, 680, rowH - 40);
      const arr = pos(h('div', 'my-arrow', '→', root), L + 720, y);
      const a = pos(h('div', 'my-answer', esc(it.answer), root), L + 800, y, R - L - 800); fit(a, 34, 22, R - L - 800, rowH - 30);
      return { b, arr, a };
    });
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const span = Math.max(2, (sc.speechEnd || d) - 1.2);
      rows.forEach((r, i) => {
        const at = 0.8 + (i * span) / rows.length, ans = at + span / rows.length * 0.4;
        show(r.b, P(t, at, 0.6), 16);
        r.b.style.opacity = P(t, at, 0.6) * (1 - 0.55 * P(t, ans + 0.6, 0.6));
        show(r.arr, P(t, ans, 0.4), 0, -16);
        show(r.a, P(t, ans, 0.7), 16);
      });
    };
  };


  // the attack plan of a company that does not exist yet: a founder's memo and ten moves in four columns
  B.plan = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const memo = s.memo ? pos(h('div', 'pl-memo abs', esc(s.memo), root), L, 236, R - L) : null;
    if (memo) fit(memo, 22, 15, R - L);
    const cols = (s.columns || []).slice(0, 4), n = cols.length || 1, gap = 24, cw = (R - L - (n - 1) * gap) / n;
    let k = 0; const cards = [];
    cols.forEach((c, i) => {
      const x = L + i * (cw + gap);
      const hd = pos(h('div', 'pn-head', esc(c.name), root), x, 300, cw);
      cards.push({ el: hd, head: true, col: i });
      (c.items || []).slice(0, 3).forEach((it, j) => {
        k++;
        const el = pos(h('div', 'pn-card', `<i>${String(k).padStart(2, '0')}</i><span></span>${it.when ? `<b>${esc(it.when)}</b>` : ''}`, root), x, 354 + j * 172, cw);
        el.style.height = '156px';
        const sp = el.querySelector('span'); sp.textContent = it.text; fit(sp, 27, 18, cw - 40, 92);
        cards.push({ el, col: i });
      });
    });
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      if (memo) show(memo, P(t, 0.5, 0.7), 8);
      const span = Math.max(2, (sc.speechEnd || d) * 0.9 - 1.2);
      const items = cards.filter((c) => !c.head);
      cards.filter((c) => c.head).forEach((c) => show(c.el, P(t, 0.9 + c.col * 0.15, 0.5), 10));
      items.forEach((c, i) => show(c.el, P(t, 1.2 + (i * span) / items.length, 0.5), 18));
    };
  };

  // where it already happened faster: industries, what changed, how fast
  B.parallels = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const rows = (s.rows || []).slice(0, 5), rh = rows.length > 4 ? 118 : 136;
    const els = rows.map((r, i) => {
      const y = 300 + i * rh;
      const row = pos(h('div', 'px-row', '', root), L, y, R - L); row.style.height = rh - 12 + 'px';
      const f = h('div', 'px-field', esc(r.field), row); fit(f, 34, 22, 380, rh - 24);
      const w = h('div', 'px-what', `<span></span>${r.source ? `<em>${esc(r.source)}</em>` : ''}`, row);
      const sp = w.querySelector('span'); sp.textContent = r.what; fit(sp, 27, 18, 820, rh - 52);
      const sd = h('div', 'px-speed', esc(r.speed || ''), row); fit(sd, 46, 24, 380);
      return row;
    });
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const span = Math.max(2, (sc.speechEnd || d) * 0.88 - 1);
      els.forEach((e, i) => show(e, P(t, 0.9 + (i * span) / els.length, 0.6), 18));
    };
  };


  // three paths (the metAImorphosis NewCo scenarios): tradition, evolution, revolution, each with where it leads
  B.scenarios = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const items = (s.items || []).slice(0, 3), n = items.length || 1, gap = 32, cw = (R - L - (n - 1) * gap) / n;
    const cols = items.map((it, i) => {
      const c = pos(h('div', 'sn-col' + (it.accent ? ' accent' : ''), '', root), L + i * (cw + gap), 300, cw);
      c.style.height = '560px';
      h('div', 'sn-name', esc(it.name), c);
      const w = h('div', 'sn-what', esc(it.what || ''), c); fit(w, 30, 20, cw - 56, 190);
      const o = h('div', 'sn-out', `<small>${esc(it.outcome_label || '')}</small><span></span>`, c);
      const sp = o.querySelector('span'); sp.textContent = it.outcome || ''; fit(sp, 34, 20, cw - 56, 150);
      return c;
    });
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      const span = Math.max(2, (sc.speechEnd || d) * 0.85 - 1);
      cols.forEach((c, i) => show(c, P(t, 0.9 + (i * span) / cols.length, 0.7), 24));
    };
  };


  // what is really happening: the visible (often clumsy) AI step above the waterline, the experience piling up beneath it
  B.beneath = (s, root) => {
    const title = pos(h('div', 'title abs', esc(s.title || ''), root), L, 150, R - L);
    fit(title, 64, 40, R - L);
    const yLine = 450;
    const water = pos(h('div', 'bn-water', '', root), 0, yLine); water.style.width = W + 'px'; water.style.height = (H - yLine) + 'px';
    const line = pos(h('div', 'bn-line', '', root), 0, yLine); line.style.width = W + 'px';
    const sf = s.surface || {};
    const top = pos(h('div', 'bn-top', `<small>${esc(sf.label || '')}</small><span></span>`, root), L, 270, 1150);
    const ts = top.querySelector('span'); ts.textContent = sf.text || ''; fit(ts, 40, 26, 1150, 120);
    const lab = s.label_below ? pos(h('div', 'bn-label', esc(s.label_below), root), L, yLine + 22) : null;
    const items = (s.items || []).slice(0, 6), step = items.length > 5 ? 64 : 74;
    const els = items.map((txt, i) => {
      const e = pos(h('div', 'bn-item', `<i></i><span></span>`, root), L + 40, yLine + 78 + i * step, 1060);
      const sp = e.querySelector('span'); sp.textContent = txt; fit(sp, 30, 20, 1000);
      return e;
    });
    const depth = pos(h('div', 'bn-depth', '', root), L + 8, yLine + 84);
    const pun = s.punchline ? pos(h('div', 'bn-pun', esc(s.punchline), root), 1290, yLine + 90, R - 1290) : null;
    if (pun) fit(pun, 54, 30, R - 1290, 380);
    return (t, d, sc) => {
      show(title, P(t, 0.1, 0.8), 20);
      show(top, P(t, 0.5, 0.7), 16);
      line.style.transform = `scaleX(${P(t, 0.4, 0.9, ease.inOut)})`;
      water.style.opacity = P(t, 0.8, 0.8);
      if (lab) show(lab, P(t, 1.4, 0.6), -10);
      const span = Math.max(2, (sc.speechEnd || d) * 0.78 - 2);
      let last = 0;
      els.forEach((e, i) => { const at = 2.0 + (i * span) / els.length, p = P(t, at, 0.6); show(e, p, -14); if (p > 0) last = i + p; });
      depth.style.height = (last * step) + 'px';
      if (pun) show(pun, P(t, 2.0 + span + 0.3, 0.8), 20);
    };
  };

  // ---------- assemble ----------
  const scenesRoot = document.getElementById('scenes');
  const SC = F.scenes.map((s, i) => {
    const root = h('div', 'scene', '', scenesRoot);
    root.style.display = 'block';
    const builder = B[s.type] || B.statement;
    const upd0 = builder(s, root);
    const deco = DECOR[THEME] ? DECOR[THEME](s, root, i) : lookDecor(s, root);
    const update = deco ? (t, d, sc) => { deco(t, d, sc); upd0(t, d, sc); } : upd0;
    root.style.display = 'none';
    const t = F.timeline[i];
    return { s, root, update, start: t.start, dur: t.dur, speechStart: t.speechStart, speechEnd: t.speechEnd, slots: t.slots, captions: t.captions || [] };
  });
  const TOTAL = F.timeline_total;
  // the year each scene ends on (timeline and race count years while they play): lets the HUD year be computed without carried state
  SC.forEach((x) => {
    x.year = x.s.type === 'case' ? null : (x.s.year ?? null);
    x.root.style.display = 'block'; try { x.update(x.dur, x.dur, x); } catch (e) {} x.root.style.display = 'none';
    x.endYear = x.year;
  });

  // HUD
  const brand = document.getElementById('hud-brand');
  brand.innerHTML = F.brand_html || `<b>${esc(F.brand || 'metAImorphosis')}</b> · ${esc(F.company?.name || '')}`;
  const yearEl = document.querySelector('#hud-year .val');
  document.querySelector('#hud-year .lbl').textContent = UI.year;
  const actEl = document.getElementById('hud-act');
  const prog = document.querySelector('#hud-progress i');
  const cap = document.querySelector('#captions span');
  const fade = document.getElementById('fade');
  const grid = document.getElementById('grid');
  const grain = document.getElementById('grain');
  const showCaptions = F.captions !== false;

  let current = -1;

  // camera: one primary move per scene, a pure function of time (after cinecode's named vocabulary).
  // push = dolly in, pull = pull back, breathe = a <= 1.5% push that leaves reading undisturbed, none = locked.
  // ease: inertia (35% linear + 65% smoothstep) inside the film; ease-out on the first scene so it moves from frame 0.
  const CAM = { cold_open: ['push', 1.045, 'out'], chapter: ['push', 1.05], statement: ['push', 1.03], moment: ['push', 1.04],
    case: ['push', 1.025], questions: ['push', 1.02], end: ['pull', 1.04], clip: ['none'], world: ['none'] };
  const inertia = (x) => 0.35 * x + 0.65 * x * x * (3 - 2 * x), easeOut = (x) => 1 - (1 - x) * (1 - x);
  function camera(s, t, d) {
    const mode = s.camera || (CAM[s.type] || ['breathe', 1.015])[0];
    if (mode === 'none' || F.camera === false) return '';
    const amt = (CAM[s.type] && CAM[s.type][1]) || (mode === 'breathe' ? 1.015 : mode === 'pull' ? 1.04 : 1.03);
    const u = clamp(t / Math.max(0.1, d)), e = (CAM[s.type] && CAM[s.type][2] === 'out') ? easeOut(u) : inertia(u);
    const k = mode === 'pull' ? amt + (1 - amt) * e : 1 + (amt - 1) * e;
    return `scale(${k.toFixed(5)})`;
  }

  window.__seek = function (T) {
    let i = SC.findIndex((x) => T >= x.start && T < x.start + x.dur);
    if (i < 0) i = T < 0 ? 0 : SC.length - 1;
    const sc = SC[i];
    if (i !== current) {
      if (THEME === 'poster') applyPalette(posterOf(SC[i].s, i));
      if (current >= 0) SC[current].root.style.display = 'none';
      sc.root.style.display = 'block';
      current = i;
    }
    const t = T - sc.start;
    sc.year = sc.s.type === 'case' ? null : (sc.s.year ?? null);
    sc.update(t, sc.dur, sc);
    sc.root.style.transform = camera(sc.s, t, sc.dur);
    // the year counter is a pure function of the scene index (the renderer seeks in parallel chunks, so no carried state)
    let y = F.start_year || new Date().getFullYear();
    for (let j = 0; j <= i; j++) { const yj = j === i ? sc.year : SC[j].endYear; if (yj) y = yj; }
    yearEl.textContent = y;
    actEl.textContent = sc.s.act || '';
    prog.style.width = (100 * clamp(T / TOTAL)) + '%';
    // fade through black between scenes
    const fin = 1 - P(t, 0, i === 0 ? 0.12 : 0.45, (x) => x);   // the first frame already shows the picture (hook)
    const fout = P(t, sc.dur - 0.35, 0.35, (x) => x);
    const TR = LOOK ? LOOK.transition : 'dip', last = i === SC.length - 1;
    if (TR === 'wipe' && !last && i > 0) {
      // a panel in the company's colour sweeps across the cut
      const a = P(t, sc.dur - 0.4, 0.4, ease.inOut), b = P(t, 0, 0.4, ease.inOut);
      fade.style.background = 'var(--you)'; fade.style.opacity = 1;
      fade.style.clipPath = a > 0 ? `inset(0 ${100 - a * 100}% 0 0)` : `inset(0 0 0 ${b * 100}%)`;
      if (a === 0 && b >= 1) fade.style.opacity = 0;
    } else if (TR === 'slide' && i > 0 && !last) {
      // the scene slides in from the right and out to the left, over the background
      fade.style.background = ''; fade.style.clipPath = ''; fade.style.opacity = 0;
      const a = P(t, sc.dur - 0.4, 0.4, ease.inOut), b = 1 - P(t, 0, 0.5, ease.out);
      sc.root.style.transform = `translateX(${(b * 160 - a * 160).toFixed(1)}px) ` + sc.root.style.transform;
      sc.root.style.opacity = 1 - Math.max(a, b);
    } else {
      fade.style.background = TR === 'dissolve' ? 'var(--bg)' : ''; fade.style.clipPath = '';
      fade.style.opacity = Math.max(i === 0 ? fin : fin * 0.9, fout * (last ? 1 : 0.9));
    }
    if (SKETCH) STAGE.dataset.boil = Math.floor(T * 8) % 3;
    // living background
    grid.style.transform = `translate(${-(T * 6) % 80}px, ${-(T * 3) % 80}px)`;
    const fr = Math.floor(T * 12);
    grain.style.transform = `translate(${((fr * 73) % 200) - 100}px, ${((fr * 151) % 200) - 100}px)`;
    // captions
    if (showCaptions) {
      const c = sc.captions.find((c) => t >= c.a && t < c.b);
      if (c) {
        if (cap.textContent !== c.text) cap.textContent = c.text;
        cap.style.opacity = Math.min(P(t, c.a, 0.15, (x) => x), 1 - P(t, c.b - 0.12, 0.12, (x) => x));
      } else cap.style.opacity = 0;
    }
    return true;
  };
  window.__seek(0);
  window.__ready = true;
}
