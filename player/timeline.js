/* Timeline builder shared by the renderer (Node) and the browser player.
   build(film, speechSeconds, clipSeconds) -> { timeline, total }
   speechSeconds[i]: measured narration length of scene i (from TTS) or null to estimate from text length.
   clipSeconds[i]:   length of the video file of a "clip" scene, 0 otherwise. */
(function (root) {
  const CHARS_PER_SEC = 14.5;
  const MIN_DUR = { cold_open: 7, statement: 5, chapter: 3.2, dossier: 10, timeline: 12, race: 12, scissors: 10, pillars: 12, signals: 10, map: 12, waves: 14, moment: 10, attackers: 12, anatomy: 12, ladder: 12, myths: 12, plan: 14, parallels: 12, scenarios: 12, beneath: 12, world: 8, path: 12, case: 9, fork: 10, questions: 10, clip: 4, end: 6 };

  function splitCaptions(text) {
    const sents = String(text).replace(/\s+/g, ' ').trim().split(/(?<=[.!?…。！？])\s*/).filter(Boolean);
    const out = [];
    for (const s of sents) {
      if ([...s].length <= 95) { out.push(s); continue; }
      let rest = s;
      while ([...rest].length > 95) {
        const mid = Math.floor(rest.length / 2);
        const cands = [...rest.matchAll(/[,;:—–、，]\s?/g)].map((m) => m.index + m[0].length);
        let cut = cands.sort((a, b) => Math.abs(a - mid) - Math.abs(b - mid))[0];
        if (!cut || cut < 20 || cut > rest.length - 15) { cut = rest.lastIndexOf(' ', mid + 10); if (cut < 20) cut = mid; }
        out.push(rest.slice(0, cut).trim()); rest = rest.slice(cut).trim();
      }
      if (rest) out.push(rest);
    }
    return out;
  }

  function build(film, speechSeconds, clipSeconds) {
    let t = 0;
    const timeline = film.scenes.map((s, i) => {
      const lead = s.type === 'chapter' ? 0.4 : 0.6;
      const speech = (speechSeconds && speechSeconds[i]) || (s.narration ? [...s.narration].length / CHARS_PER_SEC : 0);
      const tail = s.type === 'end' ? 2.5 : 0.9;
      const clip = (clipSeconds && clipSeconds[i]) || 0;
      const dur = Math.max(MIN_DUR[s.type] ?? 6, speech ? lead + speech + tail : 0, clip) + (s.hold || 0);
      const speechStart = lead, speechEnd = lead + speech;
      const caps = splitCaptions(s.narration || '');
      const tot = caps.reduce((a, c) => a + [...c].length, 0) || 1;
      let acc = 0;
      const captions = caps.map((c) => { const a = speechStart + (acc / tot) * speech; acc += [...c].length; return { a, b: speechStart + (acc / tot) * speech, text: c }; });
      let slots;
      if (s.type === 'questions' && Array.isArray(s.items)) {
        const L = s.items.map((q) => [...q].length), T = L.reduce((a, b) => a + b, 0) || 1;
        let c = 0; slots = L.map((l) => { const x = speechStart + (c / T) * speech - (c ? 0.2 : 0.3); c += l; return Math.max(0, x); });
      }
      const item = { start: t, dur, speechStart, speechEnd, captions, slots };
      t += dur;
      return item;
    });
    return { timeline, total: t };
  }

  const api = { CHARS_PER_SEC, MIN_DUR, splitCaptions, build };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.FilmTimeline = api;
})(typeof window !== 'undefined' ? window : globalThis);
