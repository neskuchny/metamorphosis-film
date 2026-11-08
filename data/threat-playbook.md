# Threat playbook: how to think about who breaks this company, and how

This is the reasoning the agent goes through **before** writing a single scene. A film is only as convincing as the threat model behind it. The output is `work/<slug>/threats.md` (template at the end); the film is built from it, so two companies in two industries get two different films.

The viewer's real question is never "is AI powerful?" It is "why would *my* company lose, to *whom*, *when*, and *could we withstand it*?" Every section below exists to answer one of those four.

## 1. The mechanisms: why AI changes who wins

Use these to explain *why*, in the company's own terms. The first one always applies; of the rest, pick the two or three that hit this value chain hardest.

0. **Experience compounds, and it is the real gap.** This is the mechanism under all the others, and the one owners miss. When a competitor launches an AI project, even a useless chatbot on a marketplace, the visible result hardly matters. What matters is what happens in parallel: they learn what works and what does not, they see which other processes can be rebuilt, people retrain, new people join, data gets structured, and the organisation becomes *ready*. Their next project takes weeks, not months. Today the incumbent's moat is experience: years of suppliers, products, dealers, markets, hard to catch from outside. The companies that start now begin to accumulate a different experience, of rebuilding a business around AI, that the incumbent does not have and cannot buy later. They are a step ahead not because they are smarter, richer or have a better chatbot, but because they started. This is the deck's own message: the main thing is to rebuild the way people think; the best models and one brilliant employee change nothing in a company that is not ready. **A failed AI project is a useful project: it is tuition.** Never present a competitor's clumsy AI attempt as a joke; present it as a step on a path the viewer has not taken yet. The `beneath` scene shows this.
1. **Cognitive work gets cheap.** Quoting, estimating, drafting, matching, checking, answering, planning: work that took a person hours now takes an agent minutes. Every step in the value chain that is "someone reads, thinks, writes" is repriced.
2. **Speed becomes the product.** When a competitor answers in an hour and you in three days, the buyer no longer compares price first. Speed of quote, of new model, of service, of decision.
3. **Scale without headcount.** Revenue grows, headcount does not. AI-native software companies run at roughly $1–3M+ of annual revenue per employee against about $0.3–0.5M at traditional SaaS leaders (SaaStr, January 2026; author's estimates). The same logic reaches services and manufacturing more slowly but in the same direction.
4. **Learning loops.** An AI-native company runs many small experiments a week and pushes what works to the whole organisation in days. An incumbent runs a few projects a year.
5. **Compounding for free.** Every model release makes the AI-native company better without a change-management programme. The incumbent pays for each step of change with meetings, training and resistance.
6. **The buyer's side changes too.** Buyers ask AI assistants which brand or supplier to choose; procurement agents compare offers in seconds. Relationships and brand recognition protect less when an agent shortlists.
7. **Capital follows the efficiency.** Investors now fund buying traditional companies and running them on AI (General Catalyst's $1.5B for AI-driven services transformation, November 2025; Thrive Holdings with over $1B, December 2025), and funding factories built from scratch for automation (Hadrian, $1.37B raised, August 2026).

## 1b. Not three waves: a crowd from every side

The waves describe **when each kind becomes visible**, not who comes. In reality every segment of every market gets **all kinds at once, and many of each**:

- **those who optimise a little** — the same business with AI in a few tasks (cheaper quotes, better ads, a bot): dozens of them, each takes a slice;
- **those who rebuild their processes** — the neighbour who went AI-first in pricing, supply, service: fewer, each takes a bigger slice;
- **those who convert to AI-first** — an existing company that rebuilds its whole operating model around agents;
- **those who build AI-native from scratch** — newcos on venture money; few, but each takes a big piece, and **a success is copied**: when one works, investors fund the next two.

Then the dynamics that kill the "we'll keep our niche" hope:
1. **Bites from everywhere.** The small ones take slices in every segment at once; the big ones take whole pieces in a few. Nobody needs your whole market; together they take it.
2. **Success breeds copies.** If the first AI-native newco works, there will be a second and a third, and the neighbour copies their moves.
3. **The strong fight each other, and you are crushed in between.** Newcos compete on price and speed with each other, not with you; the price they reach is below your cost. You are not their target; you are the ground they fight on.
4. **No safe niche.** A niche survives only when nobody wants it; profitable niches are exactly what the crowd picks first. "He takes his niche, we keep ours" assumes one attacker; there will be many.
5. **It does not stop at the model's horizon.** The model ends in five years; the crowd does not.

Show it in the film: the `swarm` scene (every kind, in every segment of this company's market, with copies), a myth about the niche, and the world's finale where the newcomer is no longer alone. One attacker in the `race` is the cleanest number; the `swarm` says it will not be one.

## 1c. From the side: dangers that are not competitors

Competitors are only part of it. AI also arrives in the hands of this company's clients, suppliers, neighbours in other markets and in what people expect, and some of the biggest losses come from there. They differ from company to company: some apply here, some do not. Two passes, both mandatory, written into `threats.md` (section "From the side") and into one `flank` scene.

**Pass 1 — the catalogue.** Test every line on this company: does it apply, how likely in five years (low / mid / high), how much revenue or margin it could take, what the first sign would be. Keep the ones that apply; drop the rest without regret.

| # | Danger | The test question for this company | A real parallel |
|---|---|---|---|
| S1 | **The client does it himself** | Could a client build or run what you sell with AI tools and his own people? (software studios, agencies, recruiters, translators, design, accounting, analytics, simple manufacturing of spare parts) | Companies writing their own internal tools with AI instead of buying them; Klarna said in 2024 it dropped Salesforce and Workday (it moved to other software and its own stack) |
| S2 | **The client tries, fails, and still does not come back for a while** | If a client leaves to "do it with AI" and it goes badly, how long until he returns, and can you survive that gap? | Klarna replaced much of its support with an AI assistant in 2024 and began hiring human agents again in 2025: whoever lost that contract lost the money in between |
| S3 | **Price falls in the head** | Will clients believe your work is "easier now" and refuse to pay what they paid, even if your costs did not change? | Clients asking agencies, lawyers and developers for lower rates "because there is AI" |
| S4 | **Expectations jump** | What will "normal" look like after people use AI products elsewhere: instant answers, personal offers, things that adjust themselves? Is your product suddenly old? | "Smart" home and devices: switching lights on is no longer smart; people expect it to decide |
| S5 | **A general tool absorbs part of your service** | Is there a general AI tool, made for something else, that already does a slice of what clients pay you for? | Students moving from Chegg to ChatGPT and Gemini: revenue −30% in a year, 22% of staff cut (May 2025); site builders and landing agencies against Cursor/Lovable; task trackers against people organising work in Claude Code |
| S6 | **An adjacent market starts doing it in its own way** | Which company from another market touches your client at the same moment and could add your slice as a feature? | A fridge that sees what is running out and orders groceries through Instacart (Samsung, 2025): the shopping list leaves the store |
| S7 | **Answer engines and agents choose instead of people** | When a client asks an assistant "what to buy / whom to hire", are you in the answer? Does your brand still matter if an agent compares specs and price? | Pew Research (2025): with an AI summary in Google results people click links in 8% of visits, without it in 15% |
| S8 | **The channel or platform owns the client** | Can the marketplace, bank, super-app or distributor that stands between you and the client use AI to sell its own version or steer the client elsewhere? | Marketplaces launching private labels; banks steering purchases with cashback |
| S9 | **The supplier goes direct** | Could your supplier reach your clients himself now that AI handles sales, support and paperwork in any language? | Factories selling direct on marketplaces with AI-written listings and support |
| S10 | **Demand itself shrinks** | Will AI make clients need less of your product (fewer breakdowns, less waste, fewer trips, fewer hires, less paperwork)? | Predictive maintenance cutting spare-part and repair demand; translation and call-centre volumes |
| S11 | **The model is replaced by a service** | Could someone sell the result instead of the product (pay per hour of comfort, per kilometre, per outcome) and choose the cheapest supplier behind it? | Cooling as a Service: the operator owns the equipment, the client pays per unit of cooling (BASE initiative) |
| S12 | **Your clients' own business shrinks** | Are your B2B clients themselves exposed? If their market shrinks, your orders shrink with it | Suppliers of call centres, print, travel agencies |
| S13 | **People: the best leave, the young are not trained** | Will your strongest people leave to start AI-native companies? Will the junior work that trained experts disappear, so there is no one to grow? | Founders of AI-native firms coming out of incumbents |
| S14 | **Noise and fraud in the channel** | Will AI flood your channels with fake leads, fake reviews, fake applicants, deepfake fraud, raising your cost of every real deal? | Recruiters drowning in AI-written applications |
| S15 | **Money looks at you differently** | Will banks, investors or buyers of your company price in AI risk (lower valuation, stricter credit) before anything happens to sales? | The "black February" of 2026: Thomson Reuters −18% on one day |

**Pass 2 — what is not in the catalogue.** The catalogue is what we already know; the film must also say what we did not. Look at this company through these lenses and write at least eight candidate dangers specific to it, without filtering: the client's job (what does the client really want done, and who else could do that job?), the moment of purchase (who stands next to the client when he decides?), every partner in the chain (suppliers, channels, banks, insurers, landlords, regulators), the data (who else sees this company's clients' behaviour?), the physical world (devices, vehicles, buildings that start deciding), other countries (who solved this differently?), the second order (what happens to this company's clients' clients?). Search for real signals of each. Then score every candidate, from both passes, on probability, impact and surprise (would the owner have thought of it himself?).

**What goes into the film.** Three to five dangers with real weight, at least one from pass 2 when one holds up. Exactly one is marked `surprise`: the most important danger this owner most likely has not considered. It must be concrete, grounded in a real signal, and plausible for this company within five years; never a stretch made to sound clever. If nothing from the side is weighty for this company, say so in `threats.md` and keep the scene short; do not invent.

## 2. Who can come: eight types of attacker

Score each for this company: **likelihood** (low / medium / high), **when** (years from now), **what they take first**, **damage** if it happens. Choose the top two or three for the film; mention the rest in one `attackers` scene. Never name a real local competitor as one of these; types are composites. Real companies appear only as sourced `case` scenes.

| # | Type | How it enters | What it takes first | Typical speed |
|---|---|---|---|---|
| 1 | **The accelerated ecosystem** (suppliers, marketplaces, logistics, buyers' AI assistants and procurement agents that compare and transact) | Not a competitor: everyone around you gets faster and cheaper | Your margin on coordination; your visibility to buyers | Now – 1 year |
| 2 | **The neighbour who rebuilt** (a current competitor goes AI-first) | Same plants, same dealers, rebuilt processes | Distributors and key accounts that value speed | 1–3 years |
| 3 | **The platform in between** (aggregator, marketplace with instant pricing) | Sits between you and the buyer, prices instantly, routes orders | The customer relationship; you become interchangeable capacity | 1–3 years |
| 4 | **The AI roll-up** (investor buys weakened traditional firms and runs them on AI) | Buys your weaker peers, merges them on one AI platform | Market share through acquired companies; later, you | 2–4 years |
| 5 | **The AI-native newco on venture money** (built from scratch) | No legacy, different cost base, capital to undercut for years | Your most profitable segment first | 2–5 years |
| 6 | **The foreign player with an AI stack** | Enters your country with localisation, content and support done by agents | Price-sensitive and online segments | 1–3 years |
| 7 | **Your customer or supplier taking your step** | AI makes it cheap for them to do in-house what you sell | The simplest, most standard part of your offer | 1–3 years |
| 8 | **The sniper** (narrow AI-native service on your best niche) | Picks one high-margin piece: spare parts, service, premium line, B2B quotes | The niche that pays for your fixed costs | 1–2 years |

Questions that decide the scores: Where is the profit pool in this industry (which segment, which step)? Which steps are information work? Who already owns the buyer's attention (marketplaces, platforms)? Are there weak peers an investor could buy cheaply? Is there global capital flowing into AI-native players in this industry or an adjacent one?

## 3. Why the AI-native newco on venture money is the most dangerous

This is the chain the film must make felt, not just stated. Explain it in the company's numbers where possible (the `anatomy` scene).

1. **It carries no legacy.** No old processes, IT, org chart or middle management to unwind. It designs every process for agents from day one. Your change costs years; its "change" costs nothing because it never had the old way.
2. **Its cost base is different.** Fewer people per unit of output, near-zero cost per quote and per customer conversation, no dealer margin if it sells direct. So its break-even price sits below yours: it can sell at *your cost* and still earn. That is what makes the threat physical, not rhetorical.
3. **Capital buys it time.** It does not need profit in year one. Venture money finances years of low prices and fast growth to take share. You defend with this year's cash flow; it attacks with five years of someone else's money.
4. **It attacks where your margin lives.** It does not need your whole market, only the 20% of segments that make most of your profit. You keep the fixed costs (plants, staff, dealers), you lose the margin that paid for them, and the spiral starts: price pressure → lower utilisation → higher unit cost → more price pressure.
5. **It learns faster every month.** Weekly experiments, product decisions from reviews and data, and every model release makes it better automatically. Your gap does not stay constant; it widens.
6. **It takes your people.** The best engineers, designers and sales people want to work with an AI team, remotely, for more money. The incumbent loses exactly the people it needs to transform.
7. **It collects data from day one.** Every product, quote and conversation feeds its next decision. You have twenty years of data in drawers; it has two years of data in use.
8. **At the end it buys you.** When you are weakened, a roll-up or the newco itself buys your plants and brand cheaply and runs them on its platform. The physical assets you thought were the moat become its cheap capacity.

The honest counterweights (say them when they apply, they make the film credible): capital-heavy physical industries slow it down; regulation and licences slow it down; trust-heavy relationships slow it down; a newco can burn out. Slow is not never.

## 4. Stages of AI maturity: where you are, where they are

Use for the `ladder` scene and to make "how will they be better" concrete. Place the company, the neighbour (type 2) and the newco (type 5) on it.

| Stage | Name | What it looks like | Typical effect (evidence ranges, not promises) |
|---|---|---|---|
| 0 | Manual | People, phone, Excel, e-mail | Baseline |
| 1 | Tools | Employees use chat assistants on their own | Individual tasks 20–50% faster; company barely changes |
| 2 | Processes | Agents run specific flows: quotes, support, documents, planning | One process 2–10× faster (hours → minutes for quotes is well documented) |
| 3 | Operating model | Data structured, agents run cross-department flows, people supervise | Fewer handoffs, cycle times cut by multiples, smaller back office |
| 4 | AI-native company | Built around agents: small senior teams each running many agents, continuous experiments | Revenue per employee several times the industry (AI-native software: ~$1–3M+) |
| 5 | AI-native assets | Physical layer designed for automation: lights-out lines, new factories from scratch | New cost base (Xiaomi Changping: all key processes automated; Hadrian: factories built for automation) |

Inside AI companies the curve is already visible: Anthropic reported 67% more pull requests merged per engineer per day as Claude Code adoption grew, with 70–90% of code written with its help (January 2026); by autumn, merges into its main branch had grown from about 2 500 to over 30 000 a day between May and September 2026, because agents write the code (Anthropic engineering blog, 13.10.2026, via Habr). Use such numbers only with their source and date, and never inflate them.

## 5. The collision: could you withstand it?

The film should not stop at "they are faster". It should show what happens to *this* company's economics. A simple, explicit check the agent runs (numbers go on screen as `model`):

- Revenue at risk: the share of revenue in the segments and channels the top attackers take first.
- Price pressure: how much the market price falls when a competitor can sell at your cost (often 10–25%).
- Fixed cost share: plants, staff, dealers that do not shrink when revenue does.
- Result: with fixed costs staying and the margin segments shrinking, where is break-even, and in which year is it crossed? The `race` scene shows revenue; the narration names the year margins turn negative if the numbers support it.

## 6. What the owner believes, and what answers it

Every owner has reasons why "this is not about us". The film names two or three of them out loud (the `myths` scene), in the owner's own words, then answers each with a fact or a case, never with pressure. Naming a belief before it is challenged lowers defensiveness; dodging it confirms it.

| Belief | What answers it |
|---|---|
| "We are physical, AI is about software." | Xiaomi Changping, Hadrian: the physical layer is being rebuilt too. And the first attack is on what surrounds the plant: quotes, sales, service. |
| "Our clients buy on relationships." | Buyers' AI assistants and procurement agents shortlist before the relationship starts; the distributor's letter scene. |
| "It doesn't really work yet." | Cases with numbers; and the gap compounds: waiting a year is not standing still, it is falling behind a curve. |
| "Their AI projects are useless. / We tried AI once, it didn't work." | A failed project is a useful project: it buys the experience of what works, shows the next processes to rebuild and makes people ready. They are a step ahead because they started (the `beneath` scene). The deck calls "I tried AI once and it didn't work for me" the attitude to fight (s.68). |
| "We are already buying AI tools." | The electrification parallel: a motor instead of a steam engine changed little; redesigning the factory changed everything. Tools are evolution; the challenger is a revolution. |
| "We will adopt it later, when it is proven." | When it is proven, the neighbour has two years of learning and your best people. Later costs more. |
| "Not in our country / our market." | Foreign players enter with AI-made localisation; capital is global; the map scene. |
| "We have no money for this." | The first steps cost a pilot, not a programme; the finale's 30-day steps. |
| "We are too big to be caught." | Size is the reason they come: big market, healthy margin, advantage that can be bought (risk rubric). |
| "Only a company a head above us could hurt us, and there will be one at most." / "The newcomer takes its niche, we keep ours." | There will be all kinds at once: those who optimise a little, those who rebuild, those who go AI-first, those who start from scratch; and a success is copied. Bite by bite and in big pieces, no niche is left (the `swarm` scene, section 1b). |

## 7. Speed of the industry

Not every industry gets all eight attackers at the same speed. Adjust timelines and say so:
- **Faster:** information-heavy steps, fragmented market, standard products, online demand, low regulation, many weak peers (roll-up targets).
- **Slower:** capital-heavy physical assets, safety certification, licences, long contracts, state customers, unique physical locations.

Slower changes the years, not the direction. Low risk still gets a film: about erosion at the edges and the opportunity.

## 8. Red team: write the attacker's plan

The strongest single move in this method comes from the metAImorphosis team's own client prompt: *"I'm a serial entrepreneur and just got major investments and want to compete against <company> and make them irrelevant on the market, building an AI-native company. Research the market and come up with 10 different ideas for product, front office and back office processes, and best talent attraction. Present a business plan and action plan to achieve this."* Taking the attacker's chair makes the threat concrete in a way no description of "AI risk" does.

Do it better than the bare prompt, so the plan survives an owner's scrutiny:
- **Grounded, not imagined.** Every move rests on the research (where this company is slow or manual) and on a case or source that shows the move works somewhere already. No move without evidence.
- **Aimed at the profit pool.** The plan starts with the segment and channel where this company makes most of its margin, not with the whole market.
- **Ten moves in four areas**: product (3), front office: marketing, sales, service (3), back office (2), talent (2). For each: what it does, what it replaces at the incumbent, what it takes from them, when it launches, the evidence.
- **Money and people.** How much capital such a founder would raise (anchor on real rounds in this or an adjacent industry, labelled model), the team size by year against the incumbent's, the price position and the unit economics (the same numbers as the `anatomy` scene).
- **Action plan by half-year** over five years: when each move launches and what it gains. This is also the film's timeline.
- **The incumbent's best response, and why it is too slow** if the incumbent waits: the honest gap between what the incumbent could do and how fast it usually moves.
- **Kill criteria**: what would make this plan fail (licences, tariffs, capital intensity, exclusive contracts, the incumbent building its own "company from scratch" first). Credibility comes from naming them.

The plan goes to `work/<slug>/attack-plan.md` (template below). In the film it becomes the `plan` scene (the ten moves, short), and in film.json the `attack_plan` block (the ten moves in full), which the viewer can open in the finale. The challenger stays fictional; the moves must be ones real companies have made.

### Template: `work/<slug>/attack-plan.md`

```
# Attack plan: <Challenger> against <Company> (fictional founder's view, <date>)

## The memo (one line, it goes on screen)
Raised <amount> · <N> people · goal: make <Company> irrelevant in <years>

## Where we strike first
segment / channel / city, and why it is their profit pool

## Ten moves
| # | area | move | how (AI does what) | replaces at <Company> | takes from them | when | evidence |

## Money, people, price
capital and rounds (anchor: real rounds, model); team by year vs theirs; price vs theirs; unit economics (= anatomy)

## Action plan by half-year
2027 H1 … 2031 H2

## Their best response and why it comes late

## What would kill this plan
```

## 9. What the metAImorphosis programme wants the owner to take away

The film is the first touch of the programme's Deconstruction stage: *"Understand how AI-native companies can take you out of business"*, with the tasks *"understand and agree on AI risks"* and *"identify key risk zones"* (deck, slides 34–35). Carry its message, in its terms:

- **A tectonic shift, not a tsunami** (s.11): like the internet and smartphones, it stays; it is not NFTs or COVID.
- **Why now is different** (s.14): anyone can hire a 24×7 army of AI employees; execution becomes almost free; moats shrink; capital pours into AI-native startups.
- **AI-native traits** (s.16): business and data described for AI; input becomes action with few humans; very high speed; senior individual contributors each running several agents; minimal middle management; continuous experiments; learnings scale in minutes; recursive improvement. Use them as the challenger's traits.
- **Tools are not the transformation** (s.24, 27, 28, 89): buying AI licences is "automobiles to deliver better horse food faster". The electrification analogy is the honest historical parallel: replacing a steam engine with an electric motor gave little; the gain came when the factory itself was redesigned around distributed drives and assembly lines. Use it to separate "evolution" from "revolution".
- **Agents become customers** (s.50, 56): buyers' and procurement agents compare and transact; a company invisible or unreadable to agents loses before a human looks.
- **Talent first** (s.20): in businesses that depend on individuals, the best people are the first target.
- **Three NewCo scenarios** (s.88): *Tradition* (business as usual with some automation), *Evolution* (agents for internal optimisation, AI added to the product), *Revolution* ("imagine you're all fired and start from scratch: build a true AI-native competitor"). The film's fork shows these three paths (`scenarios` scene); the viewer picks one in the finale.
- **People reach the conclusion themselves** (s.41): lectures produce nothing; their own prompt (s.25) works because the owner runs it on their own company. So the film shows *their* attacker's plan, the finale asks them the three risk-zone questions (s.17) to answer themselves, and the film ends on a question, not a verdict: "How do you see <Company> now?" (the leader's script, s.46).

Cases from the deck that are not yet verified (Manifest, Alpha School, "Hexion" as factory-as-a-service, a public company's vacancy for an AI agent, YC looking for a $100B company with under 10 people) stay out of films until a source is fetched; they are listed in `data/cases.json` → `leads`.

## Template: `work/<slug>/threats.md`

```
# Threat map: <Company> (<date>)

## Where the money is
- Value chain steps, who does each today, how long, what is manual (from research.md)
- Profit pool: which segments/steps make most of the margin (estimate with basis)

## What AI changes on each step
- <step>: today <time/cost> → AI-native <time/cost>; evidence <case or source>

## From the side (section 1c)
Catalogue S1–S15: applies / probability / impact / first sign, for the ones that apply. Pass 2: eight or more candidates of your own, each with its signal. Scored list; the 3–5 that go into the film; the one marked surprise and why the owner would not think of it.

## Attackers (score all eight)
| type | likelihood | when | takes first | damage | why (one line) |
Top 2–3 for the film: …

## Why the newco wins here (section 3 in this company's terms)
- cost base: …; capital: …; where it attacks: …; people: …; data: …

## Maturity and the experience gap
- Company: stage …; the neighbour: stage … by <year>; the newco: born at stage 4–5
- What the neighbour visibly does first (often clumsy: a bot, a pilot) and what it accumulates underneath (lessons, next processes, retrained people, structured data, readiness); how many months of that experience the company is behind if it starts a year later

## Collision
- revenue at risk …; price pressure …; fixed cost share …; break-even crossed in … (model)

## Beliefs to answer (2–3)
- "…" → answer with …

## Speed modifiers and protections
- …

## Risk level and why
```

## Sources

- Habr / Selectel, «Anthropic отказалась от Git…» (14.10.2026), retelling Anthropic's engineering blog (13.10.2026): merges into the main branch grew from about 2 500 to over 30 000 a day between May and September 2026, because agents write the code; seven engineers built the replacement in five months: https://habr.com/ru/companies/selectel/news/1094398/

- SaaStr, "The new rule: $500K ARR per employee is the new $200K" (26.01.2026): https://www.saastr.com/the-new-rule-500k-arr-per-employee-is-the-new-200k
- Anthropic, "Understand Claude Code's impact with contribution metrics" (29.01.2026): https://claude.com/blog/contribution-metrics
- Techleap, "General Catalyst's $1.5B AI services transformation" (11.2025): https://finder.techleap.nl/news/feed/general-catalyst-s-1-5b-ai-services-transformation
- Newcomer, "Inside the VC roll-up craze" (18.12.2025): https://www.newcomer.co/p/inside-the-vc-roll-up-craze-that
- Cases with sources: `data/cases.json` (Hadrian, Xiaomi Changping, Xometry, Dwelly, Klarna)
