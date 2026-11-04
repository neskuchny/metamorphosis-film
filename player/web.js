/* Browser player: paste film.json -> watch it. No server, no install, no command line.
   Uses the same scene code as the renderer (film.js), a real-time clock, and the browser's own speech voice.
   Timing is estimated from text length; if the voice runs longer, the clock waits for it at the end of a scene. */
(function () {
  const $ = (id) => document.getElementById(id);
  const STR = {
    ru: {
      title: 'Плеер фильма', lead: 'Вставьте film.json, который собрал агент, и нажмите «Открыть». Всё работает в браузере, данные никуда не отправляются.',
      file: 'Выбрать файл', example: 'Пример', open: 'Открыть',
      note: 'Это режим просмотра в браузере: файла MP4 здесь нет. MP4 собирается, когда репозиторий запущен в агенте с командной строкой (см. README).',
      bad: 'Не удалось прочитать JSON: ', invalid: 'В film.json есть ошибки: ', build: 'Не удалось построить фильм (проверьте поля сцен, scripts/validate.mjs подскажет какие): ', noex: 'Пример недоступен в этом режиме запуска.',
      play: 'Смотреть', pause: 'Пауза', resume: 'Дальше', restart: 'Сначала', voice: 'Голос', fs: 'Во весь экран',
      novoice: 'В этом браузере нет голоса для языка «{l}», фильм идёт с субтитрами. Голоса есть в Chrome, Edge и Safari на компьютере.',
      fin: 'Ваши цифры', fnTitle: 'Ваши цифры за минуту', fnIntro: 'Сдвиньте ползунки так, как видите сами, и модель пересчитается.', fnChange: 'ваша выручка к {y}, модель',
      fnCross: 'Новая компания обгоняет вас в {y}.', fnNoCross: 'В горизонте модели новая компания вас не обгоняет.', fnInFilm: 'в фильме: {v}', fnDefault: 'в фильме: {v}',
      fnRisk: 'Три вопроса зоны риска: ответьте сами', fnYes: 'Да', fnNo: 'Нет', fnPaths: 'Какой путь вам ближе?', fnRefl: 'Как вы видите свою компанию теперь?',
      fnRiskQ: ['Ваш рынок большой и растёт?', 'У вас здоровая маржа и заметный размер бизнеса?', 'Ваше преимущество можно быстро повторить, если есть деньги?'],
      fnV3: 'Три «да»: за вами придут ИИ-нативные и ИИ-усиленные конкуренты.', fnV2: 'Два «да»: риск средний, сроки длиннее, направление то же.', fnV1: 'Одно «да» или ни одного: риск ниже, но края бизнеса — люди, сервис, продажи — всё равно под ударом.',
      sumRisk: 'Зона риска (мои ответы)', sumPath: 'Ближе всего путь', sumRefl: 'Как я вижу компанию теперь',
      fnPlan: 'Как бы вас атаковали: план компании, которой пока нет', fnReplaces: 'заменяет', fnTakes: 'забирает',
      fnSteps: 'Один шаг на 30 дней', fnQ: 'Обсудите с командой', fnCopy: 'Скопировать для консультанта', fnCopied: 'Скопировано', fnDl: 'Скачать .txt', fnBack: 'Вернуться к фильму', fnReset: 'как в фильме',
      fnPrivacy: 'Ничего не отправляется: цифры остаются в этом браузере, пока вы сами их не скопируете.', fnYou: 'вы', fnThem: 'новая компания',
      sumHead: 'Итог просмотра фильма', sumChanged: 'Мои цифры (в скобках — допущение фильма)', sumResult: 'Результат модели', sumStep: 'Выбранный шаг на 30 дней', sumNoStep: 'шаг не выбран', sumQ: 'Вопросы для команды',
    },
    en: {
      title: 'Film player', lead: 'Paste the film.json the agent produced and press Open. Everything runs in your browser, nothing is uploaded.',
      file: 'Choose file', example: 'Example', open: 'Open',
      note: 'This is the in-browser viewer: there is no MP4 here. An MP4 is produced when the repository runs in an agent with a command line (see README).',
      bad: 'Could not read the JSON: ', invalid: 'film.json has errors: ', build: 'Could not build the film (check the scene fields; scripts/validate.mjs lists what is missing): ', noex: 'The example is not available in this mode.',
      play: 'Watch', pause: 'Pause', resume: 'Resume', restart: 'Restart', voice: 'Voice', fs: 'Fullscreen',
      novoice: 'This browser has no voice for "{l}", the film plays with captions only. Voices are available in desktop Chrome, Edge and Safari.',
      fin: 'Your numbers', fnTitle: 'Your numbers in a minute', fnIntro: 'Move the sliders to what you believe, and the model recalculates.', fnChange: 'your revenue by {y}, model',
      fnCross: 'The new company overtakes you in {y}.', fnNoCross: 'Within the model horizon the new company does not overtake you.', fnInFilm: 'in the film: {v}', fnDefault: 'in the film: {v}',
      fnRisk: 'Three risk-zone questions: answer them yourself', fnYes: 'Yes', fnNo: 'No', fnPaths: 'Which path is closest to you?', fnRefl: 'How do you see your company now?',
      fnRiskQ: ['Is your market big and growing?', 'Do you have healthy margins and a sizeable business?', 'Can your advantage be repeated quickly with enough money?'],
      fnV3: 'Three yes: AI-native and AI-enabled competitors will come after you.', fnV2: 'Two yes: medium risk, later years, same direction.', fnV1: 'One yes or none: lower risk, but the edges — people, service, sales — are still exposed.',
      sumRisk: 'Risk zone (my answers)', sumPath: 'Closest path', sumRefl: 'How I see the company now',
      fnPlan: 'How you would be attacked: the plan of a company that does not exist yet', fnReplaces: 'replaces', fnTakes: 'takes',
      fnSteps: 'One step for the next 30 days', fnQ: 'Discuss with your team', fnCopy: 'Copy for the consultant', fnCopied: 'Copied', fnDl: 'Download .txt', fnBack: 'Back to the film', fnReset: 'as in the film',
      fnPrivacy: 'Nothing is sent anywhere: your numbers stay in this browser until you copy them yourself.', fnYou: 'you', fnThem: 'new company',
      sumHead: 'After the film', sumChanged: 'My numbers (film assumption in brackets)', sumResult: 'Model result', sumStep: 'Chosen 30-day step', sumNoStep: 'no step chosen', sumQ: 'Questions for the team',
    },
  };
  let lang = (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  const t = (k) => STR[lang][k];
  function labels() {
    $('t-title').textContent = t('title'); $('t-lead').textContent = t('lead'); $('t-file').textContent = t('file');
    $('example').textContent = t('example'); $('open').textContent = t('open'); $('t-note').textContent = t('note');
    $('t-voice').textContent = t('voice'); $('b-restart').textContent = t('restart'); $('b-fs').textContent = t('fs');
    $('b-finale').textContent = t('fin');
    $('bigplay').textContent = t('play'); $('b-play').textContent = playing ? t('pause') : (T > 0 ? t('resume') : t('play'));
  }

  let FILM = null, T = 0, TOTAL = 0, playing = false, lastNow = 0;
  const synth = window.speechSynthesis;
  let voice = null, speaking = false, spoken = -1, rate = 1, token = 0, noVoiceShown = false;

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const sceneAt = (x) => { const tl = FILM.timeline; for (let i = tl.length - 1; i >= 0; i--) if (x >= tl[i].start) return i; return 0; };

  // ---------- input ----------
  function parseFilm(text) {
    const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    return JSON.parse((m ? m[1] : text).trim());
  }
  async function openFromText(text) {
    $('err').textContent = '';
    let film;
    try { film = parseFilm(text); } catch (e) { $('err').textContent = t('bad') + e.message; return; }
    if (!film || typeof film !== 'object') { $('err').textContent = t('bad') + 'not an object'; return; }
    const v = window.FilmValidate.validate(film);
    if (v.errors.length) { $('err').textContent = t('invalid') + v.errors.slice(0, 5).join(' · ') + (v.errors.length > 5 ? ` (+${v.errors.length - 5})` : ''); return; }
    await start(film);
  }
  $('open').onclick = () => openFromText($('paste').value);
  $('file').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $('paste').value = r.result; openFromText(r.result); }; r.readAsText(f); };
  $('example').onclick = async () => {
    const emb = document.getElementById('example-film');
    if (emb) { $('paste').value = emb.textContent.trim(); return openFromText($('paste').value); }
    for (const u of ['examples/artel/film.json', '../examples/artel/film.json']) {
      try { const r = await fetch(u); if (r.ok) { $('paste').value = await r.text(); return openFromText($('paste').value); } } catch {}
    }
    $('err').textContent = t('noex');
  };

  // ---------- start ----------
  function loadFilmJs() {
    return new Promise((res, rej) => {
      const s = document.createElement('script'); const inline = document.getElementById('film-js');
      if (inline) { s.textContent = inline.textContent; document.body.appendChild(s); res(s); }
      else { s.src = 'film.js'; s.onload = () => res(s); s.onerror = () => rej(new Error('film.js not found')); document.body.appendChild(s); }
    });
  }
  let filmScript = null;
  async function start(film) {
    film.company = film.company || { name: '' };
    const { timeline, total } = window.FilmTimeline.build(film, null, null);
    FILM = { ...film, timeline, timeline_total: total }; TOTAL = total; window.FILM = FILM;
    lang = (film.language || '').toLowerCase() === 'ru' ? 'ru' : (/^(ru|en)/.test(navigator.language || '') ? lang : 'en');
    stopVoice(); playing = false; T = 0; window.__ready = false;
    $('scenes').innerHTML = ''; if (filmScript) { filmScript.remove(); filmScript = null; }
    $('intro').hidden = true; $('viewer').hidden = false; document.body.classList.add('playing');
    $('finale').hidden = true; document.body.classList.remove('fin'); $('b-finale').hidden = !film.finale; finState = null;
    document.title = (film.company.name ? film.company.name + ' — ' : '') + t('title');
    let failed = null;
    const onErr = (e) => { failed = (e.reason && e.reason.message) || e.message || String(e.reason || 'error'); };
    addEventListener('error', onErr); addEventListener('unhandledrejection', onErr);
    try {
      filmScript = await loadFilmJs();
      const t0 = performance.now();
      while (window.__ready !== true && !failed && performance.now() - t0 < 20000) await new Promise((r) => setTimeout(r, 50));
      if (window.__ready !== true) failed = failed || 'timeout';
    } catch (e) { failed = e.message; }
    removeEventListener('error', onErr); removeEventListener('unhandledrejection', onErr);
    if (failed) {
      $('viewer').hidden = true; $('intro').hidden = false; document.body.classList.remove('playing'); FILM = null;
      $('err').textContent = t('build') + failed; labels(); return;
    }
    labels(); fit(); window.__seek(0); ui();
  }

  // ---------- layout ----------
  function fit() { const s = Math.min(innerWidth / 1920, innerHeight / 1080); $('stagewrap').style.transform = `scale(${s})`; }
  addEventListener('resize', fit);
  let idleTimer;
  function wake() { $('ui').classList.remove('idle'); clearTimeout(idleTimer); if (playing) idleTimer = setTimeout(() => $('ui').classList.add('idle'), 2600); }
  ['mousemove', 'touchstart', 'keydown'].forEach((ev) => addEventListener(ev, wake));

  // ---------- voice ----------
  function pickVoice() {
    if (!synth) return null;
    const want = (FILM.language || 'en').toLowerCase();
    const vs = synth.getVoices().filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(want));
    if (!vs.length) return null;
    const score = (v) => (/natural|neural|premium|enhanced|google/i.test(v.name) ? 2 : 0) + (v.localService ? 1 : 0);
    return vs.sort((a, b) => score(b) - score(a))[0];
  }
  function toast(msg) { const el = $('toast'); el.textContent = msg; el.hidden = false; setTimeout(() => { el.hidden = true; }, 7000); }
  function speak(i) {
    const s = FILM.scenes[i]; if (!s.narration) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(s.narration);
    u.voice = voice; u.lang = voice.lang; u.rate = rate;
    const my = ++token, planned = FILM.timeline[i].speechEnd - FILM.timeline[i].speechStart; let began = 0;
    u.onstart = () => { began = performance.now(); speaking = true; };
    u.onend = () => {
      if (my !== token) return;
      speaking = false;
      const actual = began ? (performance.now() - began) / 1000 : 0;
      if (actual > 1 && planned > 0) rate = Math.max(1, Math.min(1.6, rate * actual / planned)); // catch up on later scenes
    };
    u.onerror = () => { if (my === token) speaking = false; };
    speaking = true; synth.speak(u);
  }
  function stopVoice() { token++; speaking = false; spoken = -1; if (synth) synth.cancel(); }

  // ---------- clock ----------
  function tick(now) {
    if (!playing) return;
    const dt = Math.min(0.1, (now - lastNow) / 1000); lastNow = now;
    const i = sceneAt(T), tl = FILM.timeline[i];
    const voiceOn = $('c-voice').checked && voice;
    if (voiceOn && spoken !== i && T >= tl.start + tl.speechStart) { spoken = i; speak(i); }
    const hold = voiceOn && speaking && T + dt >= tl.start + tl.dur - 0.02;   // let the voice finish
    if (!hold) T = Math.min(TOTAL, T + dt);
    window.__seek(T); ui();
    if (T >= TOTAL && !(voiceOn && speaking)) { playing = false; labels(); wake(); if (FILM.finale) openFinale(); return; }
    requestAnimationFrame(tick);
  }
  function ui() { $('bigplay').hidden = playing || T > 0; $('scrub').value = Math.round(1000 * T / TOTAL); $('clock').textContent = `${fmt(T)} / ${fmt(TOTAL)}`; $('b-play').textContent = playing ? t('pause') : (T > 0 ? t('resume') : t('play')); }
  function play() {
    if (T >= TOTAL) { T = 0; stopVoice(); }
    if (!voice) voice = pickVoice();
    if (!voice && $('c-voice').checked && !noVoiceShown) { noVoiceShown = true; toast(t('novoice').replace('{l}', FILM.language || 'en')); }
    playing = true; lastNow = performance.now();
    if (synth && synth.paused) synth.resume();
    wake(); requestAnimationFrame(tick); ui();
  }
  function pause() { playing = false; if (synth) synth.pause(); ui(); wake(); }
  $('bigplay').onclick = play;
  $('stagebox').onclick = () => { if (FILM) (playing ? pause() : play()); };
  $('b-play').onclick = () => (playing ? pause() : play());
  $('b-restart').onclick = () => { stopVoice(); T = 0; window.__seek(0); ui(); if (!playing) play(); };
  $('scrub').oninput = (e) => { stopVoice(); T = TOTAL * (+e.target.value / 1000); window.__seek(T); ui(); };
  $('c-voice').onchange = () => { if (!$('c-voice').checked) stopVoice(); else spoken = -1; };
  $('b-fs').onclick = () => { const d = document.documentElement; (document.fullscreenElement ? document.exitFullscreen() : d.requestFullscreen && d.requestFullscreen()); };
  addEventListener('keydown', (e) => {
    if (!FILM || e.target.tagName === 'TEXTAREA' || !$('finale').hidden) return;
    if (e.code === 'Space') { e.preventDefault(); playing ? pause() : play(); }
    if (e.key === 'f' || e.key === 'F') $('b-fs').click();
    if (e.key === 'ArrowRight') { stopVoice(); T = Math.min(TOTAL, T + 5); window.__seek(T); ui(); }
    if (e.key === 'ArrowLeft') { stopVoice(); T = Math.max(0, T - 5); window.__seek(T); ui(); }
  });
  if (synth) synth.onvoiceschanged = () => { if (FILM && !voice) voice = pickVoice(); };

  // ---------- finale: your numbers -> your step ----------
  // The film's race model (film.model) with the viewer's own values; nothing leaves the browser.
  let finState = null;
  const tf = (k, o) => { let v = (FILM.finale && FILM.finale.ui && FILM.finale.ui[k]) || t(k); for (const x in o || {}) v = v.replace('{' + x + '}', o[x]); return v; };
  const fmtIn = (inp, v) => inp.format === 'pct' ? (v * 100 >= 0 && inp.signed ? '+' : '') + Math.round(v * 100) + '%' : inp.format === 'year' ? (v % 1 ? (lang === 'ru' ? 'сер. ' : 'mid-') + Math.floor(v) : String(v)) : String(v);
  const pctStr = (c) => (c > 0 ? '+' : c < 0 ? '−' : '') + Math.abs(c) + '%';
  function finaleModel() { return Object.assign({}, window.FilmModel.DEFAULTS, FILM.model || {}); }
  function openFinale() {
    const F = FILM.finale; if (!F || !window.FilmModel) return;
    pause();
    if (!finState) {
      const base = finaleModel();
      finState = { base, cur: Object.assign({}, base), step: -1 };
      $('fn-company').textContent = FILM.company?.name || '';
      $('fn-title').textContent = F.title || tf('fnTitle');
      $('fn-intro').textContent = F.intro || tf('fnIntro');
      $('fn-steps-title').textContent = F.steps_title || tf('fnSteps');
      $('fn-copy').textContent = tf('fnCopy'); $('fn-dl').textContent = tf('fnDl'); $('fn-back').textContent = tf('fnBack'); $('fn-reset').textContent = tf('fnReset');
      $('fn-privacy').textContent = F.privacy || tf('fnPrivacy');
      $('fn-l-you').textContent = '— ' + (FILM.company?.short_name || FILM.company?.name || tf('fnYou'));
      $('fn-l-them').textContent = '— ' + (FILM.attacker?.name || tf('fnThem'));
      const box = $('fn-inputs'); box.innerHTML = '';
      (F.inputs || []).forEach((inp) => {
        if (!(inp.param in base)) return;
        const d = document.createElement('div'); d.className = 'fn-in';
        d.innerHTML = `<label><span></span><b></b></label><input type="range"><div class="fn-def"></div>`;
        d.querySelector('span').textContent = inp.label;
        const r = d.querySelector('input'); r.min = inp.min; r.max = inp.max; r.step = inp.step; r.value = base[inp.param];
        d.querySelector('.fn-def').textContent = tf('fnDefault', { v: fmtIn(inp, base[inp.param]) });
        const show = () => { d.querySelector('b').textContent = fmtIn(inp, +r.value); };
        r.oninput = () => { finState.cur[inp.param] = +r.value; show(); recalc(); };
        inp._el = r; inp._show = show; show(); box.appendChild(d);
      });
      const AP = FILM.attack_plan;
      if (AP && Array.isArray(AP.moves) && AP.moves.length) {
        $('fn-plan').hidden = false; $('fn-plan').open = false;
        $('fn-plan-title').textContent = AP.title || tf('fnPlan');
        $('fn-plan-memo').textContent = AP.memo || '';
        const list = $('fn-plan-list'); list.innerHTML = '';
        const areas = [...new Set(AP.moves.map((m) => m.area || ''))];
        areas.forEach((ar) => {
          if (ar) { const h4 = document.createElement('h4'); h4.textContent = ar; list.appendChild(h4); }
          AP.moves.filter((m) => (m.area || '') === ar).forEach((m) => {
            const d = document.createElement('div'); d.className = 'fn-move';
            d.innerHTML = '<b></b><span></span>';
            d.querySelector('b').textContent = m.move;
            if (m.when) { const e = document.createElement('em'); e.textContent = m.when; d.querySelector('b').appendChild(e); }
            d.querySelector('span').textContent = [m.how, m.replaces ? tf('fnReplaces') + ': ' + m.replaces : '', m.takes ? tf('fnTakes') + ': ' + m.takes : ''].filter(Boolean).join(' · ');
            list.appendChild(d);
          });
        });
      } else $('fn-plan').hidden = true;
      // the owner's own risk check (metAImorphosis risk-zone questions): they reach the verdict themselves
      finState.risk = [null, null, null];
      if (F.risk_check !== false) {
        $('fn-risk').hidden = false; $('fn-risk-title').textContent = (F.risk_check && F.risk_check.title) || tf('fnRisk');
        const qs3 = (F.risk_check && F.risk_check.questions) || t('fnRiskQ'), box3 = $('fn-risk-q'); box3.innerHTML = '';
        qs3.slice(0, 3).forEach((q, i) => {
          const r = document.createElement('div'); r.className = 'fn-rq';
          r.innerHTML = '<span></span><div class="yn"><button type="button"></button><button type="button"></button></div>';
          r.querySelector('span').textContent = q;
          const [by, bn] = r.querySelectorAll('button'); by.textContent = tf('fnYes'); bn.textContent = tf('fnNo');
          const set = (v) => { finState.risk[i] = v; by.classList.toggle('on', v === true); bn.classList.toggle('on', v === false); verdict(); };
          by.onclick = () => set(true); bn.onclick = () => set(false);
          box3.appendChild(r);
        });
        finState.riskQ = qs3.slice(0, 3);
      } else $('fn-risk').hidden = true;
      // the paths: tradition / evolution / revolution from the scenarios scene
      const scen = (FILM.scenes.find((x) => x.type === 'scenarios') || {}).items || [];
      finState.path = -1;
      if (scen.length) {
        $('fn-paths-wrap').hidden = false; $('fn-paths-title').textContent = F.paths_title || tf('fnPaths');
        const pb = $('fn-paths'); pb.innerHTML = '';
        scen.forEach((it, i) => {
          const b = document.createElement('button'); b.className = 'fn-step'; b.type = 'button';
          b.innerHTML = '<b></b><span></span>'; b.querySelector('b').textContent = it.name; b.querySelector('span').textContent = it.what || '';
          b.onclick = () => { finState.path = finState.path === i ? -1 : i; [...pb.children].forEach((c, j) => c.classList.toggle('on', j === finState.path)); };
          pb.appendChild(b);
        });
        finState.paths = scen;
      } else $('fn-paths-wrap').hidden = true;
      $('fn-refl-wrap').hidden = F.reflection === false; $('fn-refl-title').textContent = (F.reflection && F.reflection.question) || tf('fnRefl'); $('fn-refl').value = '';
      const sb = $('fn-steps'); sb.innerHTML = '';
      (F.steps || []).forEach((st, i) => {
        const b = document.createElement('button'); b.className = 'fn-step'; b.type = 'button';
        b.innerHTML = '<b></b><span></span>'; b.querySelector('b').textContent = st.title; b.querySelector('span').textContent = st.text || '';
        b.onclick = () => { finState.step = finState.step === i ? -1 : i; [...sb.children].forEach((c, j) => c.classList.toggle('on', j === finState.step)); };
        sb.appendChild(b);
      });
      const qs = (FILM.scenes.find((x) => x.type === 'questions') || {}).items || [];
      $('fn-q-title').textContent = qs.length ? (F.questions_title || tf('fnQ')) : ''; $('fn-q').innerHTML = '';
      qs.forEach((q) => { const li = document.createElement('li'); li.textContent = q; $('fn-q').appendChild(li); });
      const c = F.contact;
      if (c && c.url && /^(mailto:|https:\/\/|tg:)/.test(c.url)) { const a = $('fn-contact'); a.hidden = false; a.textContent = c.label || 'Contact'; a.href = c.url.startsWith('mailto:') ? c.url + (c.url.includes('?') ? '&' : '?') + 'body=' : c.url; a.target = '_blank'; a.rel = 'noopener'; a._mail = c.url.startsWith('mailto:'); }
      recalc();
    }
    $('finale').hidden = false; document.body.classList.add('fin'); $('finale').scrollTop = 0;
  }
  function verdict() {
    const r = finState.risk; if (r.some((x) => x === null)) { $('fn-risk-v').textContent = ''; return; }
    const n = r.filter(Boolean).length; $('fn-risk-v').textContent = n === 3 ? tf('fnV3') : n === 2 ? tf('fnV2') : tf('fnV1');
  }
  function recalc() {
    const r = window.FilmModel.run(finState.cur), base = window.FilmModel.run(finState.base);
    finState.r = r;
    const ch = $('fn-change'); ch.textContent = pctStr(r.change); ch.style.color = r.change < 0 ? 'var(--them)' : 'var(--ok)';
    $('fn-change-l').textContent = tf('fnChange', { y: r.years[r.years.length - 1] }) + ' · ' + tf('fnInFilm', { v: pctStr(base.change) });
    $('fn-cross').textContent = r.cross ? tf('fnCross', { y: r.cross }) : tf('fnNoCross');
    const svg = $('fn-chart'), W = 560, H = 260, pad = 14, max = Math.max(110, ...r.you, ...r.them, ...base.you) * 1.08;
    const X = (i) => pad + (i / (r.years.length - 1)) * (W - 2 * pad), Y = (v) => H - pad - (v / max) * (H - 2 * pad);
    const path = (a) => a.map((v, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(v).toFixed(1)).join('');
    svg.innerHTML = `<line x1="${pad}" x2="${W - pad}" y1="${Y(100)}" y2="${Y(100)}" stroke="rgba(237,233,226,.15)" stroke-dasharray="4 6"/>` +
      `<path d="${path(base.you)}" fill="none" stroke="var(--you)" stroke-width="2" opacity=".3"/>` +
      `<path d="${path(r.you)}" fill="none" stroke="var(--you)" stroke-width="4" stroke-linejoin="round"/>` +
      `<path d="${path(r.them)}" fill="none" stroke="var(--them)" stroke-width="4" stroke-linejoin="round"/>` +
      r.years.map((y, i) => `<text x="${X(i)}" y="${H - 1}" fill="#8B9099" font-size="12" text-anchor="${i ? i === r.years.length - 1 ? 'end' : 'middle' : 'start'}" font-family="JetBrains Mono,monospace">${y}</text>`).join('');
  }
  function summary() {
    const F = FILM.finale, r = finState.r, lines = [];
    const dt = new Date(), ymd = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    lines.push(`${tf('sumHead')}: ${FILM.company?.name || ''}`, ymd, '');
    lines.push(tf('sumChanged') + ':');
    (F.inputs || []).forEach((inp) => { if (inp.param in finState.cur) lines.push(`- ${inp.label}: ${fmtIn(inp, finState.cur[inp.param])} (${fmtIn(inp, finState.base[inp.param])})`); });
    lines.push('', tf('sumResult') + ': ' + pctStr(r.change) + ' · ' + (r.cross ? tf('fnCross', { y: r.cross }) : tf('fnNoCross')));
    if (finState.riskQ && finState.risk.some((x) => x !== null)) { lines.push('', tf('sumRisk') + ':'); finState.riskQ.forEach((q, i) => lines.push(`- ${q} ${finState.risk[i] === true ? tf('fnYes') : finState.risk[i] === false ? tf('fnNo') : '—'}`)); if ($('fn-risk-v').textContent) lines.push($('fn-risk-v').textContent); }
    if (finState.paths && finState.path >= 0) lines.push('', tf('sumPath') + ': ' + finState.paths[finState.path].name);
    lines.push('', tf('sumStep') + ': ' + (finState.step >= 0 ? F.steps[finState.step].title : tf('sumNoStep')));
    const refl = ($('fn-refl').value || '').trim(); if (refl) lines.push('', tf('sumRefl') + ':', refl);
    const qs = (FILM.scenes.find((x) => x.type === 'questions') || {}).items || [];
    if (qs.length) { lines.push('', tf('sumQ') + ':'); qs.forEach((q, i) => lines.push(`${i + 1}. ${q}`)); }
    return lines.join('\n');
  }
  $('b-finale').onclick = openFinale;
  const closeFinale = () => { $('finale').hidden = true; document.body.classList.remove('fin'); wake(); };
  $('fn-close').onclick = closeFinale; $('fn-back').onclick = closeFinale;
  $('fn-reset').onclick = () => { finState.cur = Object.assign({}, finState.base); (FILM.finale.inputs || []).forEach((inp) => { if (inp._el) { inp._el.value = finState.base[inp.param]; inp._show(); } }); recalc(); };
  $('fn-copy').onclick = async () => {
    const txt = summary();
    try { await navigator.clipboard.writeText(txt); } catch { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }
    const b = $('fn-copy'); b.textContent = tf('fnCopied'); setTimeout(() => { b.textContent = tf('fnCopy'); }, 1800);
  };
  $('fn-dl').onclick = () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([summary()], { type: 'text/plain;charset=utf-8' }));
    a.download = ((FILM.company?.short_name || FILM.company?.name || 'film') + '-numbers.txt').replace(/[^\w.\-а-яё]+/gi, '_'); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('fn-contact').onclick = (e) => { const a = $('fn-contact'); if (a._mail) a.href = a.href.split('body=')[0] + 'body=' + encodeURIComponent(summary()); };
  window.__openFinale = openFinale;

  labels();
  const emb = document.getElementById('example-film');
  if (!emb && location.protocol === 'file:') $('example').hidden = true;   // nothing to fetch from a double-clicked file
  if (emb && emb.hasAttribute('data-autoload')) { $('paste').value = emb.textContent.trim(); openFromText($('paste').value); }
  const q = new URLSearchParams(location.search).get('film');
  if (q) fetch(q).then((r) => r.text()).then(openFromText).catch((e) => { $('err').textContent = t('bad') + e.message; });
})();
