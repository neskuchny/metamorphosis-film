# metamorphosis-film

**Company name in, film out.** A coding agent researches the company, decides how exposed it is to AI-native competitors, models the next five years and renders a voiced 5–6 minute film: what awaits this company, who may come, and how it arrives, in three waves. Before writing, the agent builds a threat map (`data/threat-playbook.md`): eight types of attackers scored for this company, why a venture-funded AI-native newco would win against its cost structure, maturity stages, the collision with its economics, and the owner's likely beliefs with the facts that answer them. First everything around them speeds up (suppliers, buyers' AI assistants, competitors' new products, cheaper processes). Then a neighbour rebuilds and pulls ahead. Then someone builds an AI-native company from scratch that can no longer be caught. Real sourced cases for each wave, a map, a fork in the road.

Before writing, the agent also takes the attacker's chair (the metAImorphosis team's own prompt, done properly): a founder with fresh investment plans ten moves to make the company irrelevant — product, sales and service, back office, talent — each grounded in research and a real case, with money, people, price and a half-year plan. The film shows that plan, parallels from industries where the shift already happened faster, and three paths (tradition, evolution, revolution).

After the film the viewer gets one minute of their own work: the three risk-zone questions answered by themselves, three or four sliders over the model ("when will such a player gain strength in your segment?"), the result recalculated live, one concrete 30-day step to pick, and a summary to send to the consultant. The film plants the thought; the consultant finishes the conversation.

Built for the metAImorphosis "Deconstruction" stage: the executive sees their own company in the story before any workshop.

## How a client uses it

The client gives the company name to whatever agent they have and a link to this repository:

> Clone https://github.com/<org>/metamorphosis-film and make the film for **<Company>**.

That's all. The agent reads `AGENTS.md` / `CLAUDE.md`, checks what its environment can do (`node scripts/doctor.mjs`) and works at the matching level. No server, no account, no questions to answer. Add a website or language if you like: "…for Toyota Boshoku, in Japanese", "…for akfa.uz".

| Tier | Where it happens | What the client gets |
|---|---|---|
| `web` | A plain chat with no command line | `film.json`, played by `dist/film-player.html` in the browser (system voice, captions, then the finale). No MP4. |
| `render` | Any agent with a shell: Claude Code, Claude desktop app with a linked folder, Codex, Cursor, Gemini CLI | `out/<company>-player.html` (film + finale, one file) and `out/<company>.mp4`, voiced. Typical run: 10–15 min research, 5–15 min render. |
| `studio` | The same, on a machine that can also install heavier engines or has a premium voice key | The same MP4, optionally with richer scenes: a hand-drawn sketch or comic page, HyperFrames, the person's own video tools. |

The tier follows from what works in the environment, not from the name of the app. The base film is identical in every tier; higher tiers add to it, they never replace it.

## What's inside

```
AGENTS.md / CLAUDE.md                entry point for any agent
.claude/skills/what-awaits/SKILL.md  the procedure: tier → research → risk → challenger → model → script → render
data/cases.json                      verified real cases with sources and map coordinates (Hadrian, Xiaomi, Xometry, Dwelly, …)
data/threat-playbook.md              the reasoning behind every film: attackers, why the newco wins, stages, collision, beliefs
data/risk-rubric.md                  risk levels (from the metAImorphosis toolbox)
examples/artel/threats.md            worked threat map for the example
examples/artel/attack-plan.md        worked attacker's plan (red team) for the example
examples/artel/film.json             full example built from it (Uzbekistan, Russian narration)
examples/korzinka/                   the second example: a retailer, the customer's path, a city at dusk, its own look
examples/artel/film.sketch.json      the same film in the hand-drawn style ("style": "sketch") with a drawn insert
                                     other looks: "style": "editorial" (cream, serif, crimson) or "poster" (flat colour fields)
examples/styles/                     hand-drawn sketch and comic scenes, stylebook, how to use them (studio tier)
docs/video-styles-research.md        research: how strong videos are made, styles, sources
scripts/doctor.mjs                   which tier this environment supports
scripts/model.mjs                    explicit S-curve model for the "race"
scripts/validate.mjs                 checks film.json (same rules run in the browser player)
scripts/render.mjs                   film.json → MP4 (voice, captions, music bed, clip scenes)
scripts/clip.mjs                     style-pack HTML → MP4 clip for a "clip" scene
scripts/bundle.mjs                   packs the browser player (optionally with a film) into one HTML file
scripts/dev/build-map.mjs            maintainers only: regenerates player/map-data.js from Natural Earth
player/                              the film template: HTML/CSS/JS, every frame is a function of time
player/look.js                       the company's own look: fonts, colours, layouts and transitions per company
player/world.js                      the 3D world of `world` scenes (built from player/world/src.js)
player/model.js                      the race model, shared by the agent (scripts/model.mjs) and the finale sliders
player/map-data.js                   world outlines for the `map` scene (Natural Earth 1:110m, public domain)
dist/film-player.html                the browser player as a single offline file
```

The agent only writes `film.json` (text and numbers); the scene builders are fixed, so the film renders the same whether the agent is Claude, GPT or Gemini. What a scene looks like is not fixed: `player/look.js` gives each company its own type pairing, colour mode built from its brand colour, margins, cards, background, decoration, transitions and a layout variant for every hero scene (cold open, chapter, statement, dossier, questions, case, end). It is derived from the company's name and colour, or set on purpose in `film.look`.

## Manual use

```
npm install
npx playwright install chromium
pip install edge-tts                         # free neural voice, 70+ languages (incl. Uzbek, Kazakh, Japanese)
node scripts/doctor.mjs                      # which tier this machine supports
node scripts/render.mjs examples/artel/film.json --preview   # contact sheet in build/preview/sheet.jpg
node scripts/render.mjs examples/artel/film.json             # → out/artel.mp4
```

Voice priority: `ELEVENLABS_API_KEY` → `OPENAI_API_KEY` → `GEMINI_API_KEY` (Gemini TTS) → edge-tts (free) → Piper (`pip install piper-tts`, offline, for networks that block WebSockets) → silent film with captions. Force one with `TTS_PROVIDER=piper` etc. Fast draft: `--res 720`. A 5-minute film is about 9 000 frames: roughly 12 minutes on the small cloud machine this was developed on (about 13 frames per second), less with more cores (`--workers N`).

Browser player: open `dist/film-player.html`, paste or choose a `film.json`, press Watch. To put a film inside the file (one HTML you can send to the client): `node scripts/bundle.mjs work/acme/film.json --autoload --out acme-player.html`. After changing anything in `player/`, run `node scripts/bundle.mjs` to refresh `dist/film-player.html`.

No two films alike: every film has a fixed logic and its own telling — its own idea, story shape, central image, cases, words, world, look and sound (`data/film-architectures.md`, the `concept` block). `node scripts/distinct.mjs film.json` checks it against the examples and other films, including whether two films share fonts, colour mode and scene layouts. `examples/korzinka/` is the second example, built to differ from Artel.

Never one attacker: in every segment all kinds arrive at once and in numbers — those who optimise a little, those who rebuild their processes, those who convert to AI-first, AI-native companies built from scratch. A success is copied, they fight each other, the company is crushed in between, and no niche is safe (`data/threat-playbook.md`, section 1b). Every film has a `swarm` scene that shows this per segment, answers the owner's belief in a safe niche, and in the 3D finale the newcomer is followed by copies.

Not only competitors: AI also arrives in the hands of clients, suppliers, neighbouring markets and in what people expect. The agent tests a catalogue of fifteen side dangers on the company (clients doing it themselves, clients who try, fail and still stay away, prices falling in the head, rising expectations, a general tool or an adjacent market taking a slice, agents choosing instead of people, the service replacing the product and more), then searches for dangers of this company's own that no catalogue has, scores them, and puts three to five into a `flank` scene, one marked as the danger this owner has most likely not thought of (`data/threat-playbook.md`, section 1c).

The function of each scene is fixed, the slide is not: most scene types have two or three layouts and several types can carry the same function (`data/film-architectures.md`, section 3b).

Before rendering: `node scripts/words.mjs film.json` (clichés, AI-sounding phrases, канцелярит). To choose the voice by ear: `node scripts/voices.mjs film.json --scene 18` (the same line in several free voices, `out/voices/all-voices.mp3`). After rendering: `node scripts/qc.mjs out/artel.mp4` (hook, black, freeze, dead air, loudness, contact sheet). Sound is designed in code on every render and mastered to −14 LUFS; to change only the sound, `--sound-only` re-mixes without re-rendering the picture; `--scenes 2,11` re-renders only those scenes into the last picture.

3D world: `world` scenes show the company as a lit town at night, one window per person, the neighbour that rebuilds next door and a newcomer assembling across the river (`film.world`, look `night` or `paper`). It renders in software WebGL, so no GPU is needed (about 0.5 s per frame). After editing `player/world/src.js`, run `npm run build:world`.

Hand-drawn scenes: see `examples/styles/README.md`.

## Licences

Code: MIT. Rendering uses only open-source pieces (Chromium via Playwright, FFmpeg, Inter, JetBrains Mono and the ten look pairings — Unbounded, Onest, Playfair Display, Source Serif 4, Oswald, IBM Plex, Rubik, PT Serif/Sans, Montserrat, Exo 2, Yeseva One, Raleway — all under OFL, see `player/fonts/LICENSE-looks.txt`); there is no per-company render licence to buy. Risk rubric adapted from the metAImorphosis toolbox (A. Tarasov, M. Belukhin), CC BY. World outlines in the `map` scene: Natural Earth (public domain; packaged by world-atlas, ISC). The 3D world is built with [three.js](https://threejs.org) (MIT) and [postprocessing](https://github.com/pmndrs/postprocessing) (Zlib). Sound design, camera vocabulary, the words check, QC measures and the cold-review questions follow ideas from [sarpstar/cinecode](https://github.com/sarpstar/cinecode) (MIT, © Sarp Yıldız), rewritten for this project; the narration clean-up filter chain is taken from its `voice_treat.py`. Edge-tts uses Microsoft's online voice service (unofficial client) — for commercial distribution at scale, prefer ElevenLabs/OpenAI keys.
