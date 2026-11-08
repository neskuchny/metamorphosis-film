# metamorphosis-film — instructions for any coding agent

This repository turns a **company name** into a voiced 5–6 minute film, "what awaits this company in the AI era", followed by a one-minute finale where the viewer checks their own numbers and picks a first step.

When the user gives you a company name (with or without a website, country or language):

1. Read `.claude/skills/what-awaits/SKILL.md` completely and follow it step by step. It is the full procedure.
2. Do **not** ask the user any questions. Choose the most likely interpretation, note it, and keep going.
3. Run `node scripts/doctor.mjs` to see what this environment can do (Step 0 of the skill). If you cannot run commands at all, you are in the `web` tier.
4. Deliver `out/<slug>-player.html` (the film plus the finale, one file) and `out/<slug>.mp4` (tiers `render` and `studio`), or `film.json` plus the browser player `dist/film-player.html` (tier `web`, no MP4).

Setup if not done yet:

```
npm install
npx playwright install chromium
pip install edge-tts        # free voice; alternative offline voice: pip install piper-tts
```

Key files:
- `.claude/skills/what-awaits/SKILL.md` — research → threat map → attacker's plan (red team) → three waves → model → script → finale → render
- `data/cases.json` — verified real-world cases with sources (only source of cases besides what you fetch yourself)
- `data/threat-playbook.md` — how to think about who breaks this company and how: attacker types, why a venture-funded AI-native newco wins, a crowd from every side rather than one attacker (1b), dangers from the side that are not competitors (1c), maturity stages, the collision, the owner's beliefs (Step 2, mandatory)
- `data/risk-rubric.md` — how to decide the risk level
- `examples/artel/threats.md`, `examples/artel/attack-plan.md` and `examples/artel/film.json` — a worked threat map, the attacker's plan and the film built from them (Russian). Examples show the format, never the content
- `data/film-architectures.md` — what every film shares and what must be this company's alone: story shapes, central images, the `concept` block (Step 2c)
- `examples/korzinka/` — a second example built to differ from Artel: a retailer, the customer's path, a city at dusk, other cases
- `scripts/doctor.mjs` — which tier this environment supports (`web` / `render` / `studio`)
- `scripts/validate.mjs`, `scripts/model.mjs`, `scripts/render.mjs` — check, model, render
- `scripts/words.mjs` — the words check: clichés, AI-sounding and sales phrases, канцелярит, long sentences (run before rendering)
- `scripts/sound.mjs` — sound design in code (bed, hits, year ticks, picture-locked taps, silences), used by render; `--sound-only` re-mixes without re-rendering the picture
- `scripts/distinct.mjs` — is this film its own? Shared sentences, titles, cases, scene order and world with the examples and other films; how much of it speaks in the company's own words
- `scripts/qc.mjs` — measured checks on the MP4 (hook, black, freeze, dead air, loudness) and a contact sheet for the cold review
- `scripts/voices.mjs` — the same line in several free voices, to choose the voice by ear
- `player/look.js` — the company's own look (fonts, colour mode from the brand colour, layouts per scene, transitions); set `film.look` on purpose, never copy an example's
- `player/world.js` — the 3D world of `world` scenes (the company as a lit town; built from `player/world/src.js` with `npm run build:world`; three.js MIT, postprocessing Zlib)
- `scripts/clip.mjs`, `examples/styles/` — hand-drawn sketch and comic scenes as video clips (studio tier, optional)
- `scripts/bundle.mjs` — packs the browser player (optionally with a film inside) into one HTML file
- `dist/film-player.html` — the browser player: paste film.json, watch it, no install

Do not edit `player/` or `scripts/` to make a film fit — change the text in film.json instead.
