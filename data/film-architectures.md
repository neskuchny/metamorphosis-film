# The film's own idea: what every film shares and what must be this company's alone

These films travel by word of mouth. An owner watches theirs, sends it to a friend who runs another company, the friend makes one too. If the second film has the same examples, the same chapter titles, the same pictures and the same sentences with other numbers, the friend draws the obvious conclusion: it is a template, so it is not about me, so "AI" here is a mail merge, so AI is not a threat to me either. A template film does not just fail; it argues against its own point.

So every film has a fixed **logic** and a free **telling**. Read this file in Step 2c, after the threat map and the attacker's plan, before the waves and the script. Write your choices into `concept` in film.json (format at the end) and run `node scripts/distinct.mjs work/<slug>/film.json` before rendering.

## 1. What every film shares (the logic)

- An honest risk verdict, with the strength of the company named before the threat.
- Change arrives in waves of growing size: the environment speeds up, a neighbour rebuilds, a company is built from scratch. The waves may be told in any form (see the architectures), not always as three chapters.
- **It is never one attacker.** In every segment all kinds arrive at once and in numbers (those who optimise a little, rebuild, go AI-first, start from scratch); a success is copied; they fight each other and the company is crushed in between; no niche is safe. Every film has a `swarm` scene and answers the niche belief (`data/threat-playbook.md`, 1b).
- **Not only competitors.** Danger also comes from the side: clients doing it themselves, prices falling in the head, rising expectations, a general tool or an adjacent market taking a slice, agents choosing instead of people. Every film has a `flank` scene with 3–5 of these that really apply to this company, and exactly one the owner most likely has not thought of (`data/threat-playbook.md`, 1c).
- The experience gap: the neighbour's clumsy first step is a step the viewer has not taken; experience piles up underneath.
- A fictional composite challenger that only does what real companies have done, said on screen.
- A model, labelled as a model.
- A fork with three paths (tradition, evolution, revolution) and a question at the end, never a verdict. The finale.

## 2. What must be this company's alone (the telling)

| Variable | Rule |
|---|---|
| **Central image** | One picture that carries the whole film, taken from how this company physically makes money: what a stranger would see standing at its door. Numbers become things in it (people as lit windows, customers as lights in apartment blocks, orders as trucks on a road). See section 4. Never the image of the example film unless the business is genuinely the same kind. |
| **Architecture** | The story shape (section 3). Pick by the company and its owner, and write one sentence on why. |
| **Cold open** | The first line is a fact only this company has: a number from the dossier, a product, a place, a date from its history, a phrase from its own site. "This is a film about X" alone is not a hook. |
| **Chapter titles and act labels** | In the company's own words: its products, its customers, its cities, its trade's jargon. Not "Кто вы сегодня / Сосед перестраивается / Компания с нуля / Развилка" unless they truly fit better than anything specific. |
| **The moment** | A message through this company's real channel (a dealer's WhatsApp, a tender portal notice, a franchisee's email, a review on 2GIS, a bank's procurement letter), with its real counterparties. |
| **Cases and parallels** | Researched for this industry and region. At least two cases or parallels per film that are not in `data/cases.json` and not in any example film, each with a fetched source. `data/cases.json` is a fallback, not the default. |
| **Attackers** | The top threats from this company's threat map. A retailer's monster is usually a platform or a dark-store network, a services firm's is a roll-up, a manufacturer's is a newco with its own plants. |
| **Myths and questions** | Beliefs in the owner's own words as found in interviews, the site, job ads; questions that only this owner can answer, with this company's numbers. |
| **World** | `world.kit` from the business (factory, city, logistics), `world.time` (night, dusk, dawn, snow) from the region and season, `world.light` in the brand's colour, the beats re-cast in this business's terms. |
| **Look** | `look` (player/look.js): the type pairing (ten, all with Cyrillic), the colour mode (night, paper, field, snow, ink), the company's colour as "you" and a challenger colour across the wheel, cards, background, decoration, captions, transitions and a layout variant for each hero scene (cold open, chapter, statement, dossier, questions, case, end). Without `look` it is derived from the company's name and colour, so it already differs; set it on purpose for this owner (a family manufacturer and a fintech should not look alike). A named `style` (editorial, poster, sketch) keeps its own colours and fonts. |
| **Side dangers** | Which of the catalogue apply here, and the one of its own: the `flank` scene is the most company-specific scene of the film. The surprise must be this company's, never a stock line. |
| **Scenes and layouts** | The set of scene types and the layout of each (section 3b). Two films should not share the same set and the same layouts. |
| **Sound identity** | `sound.identity` from the kit (machine room, city, highway) and one signature sound tied to the central image. |
| **Signature motif** | One element that returns three times, changed each time (the lit windows of Artel; a store sign that dims; a truck that drives empty). |

The distinct check (`scripts/distinct.mjs`) measures this: sentences shared with the examples and other films, the same chapter titles, the same cases, the same scene order, the same world settings. Reuse of a few structural types is fine; reuse of words and pictures is not.

## 3. Architectures — the story shape

Every architecture uses the same scene types; what changes is the order, the spine and what the viewer is asked to follow. Do not default to the chronicle: choose.

**A. Chronicle — five years forward.** The year counter is the spine; the film walks from today to the end of the model, wave by wave. *For:* long-cycle industries (manufacturing, construction, energy), owners who think in plans. *Open:* today, with their own numbers. *World beats:* open, neighbour, newcomer, fork. *Example:* Artel.

**B. Letter from the end.** Open in the last year of the model with the moment (a client's letter, a news headline, a bank's covenant notice), then "how did we get here" and rewind to today; the waves are told as the causes of that letter; the end returns to today: the letter has not been written yet. *For:* owner-led companies with a strong brand, emotional owners, family businesses. *Open:* `moment` or a `statement` dated in the future. *World:* begins with the finale beat (from above, at the end), then open.

**C. The customer's path.** The same purchase made twice: by a customer today and by the same customer in the last year of the model. Each wave is a step of that path where the company drops out (the search, the price, the delivery, the service). *For:* retail, banking, insurance, restaurants, clinics, B2C services. *Spine:* a `timeline` of the path, repeated. *World:* city kit; the customer's lights move from the company's stores to couriers.

**D. The attacker's pitch.** The film is the challenger's investor pitch, read aloud: "we will take X from <Company>". The viewer sees their company through the eyes of the people raising money to replace it; the waves are slides of the pitch; the fork answers the pitch. *For:* B2B, distributors, high-margin niches, boards and investors. *Spine:* the `plan` scene opens the film; `anatomy` and `race` are the pitch's numbers.

**E. One day, two companies.** The same working day at the company and at the challenger, time stamps repeating (09:00, 11:30, 15:00, 18:00): a quote, an order, a problem, a hire. The waves are told as how far apart those days drift each year. *For:* operations-heavy services, logistics, distribution, call-centre businesses. *Spine:* `scissors` rows as hours of the day.

**F. Countdown to break-even.** The spine is the year the model crosses the break-even line of the company's fixed costs; the counter runs down instead of up. *For:* thin-margin, fixed-cost-heavy businesses (plants, fleets, store networks). *Spine:* `race` early, then the causes.

**G. Three witnesses.** A client, an employee and a supplier, one per wave, each with one message through a real channel (three `moment` scenes), each telling what changed on their side. *For:* people businesses (education, clinics, agencies, consulting), and when the threat is mostly in talent.

Write in `concept.architecture` the letter and a sentence on why. Mixing is allowed (a chronicle that opens with the letter from the end), but name it.

## 3b. Scenes: the function is fixed, the slide is not

The logic needs functions, not particular slides. Each function can be told by several scene types, and each type has several layouts (`look.variants`). Choose the type that fits this company's story shape and data, then the layout on purpose; never take the example's set.

| Function | Scene types that can carry it | Layouts |
|---|---|---|
| Who you are, your strength | `dossier`, `statement`, `world` (open), `cold_open` | dossier: grid, ledger, hero; statement: left, center, split |
| The change arrives in waves | `waves`, `chapter`, `world`, `path`, `timeline` | chapter: numeral, center, split |
| Signs already here | `signals`, `timeline`, `moment` | signals: stack, list |
| The experience gap | `beneath`, `scissors`, `ladder` | scissors: rows, bars |
| Who may come | `attackers`, `ladder`, `plan` | plan: columns, list |
| Why they are cheaper | `anatomy`, `scissors`, `race` | race: line, bars |
| The crowd | `swarm` | columns, rows |
| From the side | `flank` | radar, doors, cards |
| Where it already happened | `parallels`, `case`, `map` | parallels: rows, tiles; case: right, below |
| What the owner believes | `myths` | rows, stack |
| The fork and the question | `scenarios`, `fork`, `questions`, `end` | scenarios: columns, rows; questions: list, cards; end: left, center, block |

The distinct check compares the set of scene types and every layout with the other films and warns when they repeat.

## 4. Central images by how the money is made (starting points, not answers)

| Business | What a stranger sees | How numbers become things |
|---|---|---|
| Plants, factories | halls, chimneys, shifts | one lit window = one person; a newcomer's few cold windows do the same work |
| Store chains, retail, restaurants | storefronts across a city, carts, queues | stores as lit signs; customers as lights in apartment blocks; couriers as moving lights pulling those customers away |
| Banks, insurance | branches, queues, a phone screen | queue numbers; branches dimming as phone glows multiply |
| Logistics, distribution | warehouses, trucks, empty returns | trucks as light streams; an automated hub with few windows and dense flows |
| Construction, development | cranes, sites, paperwork | sites that stall at the estimate stage while another's cranes move |
| Clinics, education, agencies | chairs, rooms, hours | chairs in a waiting room; hours as the unit of price |
| Agriculture, food processing | fields, trucks at harvest, cold stores | harvest trucks; a buyer's platform that prices the crop before it arrives |

Pick the image a stranger would recognise as *this* company within two seconds, then ask: can the three waves and the fork be told inside it? If yes, it is the central image. The `world` kits draw three of these today (factory, city, logistics); for the others, carry the image through `statement`, `moment`, `scissors` and the cold open, and use the closest kit.

## 5. `concept` in film.json

```json
"concept": {
  "idea": "one sentence: what this film says about this company that no other film says",
  "architecture": "C — the customer's path: a retailer loses the path, not the store",
  "central_image": "the city at dusk: your stores' signs, customers' windows, couriers' lights",
  "signature": "a store sign that dims a little in each wave",
  "specifics": ["Korzinka", "Ташкент", "Korzinka Go", "супермаркеты у дома", "Мирзо-Улугбек"],
  "why": "why this shape and image fit this company and this owner"
}
```

`specifics` lists the words only this company has (names, products, places, people, numbers from the dossier). The distinct check counts how many scenes use at least one of them: aim for most of them.
