/* The "race" model, shared by scripts/model.mjs (Node) and the browser finale (web.js), so the film and the
   viewer's own sliders always compute the same numbers. Revenue indices: your revenue in the first year = 100.
   market_growth   yearly growth of the whole market (0.04 = 4%)
   your_share      your share of the market you are measured in
   attacker_cap    share the AI-native challenger reaches at saturation
   attacker_mid    year when it is halfway to that cap
   attacker_k      steepness of its S-curve (1.0 slow … 1.8 fast)
   taken_from_you  part of the challenger's share that comes out of yours (0..1) */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.FilmModel = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const DEFAULTS = { from: 2026, to: 2031, market_growth: 0.04, your_share: 0.3, attacker_cap: 0.25, attacker_mid: 2029.5, attacker_k: 1.3, taken_from_you: 0.5 };
  function run(params) {
    const p = Object.assign({}, DEFAULTS, params || {});
    const years = [], you = [], them = [];
    const logi = (y) => p.attacker_cap / (1 + Math.exp(-p.attacker_k * (y - p.attacker_mid)));
    const base = logi(p.from);
    for (let y = p.from; y <= p.to; y++) {
      const market = Math.pow(1 + p.market_growth, y - p.from);
      const sa = Math.max(0, logi(y) - base);
      const sy = Math.max(0, p.your_share - p.taken_from_you * sa);
      years.push(y);
      you.push(Math.round(100 * market * sy / p.your_share));
      them.push(Math.round(100 * market * sa / p.your_share));
    }
    const change = you[you.length - 1] - 100;
    const crossIdx = them.findIndex((v, i) => v >= you[i]);
    return { years, you, them, change, cross: crossIdx >= 0 ? years[crossIdx] : null, params: p };
  }
  return { DEFAULTS, run };
});
