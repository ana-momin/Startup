# CONTEXT.md — The one file that holds this startup's brain

> Single source of truth. Every decision, every "why", lives here.
> Started: 2026-09-23 · Founder: Anas (21, AI student) · Status: **Pre-MVP, day 0**

---

## 1. The Heart of It

Build a product where a person types a prompt and gets a **great motion graphic video** —
better quality, lower cost, and faster than what the market gives today.

Founder's own words, kept as-is because they are the north star:

- "I don't care about failure anymore. I will start from the beginning if I want to."
- "Great things take time and time is what I am giving."
- "Something that would genuinely give value to the users... cheaper and faster and better than the existing products."
- "Just don't overcomplicate things." — **one product, few files, no mess.**

**Working name:** TBD (see Open Questions)

---

## 2. What the Market Actually Looks Like (researched 2026-09-23)

### The money is real
| Thing | Real 2026 price |
|---|---|
| Freelance motion designer | $35–$200 / hour |
| 60–90s explainer video (studio) | $5,000 – $30,000 |
| 60s motion graphics (freelancer, library assets) | $2,500 – $5,000 floor |
| Custom 2D / character work | $5,000 – $12,000 |

Motion graphics job postings are **up ~35% since 2023**. Demand is not the problem.

### The market has split in two
- **Low end is being crushed** — AI tools now make "passable" explainers cheap. Template work is dying.
- **High end is growing** — creative direction, brand motion systems, 3D. People pay more for taste.

**What this means for us:** do not fight at the bottom with another template generator.
Aim at the gap: *studio-quality output, self-serve price.*

### Who is already here
| Player | What they do | Their weak spot |
|---|---|---|
| Motionvid.ai | Free text→motion graphics, infographics, maps | Free = generic, thin quality |
| Easymotion | Ideas/files → animated video, no timeline | Launched Jun 2026, very new, narrow |
| Synthesia | Motion graphics bolted onto AI avatars | Motion is a side feature, not the product |
| Motion AI Studio | Text → motion graphics in seconds | Speed over craft |
| Jitter / Canva | Design tools with motion presets | Not prompt-driven; "moves like a template" |
| Runway / Veo / Sora / Higgsfield | AI *video* models | Can't do clean text, logos, brand colors, or exact data |

### What users complain about (this is our opening)
1. **"It moves like a template."** Everything looks the same.
2. **No real control.** You can't say "make that bar chart 0.3s slower."
3. **Clips are 3–8 seconds.** No real composition, no narration, no long form.
4. **Diffusion video can't do text.** Logos warp, words melt, brand colors drift.
5. **No source files.** You can't hand it to a designer to finish.

---

## 3. The Core Insight (our unfair angle)

> **Motion graphics is not a video problem. It is a code problem.**

Everyone else is trying to make motion graphics with **diffusion video models**
(Sora/Veo/Runway-style). That approach will *never* give crisp text, exact brand hex
codes, real data charts, pixel-perfect logos, or a 90-second story arc.

We go the other road: **prompt → LLM writes React/Remotion code → render to video.**

Why this wins:
- ✅ **Text stays sharp.** It's real text, not pixels.
- ✅ **Brand colors exact.** It's a hex code, not a guess.
- ✅ **Any length.** 5 seconds or 5 minutes, same cost curve.
- ✅ **Editable.** "Slow that down", "change blue to green" = a code edit, not a re-roll.
- ✅ **Cheap to render.** ~cents per video on Lambda vs. dollars per second of diffusion.
- ✅ **Deterministic.** Same prompt = same video. Clients need that.
- ✅ **Real data.** Feed it a CSV, get a real animated chart.

And because rendering is cheap, **we can genuinely undercut the market** — which is
exactly the promise: *cheaper, faster, better.*

**The trade-off (be honest):** code-based motion can't do photoreal humans, organic
textures, or cinematic footage. That's fine — that's not motion graphics. If we ever
need it, we bolt a diffusion model in for *backgrounds only* (Higgsfield MCP is already
available in this workspace).

---

## 4. Who We Build For (first 100 users)

Pick **one** narrow group to start. Serving everyone = serving no one.

Candidates, best first:

1. **SaaS founders / indie hackers** — need product demos, launch videos, feature
   announcements. They live on X/LinkedIn. They pay. They already buy tools.
   They can't afford a $5k explainer. ← *strongest fit*
2. **Content creators / YouTubers** — need B-roll, stats overlays, intros. High volume,
   lower price tolerance.
3. **Marketing agencies** — need to churn out client variations. Highest willingness to
   pay, but slowest to trust a new tool.
4. **Educators / course creators** — need explainers for concepts. Big market, less money.

### ✅ DECIDED (2026-09-23): **SaaS founders / indie hackers.**

What they actually need, in order:
1. Product demo video (show the app working, clean UI shots + callouts)
2. Launch video for Product Hunt / X (30–60s, punchy)
3. Feature announcement clips (15–20s, for X/LinkedIn)
4. Landing page hero loop (8–15s, silent, looping)

Why they're the right first group: they can't afford $5k explainers, they already pay
for tools, they post publicly so they market us for free, and they are easy to reach
(X, Indie Hackers, r/SaaS, Product Hunt).

---

## 5. What "Version 1" Means

V1 is **not** the $1M product. V1 exists to answer one question:
*"Will a stranger say wow at the output?"*

### V1 must do
- Text box → user describes a video
- AI plans the scenes, then writes the animation code
- **Live preview in the browser** (no waiting for a render to see it)
- Chat to refine: "make it slower", "use our blue #1A73E8", "cut scene 3"
- Export MP4 (1080p) — 16:9 and 9:16

### V1 must NOT do (on purpose)
- ❌ Accounts, billing, teams, dashboards
- ❌ Voiceover, music, captions
- ❌ Template library / marketplace
- ❌ Mobile app
- ❌ Any 3D

### The one thing that decides if we win
**Output quality.** A hundred tools can take a prompt. Almost none produce something a
real designer wouldn't be embarrassed by. Our moat is a **curated motion design
system** — our own library of professionally-crafted animation primitives (easing
curves, entrances, transitions, layouts, type scales) that the AI composes from,
instead of inventing animation from scratch. The AI picks and arranges; the *taste* is
pre-baked by us.

> This is the real product. Not the prompt box. **The taste library.**

---

## 6. Tech Direction (v1)

```
User prompt
   ↓
[LLM #1 — Director]  → writes a scene plan (JSON): scenes, timing, copy, layout
   ↓
[LLM #2 — Animator]  → writes React/Remotion code, composing OUR design-system pieces
   ↓
[Remotion Player]    → live preview in browser, just-in-time compiled
   ↓
[Remotion Lambda]    → render MP4 on export
```

### ⚖️ LICENSE LAW (founder's hard rule, 2026-09-23)

> **We only use MIT / Apache 2.0 / BSD / ISC.** Free for commercial use, forever, no
> fees, no company-size limits, no per-render royalties, no vendor who can change the
> terms on us later. The product must be genuinely ours.

**Important distinction, so the rule is usable:** using a permissively-licensed library
is *not* "selling someone else's product as ours." MIT/Apache licenses explicitly grant
the right to use, modify and sell — that is what they exist for. Every serious company
does this. What we refuse is anything that (a) charges us per use, (b) limits us by
company size, (c) can be revoked or repriced, or (d) forces us to open-source our code.

Learning *how* a tool works = fine and smart. Copying its code or renting its runtime = no.

### ❌ Remotion — REJECTED

| Fact | Source |
|---|---|
| Source-available, **not** OSI open source — custom "Remotion License" | remotion.dev |
| Free only for individuals & companies ≤3 people | remotion.dev |
| Automated rendering (exactly our business): **$0.01 per render, $100/month minimum** | remotion.dev/docs/license/pricing |

A per-render fee on a render company is a permanent tax on our core business, paid to a
vendor who sets the price. Founder's call to reject it was correct.

### The stack, all permissive

| Layer | Pick | License |
|---|---|---|
| UI framework | React + Next.js | MIT ✅ |
| Animation engine | **Ours — we write it** | Our IP ✅ |
| Frame capture | Playwright or Puppeteer (headless Chrome) | Apache 2.0 ✅ |
| Video encoding | **WebCodecs** (built into Chrome) + an MIT mp4 muxer | MIT ✅ |
| AI | Claude Code now, API later | Pay-per-use service, not a license on our code ✅ |
| DB / Auth | Defer | — |

**Why WebCodecs instead of FFmpeg:** default FFmpeg builds include libx264/libx265 which
are **GPL** — that could force us to open-source our whole product. Chrome's built-in
WebCodecs encoder sidesteps that completely. Cleaner legally *and* faster.

### Money math (rough)
- LLM cost per video: ~$0.05 – $0.30
- Render (60s, 1080p, our own engine on our own box/cloud): ~$0.01 – $0.05
- **Cost per video: under $0.40, and $0 owed to any vendor**
- Market price for the same output: $2,500+

---

## 6b. The $0 Budget Plan (decided 2026-09-23)

Founder's call: **spend nothing until a complete working thing exists.** Good call — and
it's fully possible, because the expensive parts are the parts we don't need yet.

| Piece | Normally costs | How we do it free |
|---|---|---|
| The AI that writes animation code | OpenAI/Claude API key | **Claude Code itself** (already paid for). I write and test the animations directly. |
| Remotion | Free for individuals & teams ≤3 | Free. No license needed at our size. |
| Rendering MP4s | Lambda (cents) | **Render locally** with the Remotion CLI. Costs $0, just your CPU. |
| Preview | — | Remotion Studio, runs on localhost. Free. |
| Hosting | Vercel etc. | Not needed yet. Nothing is online in Phase 0–2. |
| Domain / name | ~$10/yr | Buy only when we're ready to show people. |

**The order that keeps it free:** build the taste library and prove the output is
beautiful FIRST (that's me + Claude Code, $0). Only when the videos genuinely look pro
do we wire in a paid API key so strangers can type prompts too.

This is also just better startup logic: prove the product is good before paying to scale it.

**Machine is ready:** Node v24.14.0, npm 11.9.0, git 2.54.0 — all installed. ✅

---

## 7. How We Work Together

### Founder profile
5th semester AI student. **Strong Python.** Knows CS fundamentals well — not a layman —
but does most building by vibe-coding rather than writing React/TypeScript by hand.
Going **all in**, this is the main focus.

**So:** I write the TypeScript/React. I explain *what* each piece does in plain words
and *why* it's there — no code-dumping without context, and no baby-talk either. Where
Python can do a job (scripts, data, automation), we use Python so he can own that part
directly.


- **🛑 I ask before every major step.** New dependency, scaffold, architecture change, big
  build — I explain the plan, then wait for your "go". Small edits and research don't need it.
- **⚖️ License checked before every install.** I state the license out loud in the
  recommendation. See §6 License Law.
- **🎓 Every reply ends with a learning section.** Short: what was added, what it does,
  what the words mean. This is build *and* learn, not blind vibe-coding.
- **📁 Directory discipline.** Everything organized, named consistently, in the right
  folder. No loose files at the root, no dumping ground folders. A clean tree is a
  professional tree — see the Folder Standard below.
- **🏢 We behave like a company from day one.** Licenses checked, decisions written down,
  code reviewed, nothing casual.
- **No big-bang builds.** Brick by brick. Ship something ugly that works, then make it good.
- **Few files.** This CONTEXT.md + the app. No doc sprawl.
- **Replies stay short.** Founder reads bullets, not essays. Detail goes in files.
- **Every milestone gets a real test:** show it to a stranger. Did they say wow?
- **Honest reporting.** If something fails, it gets said plainly.

---

## 7b. Folder Standard

Rules, so the tree stays clean as the project grows:

- **Root holds almost nothing** — `CONTEXT.md`, config, and top-level folders. No loose files.
- **Group by feature, not by file type.** `compositions/ProductLaunch/` beats scattering
  its parts across `components/`, `styles/`, `utils/`.
- **One job per folder.** If a folder needs "and" to describe it, split it.
- **No `misc/`, `stuff/`, `temp/`, `new/`.** Junk drawers are where projects go to die.
- **Naming is consistent:** `PascalCase.tsx` for components, `camelCase.ts` for logic,
  `kebab-case` for folders and assets.
- **Every folder has an `index.ts` front door** so imports stay short and the insides
  can be rebuilt without breaking anything.
- **Docs live in `docs/`** once there is more than CONTEXT.md. Never scattered READMEs.

---

## 8. The Plan (founder's order, 2026-09-23)

We do **not** go random. This is the sequence:

| # | Stage | What happens | Done when |
|---|---|---|---|
| **0** | ✅ **Engine** | Our own animation engine (done — §11) | Build passes, preview runs |
| **1** | ✅ **Web app + UI** | The complete front end (done — §11). Minimal ChatGPT/Claude style, sidebar, fake accounts, light + dark. | Done 2026-09-23 |
| **2** | ✅ **Backend logic** | Server, database, real accounts, saved videos, planner moved server-side. | Done 2026-09-23 |
| **3** | ✅ **Export & delivery** | Our own renderer (Chrome + WebCodecs) → real MP4 files. **Pulled forward ahead of the backend** — a video tool that can't give you a file isn't a product. | Done 2026-09-23 |
| **4** | **Extras** | Whatever the product clearly needs by then — brand kits, templates, team sharing. Decided at that point, not guessed now. | — |
| **5** | 🔁 **The Cycle** | **Build → Test → Find errors → Fix → Repeat.** Over and over until the product is the best in the market. | It genuinely beats the competition |
| **6** | **Launch & charge** | Put it online, get users, add payments. | First paying customer |

> **Stage 5 is not a phase, it's a habit.** Everything before it is the first lap. After
> that we keep looping: harden, test, fix, improve. That loop is what separates a demo
> from a company.

**UI first, on purpose.** Building the interface first forces us to decide what the
product actually *is* before we write hard-to-change backend code. It also means we
always have something real to show people.

We are at **Stage 1.**

---

## 9. Open Questions

**Answered 2026-09-23:** audience ✅ · budget ✅ · founder skill ✅ · time ✅

**Still open:**
1. **Name + domain** — decide at Phase 3, not now. A name for a product nobody has seen
   is a distraction.
2. **Which paid API when we get there** — Claude vs. GPT for the animator model. Decide
   at Phase 4 by testing both on real prompts.

---

## 10. Decision Log

| Date | Decision | Why |
|---|---|---|
| 2026-09-23 | Code-based (Remotion), not diffusion video | Crisp text, brand accuracy, editability, cheap renders (§3) |
| 2026-09-23 | One context file, no doc sprawl | Founder asked to keep it simple |
| 2026-09-23 | Real moat = curated motion design system, not the prompt box | Everyone has a prompt box; nobody has taste (§5) |
| 2026-09-23 | First audience: **SaaS founders / indie hackers** | Can't afford $5k explainers, already buy tools, post publicly = free marketing (§4) |
| 2026-09-23 | **$0 spend** until output is proven beautiful | Claude Code writes the animations; render locally. Prove quality before paying to scale (§6b) |
| 2026-09-23 | Founder writes Python, I write the TS/React | Plays to his strength, removes his bottleneck (§7) |
| 2026-09-23 | Name + domain deferred to Phase 3 | Naming a product nobody has seen is procrastination |
| 2026-09-23 | **Remotion REJECTED** | Not open source. $0.01/render + $100/mo minimum for automated rendering = a permanent tax on our core business (§6) |
| 2026-09-23 | **MIT / Apache / BSD only** — hard rule | This is a company. No vendor should be able to reprice, restrict, or claim any part of it (§6) |
| 2026-09-23 | **We build our own animation engine** | It's the moat anyway. Owning it means zero fees forever and full IP |
| 2026-09-23 | WebCodecs over FFmpeg for encoding | Default FFmpeg ships GPL codecs (libx264/x265) that could force us to open-source the product |
| 2026-09-23 | **I ask before any major step; founder says "go"** | Founder's rule. Saves time and prevents wrong foundations |
| 2026-09-23 | **Order: UI first → backend → export → extras → build/test/fix loop** | Founder's call. UI first forces us to define the product before writing hard-to-change backend code (§8) |
| 2026-09-23 | **Folder standard written and enforced** | Founder wants everything organized and professional as it grows (§7b) |
| 2026-09-23 | **Every reply ends with a learning section** | Founder is building *and* learning; he wants to understand the background, not just ship (§7) |
| 2026-09-23 | **UI style: minimal like ChatGPT / Claude. No glassmorphism.** | Founder's call. Quiet chrome, flat surfaces, thin borders, one screen with one job. Learn from the best in the market |
| 2026-09-23 | **App screen ≠ marketing site** | The start screen is a tool, not a landing page. Pricing/features/footer come later on a separate site |
| 2026-09-23 | Light + dark theme, tokens only | One variable set, two themes. No component ever hardcodes a colour |

---

## 11. Build Log — where we actually are

### 2026-09-23 — Engine skeleton is alive ✅

Deleted the Remotion scaffold completely. Built our own engine from scratch.

```
Startup 001/
  CONTEXT.md
  studio/
    src/
      engine/                   ← OUR IP. No third-party video framework.
        core/
          types.ts              video config, formats (16:9, 9:16, 1:1)
          context.tsx           useCurrentFrame, useVideoConfig, useCurrentTime
          Sequence.tsx          Sequence + Series — the timeline
          layout.tsx            AbsoluteFill, Center, Column, Row
        animation/
          easing.ts             18 curves + our own cubic-bezier solver
          interpolate.ts        interpolate, interpolateColors, clamp
          spring.ts             real damped-spring physics + 5 named presets
        player/
          Canvas.tsx            true-pixel-size canvas, scaled to fit
          Player.tsx            play / pause / scrub / frame-step + shortcuts
        index.ts                one public front door
      compositions/
        ProductLaunch.tsx       first real demo video
        index.ts                composition registry
      App.tsx                   studio shell
```

**The founding idea in one line:** a video is a *pure function of a frame number*.
Frame 90 always draws the same picture. That is why preview and final render match
exactly, and why the same prompt will always produce the same video.

**Status:** `npm run build` passes clean. Dev server runs at `http://localhost:5173`.
**Dependency count: 27 packages. Every one MIT or Apache 2.0. $0 owed to anyone.**

### 2026-09-23 — Stage 1: the web app is live ✅

Restructured into a proper workspace, then built the full front end.

```
Startup 001/
├── CONTEXT.md
├── package.json                 workspace root
├── docs/
├── packages/
│   └── engine/                  ← OUR IP, standalone so the render server can reuse it
│       └── src/ core · animation · player
└── apps/
    └── studio/
        └── src/
            ├── components/      Atmosphere · Nav · PromptBar · Icon
            ├── pages/           Landing · Studio
            ├── lib/             generate.ts (the planner) · types · composition
            ├── videos/
            │   ├── scenes/      ← THE DESIGN SYSTEM (the moat)
            │   │   Title · Features · Stat · Quote · Outro · shared
            │   └── GeneratedVideo.tsx
            └── styles/global.css   design tokens
```

**It actually works.** Type a prompt → a real video plays. No API key, no cost.
The planner (`lib/generate.ts`) reads the prompt with rules: it picks a palette (or
honours an exact hex), picks the aspect ratio, pulls out the headline, bullets, numbers
and quotes, then builds a scene list with professional timings.

**The key architectural line: `VideoSpec`.**
Prompt → **VideoSpec** → video. The planner fills the spec today; an AI model fills the
identical spec at Stage 2. Nothing downstream changes. That one type is what makes the
brain swappable — and what makes "edit scene 2" possible instead of re-rolling.

**Status:** build passes, dev server at `http://localhost:5173`.
**32 packages. All MIT / Apache 2.0. Still $0 owed to anyone.**

### 2026-09-23 — UI iteration round ✅

Founder feedback: too busy, too much glass. Rebuilt minimal, ChatGPT/Claude style.

- Deleted the decorative background (aurora, stars, grain, vignette) and all glassmorphism
- Flat surfaces, thin 1px borders, quiet type
- Start screen is one non-scrolling page: logo mark, one question, one box
- Collapsible left sidebar with Recents; collapsed logo cross-fades to the expand icon on hover
- Fake accounts: sign up / log in modal, avatar, account menu, sign out
- Light + dark theme from one token set
- Fixed the focus ring drawing a hard border around the prompt box

**Everything visual is drawn by our own code.** Icons are hand-written SVG paths, the
logo is generated in code, backgrounds are CSS. The only outside asset in the whole app
is the Inter font (SIL Open Font Licence — free commercially).

**Stage 1 complete.**

### 2026-09-23 — MP4 EXPORT WORKS ✅ (Stage 3, pulled forward)

Founder's call: build export before the backend, because a video tool that cannot give
you a file is not a product. Correct call.

**We built our own renderer. It produces real MP4 files.**

```
apps/render-server/       tiny HTTP service (Node's own http module, no framework)
packages/renderer/        drives Chrome, captures frames, collects the MP4
apps/studio/
  render.html             a bare page that draws ONE exact frame
  src/render.tsx          exposes __setSpec / __setFrame to the renderer
  src/render/encode.ts    WebCodecs → H.264, muxed to MP4 in the browser
  src/lib/export.ts       Export button → render service → download
```

**How it works**

```
Node ──drives──> Render pages ×N   real Chrome drawing our own components
  │                    │
  │<─── screenshots ───┘            identical to what the preview showed
  │
  └──feeds──> Encoder page          WebCodecs → H.264 → mp4-muxer → MP4 bytes
```

The same components render the preview and the export, driven by the same frame number.
That is why what you watch is exactly what you download.

**Verified output:** `ftyp · moov · mvhd · trak · avc1 · avcC · stsd · mdat`, fastStart
enabled. A genuine, playable H.264 MP4. Sample kept at `sample-export.mp4`.

**Speed:** 3.4s video at 1080p30 → **19.6s** (was 53.6s before optimising, 2.7× faster).

Three things fixed, in order of impact:
1. `encoder.flush()` every few frames was draining the encoder pipeline and serialising
   it. Replaced with waiting on the `dequeue` event.
2. Frames were decoded via `fetch('data:image/png;base64,…')`, which made Chrome parse a
   multi-megabyte URL per frame. Now decoded straight to bytes.
3. PNG capture is expensive on gradients. Default is now quality-96 JPEG — the H.264
   pass that follows is far more lossy anyway, so PNG was protecting detail the codec
   discards moments later. `quality: 'lossless'` still available.

Parallel capture (N render pages) is in place but was *not* the bottleneck — worth
knowing, and worth keeping for longer videos.

**Licences, all verified before install:** Playwright **Apache-2.0**, mp4-muxer **MIT**.
⚠️ mp4-muxer is deprecated in favour of Mediabunny, which is **MPL-2.0** — weak copyleft,
commercially usable but outside our MIT/Apache rule. We stayed on the MIT package. The
muxer does one small job against a frozen file format, so this is low risk; revisit only
if it ever breaks.

**Still no FFmpeg, no GPL, and $0 owed to anyone.**

**Run it:** `npm run dev` in one terminal, `npm run server` in another.

### 2026-09-23 — Stage 2: real backend ✅

The placeholder account system is gone. There is a real server now.

```
apps/server/                 API + render service, one process, port 4000
  src/
    server.ts                routing (Node's own http, no framework)
    db.ts                    SQLite via node:sqlite — BUILT INTO NODE, zero deps
    http.ts                  json, bodies, cookies, CORS
    session.ts               scrypt password hashing + sessions (node:crypto)
    routes/ auth · videos · render
packages/planner/            NEW — prompt → VideoSpec, shared by browser AND server
```

**Why the planner moved to its own package:** the server needs it, and the server is
where a real model's API key will live. A key shipped to the browser is a key given
away. It is also deliberately free of React, DOM and filesystem code, so it runs in
both places unchanged.

**Security decisions, all using only built-in Node modules:**
- Passwords hashed with **scrypt** (N=65536) — memory-hard, ~0.1s per hash. Painless for
  one login, brutal for someone brute-forcing a stolen database.
- Per-user random **salt**, so one cracked password never reveals another.
- `timingSafeEqual` for comparison — a plain `===` returns early and leaks how much of a
  guess was right.
- Sessions are 32 random bytes in an **httpOnly** cookie, so a script on the page cannot
  read it. Expired rows are swept daily; an expired session left in the table is a
  credential that only *looks* dead.
- Login says the same thing for a wrong password and an unknown email — and still spends
  the hashing time — so nobody can test which emails are registered.
- **Every** video query filters by user id in the SQL itself, not in a wrapper, so there
  is no code path where a forgotten check leaks someone's work.

**Tested: 25/25 passing**, including that a second user sees nothing of the first user's
videos and cannot delete them.

**Full loop verified end to end:** sign up → prompt → plan → refine (`use #FF7A45` →
accent became `#FF7A45`) → render → valid MP4 out.

**Dependency count did not move.** SQLite and all the crypto are built into Node.

**Honest numbers:** ~300ms per frame, so a 12-second video takes ~110s to render. Fine
for now, worth improving before real users.

**Known rough edge:** the planner's title extraction is crude — it produced "Launch video
for Pine the". Worth fixing, and exactly the kind of thing a real model will handle
better.

**Run it:** `npm run dev` + `npm run server`.

### 2026-09-23 — Planner rewritten ✅

The old planner wrote clumsy copy. Since the plan *is* the video, that was the ceiling
on quality. Rewritten and split into two honest halves:

```
packages/planner/src/
  parse.ts     UNDERSTANDING — what did they actually ask for?   (a language job)
  plan.ts      DIRECTING     — how should that become a film?    (a design job)
  palette.ts   colour selection, incl. deriving a full palette from one brand hex
  brief.ts     the Brief: the shape that sits between the two
```

**Why split:** when a real model arrives it replaces `parse.ts` only. `plan.ts` is where
our taste lives and should never be handed to a model — a language model has *read about*
motion design; it has not developed an opinion about it.

**The core insight of the rewrite:** people mix three things in one sentence —
**content** ("Pine, the calm note app"), **style** ("minimal, black and white") and
**instructions to us** ("make me a 30 second video, 1080p"). Only the first belongs on
screen. The old version did not separate them, which is why prompts ending "Minimal,
black and white." printed those words in the video.

**Timing is now derived from reading speed** (~2.5 words/second on screen, plus entrance,
plus a beat to rest). Before, every title held for a fixed 115 frames — a two-word
headline felt sluggish and a nine-word one was unreadable.

**Scene order now depends on intent.** A milestone opens on the number. A testimonial
opens on the quote. A launch opens on the product. Same material, different film.

**Build → test → fix, on 8 real prompts. Found and fixed 8 bugs:**

| Bug | Fix |
|---|---|
| "Launch video for Pine the" as a title | Use the product name; strip instruction openings |
| Style words printed on screen | Drop fragments where *every* meaningful word is style/format |
| `#FF7A45` parsed as the number 7 | Strip hex, resolutions, durations, fps before reading numbers |
| "hit publish" detected as a milestone | Milestones now require an actual number |
| Same sentence as both headline and quote | Decide slogan-vs-quote once, up front |
| "How it works: upload data" as one bullet | Split at the colon; label becomes the heading |
| Headline repeated as the first bullet | Detect it and drop the duplicate |
| Titles ending "…for our" / "…while you" | Never end a title on a dangling word |

Also: attribution (`"…" — Sara Ahmed`) is now read from *outside* the quotation marks,
where people actually write it.

**Result — same prompts, before → after:**

| Before | After |
|---|---|
| "Launch video for Pine the" | **"Pine"** |
| "Announce that we just passed" | **"We just passed 50000 users"** |
| "Testimonial" | **"What our customers say"** |
| "Black friday sale 50 off" | **"Black friday sale"** |
| "How it works upload your" | **"How it works"** |

**25/25 API tests still pass.**

### 2026-09-23 — Iteration 1 on real feedback ✅

Founder used the product and gave seven pieces of feedback. All seven done.

| Feedback | What changed |
|---|---|
| "asking for login before using — users get frustrated" | **No sign-in wall.** The whole product works signed out; videos live in this browser and **move into the account on sign-up**, nothing lost |
| "first there should be an AI which gathers info" | **Intake step.** It parses the prompt, sees which parts of the Brief came back empty, and asks about *exactly those gaps* — max 3, all skippable |
| "scenes should look like a video editor where user can change stuff and it reflects in the clip" | **Real editor.** Timeline strip sized by actual scene length, scene inspector with live fields, add / duplicate / reorder / delete. Typing changes the video as you type |
| "no exporting loading of video" | **Render is now a job.** Server returns a job id, the page polls, progress bar shows frame-by-frame % |
| "remove too much of the options on the sidebar" | Cut to **New video / Projects / Recent**. Every one works — Library and Scheduled are gone rather than dead |
| "a profile section or settings from where the user profile shows" | **Settings modal** from the account row: profile, rename, theme, plan, sign out, delete account |
| "how long the video would be, options for the video" | **Format and length pickers** in the prompt bar (16:9 / 9:16 / 1:1, short / standard / long) |

**New shape of the planner** — now three parts, each with one job:

```
parse.ts   understanding   prompt → Brief
intake.ts  asking          Brief gaps → questions → richer prompt
plan.ts    directing       Brief → scenes
edit.ts    editing         pure functions: update / move / add / remove a scene
```

**On "a free AI model":** the intake is built as a *slot*. Today it is rules — $0, works
offline, and sharper than a generic chatbot because it knows precisely what is missing.
Google Gemini and Groq both have genuine free tiers; when we add a key, it replaces
`parse.ts` and `intake.ts` and nothing else changes.

**Why editing had to be real:** a video here is *data*, not pixels. "Change that word" is
an edit, not a re-roll. That is the thing diffusion tools structurally cannot do, so the
editor is not a nice-to-have — it is the product's argument.

**20/20 tests on the new flow**, including signed-out render with live progress, saving
signed-out work into a new account, editor saves persisting, and a deleted account being
unable to log back in.

### 2026-09-24 — Real AI, and a real design system ✅

Founder supplied a Groq key and four pieces of feedback. All done.

**⚠️ Security note:** the key arrived in plain text in a chat message, so it is in that
transcript forever. It lives in `apps/server/.env` (gitignored, never sent to the
browser). **It should be rotated at console.groq.com.**

#### 1. The AI (`apps/server/src/ai/`)

```
groq.ts      hand-written client — no SDK, no dependency, key never leaves the server
chat.ts      the conversation: decides what to ask and when to stop asking
director.ts  the plan: writes the copy and picks the scenes
palettes.ts  a fixed set of checked colour schemes the model chooses from
```

**Model:** `openai/gpt-oss-120b` on Groq's free tier, ~2.7s per plan. Falls through a
chain of models on failure, retries the best one once on a rate limit, and drops to the
rule-based planner if everything is down — the product never goes dead.

**The line we drew:** the model is the **copywriter and the editor**. It writes what the
video says and in what order. It does **not** decide timing, easing, layout or type
scale. Handing a model the timings is how every AI video tool ends up feeling the same.

#### 2. Chat replaced the question form

Founder: *"remove that four question thing, that doesn't seem professional"*. Gone. It
now holds a conversation — asks nothing when the first message is clear, one thing when
it is not, and **never asks a third time**. "Just make it" always builds.

#### 3. The video logic — no longer one template

| Before | Now |
|---|---|
| 5 scene types | **8** — added `bigword` (kinetic typography), `steps` (numbered, with connecting lines), `logo` (brand resolve with tracking-in) |
| One look | **4 tones** — clean, bold, editorial, kinetic |
| Fixed styling | Tone drives type scale, weight, tracking, leading, alignment, spring physics, stagger speed, entry blur, uppercase and backdrop strength |

`videos/tone.ts` is the table that makes two videos with the same words read as
different films.

#### 4. Two guards against the model lying

Prompt wording alone did not stop it. Both are enforced in code:

- **Invented statistics are dropped.** A `stat` scene survives only if its number
  actually appears in what the user wrote (`40,000`, `40000` and `40k` all match).
- **Every video gets an ending.** If the model stops early, an outro is appended —
  a video ending mid-thought reads as broken, not brief.

Tested: "black friday sale for my design tool" no longer produces "50% off", "Ends
Sunday" or a made-up discount code.

#### 5. Video out of frame — fixed

The canvas was laid out at full output size (1080×1920) and only *visually* shrunk by a
transform. A transform changes how something looks, never how much room it takes up, so
a vertical video kept a 1920px-tall layout box inside a small panel and hung out of it.
The wrapper is now sized to the scaled result, and the scale runs from the top-left
corner instead of the centre.

Headlines also shrink as they get longer, so a seven-word line can no longer overflow.

**Still $0/month.** Groq's free tier covers this; nothing else costs anything.

---

## Step 2 — Personalisation (the actual moat)

### 2026-09-25 — Brand kits ✅

Founder's framing: *"this is the part where our project will stand alone in the market."*
He is right. The market complaint we wrote down on day one was that AI video tools
"mismatch the theme, mismatch the colours". This is the answer to that.

**Named "Brand", not "Company"** — an agency or freelancer works for several clients, and
"company" implies one. It is also what designers already call this.

#### The colour science (`packages/planner/src/color.ts`)

The hard part nobody else solves. A real brand colour is chosen for a logo on white
paper, not for 120px type moving across a dark frame. Used literally, **half of them are
illegible**: pale yellow disappears, navy vanishes, mid-grey does both depending on the
scene.

The move: **keep the hue, fix the lightness.** Nobody can tell you lightened their orange
by 12%. Everybody can tell you made their video unreadable.

- WCAG relative luminance and contrast ratios, properly weighted (green counts 3× more
  than blue to the human eye — a naive channel average produces unreadable text)
- `ensureContrast` walks lightness in small steps until the target is met, nudging
  saturation up as it goes so the colour does not drift into pastel
- Targets: **7:1** headline, **4.5:1** accent, **3.5:1** supporting text

**Tested against deliberately awful brand colours. All pass:**

| Brand colour | Result | Accent contrast | Text contrast |
|---|---|---|---|
| Pale yellow `#FFF9C4` | kept | 17.5:1 | 18.8:1 |
| Near-black navy `#0A0E2A` | lifted to `#5F70E8` | 4.7:1 | 19.7:1 |
| Neon lime `#CCFF00` | kept | 15.9:1 | 18.6:1 |
| Mid grey `#808080` | kept | 4.9:1 | 19.3:1 |

And it **says so** — `reportFor` explains what was changed and why, shown in the editor.
Silently correcting somebody's brand colour is the kind of thing that destroys trust the
moment they notice; saying it plainly turns the same act into expertise.

#### Website import (`apps/server/src/ai/website.ts`)

Paste a URL, get a brand kit. **The fastest onboarding is the one nobody types into.**

It opens the real site in the Chrome we already run for rendering — a second feature for
nearly free — and reads *computed* colours rather than regexing the HTML. That matters:
modern sites define colours in compiled CSS, custom properties and inline styles that
only exist once the page has run.

**Tested on four real sites:**

| Site | Name | Colour | Logo |
|---|---|---|---|
| stripe.com | Stripe | `#533AFD` (their real purple) | ✅ |
| notion.so | Notion | `#0075DE` (their real blue) | ✅ |
| linear.app | Linear | **none — correctly monochrome** | ✅ |
| vercel.com | Vercel | **none — correctly monochrome** | ✅ |

Getting Linear and Vercel *right by returning nothing* took a real fix: their declared
`theme-color` is near-black and near-white, and taking it literally produced a video in a
colour they never chose. A genuinely monochrome brand now gets a monochrome palette
rather than our default blue.

#### Brand-aware writing

Colour is arithmetic; voice is the half people actually notice. `brandBriefing` feeds the
description, audience, voice and **"never say"** list into the copywriter as hard
constraints.

Before: *"Offline sync is now live!"* — for a brand whose voice says *no exclamation
marks*.
After: *"Pine works without internet. Your notes are ready, always."*

#### Also shipped

- **Logo in the video** — real logo in the brand card, plus a quiet corner watermark that
  fades in after the opening lands and leaves before the closing frame
- **Logo colour extraction in the browser** — canvas pixel analysis, hue-bucketed so
  anti-aliasing noise does not outvote the real colour. No server-side image decoding
  dependency.
- **Onboarding** — sign up → "what's your website?" → confirm → making videos
- **Brands in the sidebar**, with a chip showing which brand new videos come out in
- **Videos keep their own brand** — editing last month's video for one client cannot
  repaint it in another client's colours
- **Private addresses blocked** on import, so the endpoint cannot be used to make our
  server read things on its own network

**40/40 tests passing** across both suites, including brand isolation between users.

### 2026-09-25 (later) — Feedback round: conversation, variety, and the pages ✅

Nine pieces of feedback. The two big ones were right and changed the shape of the product.

#### The conversation never ends (his #9)

*"Maybe we don't do a one-time prompt and then the video — maybe we do prompt, video, and
still the chatbot where the user tells the AI the changes he wants."*

Correct, and it is now how the workspace works: **video on the left, chat on the right,
permanently.** Making a video is a back and forth, the way it would go with a designer.

The important part is what gets sent. `/api/edit` posts **the current plan**, not the
original prompt. That is the difference between an editor and a re-roller: somebody who
has tweaked a headline and then asks for "a bit slower" must not lose their tweak.

**Verified precisely** — asked to shorten the opening headline of a five-scene video:

```
scene count same:    true
later scenes intact: true     ← byte-identical
palette intact:      true
headline changed:    true
```

#### Variety (his #7)

*"It follows the same pattern for every single video."* It did. Three fixes:

1. **Layout variants** — title scenes have three arrangements (centre, left with a drawn
   rule, oversized stack); feature scenes have three (column, centred, 2×2 grid). Two
   consecutive scenes never use the same one.
2. **Background motifs** — grid, dots, rings, beams, scan. Repeating CSS gradients that
   drift, so they cost almost nothing to draw. Chosen per video.
3. **Varied openings** — the director is told which opening suits which job.

**Before:** every video was `title > features > outro`.
**After, five different briefs:**

| Brief | Shape |
|---|---|
| Product launch | `title > bigword > features > steps > outro` |
| Milestone | `stat > title > outro` — opens on the number |
| Explainer | `title > steps > outro` |
| Social teaser | `bigword > features > outro` |
| Testimonial | `quote > features > outro` — opens on the quote |

One overcorrection caught in testing: after the first fix it opened *every* video with
`bigword`, which is just a different template. The prompt now says plainly that bigword
is a special effect, roughly one video in four, never in something calm or informative.

#### Also in this round

- **Stops asking so much** — a detailed first message now always builds. Backed by a
  code-level check, not just prompt wording: twelve words, or seven with a number, quote
  or list, means build. *"A good video from a thin brief that they then refine beats a
  perfect brief they abandoned halfway through answering."*
- **Video titles name the video** (his #6) — they were all the brand name, so every row
  in the sidebar said the same thing. Now: "Quarter Million Milestone", "Return Process
  Explained", "Orbit Launch Reveal".
- **Pick your colour** (his #3, #5) — the importer returns **every** colour it found,
  each with the palette it would produce, and tapping between them updates the live
  preview. Guessing one and presenting it as fact was the wrong shape for a problem no
  heuristic solves reliably. Plus a "set it up by hand" route for anyone without a site.
- **Projects rebuilt** (his #8) — real thumbnails, drawn by the engine at one frozen
  frame (affordable only because a frame is a pure function of a frame number). Search
  across titles *and* prompts, filter by brand, sort.
- **Brand picker in the prompt box** (his #2) — where it belongs, since it changes the
  result as much as anything typed above it.

### 2026-09-25 (evening) — The engine rebuild ✅

*"Currently we are not even 5% of the videos which we want."* Fair. The videos were
kinetic typography on a gradient. This round is about what actually separates that from
motion graphics.

#### `videos/motion/` — the new primitives

**`MaskedText` — the single highest-impact change.** Text now *rises from behind an
invisible edge* instead of fading in. Every title sequence you have admired does this:
the word is already there, hidden below a boundary, and the boundary is what moves.

Masked per word rather than per line, deliberately — lines cannot be known without
measuring rendered text, which needs a layout pass and breaks on any font change. Word
masks look nearly identical and always work. A small rotation on the way up gives it
weight: a flat translate reads as a slide, the tilt reads as something pivoting into
place. Plus a highlight bar that wipes in behind marked words.

**`SceneShell` — real transitions.** Every scene used to fade in and out, and a
crossfade is what you reach for when you have no idea how two shots should meet. Now:
`wipe`, `push`, `iris`, `split`, `rise`, `fade` — driven by `clip-path`, because a shape
that uncovers content reads as deliberate where a fade reads as absence. Chosen from
scene position and tone so no two neighbouring scenes arrive the same way.

**`Shapes` — the geometry.** Rules that draw themselves, blocks that wipe in, corner
brackets that snap inward, a progress arc for statistics (SVG `stroke-dashoffset` —
the only way to animate a partial circle without redrawing a path every frame), progress
bars, and the "01 / 04" index chips broadcast graphics use.

#### Every scene rebuilt on them

Titles are now choreographed rather than simultaneous — badge, rule, headline, subtitle,
each on its own beat. Stats have an arc closing behind them and brackets snapping in at
the moment the count lands. Features cards draw their own borders. Steps fill their
number rings. Big words alternate direction to create a rhythm. Logos still resolve by
closing their letter-spacing, which is one interpolated value and most of why a logo
resolve feels expensive.

#### Also this round

- **Spacebar bug** — the player's keyboard shortcuts checked for `<input>` but not
  `<textarea>`, so pressing space in the chat played the video instead of typing. One of
  those bugs that makes a feature unusable rather than imperfect.
- **The editor is now full screen** (his #3) — no app sidebar. Conversation on the
  **left**, video on the **right**: the panel is where work is directed from, and in a
  left-to-right language the thing you act *with* belongs before the thing you act *on*.
- **A real playhead** — the timeline shows where the video is, clips fill as it passes
  through them, and clicking any point seeks there. Driven by the player's own clock via
  an `onFrame` callback, so it can never drift out of step.
- **Confirmation before building** (his #2) — one short line saying what is about to be
  made, with a Make it button. Catching a misunderstanding before a render is far
  cheaper than after one.
- **Rename and delete on hover** in the sidebar (his #7), editing in place rather than
  in a dialog — a rename is a two-second correction.
- **Brand chip removed from the sidebar** (his #1) — it lives in the prompt box now, and
  saying it twice made the sidebar look like a status panel rather than navigation.

**9/9 on the confirmation flow, 20/20 on the regression suite**, rendering verified
against the new engine.

### 2026-09-25 (night) — Full-pass feedback round ✅

A proper test from the founder, grouped by screen. Everything on the list, plus the
causes behind the symptoms.

#### Bugs, and what was actually wrong

| Symptom | Cause |
|---|---|
| Profile icon off-centre in the collapsed rail | `.account svg:last-child { margin-left: auto }` was meant for the settings icon but also matched the icon *inside* the avatar. Scoped to a direct child. |
| Saying "hi" wiped the icons and the brand | The composer hid its controls once a conversation started. Settings vanishing because you typed is never right — they stay now. |
| Brand menu drew doubled hairlines | Menu items carried their own borders, which stacked against the container's edge and each other. Separators are explicit elements now, never side effects. |
| Playhead out of step with the blue fill | Two different totals. The playhead divided by one number and the clip fills by another, drifting apart by one crossfade per scene. Both use `specFrames` now, and clips are sized by their *span* (the gap to the next scene) rather than their duration. |
| Prompt box looked low | True centre reads low when the heading above outweighs the hint below. Lifted optically. |

#### Made better

- **Brand icon** — three overlapping swatch cards instead of a droplet. A droplet means
  "a colour"; a brand kit is a *set* of decisions.
- **Settings** — 860×620 instead of a small box, and five sections: Profile, **Video
  defaults**, **Brand kits**, Appearance, Account. Defaults is the one that matters:
  format, length and look for every new video, so the choice is made once instead of
  three times per video. Plus reduced-motion and autoplay toggles.
- **Brands page** — list beside one open editor, grouped into *how it looks*, *how it
  sounds*, *what it's called*. The delete is now a framed block at the bottom with its
  own confirmation; a delete beside a save is how people delete things by accident.
- **Projects page** — real empty states, an accent dot per card so the grid reads as
  distinct pieces rather than a wall.
- **Confirmation card** — a card rather than another chat bubble, because a decision
  that looks like conversation gets scrolled past.
- **Thinking states** — "Reading what you asked for", "Working out the shape", "Writing
  the copy", "Choosing the look". Named after the real pipeline rather than invented
  filler. Four silent seconds feel broken; the same four narrated feel like work.
- **Favicon and tab titles** — a real mark on a tile (a bare glyph disappears at 16px
  against half of people's themes), and titles as "Projects · Motion" — specific part
  first, since a tab strip only shows twenty characters.

#### The editor

- **Scene 1 → "Edit title"** — numbering told you nothing about what you were editing.
- **A video switcher in the title**, so opening another video is a change of subject
  rather than a change of app. Switching resets what belongs to the old video and
  leaves everything else alone.

#### Memory (his "give the agent memory")

`/api/edit` now receives the previous exchanges, so a follow-up has something to build
on. Only the exchanges are replayed, never the plans they produced — the current plan is
already in the message, and five old copies of it would cost a fortune to say nothing.

**Verified:** "make it bolder" → clean→bold. Then **"now even more"** → bold→kinetic,
with the reply *"Changed tone to kinetic and sharpened copy for a bolder feel."* It
understood what "more" referred to.

#### Deeper website import

Now reads the **homepage headline and its subhead** — the sentence a person agonised
over — in preference to the meta description, which is written for search engines. Also
reads what their own buttons say, filtering out the navigation words every site has.

Two extraction bugs found by testing real sites: Notion produced "together.. Capture"
(a period added to a sentence that had one), and Linear's animated hero returned its
headline three times because the copies stack in one element for the transition. The
dedupe ignores spacing and case, because the copies are not byte-identical.

**49/49 across all suites.**

### 2026-09-26 — Engine rebuild, stage 1: the stage, the camera, the beat ✅

Founder's verdict on the old engine: *"the video is still ten percent of what we want...
real motion graphics, not a slideshow of text."* Correct, and the diagnosis matters more
than the complaint: **we were animating text, not animating a scene.** Every frame was a
flat plane with words arriving nicely on it. Good typography does not make that
anything other than a slide with a transition on it.

#### Remotion: settled, permanently

Checked the licence text rather than trusting memory. It is **not open source**. Free
only for *"an individual"* or *"a for-profit organization with up to 3 employees"*;
everyone else *"must obtain a Company License."* And: *"It is not allowed to copy or
modify Remotion code for the purpose of selling, renting, licensing, relicensing, or
sublicensing your own derivate of Remotion."*

That is exactly what we are building. Ruled out for good — not the package, not the
code. Ideas are not theirs to own: a frame as a pure function of time is how After
Effects, Lottie and Rive all work, and ours was written from scratch. See the licence
law at the top of this file.

#### The camera (`packages/engine/src/camera/`)

A camera does not touch content. It publishes where it is looking from; each layer obeys
as much of that as its distance says it should. Depth 0.25 is far background, 1 is the
focal plane where the words live, above 1 is between the camera and the subject. Near
things move more — that ratio *is* the depth, and it costs one multiply per layer.

Shots are named by what they are for, not by what they do to a transform: `travel`,
`push`, `pull`, `impact` (anticipation → hard arrival → settle), `drift`. Every one of
them is still moving at the cut, because a camera that arrives and sits perfectly still
turns movement back into decoration on a static picture.

`chooseCamera` assigns them. Two rules carry it. **Flow**: neighbouring shots that travel
the same way read as one camera passing through two places, so the rotation pairs its
directions — right, right, then in. **The subject decides**: a scene that exists to land
one number gets `impact`; a scene with four bullet points to read gets stillness, because
nobody can read moving text.

#### The beat grid (`packages/engine/src/rhythm/`)

Every delay in every scene used to be typed by hand — 5 here, 28 there, 10 somewhere
else. Each fine alone; together, arrhythmic. Now each tone carries a tempo (editorial 76,
clean 92, bold 120, kinetic 140 bpm) and scenes say `delay={on(1)}` instead of a number.
Nothing plays a sound. A beat grid works silently, and a soundtrack dropped on later will
appear to have been written for the video.

#### One world instead of eight backgrounds

A black gap appeared at the frame edge mid-transition. The patch would have been to
overlap the scenes more. The real answer was that **a background is not a property of a
shot** — it is the place the shots happen in. Moved it out of the scenes and up to the
video, drawn once, running continuously. The gap cannot exist now, it is cheaper (one
backdrop per frame rather than one per overlapping scene), and the cuts finally move
*within* one space. The vignette and the out-of-focus foreground went with it: those
belong to the lens, and a vignette that restarts every scene is one you can feel
restarting.

That fix exposed the next bug — with no opaque background to hide it, two overlapping
scenes were both fully visible and the headlines printed over each other. Every exit now
fades as well as moves, holding near-full through the first part so the geometry of the
wipe is still what you read.

#### Composition

The honest reason the old frames looked empty: they were. ~80% of every frame was unused.
Added **frame furniture** — corner ticks, a brand mark, a chapter counter, and a
progress rule segmented by scene so the bar is a picture of the video's structure rather
than a percentage. It is drawn outside the sequence, so it survives every cut; a viewer
reads that continuity as one film rather than five clips. Title type went up 112 → 178.

A centre hairline was tried and removed: on paper it was the axis centred type is placed
against, on screen it ran straight through the headline, which is also on that axis.

Also fixed a genuine typographic error: bullet lists were centre-aligned per row, so
every marker sat at a different x. A list is a centred *block* of left-aligned lines.

#### Render speed — a real regression, found and fixed

First render after the rebuild: **1.15s per frame**, against 0.08s before. The cause was
CSS `filter: blur()` on full-frame elements — a blur forces the whole surface to be
rasterised again on every frame, and the backdrop gradients already fade to transparent,
so it was buying softness nobody could point to. Removed it, along with `willChange` on
the camera layers, which promotes a layer to its own surface — useful to a preview that
composites between frames, worthless to a renderer that rasterises each one from scratch.

Settled at **0.17s per frame** (319 frames, 54.9s, 7.9MB). Still about twice the old cost
per frame, and that part is inherent: scaling text with a camera means re-rasterising
glyphs every frame. Worth it.

**Verified by eye, not by assumption** — a contact-sheet script shoots chosen frames
through the real render page, which is how every problem in this entry was found.
brands 20/20, confirmation 9/9.

#### Also fixed: the player never played

Not random. The editor kept a `playing` flag and the player kept its own. The play button
flipped the editor's copy; the player only ever read `autoPlay` at mount. So **pause
worked and play did not**, and `setSeek(0)` when opening a video told the player to stop,
which is why a fresh video sat frozen on its first frame. Playback is now owned in one
place, and a seek carries an id so clicking the same clip twice jumps both times.

### 2026-09-26 — Engine rebuild, stage 2: objects ✅

Stage 1 gave the video a space and a camera. Stage 2 gives it things that behave like
objects rather than like text with effects applied.

#### Morphing, and why it needed a different idea

Shape morphing is the signature move of motion graphics and essentially absent from
prompt-to-video tools, because the obvious approach does not work: two hand-written SVG
paths almost never share a point count, and interpolating mismatched paths produces
garbage.

The way round it is to stop treating shapes as paths. Every shape in
`packages/engine/src/shapes/` is defined by its corners and can be resampled to any
number of points by walking its perimeter. Resample both to the same count and morphing
becomes what it should always have been — move each point towards its partner.

Two details make it read as one shape changing rather than a cloud of points
rearranging: every shape starts at the top and runs clockwise, so corners travel to
corners; and sampling is uniform along the *perimeter* rather than between corners, so a
long edge gets proportionally more points instead of collapsing.

#### The thread — the piece worth copying and hardest to

One shape lives for the whole video. It is the underline under the opening headline; at
the cut it stretches and turns into the spine down the left of the list; then swells into
the disc behind the number; then settles under the closing line. Same object,
continuously, from first frame to last.

Why it matters, beyond looking good: a viewer decides whether something was *made* or
*generated* in the first seconds, and the tell is continuity. Generated video is a
sequence of independently correct pictures. Designed video has decisions that persist
across cuts. An object the eye can track through a cut is the strongest version of that,
and the viewer never has to notice it consciously to feel somebody was in charge.

Every role it plays is furniture the scene wanted anyway — an underline, a spine, a field
of colour behind a number. It is not decoration added on top; it is eight scenes' worth
of furniture supplied by one object.

**Two fixes found by looking at frames.** Easing the bar from upright to flat meant
showing it at 37° for several frames, and a diagonal line across the frame reads as
broken, not as turning — so a large turn now happens instantly at the midpoint, while the
thread has drawn back to almost nothing. That draw-back was itself the second fix: the
pen lifts between strokes, which turns the awkward frames into the most deliberate part
of the move.

#### Per-letter type, used in exactly one place

`perLetter` on `MaskedText`, and built into `BigWordScene`. Deliberately not used on
headlines: where a viewer has to *read*, per-letter staggering fights them — the eye
wants whole words and is handed a queue of glyphs, so comprehension arrives after the
animation instead of during it. On one big word there is nothing to read, only something
to watch, and letters landing separately give the word a physical size the eye can feel.

**Found by looking:** big words queued instead of handing over. The outgoing word had to
be completely gone before the next could start, and for a few frames the screen was
empty — which reads as a dropped clip. Each word now keeps its own clock and starts
rising before its slot, so one is still leaving while the next is arriving.

Also reverted a Stage 1 overreach: snapping word changes to the beat turned 20 frames a
word into 15, which is less time than the letters need. Rhythm is worth bending timing
for, not breaking the shot for — it now snaps only when the nearest beat is within 20%.

#### Anticipation

`entrance()` adds the part a spring cannot: the wind-up. Real things pull back before
they move, and leaving it out gives motion that is technically smooth and somehow
lifeless. It is also practical — the counter-move tells the eye that this spot is about
to matter, so the viewer is already looking when the content lands. Wired into `FadeUp`,
so every quiet entrance in the video has it.

`idle()` keeps the badge breathing by a pixel and a half after it lands, because an
element that stops completely reads as a still image dropped into a video.

`trailing()` was written and then deleted — it said the same thing a delay plus a spring
already says, and two ways to express one idea is how a codebase starts disagreeing with
itself.

#### Performance: a scare that turned out to be the room

Render went 55s → 90s and looked like a Stage 2 regression. It was not. Disabling the
thread changed nothing (84.4 → 84.1). Removing the new scene kinds changed nothing.
Disabling the thread, the furniture **and** the lens together changed nothing (84.1).
Two consecutive cold-server runs agreed at 83–85s.

Nothing added in Stage 2 is measurable. The machine is simply slower after a long stretch
of continuous rendering than it was for the 55s measurement — sustained load on a laptop.
**Worth re-measuring cold before treating any of this as a real number.** Batching the
four bracket strokes onto one canvas and sizing the morph canvas to the shape instead of
the frame are both still worth having, they just were not the problem.

The general lesson, and the reason it is written down: *a measurement taken at a different
time is not a control.* Bisecting by switching things off was the only thing that settled
it, and it took four runs to stop blaming the code.

brands 20/20, confirmation 9/9, real MP4 out.

### 2026-09-26 — Engine rebuild, stage 3: the product on screen ✅

Founder's verdict after stage 2: *"honestly i dont see a major upgrade in video motion
effects."* Fair, and the reason is worth writing down.

**The camera moves were professionally subtle and therefore invisible.** A 6% pan across
four seconds is right for a brand film on a cinema screen and nothing at all in a browser
tab on a laptop. Amplitudes roughly doubled: a pan now travels 20% of the frame, a pull
opens from 1.26× to 0.96×, an impact lands from 1.34×. Quiet tones were quiet twice over
— a small move multiplied by a small `motion` number — so those went up as well.

The second reason is a process failure worth not repeating: **stills were the wrong tool
for judging motion.** A contact sheet proves a frame is composed; it cannot show whether
anything moves. Every "verified" claim in the stage 1 and 2 notes was really about
composition.

#### The product scene

The scene this whole product exists for. Competitors describe software with words on a
gradient; a founder making a launch video wants the thing itself.

The interface is **drawn, not photographed** — the only approach that works from a
prompt. Nobody uploads anything, nothing has to be kept in sync with a real app, and it
is in the right colours by construction, because every interface grey is mixed from the
brand's own background and text rather than picked. It is honest about what it is: the
claim is "this is the shape of the thing", not "this is a screenshot".

Four surfaces — dashboard, list, chat, editor — chosen from what the product does. Three
details do the convincing, and all three are restraint:

- **Real software is mostly quiet.** One thing happens at a time: a row arrives, a toggle
  flips, a number ticks. A mockup where everything pulses reads as a toy.
- **The text is unreadable on purpose.** Interface copy at this size cannot be read
  anyway, and inventing sentences to fill a fake product is how a video ends up making
  claims nobody approved. Bars at text weight say "words" without saying anything.
  Sidebar *labels* are real, because their own feature names are what make it look like
  their product — and a label longer than two words is dropped rather than shrunk, since
  "Automatically declines your meetings" in a nav is instantly a fake screenshot.
- **The cursor is the tell.** A pointer that travels and clicks turns a picture of
  software into a recording of somebody using it. It eases between waypoints, because a
  cursor at constant speed is the clearest possible sign nobody is holding it.

#### Charts

Bars, line and donut, drawn rather than revealed. A statistic said out loud is a claim; a
statistic growing in front of you is evidence, and the growth *is* the argument.

Every value comes from the plan. Nothing rounds up to make a shape look better — a chart
that flatters its data is the one thing a company can actually be sued over. The director
drops an unusable series rather than guessing at one, and a donut given several points
keeps the first, because a donut answers "how much of the whole", which only one number
can do.

#### Getting the model to actually use them

First test: the AI ignored both, every time. The prompt described them in prose while the
section the model actually follows — the shot-list — never mentioned them. Prose is
advisory; **a template is structural.** Replaced with eight named shapes
(`title -> product -> chart -> outro` and so on) and one hard rule: a video about
software without a product scene is a failed plan.

After: *"launch video for Ledger, a billing dashboard… churn dropped from 5.2% to 1.8%"*
returns `title -> product -> chart -> outro`, with **Invoices, Customers, Payouts,
Reports** in the sidebar and a line chart of **Q1 5.2 → Q4 1.8%**. Their words, their
numbers.

#### The fallback got the feature too

The model is on a free tier that rate-limits, and the rules planner takes over when it
does — so anything only the model can produce disappears at exactly the moment the
product is busiest. The rules path now picks a surface by keyword, uses their feature
names as nav items, and correctly gives a bakery **no** product scene. It also picks a
background motif now; it used to leave that unset, so every video made during a rate
limit came out flatter than the ones made a minute earlier.

#### Phones are not small desktops

The vertical path was drawn and looked wrong immediately: a **desktop sidebar inside a
phone frame**. A viewer who has never thought about interface conventions still knows
instantly that their phone does not look like that, so it undoes the whole scene. Rails
are now desktop-only, and dashboard tiles stack instead of sitting three across a narrow
screen.

The list was then a quarter full, and the first fix — more rows — was wrong for the same
reason. A real phone inbox shows about a dozen rows, each a chunky touch target taking
roughly a twelfth of the screen. Adding desktop-sized rows made it a spreadsheet on a
phone, which is a stranger thing to see than an empty list. Rows are now sized to the
screen.

That pushed the heading off the top, because the space reserved above the window had been
tuned against a one-line heading. Over-reserving costs a slightly smaller window nobody
notices; under-reserving costs a headline nobody can read.

#### Two bugs worth remembering

**A literal backspace in a regex.** `isSoftware` never matched, even though the same
pattern matched fine when tested by hand. The file contained `/\b(app|dashboard|…)\b/`
— the escaping in the script that wrote it had collapsed `\b` into a real 0x08 byte
rather than the two characters of a word-boundary escape. The same trap had already
produced literal carriage returns in a test script an hour earlier.

Two lessons. Tooling that writes source through several layers of escaping will silently
produce control characters, so **assert on the bytes after writing** — the second
occurrence was caught in seconds by exactly that check. And when a pattern works in
isolation but fails in place, read the file as bytes, not as text.

**A fallback model that could never succeed.** `qwen/qwen3.8-27b` is still served, so it
looked like a working third option — but it answered every director request with a 429
"request too large", because the system prompt is longer than its context window. A
fallback that cannot succeed is worse than none: it adds a round trip to every failure
before the rules take over. Checked against the live model list rather than assumed, and
removed.

brands 20/20, confirmation green (occasional flake is the free tier rate-limiting, not
the code), real MP4 out with product and chart scenes — 520 frames, 12MB.

### 2026-09-26 — Stage 4, and the regression I had shipped without noticing ✅

Founder: *"honestly by results it seems like we are downgrading."* He was right, and the
cause was not taste. It was a bug I introduced in stage 3 and did not detect, because it
had no symptom except worse videos.

#### The silent regression

Generated a video the way a user would — *"launch video for Northwind, a project tracker
that keeps engineering teams in sync"* — and got a two-scene film with the headline
**"Something worth watching"** and two near-empty frames. Unusable.

The log said `ai unavailable, using rules: 400 Failed to validate JSON`. Not a rate limit.
Probing the API directly at two budgets settled it in one call:

    maxTokens 1600 → 400, failed_generation empty
    maxTokens 4000 → 200, completion_tokens 1204, finish "stop"

The answer needed 1204 tokens and the budget was 1600, so it should have fit. It did not,
because **gpt-oss models emit reasoning tokens that are billed to `max_tokens` and never
appear in the reply.** Stage 3 added scene kinds and shot-list templates to the prompt,
the model reasoned longer about a wider choice, and the combined total crossed the limit.
The JSON came back truncated, Groq rejected it, the director fell back to the rules
planner, and every video quietly got much worse.

**Nothing errored. Nothing looked broken. The only symptom was quality** — which is the
last thing anyone thinks to check a log for. That is the most expensive shape a bug can
have, and the reason the founder saw it before the tests did: every suite still passed,
because they assert that a spec comes back, not that it came back from the good path.

Budgets raised across the board, and a truncation-shaped 400 now prints a specific,
loud explanation instead of blending into the ordinary fallback message.

Lesson worth keeping: **a quality regression can hide behind a green test suite.** Watch
the thing a user would watch, not the thing the tests assert.

#### Stage 4 — shot distance

The last piece of the director, borrowed wholesale from film, where it is a century old:
a sequence of shots at the same distance reads as a list however good each shot is. Real
coverage has a shape — stand back to establish, move in as the argument gets specific,
sit closest at the thing that matters, pull back to let it land.

`shotDistance(position)` returns a multiplier applied to every keyframe of whatever move
the scene already had, so a push from further out is still a push. It peaks at two thirds
through rather than at the midpoint, because the strongest moment of an argument belongs
late and a video that peaks in the middle has nowhere to go afterwards. It closes wider
but not as wide as it opened, so the ending feels resolved rather than restarted.

Only the video knows the running order, so position is decided in `GeneratedVideo` and
handed down through every scene.

#### Two more fixes from watching real output

**The thread was stranded.** A list scene gets a spine down its left edge, which is right
for a left-aligned list and wrong for a centred one — the spine sat in empty space beside
nothing, reading as a rendering fault. Alignment belongs to the tone, so the thread now
asks, and a centred layout gets a rule under the heading instead: same job, done the way
a centred composition does it.

**The editor was deleting scenes nobody asked it to.** "Make it bolder" came back with
three scenes where there had been four, and the reply said only "Changed tone to bold".
The prompt already says to return the whole plan; the model mostly obeys, and *mostly* is
not good enough when the failure is somebody's work disappearing silently. Scenes dropped
without a shortening word in the instruction are now restored, with a warning. Keeping one
scene too many is far cheaper than losing one: an unwanted scene is visible and one click
to delete, while a vanished one is invisible until after they have exported.

Verified: 4 → 4 → 4 scenes across two edits, with the agent's memory still working
(clean → bold, then motif → beams "for a bolder look").

brands 20/20, confirmation 9/9, memory verified, full loop end to end, real MP4 out.

### 2026-09-26 (late) — UI round, and a smarter intake ✅

#### Brand extraction: it was finding *a* colour, not *their* colour

Colours were collected from buttons, headings and every CSS variable, then trusted in
whatever order they arrived — so a border colour could outrank the background of the
primary call-to-action. Those are not equal evidence. A company chooses the colour of its
main button deliberately; almost nothing else on a page is chosen with that much care.

Every source now carries a weight: `theme-color` 100, a variable actually named
`--brand`/`--primary`/`--accent` 90, a filled button's background 85, a ghost button's
text 60, links and headings 35. Greys, neutrals and anything named `--surface` are
dropped outright.

Result on real sites: Stripe **#533AFD**, Notion **#0075DE**, and Linear **#7170FF** —
Linear previously came back with *no colour at all*.

#### The logo was their share card, not their logo

`og:image` was ranked above the page's own header image, and `og:image` is almost always
a social card: a screenshot with a headline baked into it. That is why imports kept
returning something from the right company that was obviously not their mark.

Candidates are now scored, and an inline `<svg>` in the header scores near the top —
because a company that cares about its logo ships it as vector markup, and that was the
one candidate the old code could not use at all (it has no URL). It is serialised out of
the page as a data URL and stored directly.

Verified against the database: the three newest logos are 1.9–3.3KB SVGs. The ones before
were 62KB PNGs — the share cards.

#### The conversation no longer dies when the video is born

Raised twice, and it was structural rather than cosmetic: the intake chat lived in one
piece of state and the editor's chat in another, and making a video threw the first away.
Everything the person had explained vanished, and reopening the video showed an empty
panel — so the only route back to their own words was to remember them.

They are one conversation, so they are now one thread. The editor opens on the whole
history: what was asked for, what was agreed, and every change since.

#### Intake: ask like a director, not a form

The prompt was tuned hard the other way — "DEFAULT TO BUILDING", "never ask a second
question" — a deliberate anti-form decision that had gone too far: a video built from one
line is about the *category*, not about them, and generic is the thing this product
exists to beat.

Now at most two questions, each chosen because it changes the film, each with the reason
attached and an escape offered ("or say go and I'll take a swing at it"). Ranked by
value: the one thing the viewer should do, who it is for, the proof, where it runs. Never
ask what a brand kit already answers, never ask what the director should decide itself
(length, colours, tone — asking the user to art-direct is the opposite of the point), and
never ask the same question twice.

**Two bugs found by running the conversation rather than reading it.** The server forced
`ready` after two user messages, which was correct when one question was allowed and
wrong the moment two were: the model was still asking while a "Make it" button appeared
underneath, and the answer went nowhere. And the confirmation fell back to "A short video
from what you described", which looks like a real answer and confirms nothing — it now
falls back to the brief's own first sentence.

#### Smaller things

- **Favicon** is now the same mark as the one beside "Motion", authored in the same 24x24
  box and scaled by a transform, so the two cannot drift apart again. They had.
- **Replies arrive word by word.** Honest about what it is: the whole reply has already
  been received and is revealed in reading order. Text that appears all at once has to be
  *found* before it can be read. Paced by a total budget rather than a per-word delay, or
  the longest replies — the ones people are least patient with — would be the slowest.
- **Nothing answers faster than 800ms.** A reply in 200ms reads as a lookup rather than
  as consideration. The floor only ever adds time to a call that had nothing to wait for.
- **Sidebar hierarchy.** Destinations at weight 560 with an accent marker; history at 420
  and muted, behind a rule. They were nearly the same weight, so the eye had to read the
  words to find the difference.
- **The avatar's contents were riding a text baseline**, which reserves room underneath
  for descenders neither an icon nor initials have — invisible in a row of text, obvious
  in a circle. That is why it kept showing up only in the collapsed rail.
- **The brand chip shows the brand**: their real logo (falling back to a monogram on
  their own accent) and a three-colour strip, rather than one flat swatch. A kit is a set
  of decisions; one dot cannot say that.
- **Brand rows** say "Calm and clear · linear.app" instead of "#7170FF · Dark". Nobody
  recognises their brand by hex code, and the colour is already visible beside it.

brands 20/20, confirmation 9/9.

### 2026-09-26 (night) — Motion 2.0, part 1: composition ✅

Founder: *"it feels like you are having a rule based system which is generating the same
kind of videos with same kind of structure and pattern."* Correct, and the cause is
architectural rather than aesthetic.

#### The honest diagnosis

Every scene component *was* its layout. A title was a centred column of badge, headline
and subtitle, written into the JSX, with three enum values that nudged it. Tone changed
size, weight, colour and speed — never position. So the entire space of videos the engine
could produce was ten scene kinds times three layout enums, and it felt like a template
because architecturally it was one. No amount of better typography could have hidden it.

#### Research, and the licence position

- **Motion Canvas** — MIT. Safe to learn from. Its central idea is that animation is
  *composed* rather than selected, which is exactly the gap here.
- **Theatre.js** — core Apache-2.0, studio **AGPL-3.0**. The studio is unusable for a
  hosted product; avoided entirely.
- **Remotion** — still ruled out, unchanged.

Ideas only, as always. No code taken from any of them.

#### Layout is now data

`packages/engine/src/compose/` — a 12x8 grid (twelve because it divides by 2, 3, 4 and 6,
which is why the number survived from print), regions described in column and row *lines*
rather than cell indices, and a `<Slot>` that places whatever it is handed.

Seven title compositions now exist where there were three nudges: centre-stage,
left-hero, high-and-low, lower-third, full-bleed, two-thirds, deep-centre — plus mirrors.
Adding an eighth is a row in a table, not a component.

#### Seeded variation

The reason nothing ever varied is that nothing ever *chose*. The fix is not randomness,
which would break the rule the whole engine rests on — a frame is a pure function of its
inputs, so preview and render match exactly. The fix is to make the inputs carry the
variation: a seed derived from the video's own brand, title and prompt.

Same prompt composes the same film forever. A different prompt lands somewhere else
entirely. Verified: same input → same seed → same stream; different input → different
seed.

Every decision draws from its own *labelled* stream (`streamFor(seed, 'title-layout-2')`).
Without that, adding one new decision anywhere shifts every choice made after it, and a
video that looked right yesterday is silently rearranged today by an unrelated change.

Two details that matter more than they look: FNV-1a for the hash, so "Northwind launch"
and "Northwind Launch" do not land next to each other; and Fisher-Yates for the shuffle,
because `sort(() => random() - 0.5)` biases heavily towards the original order and would
have quietly undone the point.

#### Type that fits its box

Composition broke immediately on the first test: headlines overflowed their regions and
collided with the subtitle underneath. Once layout is data, sizing by guesswork stops
being survivable — a composition that hands out regions has to be able to trust that what
goes in them stays in them.

`fitText` steps a size down until the text fits both the width and the height of its
region, wrapping on whole words. It cannot measure — measuring would make the answer
depend on fonts having loaded, which would break frame purity — so it estimates from
average character width and deliberately errs small. Text one step smaller than optimal
looks considered; text one step larger looks broken.

Also: the accent rule now takes the shape of its region, running along whichever axis is
longer and as long as the region is. A fixed horizontal dash dropped into a tall region
was floating mid-frame attached to nothing.

#### Proof

Four different prompts, four genuinely different designs — left-hero, centred,
lower-third, two-thirds — with type fitting in all of them. Before this change all four
were the same picture with different words in it.

Render verified end to end: 15.6MB MP4.

#### What is left of 2.0

This is the foundation. Still to come: the other nine scene kinds converted from
hardcoded layouts to compositions; an entrance library (one move today — masked rise);
a compiled score so timing is composed rather than written as delays inside components;
and "looks" — art direction presets bundling type pairing, grid density, colour blocking
and transition family.

### 2026-09-26 (night) — Motion 2.0, part 2: entrances and lists ✅

#### One move, used for everything

The engine had exactly one entrance — text rising from behind a mask — and used it for
headlines, supporting lines, list rows, captions, every scene, every video. It is a good
move, which is why it took so long to notice it was the *only* move. A film where every
element arrives identically reads as one effect applied to some content rather than as a
piece of design, and that impression survives however varied the layout underneath is.

Nine entrances now: rise, drop, wipe, split, scale, slideIn, focus, unfold, and cut.
Each is a pure function of frames-since-start returning styles, so nothing about this
threatens the rule that a frame is computable on its own.

Three decisions inside that are worth keeping:

**Grouped by role, not by effect.** The useful question at a call site is never "which
transform" but "what is this thing". A `hero` happens once and can afford a gesture; an
`item` is one of four arriving in sequence and must stay calm, because the same move seen
four times in three seconds stops being a move and becomes a tic. So `item` has the
shortest list on purpose.

**Tones forbid as well as prefer.** A bold film that occasionally drifts softly into
focus is not bold, it is inconsistent — which reads as accidental rather than as range.
Bold and kinetic cannot use `focus` or `unfold`; editorial cannot use `scale`, `split` or
`cut`.

**`cut` earns its place by doing nothing.** When everything around it is moving, the
thing that is simply *there* on the beat takes the eye, and a film where nothing ever
cuts has no punctuation.

#### The bullets

The founder's words were *"same kind of bullets"*, and there was exactly one arrangement:
a heading above a centred column of dashed rows, in every video ever made.

Five arrangements now — stacked rows, heading-beside, full-width bands, columns, and a
two-by-two grid — chosen by item count, text length, format and the seed. A list of four
short things is one of the most flexible shapes in graphic design, and a bulleted list is
the least interesting of them: it is what you reach for when the arrangement has not been
decided.

Constraints are hard rather than preferred, because getting them wrong does not look like
variety, it looks like a bug: a two-by-two holding three things has a hole in it, and
columns holding five are too narrow to read.

**StepsScene was deleted.** It drew a numbered version of the same picture, so every
layout improvement had to be made twice and drifted apart whenever it wasn't. Order is a
property of the content, not a reason for a second component — the chooser reads it and
picks a numbered arrangement. An ordered list gets numbered; an unordered one never does,
because numbering a list of benefits invents a sequence that is not there.

#### The bug that looked like a layout bug

Two arrangements ran off the right edge of the frame. The cause was not layout at all:
`Slot` spread the caller's `style` *after* its computed geometry, so a `width: 100%`
meant for the content replaced the slot's own width — and the slot then ran from its left
edge to the full width of the frame.

Caller styles now go first and geometry last. A slot's position and size belong to the
composition, and nothing passed in should be able to take them. Worth remembering as a
general shape: when a style spread can overwrite computed layout, the failure shows up
far from its cause.

Verified: four prompts, four genuinely different list arrangements, steps correctly
numbered, everything inside the frame.

brands 20/20, confirmation 9/9, render 15.6MB.

### 2026-09-27 — Motion 2.0, part 3: looks, endings, rhythm ✅

#### Looks — art direction

Tone controlled how fast things move and how heavy the type is. What it could never
control is the thing a designer decides first: what *kind* of piece this is. A financial
report, a fashion campaign and a developer tool launch can share a palette, a voice and a
running order and still look nothing alike.

Six looks — **studio** (confident default), **press** (serif, tight grid, rules doing the
structural work), **signal** (mono labels, tight tracking, hard cuts), **poster** (huge
type, extreme contrast, colour in blocks), **bloom** (light weights, wide tracking, no
furniture at all), **broadcast** (bands, strong accent blocks, fast snaps).

A look bundles typeface, weight shift, tracking, case, type contrast, grid margin, colour
treatment, furniture level and transition family — and the bundling *is* the point. A
serif headline over a technical corner-marker grid is not a new look, it is two looks
fighting. Bundling is what lets a video be varied without being incoherent, which is the
difference between range and randomness.

Chosen once per film, never per scene: art direction that changes every four seconds is
not art direction. Constrained by tone (a kinetic script set in a serif with wide margins
is a contradiction a viewer feels without naming it) and by content (the poster look
exists to say one short thing enormously, so a nine-word headline vetoes it).

Type contrast is the most characteristic number in the bundle: editorial sits near 3, a
poster at 8 or more, which is why a poster reads as a poster even in silhouette.

**Typefaces are generic CSS stacks, not bundled files.** Shipping a typeface means
checking its licence for embedding and redistribution, and the licence rule here is
absolute. Until a specific open-licensed family is chosen and checked, the looks vary
weight, tracking, case, contrast and colour — which is most of the difference anyway.

#### Endings

Every video we had ever made ended identically: a centred line with a pill under it. It
is the last thing anyone sees and where the call to action lives. Six arrangements now,
shared with nothing else.

#### Two bugs, one of them mine to admit

**Type fitting was estimating for the wrong typeface.** The serif look picked sizes that
overflowed, because a serif at a given size is meaningfully wider than a grotesque and
one ratio was sizing both. Each look now carries its own character-width estimate, plus
corrections for weight and tracking.

**Adjacent regions with nothing between them.** Headlines and subtitles touched. Turning
on the slot outlines settled it in one frame: the type *fitted* its region perfectly, the
regions were simply adjacent, and both were filled to their shared edge. The layout was
right and the spacing was missing — which is not a thing that can be reasoned out from
the numbers, only seen. Supporting lines now keep a gap proportional to the headline.

#### The stat scene: a decision reversed

Endings and statistics looked like the same compositional problem — one important thing
plus a label — so they shared a table. That was wrong, and the render showed it: a
closing line is *text*, while a statistic is a composite object with a ring that closes,
brackets that snap in and a disc behind it. Hung in a corner by a text arrangement, the
ring collided with its own label and the thread's disc sat somewhere else entirely.

The number is centred again, deliberately. **Not every scene benefits from positional
variety** — this one is the subject of its shot, and the subject belongs where the eye
already is. Its variation comes from scale, entrance and rhythm instead. The sizing work
was kept: the whole *object* is fitted to its region rather than the digits, because
fitting the text left the ring overflowing.

#### Rhythm, and a subsystem not built

The plan had a compiled score: entrances composed into a timeline, sampled per frame. On
inspection it would have bought almost nothing the beat grid and entrance library do not
already give. What was genuinely missing was that every video played at exactly its
tone's tempo, so two films in one tone shared a pulse as well as a look.

A seeded tempo shift is the whole of that value in one line, kept inside ±12% because
tempo is the thing a viewer feels most precisely — further and a "clean" video stops
reading as clean, which would undo the point of having tones.

Worth recording as a decision rather than an omission: the score was scoped out on
evidence, not forgotten.

brands 20/20, confirmation 9/9, render 7.4MB.

### 2026-09-27 — The logo hunt, and the friction fixes ✅

#### "It's just fetching an arrow icon"

Correct, and it was a regression I introduced. The scrape took
`header.querySelector('svg')` — the *first* svg in the header, which on a real site is
almost always a hamburger, a chevron or a search glyph. The logo is usually three or four
elements further in.

Fixing it properly took four passes, and each one was found by rendering the stored
logos and looking at them rather than by reading the code:

**1. Score them instead of taking the first.** What identifies a logo is not its shape
but its position in the document: it is the thing in the top-left that links to the
homepage. That convention is effectively a rule and far more reliable than anything
guessable from path data.

**2. A logo can be labelled "Home" rather than "logo".** Notion's reads "Notion – Home"
and links to `/product`, so both the homepage rule and the name rule missed it.

**3. The blocklist was judging the wrong element.** Stripe's logo *is* labelled
"Stripe logo" and links to `/` — it scored 92 and was still discarded on every import.
The rejection test was reading the parent link's class, which describes the navigation
the logo belongs to, and a structural word in it matched the blocklist. **A parent's
class says where a thing is; only the thing itself says what it is** — and only that can
be grounds for throwing it away. This one cost the most time and was the smallest fix.

**4. A fixed pause is not a wait.** On a heavy homepage the navigation is still being
built at 1500ms, so every svg measured zero, the size gate rejected all of them, and the
logo fell through to the app icon. It now waits for the header to exist, then pauses for
fonts. Faster on light pages and correct on heavy ones.

Two more things an svg has to survive being lifted out of its page: a `<use href="#id">`
sprite reference points at nothing once extracted and renders as an empty box, and
`currentColor` resolves against CSS that does not come with it. Candidates are now
checked for geometry of their own, and the inherited colour is set on the root — *not*
substituted throughout, because replacing every `currentColor` with one value flattened
a two-tone mark into a solid blob.

**Result:** Stripe's wordmark, Linear's wordmark, Notion's mark. Previously an arrow
icon, a purple app tile and a blank.

#### The friction

**The composer lost focus after every message.** Sending re-renders the page and the
browser drops focus with it, so the second message and every one after needed a click on
the box before a single character could be typed. Nobody reports this as a bug and
everybody feels it: a conversation where you have to ask permission to speak each time.
Focus is reclaimed a frame after the send, in both composers.

**The playhead could not be picked up.** It carried `pointer-events: none` so clicks
would fall through to the strip underneath — which worked for clicking and made the one
thing in the editor that looks draggable impossible to drag. It now handles its own
press, drags from anywhere on the strip, and has a hit area wider than its own two
pixels, because a two-pixel target is not one anybody can hit on purpose.

**Nothing showed which chat was open.** A tinted background is indistinguishable from
hover, so two rows could look current and neither was certain. An accent bar is not
ambiguous.

**History had receded into looking disabled.** 13px at weight 420 in the muted colour —
the hierarchy was right and the floor was too low. A list you scan for your own work has
to be legible first and subordinate second.

**The editor header listed everything it knew.** "1920×1080 · 12.4s · 5 scenes ·
Northwind" — the resolution is implied by the format buttons beside it, the scene count
is the strip along the bottom, the brand is in the colours. Length is the only one you
cannot see by looking, so length is what it says.

brands 20/20, confirmation 9/9.

#### Still to do from this round

Settings: profile photo and personalisation fields. Brand page: the two-choice opening
and the kit library. The workspace panel still needs its wider clean-up.

### 2026-09-27 — The colour script. The change that should have come first.

Founder, straight: *"the video we are producing right now is trash according to the
competitors."* He is right, and the diagnosis is uncomfortable — I had been building
architecture while the thing a viewer actually sees stayed the same.

#### What was actually wrong

Every palette we ever shipped was near-black. `#06070F`, `#030B08`, `#0A0A0A`. And every
scene in a video reused the same one.

So however much the layout varied, however many entrances were added, however the camera
moved — at the level the eye reads first, every video was **a dark slide with a coloured
line on it**. Colour is the most powerful tool in graphic design and we were using
exactly one of them, as a thin accent.

On top of that sat a sci-fi HUD — corner ticks, a chapter counter, a progress rule, a
glowing vignette, a drifting gradient — added months ago to stop frames looking empty.
It worked, by putting the same instrument-panel costume on every film. The result was the
worst of both: **busy and empty at the same time.**

#### The colour script

Borrowed from animation, where a colour script is a strip of the whole film in
thumbnails, made before anything is animated, to decide what each sequence feels like.

Every scene now gets a full-frame treatment, and the sequence is composed. Six shapes:
`one-moment` (quiet, then one full field of brand colour exactly where the argument
lands), `bookend`, `nightfall`, `strobe`, `gallery`, `midnight`. The video's seed picks
one.

Four treatments: **paper** (near-white, tinted 14% with the brand's own hue — a brand
colour on pure #FFFFFF looks like a colour on a browser default; on paper that carries
its hue it looks chosen), **tint** (a wash), **field** (the brand colour edge to edge),
**ink**.

Text on a field is whichever of black or white can actually be read on it — measured,
not preferred. A brand yellow needs black and a brand navy needs white, and guessing
wrong makes the most striking frame in the video the one nobody can read.

**Light is the default.** Every video we had made was dark. Most brands are not.

#### The transition is the colour change

A cut from white to a full field of brand colour is *felt* before it is read — more than
typography can do in the same quarter second. The wipe direction rotates by position,
because a wipe that always comes from the same edge is a slide transition and one that
changes is choreography.

#### And the HUD came off

Corner ticks, counter, progress rule, vignette, bokeh, background glow: gone. Once colour
is doing real work the frames are not empty, and the furniture was a costume every film
was wearing. The thread that survives every cut is still there and now at 55% strength —
it was designed against near-black, where a faint accent line reads as structure; on
paper the same line is a smear.

**Restraint was what was missing, not decoration.**

#### Four bugs, each found by looking

**Glows on paper.** Halos, soft shadows and coloured glows were written when every frame
was near-black, where they read as light. On white they are grey smudges — the shadow
behind the big number turned a figure into something smeared. Light does not glow on
white, so anything adding luminance now asks first.

**A black glow on a colour field.** Worse: on a field the accent *is* black or white,
because the background took the brand colour. So "a halo of accent light" rendered as a
black smear behind the number. A field is now detected by the fact that accent equals
text — exactly true by construction.

**Padding outside the width.** Full-width bands were their region's width *plus* their
own padding, and their slot centres them, so the overflow landed on both edges and ate
the first letters of every line.

**And the real one: a reading scene that moved 15%.** The bands were still off-frame
after the padding fix. Outlining the regions showed the *regions themselves* were off
frame — the camera's `drift` zoomed 1.03 → 1.15 on a shot whose entire job is being
read. The frame grows past its own edges and anything laid out to the safe margin is
pushed off the side by the time the viewer reaches the last line. A scene that says
"hold still and read this" cannot also move 15%. Now 1.0 → 1.045.

I guessed twice before outlining the regions. Both guesses were wrong and both were
plausible. Looking took one shot.

#### An unplanned win

**Render dropped from ~160s to 33s.** A flat rectangle costs nothing to draw, where the
gradients, blurs, motif and vignette it replaced cost everything. The simplification was
made for the design and paid for itself in speed.

brands 20/20, confirmation 9/9, render 5.5MB.

#### Honest position

This is the first change in a while that moves what a viewer sees rather than how the
code is arranged. It is not finished — the next real gaps are graphic *objects* (shapes
and marks that carry meaning, not just type on colour) and genuine typographic range.

### 2026-09-27 — Stacked type, and a verified checkpoint ✅

#### The thing that was still missing

*"A bit better and a bit not better. I'm not super impressed."* Fair. The colour script
fixed the frame; the *content* of the frame was still one line of text in a box.

Headlines were set the way a browser sets text: one size, wrapping wherever the box ran
out. What a designer does with a short, important line is break it by meaning and set
each line to **fill the full measure** — so a two-word line and a four-word line both
reach the same right edge, and their sizes therefore differ enormously. That difference
*is* the composition. It is the look of a Swiss poster, a magazine cover and essentially
every title sequence that has ever looked expensive.

It costs one division per line: the size that fills the measure is the measure divided by
the line's width at size one. No layout pass, no measuring, still a pure function.

Headline regions were widened to nine and ten columns to go with it, because type set to
*fill* its measure means the region's width now decides the type's size — a headline
given six columns is not a smaller version of the same design, it is a different one.

One word per headline gets marked, in one of three ways chosen by the seed: colour, a
solid bar that wipes in behind it after it lands, or an outline. Exactly one, because a
headline with three emphasised words has emphasised nothing.

#### Two bugs in it, both found by looking

**An orphan guard that disabled the feature.** The line breaker refused to start a new
line unless more than one word remained — which meant a three-word headline could never
break, and "Ship without meetings" stayed on one line with the stacking silently not
happening. One word is a perfectly good last line; it is the biggest one, and often the
point of the headline.

**Eyebrows under headlines.** Widening the headline regions moved them up into the row
the badge was using, so "NEW" printed on top of the first line.

#### Checkpoint — verified, not assumed

Everything below was run just now against a clean start of both servers.

| | |
|---|---|
| Typecheck + build | clean |
| Brand suite | 20/20 |
| Confirmation suite | 9/9 |
| Agent memory across edits | clean -> bold -> beams, 4 scenes held throughout |
| Full loop (signup, create, refine, render) | passes, 609 frames, 8.6MB, valid MP4 |
| Single render | 29.2s, 5.5MB |
| Website import | Stripe #533AFD, Notion #0075DE, Linear #7170FF — all three logos found |
| Studio + render surface | both 200 |

Render is now ~29s where it was ~160s before the colour work, because a flat colour field
costs nothing to draw next to the gradients and blurs it replaced.

#### Where this honestly stands

The frame is doing real work now — colour that changes, type set as a graphic object,
compositions that differ between videos. What is still missing, and what the founder is
still right about, is **graphic content that is not type**: shapes and marks that carry
meaning rather than decorate, and genuine typographic range beyond one family per look.
That is the next real gap, not another layer of architecture.

### 2026-10-12 — Back after a break. The strategy call, and the product shot.

#### The question

Founder, returning: *"should we improve the current engine or make a bigger shift?"* —
with the output honestly at 5-10% of target, and a benchmark of 50-60% on free tools
before considering anything paid.

#### The answer, and the thing I could finally name

Neither "improve" nor "replace the renderer" is right. The renderer is good: deterministic,
free, real MP4 out, 29s renders, preview identical to export. Diffusion is wrong for us —
it cannot do crisp text or exact brand colours, which is the entire thesis.

What needs replacing is this: **I design the videos, and the AI only writes the words.**

The engine draws about ten scene types I hand-coded. However good each one is, that is
the whole universe of videos the product can make. A motion designer handed the same
brief *invents* a composition; we pick from my list. That is the ceiling, and adding
scene number eleven does not raise it.

The unlock is to let the AI compose scenes — placing typed elements on the grid with
their own timing, from a vocabulary the engine validates and renders. Unbounded, still
deterministic, still free.

**But ordering matters, and I would have got this wrong a month ago.** Doing that first
would produce AI-arranged plainness, because the primitives available to compose *with*
are text, a rule, a circle and a device frame. So: vocabulary first, composition second.
Both agreed.

#### Also agreed: I have been guessing at "good" for eight rounds

Asked for two or three reference videos the founder would be proud to have made. Not
answered yet, and worth chasing — it is worth more than another week of me interpreting
"trash".

#### The product shot

Chosen as the first vocabulary piece because launch videos are roughly seventy per cent
product footage. Ours was a rectangle facing the camera, dead centre, at one angle,
forever — correct, and it looked like a screenshot pasted onto a slide.

Presentation is now separated from content, because what makes product footage look
expensive is never the interface. Four stagings — flat, angled, stacked, cropped — chosen
per video from the seed. Perspective lives on the wrapper so every layer shares one
vanishing point. Angles stay under about twelve degrees, past which a screen stops
reading as "turned towards you" and starts reading as a 3D render that is hard to read.

Two shadows rather than one: a tight dark one to ground it and a wide soft one to give it
a room. A single shadow always reads as either a sticker or a blur.

And the content drifts inside the window. A static interface is a picture however well it
is staged; the same interface moving is a recording. The rail stays put while the panel
moves, because scrolling the navigation with the content is the giveaway of a fake.

#### Three bugs, each from looking at a render

**Blue on blue.** The interface inherited the scene's palette — right for everything else
in the engine and completely wrong here. On a colour-field scene the window became brand
blue, so the UI inside it was invisible. A screenshot does not change colour because the
slide behind it did. The interface now has its own near-white or near-black surface, with
the brand's real accent inside it — which also meant threading the true brand accent
separately, since on a field the scene's accent has become black or white.

**A phone taller than the frame.** Giving the browser more room was right; applying the
same allowance to a phone was not. A phone is twice as tall as it is wide, so it was
immediately cut off at both ends with the heading pushed out entirely. Aspect ratio
decides which dimension is scarce, so each now gets its own allowance — and no screen
takes more than 74% of the frame, because a shot with no air reads as a screenshot.

**A drift that became a scroll.** The first distance carried the labelled rows clean off
the top of the phone, leaving a screen of blank placeholders — worse than not moving at
all, because the only part carrying the customer's own words had gone. Now a few per cent.

brands 20/20, confirmation 9/9, render clean, vertical and landscape both verified.

#### Next

The rest of the vocabulary — graphic systems, layered depth, richer type blocks — then
the AI composing scenes from it.

---

## Round nine — the references, and an agent that chooses

Three reference films arrived in `REF_Video/`, with a five-part brief: fix the prompt
focus bug properly, build a page that shows the work happening, study the references
deeply rather than copying their surface, and make the agent decide rather than follow
rules. All of it is in. What follows is what was built and, more usefully, what was wrong.

### The focus bug, finally

Reported since the first week, "fixed" twice, never fixed. The cause was one attribute:

```tsx
<textarea disabled={busy} …/>
```

Pressing enter sets `busy`, which disables the element on the very next render, and a
browser blurs a control the moment it is disabled. Worse, `.focus()` on a disabled
element silently does nothing — which is exactly why re-focusing after submit looked like
a fix and changed nothing at all. Both previous attempts were calling a method that
cannot work on the element they were calling it on.

The textarea is never disabled now. Sending was already guarded (`if (!trimmed || busy)
return`), so the attribute was protecting nothing and costing everything.

**The lesson is the part worth keeping: a fix that cannot be observed to work has not
been verified.** It is now proved by a Playwright test that types, presses enter, keeps
typing without clicking, and asserts the second message landed in the box.

### Reading the references

Frames were pulled without FFmpeg — Chrome's own decoder, driven by Playwright, seeking
and screenshotting, tiled into contact sheets. Three distinct approaches:

- **product-led** (Notion) — the interface is the hero. Fragments of UI floating at mixed
  scales and slight rotations, some running off the frame edge. Named cursors. Interface
  elements set inline inside a sentence. About four seconds a scene.
- **typographic** (Fireworks) — no product footage at all. One saturated colour against
  white and black and nothing else. Full-frame colour fields as whole scenes. Technical
  grids with a dot at every intersection. Outlined pill chips with drawn arrows.
- **camera-led** (Base44) — one continuous interface with the camera as the only editor.
  Extreme push-in, pull back to re-establish. Gradient meshes behind the cards.

Seven rules all three obey: light backgrounds dominate; one brand colour plus neutrals;
about four seconds a scene; large negative space; soft shadows and rounded corners on
anything representing an interface; the camera moves *into* things; never more than one
idea on screen.

**These live in `packages/planner/src/references.ts` as data, not prose in a prompt.**
`referenceBriefing()` builds the prompt text from the array, so adding a fourth reference
is adding an entry — not rewriting a prompt and hoping. That was the explicit ask and it
is the part most likely to matter in six months.

### Breaking the four-primitive ceiling

The engine could draw text, a rule, a pill and a rectangle. You cannot compose a rich
frame out of four primitives however well you arrange them, which is most of why eight
rounds of layout work kept producing the same picture. `videos/fragments/Fragments.tsx`
adds `Chip`, `NamedCursor`, `Card`, `Bubble`, `Flow`, `Arrow`, `NodeGrid` and `Mesh`, and
two scenes built from them:

- **flow** — states with drawn arrows between them. A list says "here are some things
  that exist"; a flow says "this becomes that", which is almost always the real claim.
- **constellation** — six fragments of the product scattered at mixed scales with a named
  cursor. Showing a corner implies the rest without inventing it.

### The direction

The director now chooses a direction before anything else and says why in one line, and
that choice reaches the frame in four places: the look set, the colour-script shapes, how
much the camera moves, and which scene shapes the plan may use.

| | looks | colour shapes | camera |
|---|---|---|---|
| typographic | poster, signal, broadcast, studio | strobe, bookend, one-moment | ×0.45 |
| product-led | studio, bloom, press | one-moment, gallery, bookend | ×0.85 |
| camera-led | bloom, studio, press | gallery, one-moment | ×1.35 |

Tone wins a straight fight, because a look carries its own cut list and motion multiplier
and those have to agree with how the script reads. Where the two sets do not overlap, the
tone's set stands — narrowing an empty set to nothing would hand every such video the
fallback look, which is how you end up with one look again by accident.

The prompt's old "every software video MUST contain a product scene" rule contradicted the
typographic direction, which exists precisely for products with no screen worth filming.
It is now conditional on the direction, with separate shape menus for each.

Verified on three briefs: a message queue came back typographic (`bigword → stat → flow →
outro`), a project tracker product-led (`title → product → features → outro`), a support
agent camera-led (`title → steps → product → outro`). Three briefs, three directions,
three different films, no hardcoded mapping — the model is choosing.

The rule-based fallback states a direction too, read off the plan it actually built
rather than guessed: a plan with an interface in it is product-led, one without is
typographic. The fallback runs when the model is rate-limited, which is when the product
is busiest, and that is exactly when it must not get quietly worse.

### What photographing it found

Everything above built cleanly. Then the frames were shot, and four things were wrong
that no amount of reading the code would have shown.

**Two marks where there should be one.** Titles and endings each drew their own accent
rule where the composition asked for it — and the thread drew a second one pinned to the
centre of the frame, because the thread's position table was written when every scene was
centred. Side by side, a few centimetres apart, they read as a rendering fault.

The thread now recomputes the same layout the scene computes, from the same seed and the
same stream, and lands on the mark that layout asked for. The scene no longer draws it.
This works because a composition here is a pure function of its inputs — the same property
that makes the preview match the export. Nothing is passed between them; they agree
because they are doing the same arithmetic. Lists got the same treatment: the spine sits
against the items' real left edge, and is as long as the list rather than as long as the
region it was cut from.

**99.99% rendered as "100.0%".** Decimal values were formatted to one place. Four nines is
the entire claim an infrastructure company is making, and we rounded it into a promise
nobody can keep. Precision now comes from the value as written. The engine is not allowed
to improve a number it was handed, in either direction.

**A chat with the composer sliding out of the window.** The whole thread rode the scroll,
including the input — and it scrolled *down*, which is the one direction a conversation
never goes. The composer is outside the scrolling area now; the thread moves up; messages
have line counts and a width ceiling in pixels, because half of fifteen hundred pixels is
a bubble three times wider than any real message and six of them stack into a bar chart.

**Three points in a box cut for six.** The item size cap was one number for every list, so
a short list came out the same size as a long one and sat in the top corner of an empty
frame. Fewer things on screen means each matters more: the cap now rises as the count
falls, with a ceiling under the heading's own size so the hierarchy cannot invert.

### The build page

`pages/Building.tsx`. Five stages — reading the brief, choosing a direction, writing the
copy, composing the scenes, putting it together — with ticks, a three-dot animation on the
active one, and a line between them that fills as each completes.

Three of the five happen inside one API call with nothing to observe between them, so
those advance on a timer. **Any real signal always overrides the walk**: the page can run
ahead of itself but never behind, and it never claims to have finished something it has
not. When the plan lands, "Choosing a direction" stops showing a generic line and shows
what the director actually decided.

That reason also goes into the first message of the editor thread, because the build page
is gone a second later and a decision you cannot see is a decision you cannot argue with.
It is in the scene inspector too, as a quiet note rather than a field — changing the
direction means asking for a different video, and making it look like an input would be a
promise the panel cannot keep.

### Verified

Build clean. brands 20/20, confirm 9/9, direction 9/9, memory test passes (a follow-up
edit saying only "now even more" was understood in context), focus test passes, full loop
passes end to end — signup, plan, refine, render, valid MP4. A real 426-frame render at
8.5 MB and a 609-frame one at 9.7 MB. Contact sheets shot for all three directions.

### Next

The constellation and the stacked-rows list both leave a lot of frame empty on one side.
Not wrong — the references use large negative space deliberately — but worth composing
rather than inheriting. And the references want a fourth entry the moment another film is
worth learning from, which now costs one array entry.

---

---

## Round ten — reading the films properly, and the scene that came out of it

Anas said the engine had learned one or two per cent from the references and that every
video still looked like one template with the text swapped. Both were true, and the second
followed from the first.

### What the first reference pass actually did

It sampled twelve frames out of sixty-six seconds and turned them into three paragraphs of
adjectives — "light, near-white, large negative space". All true, none of it buildable.
Worse, the one hard number in it was wrong: it said "about four seconds a scene". The real
medians are 4.6, 2.8 and 2.2 seconds, and two Notion shots run sixteen and fourteen
seconds with no cut at all because the camera keeps working inside them. Scene timing was
built on a guess.

### The second pass

Every film walked at 0.2s with a histogram difference between neighbours as the cut
signal, then every distinct composition looked at. `references.ts` now carries measured
holds, cut counts, luminance shares, and the devices as things you could draw.

The devices that were missed entirely:

- **Type sits ON the moving interface.** Notion puts "your docs" and "all connected." in
  the middle of the frame with real UI scrolling behind, overlapping, tilted, running off
  both edges. The words and the product are one picture.
- **Interface objects set inline inside sentences**, on the baseline: "You didn't just
  [card] take notes."
- **The frame as a viewport.** Base44 lets body text run off *both* edges. Nothing is
  composed to fit.
- A **sliding dark/light split**; a **vertical panel carousel**; **edge barcode strips**;
  a **block-mosaic gradient**; **guide lines with dots at the intersections drawn in a
  tint of the background**; a flow diagram that **grows by inserting states mid-chain**;
  **headlines that type themselves and leave the caret**; a **real photograph** mid-film.

Base44 is 96% light frames with **not one dark frame**, and is one interface for forty
seconds with the camera as the only editor.

### More detail made the model worse

Feeding all three full vocabularies into one prompt took the briefing from ~700 to ~3100
tokens — and the planner got measurably worse: two-scene plans, and it dropped the reason
for its own style choice. Not truncation; `finish_reason` was never `length`. The model
simply lost the thread with three competing vocabularies in view.

`referenceBriefing(style?)` is selective now: a ~700-token menu to *choose* a direction,
the full ~1200-token vocabulary of *one* film to compose with. Nobody ever needs all three.

Along the way `finish_reason` is finally read. It was never checked, so hitting the token
ceiling produced a short plan and nothing anywhere said why. On a reasoning model the
ceiling covers the thinking too, so a longer prompt can push a working request over it
without a line of our code changing.

### The overlay scene

`OverlayScene` is the first scene where type and product share the frame instead of taking
turns. Cards drift continuously behind a line of type, overlapping, tilted, clipped by
both edges.

Three things make it read rather than look like a mistake. The column is **already moving**
when the scene opens and still moving when it cuts. The cards are laid out against a span
**wider than the frame** and deliberately clipped. And the type is held up by a **soft
radial scrim** in the frame's own background colour rather than a plate — a hard box would
put the words back in their own region, which is the thing the scene exists to escape.

The camera holds almost still here (0.12 strength): the background already travels a frame
and a half, and two motions give the viewer nothing to hold on to.

The director picked it unprompted on the first real brief:
`title → product → overlay → features → outro`.

### The build screen

It was a list of five stages with ticks and a progress rail, sitting next to the sidebar.
That is a status report, and it made making a video look like one more destination in a
menu. Now the navigation goes away entirely, the frame the film will play in is already on
screen at the right aspect ratio, and **one line at a time** sits inside it with a single
travelling bar under it. Nothing to read ahead to, nothing ticked off behind.

### The scrollbar

A grey rail appeared down the chat the moment the conversation got long — so the better
the conversation went, the uglier the panel got. `.scroll-bare` on the three reading
surfaces. Both properties are needed because Firefox and WebKit disagree about how to say
it. Scrolling is untouched; verified by computed style and by scrolling.

### A correction worth recording

A subtitle looked clipped in a contact sheet and a bug was chased for several steps. It was
not clipped — it was JPEG compression in a downscaled tile. **Contact sheets are for
composition; detail needs a full-resolution crop.** The `em` fix made along the way is
still correct on its own terms (the mask's descender room resolved against the wrong font
size) but it fixed nothing visible.

### Verified

Build clean. confirm 9/9, direction 9/9, focus passes. A 768-frame render at 14.6 MB
including the overlay scene.

### Next

The vocabulary list is honest now and the engine can draw one item on it. The rest —
inline objects in sentences, the viewport model, the sliding split, one continuous shot as
a whole film — are structural and still outstanding.

---

---

## Round eleven — the plan, the workspace, and plainer type

Three notes from Anas, and the most useful one was about type.

### The build screen, third time

It was a list of ticked stages beside the sidebar; then a full-bleed screen of its own.
Both were wrong the same way — a *different place* you went to wait, and then you were
moved somewhere else when the work finished.

It is now the editor itself: the same header, the same conversation down the left, the
same rectangle on the right, and the work happening inside that rectangle at the aspect
ratio the film will actually be. Nothing swaps underneath you. One line at a time, with a
single travelling bar, and the same line echoed in the thread where the agent has been
talking all along.

The timeline's space is held empty rather than filled with a fake strip of scenes.
Inventing a timeline for a film that has no scenes yet is the kind of small lie that
makes a product feel untrustworthy.

### The agent plans out loud

Two changes, because "it generates in one click" was a fair description.

The question ceiling went from two to four, and — more importantly — a **floor** of three
was added. A single question is not gathering, it is a formality, and a film built on one
answer is a film about the category rather than about them.

And the reply now carries a `plan`: four or five beats in plain language, numbered,
shown above the Make it button. Each beat is what the viewer SEES, never a scene-kind
name. There is deliberately **no fallback plan** — a generic one invented server-side
would be a claim nothing is checking, which is worse than showing none, because it looks
like agreement was reached. Three beats is the floor for showing it at all.

This is the last moment a misunderstanding is free. After it there is a render, and once
somebody has watched a video being made they argue with it far less than they would have
argued with four lines of text — not because it got better, but because disagreeing now
costs them another wait.

### Plainer type, which was the real note

> *the text which is professional and better is simple and minimal — you don't need to
> overcomplicate text stuff*

He is right and the engine had been doing the opposite. `StackedType` breaks a headline
into lines by meaning and sets each part at whatever size fills the measure, so a two-word
line and a four-word line come out at wildly different scales. It is a real technique and
it looks designed — for about two videos. After that every headline in every film is
doing the same trick, and a trick repeated is a template, which is the exact complaint
this engine keeps earning.

The attached frames do the opposite and look more professional for it: "Your next idea",
"Starts here", "Find inspiration". One line, one size, regular weight, dead centre, a lot
of air. The confidence is in the restraint.

`PlainLine` is now the default for titles and endings; the stacked treatment is kept only
for the poster look, which is the one art direction that genuinely exists to set a short
phrase enormously. Weight is capped at 560 — an 800-weight "simple line" is not simple,
it is shouting quietly.

The one flourish those frames allow themselves is kept: the line ramps from the text
colour to the brand colour across its own length, per word, so the last word lands in the
brand's colour. "Your next **idea**". "Find **inspiration**". On a full colour field the
ramp collapses to nothing on its own, because there the accent has already become black
or white for legibility — which is the correct behaviour and needed no special case.

### Two collisions found by looking

The closing button landed on top of the thread's rule. Padding it down only moved the
collision. Every one of these arrangements puts its mark in the gap between the closing
line and the call to action, which is exactly where the button goes — so when a button
exists the mark now goes **above** the line instead. A rule over a closing statement is as
old as print, it cannot collide with anything, and it leaves the line and its action
sitting together as the one block they are.

The offline planner also stated a style with no reason beside it, which reads as the
machine declining to explain itself. It now says plainly that it is the fallback and why
it chose what it chose.

### Verified

Build clean. confirm 9/9, direction 9/9. The plan card photographed with five beats above
the Make it button. The build screen photographed in the workspace layout with the real
conversation beside it.

Two direction failures mid-session were Groq 429s, not code — the free tier was being
hammered all day. Worth remembering before debugging a phantom.

### Next

Still outstanding from the reference list: inline objects inside sentences, the viewport
model everywhere rather than in one scene, the sliding dark/light split, depth-of-field
focus pulls, and one continuous camera move as a whole film.

---

---

## Round twelve — the agent was the rules, and the arithmetic that made it so

> *the agent that comes in the chat is so so much dumb right now that we can't even
> explain*

He was right, and the cause was not the prompt. It was a number nobody had looked up.

### The finding

Groq's free allowance is **8,000 tokens per minute, per model** — not per request — and
`max_tokens` is **reserved** against that budget whether the model uses them or not.

Measured: the director's prompt is 2,862 tokens and it reserved 4,500 more. **One plan
cost 7,292 of the minute's 8,000.** Make a video and the allowance was gone; everything
after it got a 429, and a 429 meant the offline rules planner. So for weeks the agent
*was* rule-based much of the time, and nothing in the logs said so.

### What changed

**Budgets sized from measurement, not comfort.** The director measures 1,678 completion
tokens at medium effort, so the reservation went 4,500 → 2,200. A plan now costs 5,062
instead of 7,292. Chat 1,800 → 1,500 with low effort; editor 5,000 → 2,600.

**`reasoning_effort` is now set per call.** The gpt-oss models bill their thinking in full
and never show it. Measured on one small request: low 55 tokens, default 119, medium 161,
high 372. Low for conversation and editing, medium for the director — the one genuinely
creative judgement. High produced the same plan shape for triple the cost.

**Buckets are per model, so a 429 now switches models instead of waiting.** Measured: with
120b spent down to 4,893, the 20b model still reported a full 7,918. The old code waited
twice on the first model and then dropped to the rules — nine seconds of waiting while a
perfectly good model sat idle. Waiting is the last resort now, not the first.

**A cut-off JSON reply earns a bigger budget.** "Failed to generate JSON" is not a prompt
problem, it is the model running out of room mid-object — and the smaller model reasons
more verbosely than the larger one at the same effort, so a budget tuned for 120b strands
20b. One retry at 1.6×.

**The remaining allowance is logged on every call.** The single most expensive kind of bug
is one whose only symptom is quality, because quality is the last thing anyone thinks to
check the logs for. Now the number is there before it is needed.

**The fallback message tells the truth.** "The AI service was unreachable" was wrong
almost every time it appeared — the service was reachable, we had spent the minute. It
now says so and says to try again in twenty seconds. Telling someone a transient budget
limit is an outage teaches them the tool is unreliable, which costs more than the wait.

### A mistake worth recording

A third model was added as an extra bucket — `openai/gpt-oss-safeguard-20b` — without
testing it against a real request. It made things **worse**: it 413s on a director call
and cannot do JSON mode at all, because it is a safety classifier rather than a general
model. `qwen/qwen3.8-27b` fails the same way with a 429. Both advertise 131k context; the
limit that bites is the per-minute token allowance, which is far smaller on both.

The file already carried a note about exactly this trap, written the last time qwen was
removed, and it got walked into anyway. The note has been rewritten to name both models
and the test that catches them.

### The honest limit

A full flow — four chat turns at ~2,950 plus a director call at ~5,062 — costs about
17,000 tokens. That does not fit in one minute at any budget. Trimming helps; it cannot
fix it. At human typing pace most calls now reach the real agent; typed fast, some will
not. The real answer is a paid tier, and that is now a decision rather than a mystery.

### The loading screen

A grey rectangle with a sweep said "something is loading", which was not true — we
already know the SHAPE of the film, because the plan was agreed before anything started.

It now shows that shape being built: one card per beat of the approved plan, each
developing in turn with a band of light crossing the one being worked on, the beat named
underneath and the pipeline stage quieter below it. The cards are skeletons of a
composition rather than fake pictures of one — drawing a fake chart would be inventing the
film before it exists.

Progress is driven by the real stage, not a timer, so the last card lands as rendering
begins. One sizing bug found by looking: percentage heights on flex children inside an
aspect-ratio box resolved against almost nothing, so three bars collapsed into a
four-pixel smudge and the whole storyboard read as empty. Heights are in px now.

### Also

Chat temperature 0.4 → 0.65. The low value was there to keep `ready` stable, but the
structural decisions are guarded in code anyway, and the same number was flattening every
sentence into something that read like a form with a friendly font.

### Verified

Build clean. brands 20/20, confirm 9/9. Human-paced conversation reaches the real agent on
3 of 4 turns, up from near-zero when the allowance was being spent in one call.

---

---

## Round thirteen — the layer that looks after itself, and a phone to test on

> *I just want the agent to figure out things on its own even though if I am not present
> in the backend.*

Fair, and specific. Every AI failure this project has had was a constant somebody had to
maintain by hand, and every one of them broke silently with "the videos got worse" as the
only symptom:

- A model name was hard-coded; the provider retired it; everything fell to the rules.
- A model was added as a fallback without being tested; it could not do JSON at all, so it
  made the fallback MORE frequent.
- A token reservation was hand-tuned for one prompt; the prompt grew; a single plan
  started costing most of the minute's allowance.

The common shape is a human having to notice, diagnose and edit. `ai/health.ts` removes
that.

### What it works out for itself

**Which models exist.** It asks the provider rather than being told at build time, cached
for half an hour. Anything under a 16k context is filtered out, which excludes audio and
guard models by a far more reliable signal than pattern-matching names that change. A
model that disappears from the list is dropped.

**Which of them can do the work.** Learned by trying, not declared. A failure is
classified by whether it says anything about the model: `busy` says nothing (it will be
fine in ten seconds), `too-large` records a size ceiling, `cannot-json` is a real
inability and benches after three strikes, `truncated` is OUR budget and is held against
nobody.

**How large a request each one accepts.** A model that refuses a 5,000-token director
prompt may be perfectly good for a 1,500-token chat turn, so the refusal records a
`refusesFrom` threshold rather than a blacklist entry. This is strictly better than the
hand-written "do not use" comment it replaces — and it immediately proved the comment
wrong.

**What each job's replies actually cost.** `max_tokens` is reserved against the per-minute
allowance whether used or not, so a generous constant is the difference between the real
agent answering and the offline planner taking over. Each job now records its own worst
observed reply and reserves that plus half, converging in about three calls and staying
right through prompt changes nobody remembers to re-tune for. The worst case decays at
0.92 per sample, so one unusually long reply does not pin the budget high forever.

**Which to try first.** Budget remaining beats a configured favourite, proven beats
unproven, larger beats smaller. A configured favourite that cannot answer is worth
nothing.

`GET /api/ai/health` shows all of it. A system that manages itself still has to be
inspectable — "it will sort itself out" is only trustworthy if you can see what it has
sorted out.

### It corrected me twice within one conversation

The hand-maintained list said `qwen/qwen3.8-27b` was unusable. The layer tried it and it
answered a chat turn fine — the earlier blanket ban was from testing it only against the
largest prompt. And `openai/gpt-oss-safeguard-20b`, which had been removed entirely, is
now kept with `refusesFrom: 1588` and used for small jobs.

Result on a human-paced conversation: **4 of 4 turns reached the real agent and the build
used AI**, where the same test had been 2 or 3 of 4 with a hand-tuned list.

### A self-managing layer managing itself into a corner

The first version made things dramatically worse — 3 of 4 turns offline — and both causes
were mine.

It classed "Failed to generate JSON" as an inability, so a budget *we* set benched three
working models inside one conversation. And it fed the retry BUDGET into the usage
statistic, so the chat job learned its replies cost 2,400 tokens when they cost about 700,
reserved 3,600 for every message, and made the rate limiting it existed to relieve far
worse.

Both are the same mistake in two places: recording a number that was not measuring the
thing it claimed to. `noteTruncation` is now separate from `recordUsage` and raises a
ceiling by a tenth rather than adopting a budget as an observation. Worth remembering that
a learning system learns whatever you actually hand it, including nonsense, and then acts
on it with total confidence.

### Testable on a phone

Three things stood between the app and a real device, none of them big:

The studio listened only on the loopback, so nothing else on the network could reach it.
`host: true`.

The studio called the API at `http://localhost:4000`, which on a phone means the phone.
The base is now derived from the page's own hostname, so one build works on this laptop,
on a phone across the room and on a real host, with nothing to configure. An explicit
`VITE_API_URL` still wins.

CORS allowed three fixed origins. It now also allows private network addresses —
deliberately only 10.x, 192.168.x, 172.16–31.x and 169.254.x, which cannot be routed from
the internet, so this cannot become an open door once it is hosted somewhere real.

Then the layout: a 260px sidebar in a 390px viewport left the prompt box mostly off-screen.
Below 760px the editor stacks film-above-conversation and the sidebar overlays rather than
sitting beside.

One trap found and avoided: sliding the sidebar fully away on a phone looked better and
stranded you, because the only control that reopens it lives inside it. The narrow rail
stays.

### Verified

Build clean. brands 20/20, confirm 9/9, direction 9/9. Loaded as an iPhone over the LAN:
page renders, API calls return 200, zero request failures.

### Still local

This is reachable from the house, not from the internet. A public URL needs a host account
that only Anas can create.

---

---

## Round fourteen — the chat agent stops being a form

> *it just asks same rule based question again and again*

Correct, and the cause was in my own prompt. It said:

```
ASK ABOUT UP TO FOUR OF THESE, IN THIS ORDER OF VALUE
1. THE ONE THING...  2. WHO IT IS FOR...  3. THE PROOF...  4. WHERE IT GOES...
```

A numbered menu walked in order. The agent was rule-based because I had written the
rules. No amount of "be dynamic" elsewhere in the prompt could outvote a list.

### What replaced it

The menu is gone. In its place:

**Reason about THIS brief.** Two new fields, `known` and `gap`, which never reach the
person. They exist because without naming what has been worked out and what is missing,
the cheapest thing to produce is whatever question sounded good last time. `gap` must
name something only this product could have prompted — "the audience" is not a gap.

**Offer two concrete alternatives.** The rule that did most of the work. A question that
asks the person to supply the categories is a form; a question that names the two likely
answers proves the product was understood, is far easier to answer, and is corrected for
free if the guess is wrong. Mechanically: the question must contain two specific options
in nouns from their own industry.

**Ban the shape, not the words.** "Who is this aimed at", "which audience are you
targeting", "which group are you aiming at" are one banned question in three outfits. The
test is whether the ANSWER would differ, not whether the words do.

### Three things found by testing, each a different failure

**It copied my examples.** The first attempt used an API rate limiter and a coffee
milestone as worked examples. Tested on four briefs, it nailed the two that resembled the
examples and went generic on the others — pattern-matching my examples instead of my old
list. The examples are now a tractor dealership's 80th anniversary, a domain it will
never be asked about, so copying cannot help.

**It reasoned well and then threw the reasoning away.** The `gap` log showed it had
worked out, for a dental clinic, "parents wanting convenient weekend appointments, or the
broader community wanting a local Saturday option" — and then wrote "just let me know
which group you're targeting". All the thinking, none of it shared. The prompt now
requires the two alternatives named in `gap` to appear in `reply`.

**Low reasoning effort was a false economy.** Chat was set to `reasoning_effort: 'low'` to
protect the token allowance. Choosing a question that could only have been asked about
this product is a reasoning task; at low effort the model skips it and reaches for the
most familiar shape — which is exactly the form-filling the prompt spends four paragraphs
forbidding. Rules cannot substitute for thinking: with no thinking, the rules get
pattern-matched too. Now medium.

### The repetition itself

A separate bug, and the one he actually complained about. Asked whether an 80th
anniversary was about heritage or machines; told "we want people at the open day in
June"; asked heritage-or-machines again.

The prompt already said never to repeat a question. It was buried at the bottom and
ignored. It is now near the top, with the real transcript as the example, and a rule that
makes it actionable: **an ignored question is a "no"**. If their next message goes
somewhere else, they declined — that is a complete answer meaning "you decide". Rephrasing
does not make it a new question; the test is whether the answer would differ.

And: when they hand you something new instead of an answer, the new thing is the signal.
An open day in June is an occasion and a deadline, worth more than the question you were
waiting on.

### A word count was skipping the conversation entirely

`isDetailed()` forced "ready" when a first message ran to twelve words or more. Almost
every real brief is longer than twelve words — the tractor one is fourteen — so the
conversation was being skipped for nearly everybody, and the server then rewrote the
model's question into "I have enough to start". It looked like the agent refusing to ask.
It was this line.

It was a fair heuristic when the model could not judge sufficiency. It can now; it names
what it knows and what is missing. A word count is a worse judge of a brief than the thing
that read it. Removed; only the hard ceiling of five user turns remains.

### The server had never been type-checked

While fixing the above, a stray brace shipped through a clean `npm run build` and the only
symptom was the server refusing to boot. `npm run build` only ever checked the studio.

A server `tsconfig.json` now exists and runs as `npm run check`, wired into `build`. Its
first run found ten real problems that had been sitting there invisibly:

- `brandColor` was being passed into the director and **silently dropped** — a colour the
  user explicitly picked, ignored because `DirectOptions` never had the field. It was
  vestigial, so it is gone along with its now-dead validator.
- A scraped site with no name sent `undefined` into code typed for a string. It now falls
  back to the domain, which is usually the brand anyway.
- `SURFACES.includes(value)` narrows nothing, so unknowns were flowing into the spec. It
  worked only because the list and the type happened to agree, with nothing enforcing it.
  Proper guards now.
- `RawPlan` had no `style` or `why`, so the director's own direction fields were untyped.

### Verified

Server type-check clean, studio build clean. brands 20/20. The confirmation suite was
rewritten — it had been asserting the removed word-count behaviour — and now checks what
actually matters: a confirmation is reached in at most two questions, the questions are
never repeats, and a plan and summary arrive before anything is built. 10/10.

Four unrelated briefs now produce four genuinely different first questions. A tractor
dealership gets: *"Eighty years at a place called Harrow & Sons — that 'Sons' makes me
think there are actual family names in the history..."*

### Note on the test runs

Several intermediate failures in this round were Groq 429s, not logic — the free allowance
is 8,000 tokens a minute and an afternoon of testing spends it continuously. Each one was
confirmed by waiting and re-running. Worth checking the budget before debugging a phantom.

---

---

## Round fifteen — "hi" is not a brief, and the prompt had quietly tripled

Anas pasted a transcript:

```
them: hi
you:  Are you targeting existing customers or new prospects?
them: who are you and what you capable of
you:  Is the video for existing Pond customers or for new prospects?
them: i am asking who are you give me your intro
you:  Is the video for existing Pond customers or new prospects?
```

Four failures in six lines: a greeting answered as a brief, a direct question about
itself ignored twice, the same question asked three times, and a company name ("Pond")
invented out of nothing.

### The architectural cause

The prompt modelled exactly one state: *collect a brief*. Its first line was "Your job is
to get to a good video in as FEW messages as possible", so every message was brief
material. A greeting had nowhere to go, so it was processed as one.

There is now an explicit triage — greeting, about-you, brief, answer, other — and only two
of those are about a video. For the rest, `ready` is false and no question about
audiences, goals or proof may be asked, because there is no video yet to ask about.

It also now knows what it is. It could not answer "who are you" because nothing had ever
told it. The prompt carries the real answer: fifteen to forty seconds, everything drawn
and animated, no stock footage, a shot list agreed before building, landscape/vertical/
square, brand colours and real feature names, editable afterwards by asking. And: if they
ask twice, the first answer was not enough — give MORE, never a rephrase.

### Two guards in code, because the prompt can be wrong

A model can misread what kind of message it is looking at, and the cost of being wrong in
one direction is a video nobody asked for. So `describedSomething()` gates readiness: at
least one user message that is substantive AND not aimed at the assistant.

The first version counted words — the same mistake that made the old `isDetailed` skip
the conversation for everybody. "who are you and what you capable of" is seven words and
not a brief. The second version anchored its pattern to the first word and missed "i am
asking who are you give me your intro", because people do not start questions where a
regex expects them to. Third version matches the phrases anywhere, and is unit-tested
against the real transcript.

The same guard was missing from the fallback path, which bypasses the conversation layer
entirely — so when the allowance ran out on somebody's first "hi" the answer was "I built
that with the offline planner". A finished video, for a greeting, at the exact moment
things were already going wrong. Both paths share one guard now.

It then over-corrected: the confirm step sends the approved brief and no messages, so the
guard refused to build what somebody had just said yes to. Fixed — an approved brief is
itself the description.

### The prompt had grown to 6,844 tokens

This is the finding that explains the rest. Every round of "make it smarter" added rules,
worked examples and transcripts to a prompt that is **resent on every single message**.
It had tripled, to 6,844 tokens against a per-minute allowance of 8,000.

So one message consumed almost the whole minute, the next got a 429, and the rule-based
planner answered. **Every rule added to make the agent smarter was making it less
available — and an unavailable agent is replaced by a rule-based one, which was the
original complaint.**

Rewritten to 1,285 tokens with every rule intact: one line per rule, and the long worked
examples cut, which they deserved anyway because the model was copying them rather than
reasoning from them. There is now a note in the file: past ~1,500 tokens, something has
gone wrong — check before adding.

### And the limit that was actually biting

After all that, testing still failed. The live API reported 7,918 tokens remaining, which
made no sense, until a realistic-sized request returned the full body:

```
tokens per day (TPD): Limit 200000, Used 199454
```

Not the per-minute limit at all. A day of development had spent the **daily** allowance of
200,000 tokens per model. The two failures are indistinguishable from the status code —
both are 429 "rate limit reached" — and only the body says which.

The consequences of conflating them were bad in both directions. The client waited eight
seconds and gave up when the real wait was seven minutes. The interface said "give it
twenty seconds", and twenty seconds later it failed again, which teaches somebody that the
product is broken rather than that a free quota ran out.

Now classified separately: a model out for the day is benched rather than retried on every
request, and the message says plainly that today's free allowance is used up and the
result will be plainer than usual.

### Verified

Server type-check clean, studio build clean. The exact failing transcript replayed: a
greeting gets a greeting, "who are you" gets a real answer, and asking again gets a longer
and more specific one rather than the same sentence. No phantom video at any point.

The conversation suite could not be run to completion because the daily allowance is
spent. That is the honest state: the logic is verified by the transcript replay, the suite
is blocked on quota, and it is worth re-running tomorrow before trusting it.

### The real constraint

A free tier of 200,000 tokens a day per model cannot support a day of real use plus
development. Anas's instinct — "maybe we need a free tier AI model at backend" — is
pointing at a genuine ceiling. Groq's Dev Tier is the direct fix; self-hosting a small
model is the other direction and costs latency and quality.

---

---

## Round sixteen — a testing pass, worked through by root cause

Fourteen numbered items from real use. Several shared a cause, which is where most of the
value was.

### The chatbot was task-obsessed by construction

> *I greeted it with "Hey". It asked how it could help with a video. I asked "how's it
> going?" — it said everything was good and immediately asked about the video again.*

The prompt's first line was "get to a good video in as FEW messages as possible", so every
message was brief material and every reply ended by herding them back to the task.

There is now an explicit permission to just talk, with the failing exchange quoted, and —
the part that actually worked — **banned endings by shape rather than wording**. "All good
on my end — ready to dive into your next video project whenever you are!" is two sentences
where only the first was listening. Naming the move rather than the phrasing is what
stopped it; the first attempt banned specific sentences and it simply wrote new ones.

It now answers "how's it going" with "I'm doing great, thanks for asking! How about you?"
and ends a capability answer with "How's your day going?" rather than a call to action.

Also caught from the `gap` log: it was asking about **visual style** ("minimal or
vibrant?") and **orientation** — one is the director's own job and the other is a picker
in the toolbar. Both are now explicitly not its to ask.

### Markdown, written rather than installed

Replies had no formatting at all. A renderer is eighty lines for the subset a chat reply
uses — paragraphs, bullets, numbered lists, bold, code — so `Markdown.tsx` builds React
elements directly. No dependency to licence, and **no `innerHTML` anywhere**, so model
output cannot inject markup by construction. It renders mid-reveal too: partial Markdown
is just literal asterisks until the closing pair arrives, which beats reformatting the
whole reply at the end.

### One brand mark, measured from its own pixels

Five places drew a brand and all five did it differently — three of them as a coloured
dot, while the company's real logo sat in the asset store.

`BrandMark` replaces all five. The interesting part is the plate behind the logo: a
transparent PNG has no idea what is behind it, so a dark wordmark on our dark surface
disappears. The first version guessed from the site's light/dark mode — and was wrong
immediately, because stripe.com reads as a dark site and serves a dark navy logo, which
went onto a dark plate and vanished. Exactly the failure the component exists to prevent.

So the pixels decide. The image is drawn to a 24px canvas and the luminance of everything
non-transparent is averaged — that is the logo's real colour whatever its site was doing.
Two things were needed to make it work: `crossOrigin="anonymous"` (assets come from the
API on another port, and a cross-origin image taints the canvas so `getImageData` throws
and it silently fell back to the guess) and a measurement on mount as well as on load,
because `onLoad` never fires for a cached image — which is every mark after the first.

### The import flow, rebuilt end to end

**The dialog** had two of its three real choices as bare underlined words, which is the
visual language of a footnote. They are now proper rows with icons and a line of
explanation each, under a divider.

**The reading state** was the word "Reading…" on a disabled button for ten seconds. It is
now five named stages with the layout held still while the words change, and a row of
ticks rather than a progress bar — because we know which step we are on, not how far into
it. The last stage does not complete on its own; it waits for the request.

**The profile** showed a name, "Logo: Found" and an About line. The scraper was also
returning their headline and their call to action — both discarded in the route before
they reached the client. They travel now, and the screen shows the brand as a card with
its real mark rather than as three label-and-value rows.

### Ready to make

Everything in it was the same visual weight, so nothing looked like the point. Rebuilt
around one decision: the plan is the content and gets a rule down its left edge so it
reads as a sequence; the brand sits in a tinted footer as a fact rather than a choice; and
the two buttons are deliberately unequal, because only one of them is a decision.

`ready: true` now requires a plan. A confirmation with nothing to confirm is a promise
with nothing behind it, and it was happening often enough to notice.

### The workspace loading, rethought rather than polished

The four animated cards were mine from last round and he was right about them: a
storyboard with a light sweeping across the active card is busier than anything else in
the product. The fix was fewer elements, not better ones — one line of their own approved
plan, the pipeline stage beneath it, and a row of ticks. Nothing else moves except a very
slow wash.

### Chat scrolling, properly

Three faults in one line of code. `scrollIntoView` walks to whichever ancestor happens to
scroll and frequently did nothing before layout settled; `behavior: 'smooth'` could not
finish between reveal ticks so a streaming reply restarted an animation that never
arrived; and it pulled to the bottom unconditionally, so scrolling up to re-read
something yanked you back mid-sentence. Now: set `scrollTop` on the element we mean, jump
rather than animate, and only follow when they were already at the bottom.

### The preview "zoom" — intentional, and five times too strong

The movement into the picture is the camera system, not a playback bug. But it was
measurably excessive: `push` ran 0.91 → 1.20, a **29% change of scale inside one scene**,
and the shot-distance multiplier added another 24% across the film. The reference films
measure around 0.3% of frame per fifth of a second — roughly six per cent over a
four-second shot. Ours was five times that, which is why it reads as the picture being
pulled towards you rather than as a camera move.

Push is now 0.97 → 1.07 and the shot-distance range is 0.955 → 1.045. A camera move you
notice as a move has already failed.

### And the black bars

The player painted its own stage black and stretched it to fill, so any aspect mismatch
became heavy bars above and below the film. The player is transparent now and the host
decides what sits behind — the film sits on the panel with a soft shadow.

### Verified

Server type-check clean, studio build clean. brands 20/20, conversation 10/10, focus
regression passes. Full flow driven in a real browser from first message through the
confirmation, the build screen and into the editor: plan shown, loading screen correct,
editor opens, chat lands at the bottom, zero console errors and zero failed requests.

### Not done, deliberately

The chat panel is still on the left. Moving it is a real judgement call about how the
workspace should work rather than a fix, and guessing at it would mean rebuilding the
layout twice.

---

---

## Round seventeen — five from testing, and one that was my own regression

### The logo that disappeared after navigating

The data was never wrong: the API returned `logoId` every time. The IMAGE request failed,
and the reason took measuring to find.

The brand mark loads logos with `crossOrigin="anonymous"` so it can read the pixels back
and choose a plate the artwork is visible against. The Brands page still had two plain
`<img>` tags, which send no Origin header — so the server, which only adds CORS headers
when asked, cached a copy of the logo WITHOUT them. Every later crossOrigin load reused
that cached copy, found no header, and failed. The logo silently became a letter on a
coloured square, but only after visiting a page that happened to contain a plain image.

Two fixes. The asset route now always sends `Access-Control-Allow-Origin: *` — these are
public, immutable images with no credentials, so one cached copy is usable by every kind
of request and the whole class of bug goes away. And both plain tags now load the same
way as the mark, so nothing can poison the cache again.

### The fetch animation said too much

A mark with three expanding rings, the address in monospace, the stage name, a line of
detail explaining the stage, and a row of ticks — five things for a ten-second wait.
Nobody reads an explanation of a loading step; by the time you have parsed "Checking the
header, the favicon and the metadata" it has moved on. Now: the domain, the current step,
and the ticks.

### Projects

Three real faults under the styling. Every thumbnail was a 16:9 film in a fixed 16:10
black box, so each one had bars across it — the ratio now comes from the spec, so the
card is the shape of the film. The filters were browser-default selects beside a custom
search field, which is the clearest possible tell that a page was assembled rather than
designed. And "LOCAL" was stamped in capitals on every card, making a caveat about
storage the loudest repeated element on the page.

While testing it the page white-screened on a malformed spec: `text.trim()` on an
undefined headline took out the whole route. That was my bad seed data, but a page that
dies entirely because one scene is missing a line is fragile — specs cross a network and
a model writes them. Five text paths are now defensive.

### Brands

The logo preview in the editor — the one screen whose entire job is to show you your
logo — drew it on `palette.bg`, so a dark brand got a dark mark on a dark square. The
exact invisible-logo case the brand mark exists to solve, left in the worst possible
place. It uses the mark now.

The list column was narrow enough that "No tone set · stripe.com" wrapped to three lines
beside a toggle and a badge. Wider column, one truncating line.

### The making screen, third time

He asked for a real moment between pressing Make it and arriving in the editor: a few
seconds, blank, one line in the middle, and copy that is not the same every time.

Everything goes away now — sidebar included. One line on an empty field, a short rule
with a light travelling along it, and that is all. The lines are drawn from a pool that
is shuffled per video, so two films in a row do not read the same, and the director's own
reason replaces the pool line once it exists, because that is the one sentence genuinely
about their video.

A three-second floor stops it flashing when the plan comes back fast. It is awaited
alongside the work rather than after it, so a slow build is never made slower: measured
at 16.4s end to end on a real build, where the floor contributed nothing.

### The editor had no undo

Which makes every other control in it slightly frightening — deleting a scene, reordering
two, trying a different tone were all one-way doors, so the safe move was to touch
nothing. Undo and redo now wrap every structural edit, with the keyboard shortcuts
everybody already has in their fingers, bounded at forty steps.

And a tone switch, because tone is the single biggest lever on whether two videos look
like different films and it was buried in the planner with no way to reach it. Four
options all visible rather than a dropdown: the value of the control is that you can try
every one in four clicks and watch the film change.

### Verified

Server type-check clean, studio build clean. brands 20/20, conversation 10/10, focus
regression passes, logo-after-navigation regression passes. Full flow driven in a browser:
confirmation card, making screen holding with four different lines, editor opening with
no loading state in the video box, zero console errors.

---

## Round eighteen — the length, the ending, and a lesson about asking a model to vary

Three complaints, all about the product itself rather than the app around it: a
fifteen-second video was not fifteen seconds, every film ended the same way, and the
output felt rule-based. All three turned out to be true, and none of them was where it
looked.

Everything below was measured before and after with `audit.mjs` — eight briefs across
three lengths, reporting duration error, shape, opening, ending, tone and style. Opinions
about sameness are cheap; the harness is not.

### The duration was three separate bugs wearing one coat

**Measured at the start:** −55% to +60% against the length the person chose.

The first was that no target existed. "Length" multiplied every scene by 0.72 or 1.4 and
the film was however long that added up to. `fitToLength` now aims at a real number — 8,
15 or 25 seconds — by dropping the most expendable scene while the floors do not fit, and
then scaling what is left, with each scene's floor derived from its own word count.

The second was a ceiling applied in the wrong place. No shot may hold longer than it can
earn (six seconds, nine for product and overlay scenes, which have movement of their
own). That ceiling ran AFTER the balancing loop, so a scene that arrived over it was
skipped by the loop — it had no room to grow — the loop balanced the rest of the film
around its inflated length, landed exactly on target, and only then was the scene trimmed
back. The time it gave up went nowhere. A fifteen-second film shipped at fourteen with
every warning silent, because by its own reckoning the fit had succeeded. Clamping before
the loop instead fixed six of the eight failing cases outright.

The third was not in the fit at all. Confirming a brief sends the agreed brief and an
EMPTY message list, because the conversation that produced it already happened — and the
offline fallback was reading the messages. A video confirmed at the moment the allowance
ran out was planned from an empty string: two scenes, eleven seconds, nothing in it from
the brief. It looked exactly like a duration bug and it was a dropped input.

**Measured after:** 0% error on every video in the harness, except four-scene "long"
films that genuinely cannot fill twenty-five seconds at a watchable pace — those land at
−7% and say so in the log. The fallback went from −53% worst case to −7%.

### The parser was throwing away the brief

Chasing the fallback's short films led somewhere unexpected. "Smile Lane, a family dental
clinic now open on Saturdays" parsed to zero points, because the list finder only
recognises a list that already looks like one and the single clause carrying every fact
in that sentence is eight words long — over the six-word item cap.

So a film about a dental clinic had two scenes, and two scenes cannot fill twenty-five
seconds without each card holding for twelve. One missing extractor was showing up as a
duration bug AND as empty videos.

Long clauses are now split again at the words English uses to join a description to the
thing it describes — "that", "which", "now", "with". A clause addressed to US rather than
to the viewer ("a video for Ada") is dropped whole rather than cleaned up; cleaning it
was tried first and produced "A Ada", which is worse than nothing. And sentence splitting
no longer breaks at a decimal point, which had been turning "99.99% uptime" into the
on-screen claim "99% uptime" — a fact nobody wrote and that is not true.

### Asking a model to vary does not work, and this is now settled

**Measured at the start:** eight videos out of eight ended on an "outro" card.

That was my fault, not the model's: all eleven shape templates in the director prompt
ended with "outro". Rewritten with four endings and criteria for each — and the next run
came back six out of eight on "logo", because the new text called the logo card "the most
confident ending there is". A model handed a superlative chooses the thing wearing it.

Fixed the prompt again, then tried the same on openings: six of fourteen shapes open on a
title card, but six videos in eight did. The opening guidance was rewritten the same way
the ending guidance had been, with five alternatives and a criterion for each. The result
went from six out of eight to EIGHT out of eight. Worse, from more instruction.

Twice is a pattern, so take it as settled: **a model cannot spread a choice across
requests it cannot see.** Each call is alone, and alone it reaches for the shape it knows.
Asking it to be varied asks for something structurally impossible, and more words make it
more confident about the one answer rather than less.

So the director now decides what the film ARGUES — judgement only it can make — and two
small modules decide how that argument lands:

- `ending.ts` chooses between the brand card, the claim as kinetic type, and a real call
  to action, weighted by the film's own direction and drawn from its own seed. Every
  candidate is built from copy that already exists in the film; nothing invents a tagline
  or a button label. An ending we wrote ourselves would be worse than a repeated one,
  because at least a repeated one says something true.
- `opening.ts` only ever REORDERS. Every opening in the shape menu is a film that leads
  with a scene it was always going to contain — the number before the explanation, the
  interface before the name, somebody else's words first. Nothing is written, nothing is
  dropped, and the running time is identical.

Both leave a deliberate choice alone: a film that closes on a stat or opens on a quote is
evidence the director was reading the brief, and that is the one thing this cannot
reproduce.

**Measured after:** openings spread across title, stat, product, overlay and flow;
endings across logo, bigword and outro; all four tones appearing; eight different shapes
from eight briefs. Both paths get it — the rule-based fallback has one shape per intent
and always closed the same way, which is the original complaint in its purest form, so it
now runs through the same two choosers.

### Shot it and looked

A passing harness proves nothing about what is on screen, and looking caught something
the numbers could not: a film whose title card read "Audit Log Launch" was closing on a
brand card reading "Audit Log Launch" — the same three words, eleven seconds apart. With
no saved brand the only name available is the video's own title.

The test is not repetition, though. "Smile Lane" after a film about Smile Lane is a
signature. What fails is a SENTENCE on a brand card. So the name may repeat the title when
it is short enough to be a name, and may not when it is long enough to be a headline.

### Cost of the round

Roughly six audits of eight videos each against the free Groq tier, and by the end only
one video in eight was reaching the model. The measurement was worth it — nearly every
fix above came from a number rather than a hunch — but the daily allowance is spent, and
the last audit ran almost entirely on the fallback. That it still showed varied openings,
varied endings and correct durations is the strongest evidence that the variety is now
structural rather than borrowed from the model.

## Round nineteen — three screens, and the shape of a card

### The start screen was saying one thing three times

A 58px circled mark, a fixed heading, and a sentence underneath explaining the heading —
on a page whose only control is a box that already says "describe the video". Three
stacked objects for one idea.

Now the mark sits IN the line, which makes it a logotype rather than a stack, and the
sentence is gone. The greeting is drawn from a pool of twelve and chosen once per visit —
in a `useState` initialiser, not during render, because render runs on every keystroke in
the box below and a line that changed as you typed would be a flicker rather than a
welcome. Measured over ten reloads: seven different lines.

The lines are stored without their question mark so the name drops in as a vocative:
"What are we making" becomes "What are we making, Anas?" when somebody is signed in and
"What are we making?" when they are not. One pool, both cases, no line written twice.
First name only — "What are we making, Anas Khan?" is a summons.

The box was one line tall, which reads as a search field: somewhere you type four words.
What goes in it is a sentence about a film. Sixty-two pixels of input on the start screen,
scoped to the empty state so it stays compact once there is a thread to sit under.

### Opening a project showed an empty chat box

The editor opened with the side panel out, so clicking a finished video gave you a third
of the screen of "Tell me what to change" and the film squeezed into the rest. Nobody
opens a project to look at a blank chat.

The panel now starts closed and the video gets the room, with an "Edit" button beside the
format switcher — those three being the things you do to a finished video: change its
shape, change its content, take it away. A reply arriving opens the panel by itself,
because an assistant answering into a panel nobody can see is worse than the original
problem.

### One ragged grid was doing all the damage

The Projects page looked unfinished, and the cause was a single line: the thumbnail took
the aspect ratio of the film inside it. A library with one vertical video in it had a card
three times the height of its neighbours — rows broke, gaps opened, and five videos looked
like a layout bug.

Every card now gets the same 16:10 frame with the film fitted inside. The engine's canvas
already scales to fit and never past 1:1, so a vertical film simply sits centred with
space either side — which is what every editing tool does, and it makes the shape of a
video legible at a glance instead of something you read off a label. The surround is a
neutral, not black: black reads as a letterbox bar, as though something failed.

### A brand is a thing you recognise

Brand kits was a 264px list beside a permanently open editor. Every kit was reduced to a
line of truncated text, and arriving at the page always put one brand's eleven-field form
on screen — a decision made on your behalf about which brand you had come to edit, right
about half the time.

Now it is a shelf of cards: the mark, the name, the tone and host, the sentence about who
it is for, the palette and how many videos it has made. The description is clamped to two
lines with a `min-height`, so a wordy kit cannot stretch its card taller than the one
beside it and the footers on a row stay level.

Choosing one slides a drawer over the shelf rather than navigating away — you came to
change one thing about one brand, and losing your place among the others to do it is a
poor trade. Scrim, Escape, and a close button; the editor drops its own border inside,
because a bordered card in a bordered panel is a frame around a frame.

One bug found while wiring the card's video count, which read zero for two brands that
plainly had videos: only the AI path was stamping the brand onto the spec. A video made
while the allowance was spent came back unattached — it kept the brand's colours in the
moment, then lost them on reopen and vanished from that brand's filter. The person chose
a brand; which planner happened to run is not their concern.


### Two bugs the drawer exposed

**The form could not scroll.** The editor used to sit in a page that simply grew, so the
window scrolled and the form never needed a scrolling region of its own. Inside a drawer
it has a fixed height with `overflow: hidden` above it, and the eleven fields below the
fold were not merely awkward to reach — they were unreachable. The fix is three lines, and
`min-height: 0` is the one that matters: a flex child's default minimum is its content
size, so it refuses to shrink below the form's natural height, and a box that never
shrinks never overflows, which leaves `overflow-y` nothing to act on.

**Opening a kit saved it.** The debounced autosave runs on mount like any other effect, so
merely looking at a brand wrote it back unchanged. That had always been true and had
always been invisible: the editor was permanently mounted beside a sidebar nobody watched.
With a shelf of cards ordered by `updated_at DESC`, it became obvious — open a brand,
close it, and the cards rearrange themselves. And because the default kit is whichever
comes first when none is remembered, looking at a brand could quietly make it the default.

Guarded with a `dirty` ref raised by the field setter, rather than comparing the draft to
the brand: the draft is replaced wholesale on every edit, so an equality check would have
to be deep, and "has anybody typed anything" is the question actually being asked. The
logo upload sets the draft directly rather than through the setter, so it raises the flag
itself.

Verified by watching the network: opening and closing a kit now sends nothing, and an edit
sends exactly one PATCH.


### "Ready to make" had become a form

An icon in a chip, a label, the summary, five numbered beats on a ruled list, a bordered
brand row captioned "Its colours, logo and voice", a swatch repeating the colour already
shown in the mark, then two buttons. Nine pieces of information for one yes-or-no — and
the summary, the only line anybody actually reads before deciding, was the fourth thing
down and set at the same weight as everything around it. Nothing in the card looked like
the point because everything in the card looked the same.

Three parts now, plainly unequal: the sentence, one quiet line of facts, the choice. The
internal rules are gone, because every line drawn across a card that size turns one object
into three. The caption explaining what a brand kit is went too — it was a definition
shown to the person who built the thing being defined.

The shot list has not gone anywhere; it is behind the scene count. It matters enormously
to the one person in ten who wants to check it before committing to a render, and it is
noise to the nine who do not. Measured: 397px of card became 155px, with everything still
one click away.

### The editing panel now depends on how you got there

Last round it was made to start closed, which fixed opening a finished video from Projects
and broke the other door. Arriving from the conversation, the person was mid-sentence with
the assistant a moment ago and the thread that produced the film is the obvious next thing
to reach for — hiding it throws the conversation away at exactly the moment it becomes
useful.

So the flag is set where the editor is entered rather than decided once inside it: out
from the conversation, away from Projects. Synced on the video rather than only at mount,
because the editor is not remounted when you switch films inside it — without that, the
decision would be made once and then be wrong for every video opened after.

Two sentences were also being fused in the handover line. The director's reason for its own
direction is written by a model and arrives with a full stop about half the time, so half
the videos read "...the step-by-step workflow that the brief highlights Tell me what to
change and I will" — a glitch in the one message meant to sound deliberate.


## Round twenty-one — the agent is the editor

The founder's question, in his words: "we have the left panel of agent editing the video
and the right we have a video editor — editor at the same time and the agent at the same
time doesn't make sense."

He is right, and the fault was in the arrangement rather than in having both. Asking and
adjusting are not rivals; they are the same job at two sizes. Presented as two tabs in one
panel they were forced to compete for the same space, so neither read as the main way to
work and choosing one hid the other. Meanwhile nine icons sat in a strip under the
timeline at identical size and weight — half of them changing the whole film, half
changing one shot, with nothing to say which was which until you pressed one.

So: **the agent is how you drive the editor, and the clip's controls live on the clip.**

- The panel holds the conversation and nothing else. The tabs are gone.
- Undo, redo and tone moved up into the header, beside the aspect ratio. Everything in
  that bar now acts on the film.
- The scene fields moved down under the timeline, into a strip for the clip you have
  selected, with that clip's own actions — move, duplicate, delete, add — in its header.
  Click a clip and its controls are the next thing down, which is the one arrangement
  that needs no explaining.
- The inspector lays out across rather than down. It was built for a 340px column, so in
  a strip this wide it had one short text box per line and a great deal of nothing beside
  it; it now fits three fields abreast, which means less scrolling to reach the one being
  looked for.
- The direction note ("Product-led — the interface carries it") came off the top of every
  scene, where it repeated itself once per clip, and became two words in the header meta
  beside the running time. The reasoning behind it is already the first thing the
  assistant says in the conversation.

Two layout bugs surfaced on the way. `.editor__title-row` had never been given a rule at
all — a plain inline span wrapping a block-level `h1`, which forces a line break whatever
the width, so the chevron sat on its own row under the title looking like a stray
character. And the `margin-right: auto` spacing the header out was on the title *button*
rather than on the flex item that wraps it, so it only worked while the bar was mostly
empty. Both were invisible until something else was added to the header.

### I destroyed the stylesheet, and this is how

While removing the dead toolbar rules I used a node script that deleted each rule *and
walked backwards to swallow the comment above it*. The backward walk — "keep going while
the line is not blank" — ran past a blank line into unrelated rules. It took about 250
lines with it: the body grid, the format switcher, the entire agent-panel styling, the
render bar, the toast and the responsive rules.

There is no git here and `npm run build` empties `dist/`, so by the time a screenshot
showed the damage the built bundle had been overwritten twice and there was nothing to
restore from. Every one of those rules had to be written again.

The lesson is not "be careful". It is that **a scripted edit is the right tool for
applying a known change and the wrong tool for deciding how much to delete.** "Walk up
while the line is not blank" is a guess, and a guess that calls `splice` is a guess nobody
gets to review. Deleting by exact text fails loudly when it is wrong; deleting by computed
range fails silently and takes the evidence with it.


## Round twenty-two — why the workspace looked wrong, and the checkpoint

"I still don't like the workspace UI, it's looking more bad." He was right, and the
previous round had fixed the arrangement while leaving the thing that actually made it
look cheap.

### Three identical boxes is not a layout

The stage, the timeline and the clip panel had the same border, the same radius and the
same background, stacked down the screen. Nothing was more important than anything else,
so the eye had nowhere to land — and a screen with no focal point reads as a form rather
than as a tool, however well the controls are grouped.

Two surfaces now. The film, and the thing you use on the film.

The stage is **dark in both themes**, which is the one place the app deliberately ignores
its own theme. Every tool that shows a picture does this, and the reason is not taste: the
eye adapts to the brightest surface it can see, so a frame judged against a light page is
judged against the page. Sunk into a dark well the film is the brightest thing on screen,
which is what it should be, and the edge of the frame becomes legible instead of
dissolving into the panel behind it. It is the single biggest change of the round and it
is four lines of CSS.

The timeline and the clip fields merged into one dock with a divider. They were always one
tool — clicking a clip up here is what changes the fields down there — and two cards said
otherwise.

### The checkpoint

The element the founder kept circling in the Replit screenshot, described twice in earlier
rounds and never built: a card in the conversation saying what changed, with a way back to
before it.

Undo is a stack with no memory of what it undoes. Pressing it four times is four acts of
faith, and there is no way to ask "put it back to how it was before I started fiddling
with the ending". A checkpoint is the same information with a name on it — "Tone → bold",
"Duplicated Product", "Shape → 16:9" — holding the spec as it was *before* that change.

It is built by **watching the spec rather than hooking the buttons**, which is what makes
it reliable: a change from the agent and a change from a slider arrive the same way, so
one rule catches both and nothing new has to remember to register itself. Anything that
arrives without a label came from the agent, because that is the only path that does not
go through `commit`. Reverting discards every checkpoint after the one chosen, since those
describe a film that no longer exists.

They live in the conversation rather than in a history panel, because the conversation is
already the record of what happened to this film, and an agent reply and a hand edit are
both just things that changed it.

### The real cause of yesterday's destruction

Not carelessness with a backward walk, as recorded in round twenty-one. **Mixed line
endings.**

Thirty-three source files had CRLF; nine had CRLF and LF in the same file, because my own
scripted edits had been writing LF into CRLF files for weeks. A script looking for the
line `}` never matches `}\r`, so the scan for the end of a rule ran off the end of the
file — and `splice(start, length - start + 1)` then deleted everything from the rule being
edited to the last line of the stylesheet. Invisible in an editor, invisible in a diff,
and silent.

Every file is now LF. That removes the class of failure rather than the instance, and it
is why the same edits applied cleanly on the second attempt today.


## Round twenty-three — show the icon, hide the options

The founder's note, and it is the clearest design direction he has given: "for options
like format add only icon and when click then it shows options, so for future work also
work like that — instead of showing too much show icon only and then the options in it."

That is a house rule, not a request about one control, so it got a component:
`IconMenu`. One icon, its choices inside, used by the shape switch, the look switch and
the clip actions. The bar above a video is now the same size whatever capabilities arrive
later, which is the real reason to adopt the pattern — a flat row of controls grows every
time the product does.

Hiding the options turned out to improve them. The tone switch had room for four names and
nothing else, so "editorial" and "kinetic" were chosen by guesswork or not at all. A menu
has room to say what they do: *Editorial — left-aligned, slower, considered.*

### What came out

**The clip form.** The whole screen below the video was a form describing the thing
squeezed into what was left. Changing a headline is a sentence to the agent, which is the
entire point of having one; the operations no sentence makes quicker — reorder, duplicate,
remove, add — are five lines in one menu. `SceneInspector` and its stylesheet are deleted
rather than left lying around.

**The timeline's rectangles.** Every scene was a bordered card with its name and length
stacked inside it, separated by gaps: a strip four times taller than it needed to be,
taking room from the only thing anybody came to look at. It is now a single 34px track
with divisions in it. The divisions ARE the proportions, which is what a timeline is for;
borders around each one made it a shelf of cards instead.

Clip names are shown by a container query rather than truncated. A two-second clip beside
a nine-second one is narrow by design, and "Bran" written in it tells you nothing the
tooltip and the selection do not — the segment measures itself and shows its name only
when it genuinely fits, which no amount of ellipsis can decide.

**The tone switch and the format switch**, into the two icons described above.

The stage grew by roughly 180px as a result, on a 900px window. That is the whole point:
everything removed here was chrome standing between the founder and the thing he is
trying to judge.

### A menu that opens off the screen is not a menu

The clip menu hangs off a bar pinned to the bottom edge, so it opened downwards into
nothing — present, correct, entirely unreachable. `IconMenu` takes a `drop` direction, and
anything near the foot of the window asks for `up`.


### Recent, with a lid

A sidebar with eight videos in it had eight rows of text between the navigation and the
account — the two things people actually come to a sidebar for. "Recent" is now the
control rather than a caption above one: the whole row is the button, so the thing you
read and the thing you press are the same object rather than a 16px chevron next to a
word that looks like a label and is not one.

Three details that are the difference between a toggle and a good one:

- **It is remembered.** A collapse that forgets itself is worse than no collapse — it
  overrules the decision on every load. Written to `localStorage`, wrapped, because
  storage throws in a private window and a sidebar is not worth a blank page.
- **The count appears only when shut.** Open, the answer is already on the screen, and a
  number repeating what sits directly under it is noise.
- **Shut, the section gives its space back.** It kept `flex: 1` at first, so collapsing
  the list moved nothing and the account block stayed pinned below an empty column — it
  looked like the toggle had not worked.

And one alignment fix the chevron caused: it pushed "Recent" nine pixels right while the
list stayed where it was, leaving the label floating above a column it no longer belonged
to. The rows are indented to meet it.


## Round twenty-four — the measurement that explains the whole month

The founder: "we are lacking the video engine so much... it's like 10% of the 100%." A
month of rounds had moved it very little, and the reason turned out to be countable.

### Nine of twelve scenes draw one picture

| Scene | Compositions |
|---|---|
| Title | 10 |
| Outro | 7 |
| Features | 3 |
| BigWord, Stat, Product, Logo, Overlay, Quote, Flow, Chart, Constellation | **1 each** |

A six-scene film therefore shows one designed shot and five that are pixel-siblings of
every other film the product has ever made. Two videos about completely different things
share five identical frames.

Everything that has been worked on for weeks — the planner's choice of scene, the
director prompt, the ending chooser, the duration fit, the springs and easings — operates
*upstream or downstream* of this. None of it increases the number of pictures the engine
can draw. The motion is genuinely not the gap: there are already eighteen easings,
springs with anticipation and follow-through, a camera, masked type and beat-synced
timing. Adding a nineteenth easing changes nothing anybody can see.

### Why it was invisible

Because `TitleScene` *does* have ten compositions, and a title opens most films. The one
scene anybody looks at first is the one scene with variety, so every review of a single
video found a well-composed opening and concluded the engine was fine.

### The route chosen

A shot library: give the other nine scenes what the title already has — six to ten
compositions each, as a data table on the 12×8 grid, chosen by a filtered seeded draw.
`titleLayouts.ts` is the pattern and needs no invention, only repetition. It takes the
engine from roughly twenty distinct pictures to roughly seventy, with no new dependency
and no licence question.

Two alternatives were researched and rejected for now. **Lottie / After Effects
templates** give professional polish immediately but cost money per template, need an AE
designer, cannot reflow text, and turn the product into a template-filler — which is the
"every video ends the same" complaint wearing better clothes. **GSAP** became free for
commercial use in April 2025, but its standard licence bars use in tools that let people
build visual animations without code in competition with Webflow's builder, which is
arguably exactly what this is; it would need a written answer from GreenSock, and it only
buys smoother motion, which is not the gap.

### A skill, written first

`.claude/skills/shot-composition/SKILL.md`. Not because instructions can make the engine
draw what it has no component for — they cannot, and that limit is now recorded twice in
this file — but because the work ahead is nine near-identical batches, and a batch done
nine times drifts unless the standard is written down.

It holds the measurement above, the grid vocabulary, the layout-table pattern, the
filter-then-draw rule for the chooser, seven composition archetypes, five rules that stop
a composition failing, and the verification step: shoot the same brief several times and
look — if the only difference is the words, the chooser is not working.


## Round twenty-five — the first scene gets its shot library

`BigWordScene` was a `<Center>`. Every big word in every video the product had ever made
was the same frame with different letters in it.

It now reads `bigWordLayouts.ts`: eight compositions — centre-stage, full-bleed,
left-rail, right-rail, lower-third, upper-quarter, split-field, cornered — chosen by a
filtered seeded draw on its own labelled stream, so two big-word scenes in one film can
land on different designs.

Two things the first contact sheet caught, which is the entire argument for shooting
frames rather than trusting a build:

**The word was sized by the smaller of width and height.** Every short region therefore
produced small type, so the compositions built on empty space came out looking forgotten
rather than composed — a modest word adrift in a frame, which is the one failure those
arrangements cannot survive. Width drives the size now; the region's height is only a
ceiling. A word is meant to FILL the columns it was given.

**The letters hung outside their row.** Each letter carries a negative margin so the
masks overlap and the tracking reads correctly, which means the first and last letters
sit outside the line box. Against a centred region nobody notices; against a region on
the frame's left margin the S was sliced down its spine. The row pays the margin back as
padding.

Known defect, carried forward: on one of the eight briefs an accent block sits across the
first letter. It is present in the shots taken before this change too, so it belongs to
the colour field or the frame furniture rather than to the layouts — to be chased next
sitting rather than claimed as fixed.

Eight scenes to go: stat, product, logo, overlay, quote, flow, chart, constellation.


## Round twenty-six — I finally watched the reference

Sixty-six seconds of the Notion 3.7 film, pulled apart frame by frame: 67 stills at one
second, then every frame-pair at a tenth of a second measured for how much the picture
changed. The founder has been asking for this for a month. He was right to.

### The number that explains everything

|                                   | Notion | Ours |
| --------------------------------- | -----: | ---: |
| Frames that barely move           |  47%   | **78%** |
| Mean change per 0.1s inside a shot |  5.9   |  4.0 |
| Hard cuts                         | 12 in 66s | 3 in 27s |
| Median shot length                | 4.2s   | ~3.4s |

**Seventy-eight per cent of our video is a frozen frame.** Our scenes animate in, then
stop dead until the cut. That is the definition of a slideshow, and it is why the output
reads as generated no matter how good any single frame looks.

Note what the table also says: the cutting rates are similar. The reference is not fast
cut — twelve cuts in over a minute, a median shot of four seconds. **All of its energy is
inside the shot.** Something is always happening: text is still typing, cards are still
drifting, the camera is still pushing, a list is still filling in. Ours holds still and
waits.

This is a better diagnosis than the one from round twenty-four. "Nine of twelve scenes
draw one picture" is true and worth fixing, but a film of seventy well-composed frozen
frames is still a slide deck.

### What the frames actually show

**Sentences are built across time, not stated.** "Docs and agents in one workspace." is
assembled over about five seconds — words arrive, and the accent colour *moves* between
them: first "agents" is blue, then "pace." is blue, then "in one" is blue. We state one
finished headline per scene and hold it.

**Something is nearly always being typed.** A caret is visible for a large part of the
film — in prompt fields, in the second line of a two-line statement, in the composer.
Typing is this film's main motion primitive and we do not have it as a scene behaviour.

**The two-line pattern, used four or more times.** A bold statement in full colour, then
a second line in grey that types itself underneath: "Add Custom Agents." / "They keep
work moving." · "Write it once." / "Every agent knows how." · "Simple" / "to start." ·
"Powerful" / "to scale."

**Interface is put inside the sentence.** "You didn't just [a little Launch-checklist
card] take notes." — a real UI card sits between two words, at text size, in the line.
Also "Docs [card] and [Research agent chip] agents".

**The interface populates progressively.** The app window arrives nearly empty and the
board fills with cards over two or three seconds. It is never shown finished.

**The camera reads the UI.** It pushes in close enough to read a dropdown, then pulls
back to show the whole workspace. Zoom is used to direct attention, not as decoration.

**A mouse cursor does the work.** It moves, hovers, opens menus, clicks send. Small chips
scattered around a title carry little cursors too — the multiplayer feel, as ambient
decoration.

**Dark is punctuation, not a theme.** Seventeen per cent of the film is dark, in two or
three short stretches, each used as a beat change. One of them is a split screen: dark
text on the left third, light product on the right two thirds.

**One accent colour, on one or two words at a time.** The film is otherwise black, white
and grey. The blue is rationed.

**The ending is an animation.** The logo arrives enormous, shrinks to tiny, settles as
mark-plus-wordmark, and only then does the tagline fade in under it.

### What to build, in order

1. **Nothing holds still.** A scene must keep moving for its whole length — a slow
   continuous drift on the composition, type still settling, furniture still travelling.
   This is the 78% and it is the whole ball game.
2. **Typing as a primitive**, with a caret, available to any text in any scene.
3. **Sentences that build across a scene** with the accent moving between words.
4. **Progressive UI population** in product scenes.
5. The rest — inline cards in sentences, cursor, camera-reads-UI, logo ending.


### The reply was right and shaped wrong

The founder pasted one back:

  "AI/ML engineer, portfolio video on your services — got it. One thing that changes the
  whole cut: are you selling the model-building side (training, fine-tuning, deployment
  pipelines) or the product-integration side (plugging AI features into clients' existing
  apps, RAG, API layers)? Those are two very different films."

Nothing in that is wrong. The thinking is exactly what the prompt asks for — two concrete
alternatives from the product's own world. It reads as a chatbot because it is one
seventy-word paragraph with the choice buried in brackets.

The shape is now specified: one short line proving it read you, the alternatives as
"- **Label** — detail" bullets, the question last on its own line.

Two attempts were needed, and the first failure is the useful one. Adding the rule to the
prompt body changed nothing at all — the model kept writing a paragraph. The reason was
sitting in the output schema four hundred lines earlier: `"reply": "what you say. Short
when asking..."`. **The field description won.** A rule in the prose and a contradicting
hint on the field itself is not a close contest; the description attached to the slot the
model is filling beats an instruction anywhere else in the prompt. The shape is now
described in both places and holds across every test.

The worked example that went in first was cut. This file already records that long
examples get copied verbatim rather than generalised, and the prompt had grown from 2,192
to 2,366 tokens against a documented ceiling of 1,500 and a budget of 8,000 a minute.

### Something to do with a reply

Copy, good, bad — under every finished assistant message, shown on hover and permanently
once pressed. Three and no more: the row repeats down the whole thread, so a sixth faint
icon is noise sixty times over.

One layout bug worth recording because it will recur: a bubble is a flex ROW — avatar,
then content — so anything added to it becomes a third item in that row. The buttons
appeared floating to the right of the message, vertically centred, looking like a toolbar
for the thread rather than for the reply. The body and its actions now share a column of
their own inside the bubble.


## Round twenty-eight — the wait was two bugs, not a timer

"The loading transition page takes a lot of time — if it's just a timer then don't make
it more than 10 seconds, and if some working is happening then do accordingly."

There was no padding to remove. The only timer is a three-second floor awaited *alongside*
the real work, so it has never added a second to a slow build. The wait was real, and
measuring it found two faults worth more than any animation.

### The model that works was sorted last

The candidate order compared remaining budget before anything else, and a model nobody
had called yet has no budget reading — which was treated as **infinite**. So the one
model that answers reliably ranked below three that fail this job every time, precisely
because we knew how much of its allowance was left.

The loop therefore worked through qwen (cut off, retried, failed), safeguard (refuses a
prompt this size), gpt-oss-20b (cut off, retried, failed) and only then reached the model
that was always going to answer.

Proven now sorts first; budget only breaks ties between two models we actually have a
reading for. An unknown budget is unknown, not infinite.

### The first reply was always cut off

The director reserved 2,200 tokens for a job that does not fit in 2,200. Every cold start
spent two round trips per model discovering this — the reservation learns from real
replies after three samples, but every restart paid the tuition again on all four models.
Raised to 3,600, which is near the truth. An unused reservation is returned, so starting
close costs nothing.

**Measured: a cold first build went from 20–26s to 4.5s.** A second build in the same
minute still takes longer when the free per-minute allowance is spent, which is the tier
rather than a bug.

### And a ceiling, in case both are ever wrong again

Each request was capped at 25 seconds — chosen as "well inside a person's patience",
which measurement contradicted: a healthy plan returns in four. Cut to 14, and the whole
attempt now has a 30-second budget across every model and retry. Capping one request does
nothing about a queue of them; past the budget the offline planner gives them a real
video now, which beats a better one later that they have stopped waiting for.

### One word, ending in -ing

The making screen read "Working out what goes first", "Deciding what to leave out". Each
true, each four words too many: a wait is not the moment to read, and a sentence that
changes every two seconds asks to be read three times. Fourteen single words now —
Cooking, Thinking, Sketching, Framing, Shaping, Composing, Cutting, Polishing — shuffled
per visit.

### The workspace chat caught up

The reply actions from the main thread are now a shared component and appear under
replies in the editor panel too. The editor's own reply keeps its plain one-sentence form
for one or two changes — a bullet for a single edit is ceremony — and only lists when
there are three or more, because five edits in a paragraph is unreadable and the person
cannot tell which one they asked for.

## Sources
- [Motion graphics freelance rates 2026 — biztoolkit](https://www.biztoolkit.co/post/freelance-motion-graphics-designer-rates-in-2026-per-hour-project-niche)
- [Explainer video cost 2026 — MotionGiraffx](https://motiongiraffx.com/blog/how-much-does-explainer-video-cost-2026/)
- [Motion graphics agency pricing 2026 — Cueball](https://www.cueballcreatives.com/blog/motion-graphics-design-services-pricing-2026)
- [Remotion: Prompt to Motion Graphics SaaS starter kit](https://www.remotion.dev/docs/ai/ai-saas-template)
- [Remotion: Generate code with LLMs](https://www.remotion.dev/docs/ai/generate)
- [Best AI motion graphics tools 2026 — iArt](https://www.iart.ai/blog/best-ai-motion-graphics-tools-2026)
- [Motionvid.ai](https://motionvid.ai/) · [Synthesia motion graphics](https://www.synthesia.io/tools/ai-motion-graphics) · [Easymotion](https://smollaunch.com/products/easymotion-ai-motion-graphics-generator)
