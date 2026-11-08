/* Film contract check, shared by scripts/validate.mjs (Node) and the browser player.
   validate(film, { exists(file) }) -> { errors, warnings, estimatedSeconds }
   exists is optional: when given, "clip" files are checked for presence. */
(function (root) {
  const TYPES = ['cold_open', 'statement', 'chapter', 'dossier', 'timeline', 'race', 'scissors', 'pillars', 'signals', 'map', 'waves', 'moment', 'attackers', 'anatomy', 'ladder', 'myths', 'plan', 'parallels', 'scenarios', 'beneath', 'world', 'path', 'swarm', 'flank', 'case', 'fork', 'questions', 'clip', 'end'];
  const TAGS = ['known', 'estimate', 'model'];
  const SIDES = ['you', 'them', 'market'];

  function validate(film, opts) {
    const exists = opts && opts.exists;
    const E = [], Wn = [];
    const err = (m) => E.push(m), warn = (m) => Wn.push(m);
    const len = (s) => [...String(s ?? '')].length;
    const isNum = (x) => typeof x === 'number' && isFinite(x);

    if (!film || typeof film !== 'object') return { errors: ['film.json is not an object'], warnings: [] };
    if (!film.company?.name) err('company.name is required');
    if (!film.language) err('language is required (BCP-47 short code, e.g. "ru", "en", "uz", "ja")');
    if (!Array.isArray(film.scenes) || film.scenes.length < 5) err('scenes must be an array with at least 5 scenes');
    if (film.style != null && !['default', 'sketch', 'editorial', 'poster'].includes(film.style)) err('style must be "default", "sketch", "editorial" or "poster"');
    if (film.world != null) {
      const w = film.world;
      if (typeof w !== 'object') err('world must be an object { you, them_start, them_end, sites, look }');
      else {
        if (w.look != null && !['night', 'paper'].includes(w.look)) err('world.look must be night or paper');
        if (w.kit != null && !['factory', 'city', 'logistics'].includes(w.kit)) err('world.kit must be factory, city or logistics');
        if (w.time != null && !['night', 'dusk', 'dawn', 'snow'].includes(w.time)) err('world.time must be night, dusk, dawn or snow');
        if (w.light != null && !/^#[0-9a-f]{6}$/i.test(w.light)) err('world.light must be a hex colour like "#e3262f"');
        if (w.share != null && !(w.share > 0 && w.share < 1)) err('world.share must be between 0 and 1 (the customers the newcomer takes, city kit)');
        for (const k of ['you', 'them_start', 'them_end', 'sites']) if (w[k] != null && !(typeof w[k] === 'number' && w[k] > 0)) err(`world.${k} must be a positive number`);
        if (w.you > 12000) warn('world.you above 12 000: the town shows 12 000 windows; say in a caption that one window stands for several people');
      }
    }
    if (!(film.scenes || []).some((x) => x.type === 'flank')) warn('no flank scene: name the dangers that come not from competitors — clients doing it themselves, prices that fall in the head, an adjacent tool, rising expectations — and one this owner has not thought of (threat-playbook 1c)');
    if (!(film.scenes || []).some((x) => x.type === 'swarm')) warn('no swarm scene: show that the challenger will not be alone — every kind, in every segment, copies (threat-playbook 1b)');
    if (film.look != null) {
      const o = film.look, P = ['grotesk', 'geometric', 'classic', 'editorial', 'news', 'friendly', 'russian', 'modern', 'tech', 'elegant'];
      if (o.pairing && !P.includes(o.pairing)) err('look.pairing must be one of ' + P.join(', '));
      if (o.mode && !['night', 'paper', 'field', 'snow', 'ink'].includes(o.mode)) err('look.mode must be night, paper, field, snow or ink');
      if (o.brand && !/^#[0-9a-f]{6}$/i.test(o.brand)) err('look.brand must be a hex colour');
      if (o.transition && !['dip', 'wipe', 'slide', 'dissolve'].includes(o.transition)) err('look.transition must be dip, wipe, slide or dissolve');
    }
    // the film's own idea (Step 2c): without it, films for different companies drift towards the example
    if (!film.concept || typeof film.concept !== 'object') warn('concept missing: write the film\'s own idea (data/film-architectures.md) — idea, architecture, central_image, signature, specifics[]');
    else {
      for (const k of ['idea', 'architecture', 'central_image', 'signature']) if (!film.concept[k]) warn(`concept.${k} missing`);
      if (!Array.isArray(film.concept.specifics) || film.concept.specifics.length < 4) warn('concept.specifics: list at least 4 words only this company has (names, products, places, numbers)');
    }
    if (film.sound != null && film.sound !== false && typeof film.sound !== 'object') err('sound must be false or an object { music, room_db, body_db, machine_db, music_db, room_wet }');
    if (film.camera != null && film.camera !== false) err('camera at film level can only be false (turns all camera moves off)');
    if (['sketch', 'editorial', 'poster'].includes(film.style) && film.language && !['ru', 'en', 'uz', 'de', 'fr', 'es', 'it', 'pt', 'uk', 'be', 'nl', 'sv'].includes(film.language)) warn(`style "${film.style}" has fonts for Latin and basic Cyrillic only: for "${film.language}" some letters fall back to a system font, prefer the default style`);
    if (film.language && !['en', 'ru'].includes(film.language)) {
      const need = ['known', 'estimate', 'model', 'year', 'you', 'source'];
      const miss = need.filter((k) => !film.ui?.[k]);
      if (miss.length) warn(`language "${film.language}": translate on-screen labels in "ui" (${miss.join(', ')}), otherwise English labels are shown`);
    }
    if (!film.attacker?.name) warn('attacker.name missing: the challenger will be called "NewCo"');
    if (!Array.isArray(film.sources) || !film.sources.length) warn('sources[] is empty: list the URLs behind every "known" fact');

    const MODEL_KEYS = ['from', 'to', 'market_growth', 'your_share', 'attacker_cap', 'attacker_mid', 'attacker_k', 'taken_from_you'];
    if (film.model != null) {
      if (typeof film.model !== 'object') err('model must be an object (paste the "model" line printed by scripts/model.mjs)');
      else for (const k of Object.keys(film.model)) { if (!MODEL_KEYS.includes(k)) warn(`model.${k} is not a model parameter`); else if (!isNum(film.model[k])) err(`model.${k} must be a number`); }
      const race = (film.scenes || []).find((x) => x && x.type === 'race');
      const M = root.FilmModel;
      if (race && M && typeof film.model === 'object') {
        const r = M.run(film.model);
        if (JSON.stringify(r.you) !== JSON.stringify(race.you) || JSON.stringify(r.them) !== JSON.stringify(race.them)) warn('the race scene does not match "model": rerun scripts/model.mjs with the model block and paste years/you/them, otherwise the finale and the film disagree');
      }
    }
    if (film.attack_plan != null) {
      const AP = film.attack_plan;
      if (!Array.isArray(AP.moves) || !AP.moves.length) err('attack_plan.moves[] required (the ten moves in full: area, move, how, replaces, takes, when)');
      else {
        if (AP.moves.length < 8) warn('attack_plan: fewer than 8 moves, the red-team plan asks for 10');
        AP.moves.forEach((m, j) => { if (!m.move) err(`attack_plan.moves[${j}] needs move`); if (!m.how) warn(`attack_plan.moves[${j}] has no "how"`); });
      }
    }
    if (film.finale != null) {
      const F = film.finale;
      if (!film.model) err('finale needs the "model" block (the finale recalculates the race from it)');
      if (!Array.isArray(F.inputs) || !F.inputs.length) err('finale.inputs[] required: 2–4 sliders over model parameters');
      else {
        if (F.inputs.length > 4) warn('finale: more than 4 sliders, keep the effort to a minute');
        F.inputs.forEach((inp, j) => {
          if (!MODEL_KEYS.includes(inp.param) || inp.param === 'from' || inp.param === 'to') err(`finale.inputs[${j}].param must be one of ${MODEL_KEYS.slice(2).join(', ')}`);
          if (!isNum(inp.min) || !isNum(inp.max) || !isNum(inp.step) || inp.min >= inp.max) err(`finale.inputs[${j}] needs numeric min < max and step`);
          else if (film.model && isNum(film.model[inp.param]) && (film.model[inp.param] < inp.min || film.model[inp.param] > inp.max)) err(`finale.inputs[${j}]: the film's value ${film.model[inp.param]} is outside min..max`);
          if (!inp.label) err(`finale.inputs[${j}] needs a label`);
          if (inp.format && !['pct', 'year', 'num'].includes(inp.format)) warn(`finale.inputs[${j}].format should be pct, year or num`);
        });
      }
      if (!Array.isArray(F.steps) || F.steps.length < 2 || F.steps.length > 4) warn('finale.steps: give 2–4 concrete 30-day first steps, the viewer picks one');
      (F.steps || []).forEach((st, j) => { if (!st.title) err(`finale.steps[${j}] needs a title`); if (len(st.text) > 140) warn(`finale.steps[${j}].text > 140 chars`); });
      if (F.contact && F.contact.url && !/^(mailto:|https:\/\/|tg:)/.test(F.contact.url)) err('finale.contact.url must start with mailto:, https:// or tg:');
    }

    let chars = 0;
    (film.scenes || []).forEach((s, i) => {
      const at = `scene ${i + 1} (${s?.type})`;
      if (!TYPES.includes(s?.type)) return err(`${at}: unknown type. Allowed: ${TYPES.join(', ')}`);
      if (s.type !== 'chapter' && !s.narration) err(`${at}: narration is required`);
      chars += len(s.narration);
      if (s.camera != null && !['push', 'pull', 'breathe', 'none'].includes(s.camera)) err(`${at}: camera must be push, pull, breathe or none`);
      if (s.sound != null && !['drop', 'none'].includes(s.sound)) err(`${at}: sound must be "drop" (silence before this scene) or "none" (no hit)`);
      switch (s.type) {
        case 'cold_open':
          if (!Array.isArray(s.lines) || !s.lines.length) err(`${at}: lines[] required`);
          else { if (s.lines.length > 5) warn(`${at}: more than 5 lines`); s.lines.forEach((l) => len(l) > 42 && warn(`${at}: line "${l}" > 42 chars, will be shrunk`)); }
          break;
        case 'statement': if (!s.text) err(`${at}: text required`); else if (len(s.text) > 110) warn(`${at}: text > 110 chars`); break;
        case 'chapter': if (!s.title) err(`${at}: title required`); break;
        case 'dossier':
          if (!Array.isArray(s.facts) || s.facts.length < 3) err(`${at}: 3–6 facts required`);
          (s.facts || []).forEach((f, j) => {
            if (!f.label || f.value == null) err(`${at}: fact ${j + 1} needs label and value`);
            if (f.tag && !TAGS.includes(f.tag)) err(`${at}: fact ${j + 1} tag must be one of ${TAGS.join('/')}`);
            if (len(f.value) > 18) warn(`${at}: fact ${j + 1} value "${f.value}" is long, keep values short (number + unit)`);
          });
          if ((s.facts || []).length > 6) warn(`${at}: only the first 6 facts are shown`);
          break;
        case 'timeline':
          if (!Array.isArray(s.events) || s.events.length < 3) err(`${at}: at least 3 events required`);
          (s.events || []).forEach((e, j) => {
            if (!/\d{4}/.test(String(e.when))) err(`${at}: event ${j + 1} "when" must contain a year, e.g. 2027 or "2027 Q3"`);
            if (e.side && !SIDES.includes(e.side)) err(`${at}: event ${j + 1} side must be you/them/market`);
            if (len(e.text) > 80) warn(`${at}: event ${j + 1} text > 80 chars`);
          });
          if ((s.events || []).length > 8) warn(`${at}: more than 8 events will overlap`);
          break;
        case 'race':
          if (!Array.isArray(s.years) || s.years.length < 3) err(`${at}: years[] (>=3) required`);
          else if (!Array.isArray(s.you) || !Array.isArray(s.them) || s.you.length !== s.years.length || s.them.length !== s.years.length) err(`${at}: you[] and them[] must have the same length as years[]`);
          else if (![...s.you, ...s.them].every(isNum)) err(`${at}: you[] and them[] must be numbers`);
          break;
        case 'scissors':
          if (!Array.isArray(s.rows) || s.rows.length < 2) err(`${at}: rows[] (2–5) required`);
          (s.rows || []).forEach((r, j) => { if (!r.label || !isNum(r.you) || !isNum(r.them)) err(`${at}: row ${j + 1} needs label, numeric you and them`); });
          break;
        case 'pillars':
          if (!Array.isArray(s.items) || s.items.length < 3) err(`${at}: items[] (3–5) required`);
          (s.items || []).forEach((p, j) => { if (!p.name || !p.attack) err(`${at}: item ${j + 1} needs name and attack`); if (len(p.attack) > 150) warn(`${at}: item ${j + 1} attack > 150 chars`); });
          break;
        case 'signals':
          if (!Array.isArray(s.items) || s.items.length < 2) err(`${at}: items[] (2–5) required`);
          (s.items || []).forEach((p, j) => len(p.text) > 90 && warn(`${at}: signal ${j + 1} > 90 chars`));
          break;
        case 'map':
        if (!Array.isArray(s.points) || s.points.length < 2) err(`${at}: points[] (2–8) required`);
        else {
          if (s.points.length > 8) warn(`${at}: more than 8 points, labels will crowd`);
          s.points.forEach((p, j) => {
            if (!isNum(p.lat) || !isNum(p.lon) || Math.abs(p.lat) > 90 || Math.abs(p.lon) > 180) err(`${at}: point ${j + 1} needs numeric lat (-90..90) and lon (-180..180), in that order`);
            else if (p.lat === 0 && p.lon === 0) warn(`${at}: point ${j + 1} is at 0,0 (open ocean): coordinates missing?`);
            if (p.side && !SIDES.includes(p.side)) err(`${at}: point ${j + 1} side must be you/them/market`);
            if (!p.label && p.side !== 'you') err(`${at}: point ${j + 1} needs a label`);
            if (len(p.label) > 26) warn(`${at}: point ${j + 1} label > 26 chars`);
            if (len(p.sub) > 34) warn(`${at}: point ${j + 1} sub > 34 chars`);
          });
          if (!s.points.some((p) => p.side === 'you')) warn(`${at}: no point with side "you": the map should end on the viewer's own place`);
          const okPts = s.points.map((p, j) => ({ p, j })).filter((o) => isNum(o.p.lat) && isNum(o.p.lon));
          for (let a = 0; a < okPts.length; a++) for (let b = a + 1; b < okPts.length; b++) {
            const dLat = okPts[a].p.lat - okPts[b].p.lat, dLon = (okPts[a].p.lon - okPts[b].p.lon) * Math.cos(((okPts[a].p.lat + okPts[b].p.lat) / 2) * Math.PI / 180);
            if (Math.hypot(dLat, dLon) < 2) warn(`${at}: points ${okPts[a].j + 1} and ${okPts[b].j + 1} are under ~2° apart (about 200 km): the dots will overlap, merge them into one dot`);
          }
          (s.routes || []).forEach((r, j) => {
            if (!Number.isInteger(r.from) || !Number.isInteger(r.to) || !s.points[r.from] || !s.points[r.to]) err(`${at}: route ${j + 1} needs from and to as indexes into points[]`);
            else if ((s.points[r.from].side || 'market') !== 'them') warn(`${at}: route ${j + 1} starts at a point that is not side "them": never cast a real company as the attacker, routes start at the fictional challenger`);
          });
        }
        break;
      case 'waves':
        if (!Array.isArray(s.waves) || s.waves.length < 2 || s.waves.length > 3) err(`${at}: waves[] (2–3) required`);
        else s.waves.forEach((w, j) => {
          if (!w.title) err(`${at}: wave ${j + 1} needs a title`);
          if (w.from == null || w.to == null) err(`${at}: wave ${j + 1} needs from and to (years, e.g. 2026 or "2027 Q2")`);
          if (len(w.title) > 32) warn(`${at}: wave ${j + 1} title > 32 chars`);
          if (len(w.text) > 70) warn(`${at}: wave ${j + 1} text > 70 chars`);
          if (w.side && !['market', 'neighbour', 'them', 'you'].includes(w.side)) err(`${at}: wave ${j + 1} side must be market/neighbour/them/you`);
        });
        break;
      case 'attackers':
        if (!Array.isArray(s.items) || s.items.length < 3 || s.items.length > 8) err(`${at}: items[] (3–8 attacker types) required`);
        else s.items.forEach((it, j) => {
          if (!it.type) err(`${at}: item ${j + 1} needs type`);
          if (len(it.type) > 40) warn(`${at}: item ${j + 1} type > 40 chars`);
          if (len(it.text) > 100) warn(`${at}: item ${j + 1} text > 100 chars`);
          if (it.likelihood && !['low', 'medium', 'high'].includes(it.likelihood)) err(`${at}: item ${j + 1} likelihood must be low/medium/high`);
        });
        break;
      case 'anatomy':
        if (!Array.isArray(s.rows) || s.rows.length < 3 || s.rows.length > 6) err(`${at}: rows[] (3–6 cost lines) required`);
        else s.rows.forEach((r, j) => { if (!r.label || !isNum(r.you) || !isNum(r.them)) err(`${at}: row ${j + 1} needs label and numeric you/them`); });
        if (Array.isArray(s.rows)) { const tu = s.rows.reduce((a, r) => a + (+r.you || 0), 0); if (Math.abs(tu - 100) > 0.5) warn(`${at}: "you" rows add up to ${tu}, make them a structure of 100 (price = 100)`); }
        if (!s.unit) warn(`${at}: unit (e.g. "из 100 единиц цены · модель") tells the viewer this is a model`);
        break;
      case 'ladder':
        if (!Array.isArray(s.stages) || s.stages.length < 4 || s.stages.length > 6) err(`${at}: stages[] (4–6) required`);
        if (!Array.isArray(s.markers) || !s.markers.length) err(`${at}: markers[] required (you, the neighbour, the newco)`);
        else s.markers.forEach((m, j) => {
          const n = (s.stages || []).length;
          for (const k of ['stage', 'from', 'to']) if (m[k] != null && (!Number.isInteger(m[k]) || m[k] < 0 || m[k] >= n)) err(`${at}: marker ${j + 1} ${k} must be a stage index 0..${n - 1}`);
          if (m.stage == null && m.to == null) err(`${at}: marker ${j + 1} needs stage (or from/to)`);
          if (m.side && !['you', 'neighbour', 'them'].includes(m.side)) err(`${at}: marker ${j + 1} side must be you/neighbour/them`);
        });
        break;
      case 'myths':
        if (!Array.isArray(s.items) || s.items.length < 2 || s.items.length > 3) err(`${at}: items[] (2–3 beliefs) required`);
        else s.items.forEach((it, j) => {
          if (!it.belief || !it.answer) err(`${at}: item ${j + 1} needs belief and answer`);
          if (len(it.belief) > 70) warn(`${at}: item ${j + 1} belief > 70 chars`);
          if (len(it.answer) > 120) warn(`${at}: item ${j + 1} answer > 120 chars`);
        });
        break;
      case 'plan':
        if (!Array.isArray(s.columns) || s.columns.length < 2 || s.columns.length > 4) err(`${at}: columns[] (2–4: product, front office, back office, talent) required`);
        else {
          let n = 0;
          s.columns.forEach((c, j) => { if (!c.name) err(`${at}: column ${j + 1} needs a name`); (c.items || []).forEach((it, k) => { n++; if (!it.text) err(`${at}: column ${j + 1} item ${k + 1} needs text`); if (len(it.text) > 70) warn(`${at}: column ${j + 1} item ${k + 1} text > 70 chars`); }); if ((c.items || []).length > 3) warn(`${at}: column ${j + 1}: only 3 items are shown`); });
          if (n < 6) warn(`${at}: fewer than 6 moves: the plan should feel complete (10 reads best)`);
        }
        if (s.memo && len(s.memo) > 110) warn(`${at}: memo > 110 chars`);
        break;
      case 'parallels':
        if (!Array.isArray(s.rows) || s.rows.length < 2 || s.rows.length > 5) err(`${at}: rows[] (2–5) required`);
        else s.rows.forEach((r, j) => {
          if (!r.field || !r.what) err(`${at}: row ${j + 1} needs field and what`);
          if (!r.source) warn(`${at}: row ${j + 1} has no source: parallels must be sourced`);
          if (len(r.what) > 110) warn(`${at}: row ${j + 1} what > 110 chars`);
        });
        break;
      case 'scenarios':
        if (!Array.isArray(s.items) || s.items.length < 2 || s.items.length > 3) err(`${at}: items[] (2–3 paths: tradition, evolution, revolution) required`);
        else s.items.forEach((it, j) => { if (!it.name || !it.outcome) err(`${at}: item ${j + 1} needs name and outcome`); if (len(it.what) > 110) warn(`${at}: item ${j + 1} what > 110 chars`); if (len(it.outcome) > 80) warn(`${at}: item ${j + 1} outcome > 80 chars`); });
        break;
      case 'swarm':
        if (!Array.isArray(s.segments) || s.segments.length < 3 || s.segments.length > 6) err(`${at}: 3–6 segments of this company's market required`);
        (s.segments || []).forEach((g, j) => { const nm = typeof g === 'string' ? g : g && g.name; if (!nm) err(`${at}: segment ${j + 1} needs a name`); else if (len(nm) > 28) warn(`${at}: segment ${j + 1} name > 28 chars`); });
        if (s.kinds && (!Array.isArray(s.kinds) || s.kinds.length !== 4)) err(`${at}: kinds must list 4 labels (optimise, rebuild, AI-first, AI-native)`);
        if (s.counts && (!Array.isArray(s.counts) || s.counts.length !== 4)) err(`${at}: counts must list 4 numbers`);
        if (s.end_share != null && !(s.end_share > 0 && s.end_share < 1)) err(`${at}: end_share must be between 0 and 1`);
        if (s.punchline && len(s.punchline) > 90) warn(`${at}: punchline > 90 chars`);
        break;
      case 'flank':
        if (!Array.isArray(s.items) || s.items.length < 3 || s.items.length > 6) err(`${at}: 3–6 items (side dangers) required`);
        (s.items || []).forEach((it, j) => { if (!it.from || !it.what) err(`${at}: item ${j + 1} needs from and what`); if (len(it.what) > 90) warn(`${at}: item ${j + 1} what > 90 chars`); if (len(it.why) > 140) warn(`${at}: item ${j + 1} why > 140 chars`); if (it.weight && !['low', 'mid', 'medium', 'high'].includes(it.weight)) err(`${at}: item ${j + 1} weight must be low, mid or high`); });
        if ((s.items || []).filter((it) => it.surprise).length !== 1) warn(`${at}: mark exactly one item surprise: the danger this owner most likely has not considered`);
        if (s.punchline && len(s.punchline) > 80) warn(`${at}: punchline > 80 chars`);
        break;
      case 'path':
        if (!Array.isArray(s.steps) || s.steps.length < 3 || s.steps.length > 6) err(`${at}: 3–6 steps required`);
        (s.steps || []).forEach((st, j) => {
          if (!st.label) err(`${at}: step ${j + 1} needs a label`);
          if (len(st.label) > 22) warn(`${at}: step ${j + 1} label > 22 chars`);
          if (len(st.text) > 70) warn(`${at}: step ${j + 1} text > 70 chars`);
          if (st.owner && !SIDES.includes(st.owner)) err(`${at}: step ${j + 1} owner must be you/them/market`);
        });
        break;
      case 'world':
        if (!['open', 'neighbor', 'newcomer', 'finale'].includes(s.beat)) err(`${at}: beat must be open, neighbor, newcomer or finale`);
        if (!s.title) err(`${at}: title required (it works as the chapter title over the world)`);
        if (len(s.title) > 40) warn(`${at}: title > 40 chars`);
        if (s.caption && len(s.caption) > 90) warn(`${at}: caption > 90 chars`);
        break;
      case 'beneath':
        if (!s.surface || !s.surface.text) err(`${at}: surface.text required (what is visible from outside, often a clumsy first AI step)`);
        if (!Array.isArray(s.items) || s.items.length < 3 || s.items.length > 6) err(`${at}: items[] (3–6 things accumulating underneath) required`);
        else s.items.forEach((x, j) => len(x) > 60 && warn(`${at}: item ${j + 1} > 60 chars`));
        if (s.punchline && len(s.punchline) > 60) warn(`${at}: punchline > 60 chars`);
        break;
      case 'moment':
        if (!s.text) err(`${at}: text required (the message itself)`);
        if (len(s.text) > 220) warn(`${at}: text > 220 chars, it is typed out on screen`);
        if (!s.when) warn(`${at}: when (e.g. "Март 2029") makes the moment concrete`);
        break;
      case 'case':
          if (!s.name || !s.headline) err(`${at}: name and headline required`);
          if (!s.source) warn(`${at}: case without source — cases must come from data/cases.json or a cited source`);
          break;
        case 'fork':
          if (!s.left?.title || !s.right?.title) err(`${at}: left.title and right.title required`);
          break;
        case 'questions':
          if (!Array.isArray(s.items) || !s.items.length) err(`${at}: items[] required`);
          (s.items || []).forEach((q, j) => len(q) > 110 && warn(`${at}: question ${j + 1} > 110 chars`));
          break;
        case 'clip':
          if (!s.file) err(`${at}: file required (MP4/MOV path relative to film.json). The clip replaces the whole frame, captions are not shown over it`);
          else if (exists && !exists(s.file)) err(`${at}: file "${s.file}" not found`);
          break;
        case 'end': if (!s.title) err(`${at}: title required`); break;
      }
    });
    const estSec = chars / 14.5 + (film.scenes || []).length * 1.6;
    if (estSec > 375) warn(`estimated length ~${Math.round(estSec / 60 * 10) / 10} min: aim for 5–6 min, trim narration`);
    if (!film.threats) warn('threats missing: write work/<slug>/threats.md (Step 2, data/threat-playbook.md) and set "threats": "threats.md"');
    if (estSec < 110) warn(`estimated length ~${Math.round(estSec)} s: the film is too thin, aim for 5–6 min`);
    return { errors: E, warnings: Wn, estimatedSeconds: Math.round(estSec) };
  }

  const api = { TYPES, validate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FilmValidate = api;
})(typeof window !== 'undefined' ? window : globalThis);
