#!/usr/bin/env node
/* Simple, explicit "race" model so the numbers in the film are consistent and explainable.
   node scripts/model.mjs '{"from":2026,"to":2031,"market_growth":0.04,"your_share":0.35,
                            "attacker_cap":0.30,"attacker_mid":2029.5,"attacker_k":1.3,"taken_from_you":0.6}'
   Prints years[], you[] and them[] for the "race" scene, the "model" block for film.json (the browser finale
   lets the viewer move these numbers), and the assumptions line. The maths lives in player/model.js. */
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { self: {} };
vm.runInNewContext(fs.readFileSync(new URL('../player/model.js', import.meta.url), 'utf8'), ctx);
const { run } = ctx.self.FilmModel;
const r = run(JSON.parse(process.argv[2] || '{}'));
const p = r.params;
console.log(JSON.stringify({ years: r.years, you: r.you, them: r.them }));
console.log('\n"model": ' + JSON.stringify(p));
console.log(`\nyour revenue ${p.to} vs ${p.from}: ${r.change > 0 ? '+' : ''}${r.change}%   challenger reaches ${r.them[r.them.length - 1]}% of your starting revenue${r.cross ? `, overtakes you in ${r.cross}` : ''}`);
console.log(`assumptions: market +${Math.round(p.market_growth * 100)}%/yr; your share ${Math.round(p.your_share * 100)}%; challenger S-curve to ${Math.round(p.attacker_cap * 100)}% share, midpoint ${p.attacker_mid}; ${Math.round(p.taken_from_you * 100)}% of its share comes from you`);
