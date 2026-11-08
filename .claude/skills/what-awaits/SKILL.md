---
name: what-awaits
description: Make a 3–5 minute personalised film "what awaits this company in the AI era" from nothing but a company name — research, risk verdict, scenario model, script, voiced MP4. Use whenever the user names a company and wants the film, the video, the scenario or "what awaits us".
---

# What awaits <company> — a film from a company name

The viewer is an owner or executive of a mid-sized company anywhere in the world — a 40-person workshop in Samarkand or a listed manufacturer in Osaka. They will not fill in forms or answer questions. They will watch a few minutes of video about **their** company. The film has one job: remove the belief "this is not about us" — honestly, with evidence, and end with a way forward, not with doom.

## The contract

- **Input:** a company name. Optionally a website, country, or language. Nothing else is needed.
- **Never ask the user questions and never stop to confirm.** If the name is ambiguous, choose the most likely company (language of the request, country, industry, size), say which one you chose in the final message and in the dossier scene, and continue.
- **Language:** narration and on-screen text are in the language the user wrote the request in, unless they asked for another one. Fill `ui` labels in that language.
- **Output:** `out/<slug>.mp4`, plus `work/<slug>/film.json` and `work/<slug>/research.md` with every source. If you cannot run commands (the `web` tier, Step 0) the output is `film.json` and the browser player instead of an MP4.
- **Time budget:** research ~10–15 minutes, render 5–15 minutes. Do not go down rabbit holes.

## Step 0 — what can this environment do? Pick the tier

Run `node scripts/doctor.mjs` (add `--json` if you want to parse it). It prints one of three tiers. Pick by what works here, never by the name of the app you are running in: the same desktop app can be a full machine today and a locked-down sandbox tomorrow.

| Tier | Meaning | You deliver |
|---|---|---|
| `web` | You cannot run commands (a plain chat window), or Node, Chromium or ffmpeg are missing | `film.json` and the browser player. No MP4. |
| `render` | Node, Chromium and ffmpeg work | `out/<slug>.mp4` |
| `studio` | `render`, plus room for heavier engines (HyperFrames can be installed, or a premium voice key is set) | the same MP4, optionally with richer scenes (Step 6b) |

If you cannot run any command, you cannot run doctor either: you are in the `web` tier. Do the research with whatever search and fetch you have, write `film.json` (Steps 1–6), and hand it over as described in Step 7 (web tier). Be plain about what the person gets: a film that plays in the browser with the system voice, not a video file.

Setup for the `render` and `studio` tiers, once per machine (fix what doctor lists under `fix`):

```
npm install
npx playwright install chromium        # skip if Chrome/Chromium is already available (CHROME_PATH)
pip install edge-tts                   # free neural voice, 70+ languages; or: pip install piper-tts (offline)
```
ffmpeg must be on PATH (or `npm i ffmpeg-static`). If `ELEVENLABS_API_KEY` or `OPENAI_API_KEY` is set, the renderer uses it automatically for a better voice. If nothing works, it renders a silent film with captions — still deliver it and say how to add the voice.

## Step 1 — research

Write findings into `work/<slug>/research.md` as you go: one line per fact, with URL and date. Aim for 15–30 searches/fetches.

**A. Identity.** What they make or sell, to whom, where. Founding year. Size signals: employees, revenue, sites, fleet, stores, export countries. Ownership. Flagship products. Sales channels (dealers, marketplaces, tenders, direct). Recent news (expansion, new markets, financing, problems).

**B. Value chain — the most important part.** Map how money flows: demand → enquiry → quote/price → design/engineering → procurement → production/delivery of service → quality → logistics → installation/service → repeat purchase. For each step note who does it today, how long it takes, what is manual. Evidence comes from:
- the website: "request a quote" forms, "a manager will call you back", PDF price lists, dealer maps, phone-only ordering;
- job ads: roles they keep hiring (estimators, dispatchers, call-centre, sales engineers, accountants) show where human labour and bottlenecks sit;
- reviews of customers and employees: complaints about speed, quotes, delivery, service, chaos.

**C. Market.** Size and growth, typical margins, local competitors, global leaders, imports (especially Chinese), consolidation.

**D. The AI-native movement in this industry, worldwide.** Start from `data/cases.json` (verified, with sources). Add a new case only if you fetched a source for it and it fits the industry. Look for: funded AI-native entrants, AI roll-ups buying traditional firms, marketplaces with instant pricing, "lights-out" / lighthouse factories, incumbents that cut cycle times by multiples.

**E. Moats.** Licences, concessions, safety-critical certification, unique physical assets, exclusive relationships, regulation. Be honest — these decide the risk level.

**Where to look — by region, not one country's services.** Company site and its language versions; national registries (OpenCorporates as aggregator; Companies House UK, SEC EDGAR US, EDINET Japan, DART Korea, Handelsregister/North Data Germany, orginfo.uz Uzbekistan, stat.gov.kz/kgd Kazakhstan, rusprofile Russia, MCA India…); rating agencies' press releases; local business press; job boards through search (LinkedIn, Indeed, hh.ru/hh.uz/hh.kz, Bayt, Naukri, doda/mynavi in Japan); reviews (Google Maps, Trustpilot, Glassdoor, 2GIS, Yandex Maps, marketplaces); trade-fair exhibitor lists; public tenders (TED, SAM.gov, national portals).

**Thin web presence (small companies).** Switch to archetype mode: "a company like yours — <industry>, <city>, <size>". Use industry and country data, keep every company-specific claim you did find, and say it plainly in the film: *we found almost nothing about you in open sources — and that is a signal too: buyers and their AI assistants won't find you either.* This line works; use it.

## Step 2 — think: the threat map (do not skip, do not shortcut)

This is where the film is won or lost. A generic film ("AI is coming") convinces nobody; a film that names *who* comes, *how*, *when* and *why they would win against this company's economics* changes minds. Read `data/threat-playbook.md` completely (section 9 carries what the metAImorphosis programme wants the owner to take away), then write `work/<slug>/threats.md` from its template, using only facts from `research.md`, `data/cases.json` and your fetched sources, with estimates and model numbers labelled as such. `examples/artel/threats.md` is a worked example.

The threat map must contain:
1. **Where the money is**: value chain steps, which are manual, where the profit pool sits.
2. **What AI changes on each step**: today vs AI-native, with a case or source per claim.
3. **All eight attacker types scored** (likelihood, when, what they take first, damage, why). Pick the top two or three for the film. Different companies get different top threats: a services firm may face a roll-up as its "monster", a retailer the platform in between, a manufacturer the newco with its own plants.
4. **Why the newco wins here**: the eight points of playbook section 3 in this company's terms, with a cost structure (100 units of price, you vs AI-native) for the `anatomy` scene, labelled model.
5. **Maturity and the experience gap**: the company's stage (an estimate, say so), where the neighbour gets to, where the newco is born; what the neighbour's first, probably clumsy AI step looks like from outside, and what experience piles up underneath (playbook mechanism 0).
6. **The collision**: revenue at risk, price pressure, fixed costs, the year break-even is crossed (model).
7. **Two or three beliefs** the owner probably holds, each with the fact or case that answers it.
8. **Speed modifiers and protections**, then the risk verdict.

**Risk verdict.** Apply `data/risk-rubric.md` (three questions, high-risk industries, protective factors). Record `risk.level` (high / medium / low) and `risk.why` in film.json. The level sets the tone:
- **high**: the full arc.
- **medium**: the same arc, slower curves and later years, more weight on the opportunity.
- **low**: say it: "your moat is real". Show what erodes it at the edges (talent, service, data, sales channels) and what they could build. Never invent doom; credibility is the product.

Set `"threats": "threats.md"` in film.json (path relative to film.json) so the consultant can open the reasoning behind the film.

## Step 2b — red team: sit in the attacker's chair

Now switch sides. You are a serial entrepreneur who has just raised serious money to make this company irrelevant with an AI-native company. Write `work/<slug>/attack-plan.md` from the template in `data/threat-playbook.md` (section 8); `examples/artel/attack-plan.md` is a worked example. This is the metAImorphosis team's own client prompt, done properly: every move rests on the research and on a case, the plan aims at the profit pool, it has money, people, price, a half-year action plan, the incumbent's best response and the kill criteria.

Ten moves in four areas: product (3), front office — marketing, sales, service (3), back office (2), talent (2). They feed:
- the `plan` scene: the founder's one-line memo and the ten moves, short (≤70 characters each), in four columns;
- the `attack_plan` block in film.json: the ten moves in full (`area`, `move`, `how`, `replaces`, `takes`, `when`), opened by the viewer in the finale; set `"attack_plan_file": "attack-plan.md"` too;
- the waves and the race: the plan's timeline must match them.

Also list, in the threat map, **players that do not exist yet** in this market and when they would appear (an agent-run distributor portal, a brand without plants, a roll-up of service centres…). And find **parallels where it already happened faster** — industries where the same shift is already measured, with sources (`data/cases.json` has several: Anthropic's code merges, Cursor's revenue per employee, Dwelly, the AI roll-up funds, the February 2026 repricing of expert-services companies). They become the `parallels` scene, closed by: "in your industry it is slower; slower is not never".

## Step 2c — the film's own idea (no two films alike)

These films travel by word of mouth: an owner sends theirs to a friend, the friend makes one. If the friend's film has the same examples, titles, pictures and sentences with other numbers, it reads as a template, and a template argues that AI is a mail merge — the opposite of the film's point. Read `data/film-architectures.md` completely, then decide, for this company and this owner:

1. **The idea** — one sentence this film says that no other film says.
2. **The architecture** — the story shape (chronicle, letter from the end, the customer's path, the attacker's pitch, one day two companies, countdown to break-even, three witnesses). Do not default to the chronicle; write why the shape fits.
3. **The central image** — what a stranger sees at this company's door, with the numbers turned into things in it; it decides `world.kit`, `world.time`, `world.light`, the cold open and the signature motif that returns three times.
4. **What is researched fresh** — at least two cases or parallels not in `data/cases.json` and not in any example film, with fetched sources; chapter titles, the moment, myths and questions in this company's own words.

Write it into `concept` in film.json (format in `data/film-architectures.md`, section 5). **The examples show the format, never the content**: do not reuse their titles, sentences, metaphors, cases or the moment. `node scripts/distinct.mjs` checks it before the render.

## Step 3 — the three waves and the challenger

**Not one attacker per wave: a crowd.** The waves say when each kind of player becomes visible; in every segment of this company's market all kinds appear at once and in numbers — those who optimise a little, those who rebuild their processes, those who convert to AI-first, those who build AI-native from scratch — and a success is copied. They fight each other and the company is crushed in between; no niche stays safe (`data/threat-playbook.md`, section 1b). Put one `swarm` scene in every film, after the challenger's numbers: 3–6 segments of this company's market in its own words, `end_share` (how much of today's position is left), a punchline in the company's terms. Answer the niche belief in `myths` ("the newcomer takes its niche, we keep ours"). The world's finale shows the newcomer copied.

**Today's date sets the start.** Check the current date (do not assume it). The film starts "now" (for example, end of 2026) and looks five years ahead. Put the date in `now` at the top level ("2026 Q4") and in the `waves` scene.

The film shows **how** the change arrives, in three waves, each bigger than the last. **The waves are filled from the threat map, not from the example**: put the company's top attacker types where they belong (wave 1: types 1, 6, 7 from the playbook; wave 2: types 2, 3, 8; wave 3: type 5, or type 4, the roll-up, when that is the real endgame in this industry). Not every industry gets all three at the same speed, and the film may say so, but the order is the point: it is what makes the end feel inevitable rather than imagined.

1. **Wave 1, everything around you speeds up (now → +1 year).** Suppliers quote in a day, buyers ask AI assistants instead of dealers, an importer launches a regional line in months, partners' cost per order falls. Nothing hits the core yet; every signal is easy to explain away. Scenes: `signals`.
2. **Wave 2, a neighbour adapts (+1 → +3 years).** Not a newcomer: one of their current competitors rebuilds its processes on AI and becomes markedly faster with the same plants and dealers. Always a **composite, unnamed** competitor ("Сосед", "A competitor who rebuilt"), said on screen. Start the wave with `beneath`: above the waterline, the neighbour's visible first step, often clumsy (a chatbot that answers off-topic); below it, what accumulates in parallel (what works and what does not, the next processes, retrained people, structured data, the next project in weeks); the line "they are not smarter or richer, they just started". A failed project is tuition; the incumbent's market experience is matched by a new kind of experience it does not have. Then `scissors` (you vs the neighbour, 3 rows), then `moment`: one concrete message from the future that makes it personal (a distributor moving 40% of the order, a key client's procurement email). The moment is fictional and says so in `note`; the mechanism is real.
3. **Wave 3, a company built from scratch (+2 → +5 years).** The AI-native challenger: a **fictional composite** with a short invented name (one search to make sure no real company in that industry uses it). It may only do things that real companies in `data/cases.json` or your sources have actually done. Say on screen that it is fictional (chapter `sub`) and once in narration. **Never cast a real competitor as the villain.** Scenes: `plan` (the founder's plan from Step 2b), `anatomy` (why it is cheaper: the price structure, you vs it), a `statement` on capital ("you defend with this year's profit; they attack with five years of investors' money", and that they hit the most profitable segment first), `race` (the model; a `timeline` of how it appears is optional when the plan already shows it), then one `statement` on inevitability: such a company will appear in every large industry; the only question is who builds it.

Typical wave-3 sequence, adapt to the industry: it starts without a plant (design by AI, contract capacity), eats the margin around the core (instant quotes, digital channel, service), lets buyers' AI agents compare suppliers, hires away the best people, buys or uses weakened incumbents (roll-up), and finally builds AI-native capacity at a different cost base.

**Map cases to waves.** Each `case` gets a kicker naming its wave: wave 1 (the buyer moves to a platform), wave 2 (an existing company rebuilt itself), wave 3 (built from scratch). Research them for this industry and region first (Step 2c asks for at least two not in `data/cases.json`); take the rest from `data/cases.json`, and prefer the cases nearest to this company's business over the famous ones.

## Step 4 — the model

Run `node scripts/model.mjs '<json>'` with explicit parameters (market growth, their share, challenger S-curve, share taken from them). Paste `years/you/them` into the `race` scene, the printed `"model": {…}` line into film.json top level (the browser finale recalculates from it; the validator warns if the race and the model disagree) and the printed assumptions into `assumptions`. For the `scissors` scene anchor "you" values on known facts (e.g. revenue ÷ headcount) or a clearly typical value for the industry; take multipliers from cases (×3–×5 output per person, hours → minutes for quotes are well documented). Tags in the dossier: `known` (sourced), `estimate` (your reasoned estimate), `model` (from the scenario). Narration must say once: "this is a model, not a forecast".

## Step 5 — the script

Use the architecture you chose in Step 2c. The table below is the chronicle (architecture A), the backbone the other shapes rearrange; it is not a template: every scene's content comes from `threats.md`, and a scene that has nothing true to say for this company is dropped. 26–29 scenes. **Target 5–6 minutes**: about 4 000–4 500 characters of narration in alphabetic languages (~14 characters per second of speech), 1 700–2 300 characters in Chinese/Japanese. `examples/artel/film.json` follows it (built from `examples/artel/threats.md`). Neural voices speak slower than the estimate: in Russian about 3 800 characters at `"voice": {"rate": "+8%"}` gave 5:53 (the validator's estimate said 5.1 min). Trust the render's printed length and trim if it runs past 6 minutes.

| Act | Scenes | Purpose |
|---|---|---|
| Open | `cold_open` | "This is a film about <Company>. It is the end of <year>. How your industry changes in five years, who may come, and why it cannot be stopped." |
| I. Who you are today | `chapter`, `dossier`, `statement` | Recognition: 3+ facts they know are true within 40 seconds. Then their strength first (what no newcomer has), and in the same scene why it can be bought: the risk verdict. Naming the strength before the threat lowers defensiveness. |
| II. How it happens | `chapter`, `waves`, `ladder`, `attackers` | The three waves on one picture; the maturity ladder (you, the neighbour, the newco); who may come: six attacker types from the threat map with timing and likelihood, the film's three deep dives marked `focus`. |
| Wave 1 | `chapter` (num "1/3"), `signals` | Everything around speeds up; signals from the top wave-1 attackers that they will explain away. |
| Wave 2 | `chapter` ("2/3", sub: composite competitor), `beneath`, `scissors`, `moment` | What really happens while the neighbour's first AI step looks clumsy; a year or two later the gap in numbers; then one concrete message from the future. |
| Wave 3 | `chapter` ("3/3", sub: challenger is fictional, every move is real), `plan`, `anatomy`, `statement` (capital), `race`, `statement` (accent, inevitability) | The founder's plan; why it is cheaper; why investors' money makes it dangerous; the model; inevitability. |
| III. It is already happening | `parallels`, 3 × `case`, `myths` (`map` optional) | Where it already happened faster, in other industries, with sources; then real cases in or near their industry, one per wave; then the two or three beliefs from the threat map, each answered. |
| IV. The fork | `chapter`, `scenarios`, `questions`, `end` | Three paths (metAImorphosis NewCo scenarios): Tradition (this film's scenario), Evolution (agents in processes; the electrification parallel: a motor instead of a steam engine was not enough, the factory had to be redesigned), Revolution (their own AI-native company inside, "then the challenger is you"). Then 3 questions only they can answer. The end card asks "How do you see <Company> now?" — a question, not a verdict — and points to the finale. (`fork` with two futures remains available.) |

`pillars` (the five fronts) is optional in this arc; add it after the race when the audience is the metAImorphosis programme team itself.

**Questions plant doubt, they do not lecture.** Each one should be answerable only by the viewer and slightly uncomfortable: a number they do not know ("how many hours from a dealer's request to a price?"), the moment scene turned into a question ("what will you answer that letter?"), and the from-scratch question ("if you were building <Company> from scratch in <next year>, what would you not build?").

The five fronts (`pillars`) follow the metAImorphosis framework: Product & business model · Market interaction · Back office · People · Data.

**Writing rules**
- Never mock a competitor's clumsy AI attempt. Present it as a step the viewer has not taken yet: a failed project is a useful project.
- Second person ("you"), concrete nouns from *their* business: their products, cities, channels, customer types. Short sentences. No hype words ("revolution", "game-changer", "unprecedented").
- Screen text ≠ narration. Screen: short labels and numbers. Narration: what a calm documentary narrator would say.
- **Write narration exactly as it must be pronounced.** Years and numbers in words where the language inflects them ("в две тысячи двадцать девятом", "четыреста пятьдесят миллионов долларов"); no %, $, ×, "Q3" in narration; brand names transliterated into the narration's script if the voice would mangle them (Xiaomi → «Сяоми» in Russian); expand abbreviations unless they are normally spoken.
- Every number appears on screen once and is either sourced, estimated with a basis, or labelled model.
- **Pass the words check** (`node scripts/words.mjs work/<slug>/film.json`). It lists tells: stock clichés («в мире, где», «новая эра», «правила игры»), staged run-ups («представьте», «давайте разберёмся»), «не просто X, а Y», inflated and sales words, канцелярит («является», «в рамках»), rhetorical questions, sentences over 24 words. A tell is a question, not a ban: replace it with a concrete thing from this company, or keep it with a reason (a belief quoted as a question in `myths` is fine).
- **The cut pass.** Read the narration aloud once and cut about a third of what does not change the viewer's belief. A line that only describes what the screen already shows goes (the caption test).
- The ending is a fork, never pure fear. Their 10–30 years of data, customers, service and people are the fuel the challenger lacks — that is the honest way out, and it is what makes the viewer act.

## Step 6 — film.json

Look at `examples/artel/film.json` for the format of each field, never for content (Step 2c). Reference:

Top level: `company{name, short_name, website, country, industry}`, `language`, `ui{known, estimate, model, year, you, source}` (required if language is not en/ru), `brand`, `start_year`, `attacker{name, is_fictional:true, built_from[]}`, `risk{level, why}`, `assumptions`, `scenes[]`, `sources[{title,url}]`. Optional `voice{provider, edge_voice, piper_voice, elevenlabs_voice_id, rate}`, `captions` (default true). `concept{idea, architecture, central_image, signature, specifics[], why}` (Step 2c, required). Optional `now` ("2026 Q4", today), `model` (from Step 4), `finale` (Step 6c), `threats` and `attack_plan_file` (paths to the reasoning files), `attack_plan` (Step 2b, shown in the finale). Optional `world{kit, time, light, you, them_start, them_end, sites, look, seed}` for `world` scenes. `kit`: `factory` (halls by a river, one lit window per person, `you` = headcount up to 12 000, `sites` = plants), `city` (a city at night or dusk: the company's stores or branches as lit signs in `light`, `sites` = stores up to 60, `you` = customers as lit windows in the apartment blocks; the neighbour's stores send couriers; the newcomer is a dark store at the city's edge whose courier lights pull customers away) or `logistics` (warehouses and highways: `sites` = warehouses, `you` = trucks; the newcomer is an automated hub with few windows and dense flows). `time`: `night`, `dusk`, `dawn` or `snow`. `light`: the company's colour for its own lights (brand colour, hex). `them_start`, `them_end`: the newcomer's people (factory), couriers (city) or trucks (logistics) at launch and at the end. `look`: `night` (lit, bloom, fog) or `paper` (a daylight paper diorama, tilt-shift). `seed` changes the layout and the camera; by default it comes from the company's name, so two companies never get the same town. Use world scenes where the architecture needs the central image — usually four, opening the parts; the same world returns changed, which is what makes it a film. Optional `style`, same scenes, layout and timing in every one: `"default"` (dark, the baseline), `"sketch"` (paper, marker ink, handwriting, lines that tremble like a hand-drawn explainer), `"editorial"` (cream paper, serif type, one crimson accent and typewriter tags: calm, museum-like, expensive; after Higgsfield's "Editorial Motion Graphics" explainer look) or `"poster"` (a flat colour field per scene in yellow, navy, magenta and cream, bold condensed type, hard shadows: energetic but adult; after "Poster Vector").

**Look.** Every film gets its own look from `player/look.js`: fonts, colours, layout variants of the hero scenes, decoration and transitions, derived from the company's name and colour. Set `look{brand, pairing, mode, cards, bg, decor, captions, transition, variants{...}}` in Step 2c to choose on purpose (pairings: grotesk, geometric, classic, editorial, news, friendly, russian, modern, tech, elegant; modes: night, paper, field, snow, ink). `style` (editorial, poster, sketch) is an older fixed preset; prefer `look`. `editorial` suits boards and conservative owners who distrust anything that looks like advertising; `poster` suits a younger team or a vertical teaser; `sketch` suits training and talks to staff. `sketch` has handwriting fonts for Latin and basic Cyrillic only; for other scripts keep the default. In a `sketch` film a drawn `clip` from `examples/styles/sketch.html` (Step 6b) sits naturally right after the scissors: same output or revenue with fewer people, with figure counts that keep the real proportion. `examples/artel/film.sketch.json` is the Artel film in this style with such an insert.

Every scene: `type`, `narration` (spoken text; optional only for `chapter`), `act` (small label bottom-left), `year` (sets the year counter top-right), `hold` (extra seconds). Scene length follows the voice automatically.

| type | fields | limits |
|---|---|---|
| `cold_open` | `kicker`, `lines[]` | ≤4 lines, ≤40 chars each; last line is accented |
| `statement` | `kicker`, `text`, `sub`, `accent` | text ≤100 chars |
| `chapter` | `num`, `title`, `sub` | title ≤30 chars |
| `dossier` | `title`, `facts[{label, value, note, tag}]` | 6 facts; value ≤12 chars (number + unit); tag known/estimate/model |
| `timeline` | `title`, `events[{when, label, side, text}]` | 5–7 events; when "2027 Q3"; side them/you/market; text ≤75 chars |
| `signals` | `title`, `items[{when, from, text}]` | 3–5 items; text ≤85 chars |
| `scissors` | `title`, `year`, `you_label`, `them_label`, `rows[{label, you, them, unit, prefix, decimals, ratio}]` | 3–4 rows; you/them numbers |
| `pillars` | `title`, `items[{name, attack}]` | 5 items; attack ≤120 chars |
| `race` | `title`, `metric`, `unit`, `years[]`, `you[]`, `them[]`, `gap_label`, `gap_caption` | from scripts/model.mjs |
| `case` | `kicker`, `name`, `where`, `year`, `headline`, `stats[{value,label}]`, `source` | ≤3 stats; source required |
| `fork` | `left{title, points[]}`, `right{title, points[]}` | ≤3–4 points per side |
| `questions` | `items[]` | 3–4 questions ≤100 chars; narration reads them |
| `waves` | `title`, `from`, `to`, `now`, `now_label`, `waves[{title, text, from, to, when, side}]` | 2–3 waves; title ≤32, text ≤70 chars; from/to like "2027 Q2"; side defaults market → neighbour → them |
| `moment` | `when`, `channel`, `from`, `text`, `note` | text ≤220 chars, typed out on screen; note says it is fictional |
| `world` | `beat` (open · neighbor · newcomer · finale), `num`, `title`, `caption`, `act`, `year` | A 3D shot of the company's world that opens a part, in place of a `chapter` card: the company as a lit town at night, one window per person (`film.world.you`); `neighbor` — next door the lights change and the trucks run faster; `newcomer` — across the river a company assembles on an empty field (`them_start` people); `finale` — from above, both lights (`them_end`) and a new light inside yours. Narration 1–3 sentences that say what the picture means; title ≤40, caption ≤90 chars |
| `swarm` | `title`, `segments[]` (3–6, this market's own), `kinds[4]` (optional labels), `counts[4]` (optional), `end_share`, `punchline` | The crowd: every segment attacked by every kind at once, many of each; small slices and big pieces; copies after a success; the company's share (its colour) shrinking in each segment. Title in the company's terms ("Arqon will not be alone") |
| `path` | `title`, `steps[{when, label, text, who, owner}]`, `note` | One purchase or one order as a row of 3–6 steps; `owner` (you/them/market) colours who decides each step. Made for architecture C: the same path twice, early in the film all `you`, late with the steps taken over. label ≤22, text ≤70 chars |
| `beneath` | `title`, `surface{label, text}`, `label_below`, `items[]`, `punchline` | surface text ≤120 chars; 3–6 items ≤60 chars, what accumulates underneath; punchline ≤60 chars |
| `scenarios` | `title`, `items[{name, what, outcome_label, outcome, accent}]` | 3 paths: tradition, evolution, revolution; what ≤110, outcome ≤80 chars; `accent` on the path the film argues for |
| `plan` | `title`, `memo`, `columns[{name, items[{text, when}]}]` | 4 columns (product, sales and service, back office, people), ≤3 items each, text ≤70 chars; memo ≤110 chars: raise · team · goal |
| `parallels` | `title`, `rows[{field, what, speed, source}]` | 2–5 rows; every row sourced; speed is the one number that hits (×10 in 5 months, −18%) |
| `ladder` | `title`, `stages[{name, text}]`, `markers[{label, stage \| from+to, side, when}]` | 4–6 stages (playbook section 4, in the film language); markers: you (stage, "estimate"), the neighbour (from → to), the newco; stages are shown numbered from 1 |
| `attackers` | `title`, `items[{type, text, when, likelihood, takes, focus}]` | 3–8 types (6 reads best); type ≤40, text ≤100 chars; likelihood low/medium/high; `focus: true` on the film's deep dives |
| `anatomy` | `title`, `you_label`, `them_label`, `unit`, `rows[{label, you, them, margin}]`, `gap_label`, `gap_caption` | 3–6 lines; "you" rows add up to 100 (price = 100); last row the margin with `margin: true`; unit says "model"; the gap is computed if not given |
| `myths` | `title`, `items[{belief, answer}]` | 2–3 beliefs in the owner's words (≤70 chars), answers with a fact or case (≤120 chars) |
| `map` | `title`, `points[{label, sub, lat, lon, side}]`, `routes[{from, to}]`, `view` | 2–8 points (≤5 reads best); side you/them/market; `sub` ≤34 chars; see "Map scene" below |
| `clip` | `file`, `title` (studio tier, Step 6b) | video replaces the whole frame; no captions over it; at least 4 s |
| `end` | `title`, `subtitle`, `cta` | |

### Map scene

`map` draws a dark world map (outlines only, Natural Earth, no political borders), fits the view to your points, and drops the points in one by one while the narration runs. Use it once, right after the cases: "this is already happening, and the next point can be next to you". Rules:

- **Coordinates come from `data/cases.json` (`geo`).** For anything new, look the place up (city centre, decimal degrees, `lat` first, then `lon`) and never guess from memory. `validate.mjs` fails on out-of-range numbers and warns on 0,0.
- **Precision is honest.** If a case is a country-level fact (Hadrian and Xometry in the US, Dwelly in the UK, Klarna in Sweden), the point sits on the country and `sub` names the country, not a city. Two cases in one country are one dot with both names (`"Hadrian · Xometry"`).
- **Points closer than about 2° collide.** The validator warns; merge them. More than five points is a crowd: pick the most telling ones. Every label gets a thin leader tick to its dot, but a tight cluster still reads badly.
- **`side`:** `market` (amber) for real cases, `you` (white, with a ring) for the viewer's own company, `them` (red) only for the fictional challenger. The `you` point goes last so the map ends on the viewer's place. Its `label` may be left out: the company name is used.
- **Routes are only for the fictional challenger.** `{"from": <index of a "them" point>, "to": <index of the "you" point>}` draws a red arc with a travelling pulse. Never start a route at a real company: that casts it as an attacker. The challenger's point carries "fictional" in its label.
- **`view`:** leave it out (auto-fit, zoom capped so the 1:110m outlines stay clean) or set `"world"` to force the whole planet. Keep the scene at least 12 s (the validator enforces this minimum).

## Step 6c — the finale: your numbers, your step

The film plants the thought; the finale lets the viewer make it their own with a minute of effort, then hands a summary to the consultant. It runs in the browser player after the film ends (and from the "Your numbers" button). Nothing is sent anywhere.

```json
"finale": {
  "title": "Ваши цифры за минуту",
  "intro": "Фильм построен на публичных данных и допущениях. Сдвиньте ползунки так, как видите сами.",
  "inputs": [
    {"param": "attacker_mid", "label": "Когда новый игрок наберёт силу в вашем сегменте", "min": 2027.5, "max": 2033, "step": 0.5, "format": "year"},
    {"param": "attacker_cap", "label": "Какую долю рынка он может занять", "min": 0.05, "max": 0.5, "step": 0.05, "format": "pct"},
    {"param": "taken_from_you", "label": "Какая часть его продаж — ваши покупатели", "min": 0.1, "max": 0.9, "step": 0.1, "format": "pct"},
    {"param": "market_growth", "label": "Рост вашего рынка в год", "min": -0.04, "max": 0.12, "step": 0.01, "format": "pct"}
  ],
  "steps_title": "Один шаг на 30 дней",
  "steps": [{"title": "…", "text": "…"}, {"title": "…", "text": "…"}, {"title": "…", "text": "…"}],
  "contact": {"label": "Отправить консультанту", "url": "mailto:consultant@example.com?subject=…"}
}
```

- 2–4 sliders over model parameters, labelled in the viewer's words, never the parameter name. The film's own values must sit inside min..max (the validator checks).
- 2–4 first steps for 30 days, each small and concrete for **this** company: one pilot on one product group, one check, one half-day with the team. No "digital transformation programme".
- The team questions come from the `questions` scene automatically.
- The finale also asks the three risk-zone questions (`data/risk-rubric.md`) for the owner to answer himself and shows the verdict, lets him pick the closest of the three paths from the `scenarios` scene, and ends with an open question (`finale.reflection.question`, e.g. "How do you see <Company> now?"). All of it goes into the summary for the consultant. Turn parts off with `"risk_check": false` or `"reflection": false`.
- `contact` is optional (mailto:, https:// or tg:). Without it the viewer copies or downloads the summary.
- UI words are Russian or English by default; for another language put translations in `finale.ui` (keys as in `player/web.js`).

## Step 6b — richer scenes (`studio` tier only, optional)

The template is the baseline and is always enough. Add richer scenes only when doctor says `studio` and they clearly make the film better, and never let them hold up the film: it must be complete without them.

A `clip` scene carries a video made elsewhere: `{"type":"clip","file":"clips/sketch.mp4","title":"…","narration":"…"}`. The file (path relative to film.json) replaces the whole frame during its time slot, the narration plays over it, captions are not drawn over it, and the scene lasts at least as long as the clip. Use one to three clips per film (the hook, one explainer), 6–15 seconds each, 16:9, so the film keeps one visual language. A style change every ten seconds is mush.

Where clips come from, in order of preference:

1. **Style packs in `examples/styles/`**: a hand-drawn whiteboard sketch (the Ray Dalio explainer genre) and a comic page. Change their text with `--text` and render with `node scripts/clip.mjs` (read `examples/styles/README.md`, look at a `--still` first). They need no network and no extra install.
2. **Footage from the person's own video tools**, if connected (Seedance, Veo, Higgsfield and similar). Atmosphere only (a factory floor, an empty office), never as evidence for a claim. No real people's likenesses, no real logos.
3. **HyperFrames** (HeyGen, Apache-2.0): HTML compositions rendered to MP4, with a large block registry; `npx hyperframes init`, then `npx hyperframes render`; needs Node 22+. It has not been tried with this repository, so treat it as an experiment: check the output frame by frame, and keep the base film working without it.
4. **Remotion** is off by default. It is source-available, not open source: free for individuals and teams of up to 3 people, and 4 or more people need a company licence (see remotion.dev/docs/license/faq). Use it only when the person asks for it by name, and say this to them first. Items 1–3 cover the same ground.

## Step 7 — check, preview, render (web tier: hand over)

**Web tier:** you cannot run the commands below. Re-read film.json against the field table in Step 6 (the player also checks it on opening and lists what is missing). Then give the person the complete film.json in one ```json block and tell them, briefly: save it as `film.json`; open `dist/film-player.html` from the repository (it is a single file that works offline by double click; on GitHub, download the raw file); press *Open file* or paste the JSON, then *Watch*. The browser reads the film aloud with the system voice and shows captions. There is no MP4 in this tier; one is made when the repository runs in an agent with a command line.

**Render and studio tiers:**

```
node scripts/validate.mjs work/<slug>/film.json          # fix every ERROR, consider warnings
node scripts/render.mjs work/<slug>/film.json --preview   # ~10 s, writes build/preview/sheet.jpg
```
**Open `build/preview/sheet.jpg` and look at it** (and single frames `build/preview/fNN.png` if something looks off): text cut off or overlapping, wrong language, typos, a chart that makes no sense. Fix film.json and preview again. Then:
```
node scripts/render.mjs work/<slug>/film.json --out out/<slug>.mp4      # add --res 720 for a fast draft
node scripts/bundle.mjs work/<slug>/film.json --autoload --out out/<slug>-player.html   # the film + finale as one HTML file
```
**Sound** is designed in code with every render (`scripts/sound.mjs`, no samples, deterministic): a room tone the whole film, a low body that grows act by act, machine-room fans in the last act, a hit on chapter titles and statements, a whoosh peaking on chapter cuts, the year counter's tick as the film's signature, soft taps where the picture moves (measured from the rendered video), and silence before `moment` and `end`. Beds duck under the narration; the narration is cleaned (high-pass, de-ess, presence, gentle compression); the master is −14 LUFS, linear. Per film: `"sound": {"music": false}` drops the quiet drone; per scene: `"sound": "drop"` (silence before it) or `"none"` (no hit). A sound-only revision never re-renders the picture: `node scripts/render.mjs work/<slug>/film.json --sound-only` (a changed line is fine while it still fits its scene). To fix a few scenes, re-render only them into the last picture: `--scenes 2,11` (same rule: the timeline stays the picture's). **Camera**: each scene has one slow move (chapters and statements push in, data scenes only breathe ≤1.5%, the end pulls back; the first scene moves from frame 0). Per scene `"camera": "push" | "pull" | "breathe" | "none"`, per film `"camera": false`.

**Voice.** The voice is chosen by ear, by the person: `node scripts/voices.mjs work/<slug>/film.json --scene N` writes the same line read by several free voices (`out/voices/all-voices.mp3`, a beep before each; for Russian it includes Microsoft's multilingual voices, which also read Russian) — offer it when the voice matters. Set the pick as `"voice": {"edge_voice": "<name>"}`. With `GEMINI_API_KEY` (a key from aistudio.google.com; check its free-tier limits) Gemini TTS is used before edge-tts: `"voice": {"gemini_voice": "Charon", "style": "<delivery in plain words>"}`.

**Measured check, then a cold viewer.**
Before the render, after `validate` and `words`:
```
node scripts/distinct.mjs work/<slug>/film.json   # shared sentences, titles, cases, scene order, world with the examples and other films; how many scenes use this company's specifics
```
Fix every FAIL: rewrite the shared lines in this company's terms, research the cases, change the order or the image.

```
node scripts/qc.mjs out/<slug>.mp4       # hook in the first 2 s, black, freeze, dead air, loudness, per-scene loudness, contact sheet
```
Fix every FAIL. Then, where you can start a helper agent, give a fresh one that has not seen your work only `out/<slug>-sheet.jpg`, the narration text and the company's name, and ask it six questions: (1) after 10 seconds, would an owner of this company keep watching, and why; (2) which one moment would they retell tomorrow; (3) which frame could belong to any company's film; (4) where is the weakest 5–10 seconds; (5) which line sounds generated or like an ad; (6) which claim would the owner dismiss first, and what would make it undeniable. Then up to three fixes, and a score: 5 a student piece, 6 competent, 7 a good agency film, 8 it changes how an owner talks about the topic that evening, 9 they forward it to their board unasked. Apply the fixes that change belief; re-render (or `--sound-only`). Score and fixes go into your final message in one line.

The HTML page is the main thing the client opens: the film, then their numbers, then their step. The MP4 is for forwarding to partners and the board.

## Step 8 — final message to the user

Path to the HTML page (film + finale) and to the MP4 (web tier: the film.json and how to open it in `dist/film-player.html`, which includes the finale); one line on which company you assumed it was (if there was any doubt); risk level in one sentence; which on-screen numbers are estimates or model; the 3–5 most important sources; if you used clip scenes, say which and where they came from. Do not paste the whole script.

## Red lines

- Never invent named people, revenues, clients, quotes or events about the real company. Unknown → `estimate` with a basis, or leave it out.
- Cases only from `data/cases.json` or with a source you actually fetched, listed in `sources`.
- No real competitor as the attacker; no claims that the company is failing without evidence.
- No photos or likenesses of real people.
- If the risk is low, the film says so.
