# Prompt for Claude Design — "Introducing Pond"

Paste everything below the line. Attach the assets listed at the bottom.

---

Build me a motion-graphics piece: **"Introducing Pond"** — a 24-second brand
explainer for Pond AI (joinpond.ai). Design it as a storyboard canvas: one
artboard per shot, 1920×1080 each, laid out left-to-right in playback order,
with the timing and motion notes written under each board.

## The brand

Pond is an **agentic task marketplace**. You post a problem; humans, AI agents
and (soon) robots compete to complete it, in parallel, and you only pay for
results. No briefing calls, no revision cycles. It also runs bounties, and
"Pond Markets", where creators launch projects the community backs. 150+
countries. Tagline on the site: *"Describe Your Needs — Agents Deliver for You."*

## Exact colour scheme — use these, do not substitute

| Token | Hex | Use |
| --- | --- | --- |
| Accent blue | `#2166F6` | hero type, accent words, icons |
| Field deep | `#2F6BE8` | full-bleed blue, top-left of gradient |
| Field mid | `#3B7DEB` | full-bleed blue, middle |
| Field light | `#5AA4F7` | full-bleed blue, bottom-right |
| Pale ground | `#F2F7FD` | the light scenes |
| Pure white | `#FFFFFF` | opening and closing frames |
| Wash | `#8FB9FB` | soft aurora blobs on light grounds |
| Wash soft | `#C3DAFC` | secondary aurora blobs |
| Ink | `#0B1526` | dark type on light |
| Ink soft | `#5C6B82` | secondary / caption type |

Full-bleed blue field = `linear-gradient(152deg, #2F6BE8 0%, #3B7DEB 46%, #5AA4F7 100%)`.

**No dark mode. No black backgrounds. No neon, no glow, no chrome, no 3D.**
This is a bright, airy, Apple-keynote / Linear-style system.

## Typography

- One family throughout: **Inter** (or SF Pro / Helvetica Now if unavailable).
- Headline kinetic lines: **weight 300 (Light)** at 150–190px. Light, not bold —
  this is the single most important type decision. Letter-spacing `-0.022em`.
- Chips and captions: weight 400–500, 40–48px.
- Only the final logo lockup is bold (weight 700).

## The signature motion technique — apply to every line of copy

Copy never simply fades in. Each **word** arrives already on screen but **pale
and heavily blurred** (26px blur, ~20% opacity accent blue), then resolves to
full colour and full sharpness over ~0.3s. Words are staggered ~0.22s apart, so
at any instant a line reads **sharp → soft → ghost** from left to right.

On top of that, the whole line **drifts slowly horizontally** (~110px over its
time on screen) — constant, linear, never stopping.

Scene changes are **hard cuts**. No dissolves, no wipes.

## Shot list — 24 seconds

**1. 0.0–3.0s — Cold open. White.**
Pure white, ~50 small `#2166F6` specks drifting slowly.
Kinetic line, centred, 190px light, `#2166F6`:
> **Building a startup has never been easier.**

**2. 3.0–5.5s — Hard cut. Full-bleed blue.**
White light type, 172px:
> **Growing one is still hard.**

**3. 5.5–9.0s — Pale ground.**
Line, 106px, ink with the last word in `#2166F6`, which blur-swaps three times
while the rest of the line stays put:
> One network for **Talent** → **Capital** → **Users** → **Execution**

Five soft circular white chips (people / globe / coin / spark / chat icons in
`#2166F6`, on white circles with a soft blue shadow) float around the line at
different depths — the far ones smaller, paler and permanently slightly blurred.

**4. 9.0–12.0s — Hard cut. Full-bleed blue.**
The Pond mark, white, centred, small (~120px). Four white pill chips fade and
float in around it, staggered, one per beat:
**Founders** (upper-left) · **AI Agents** (upper-right) · **Investors**
(lower-left) · **Contributors** (lower-right).
Caption beneath in white light type, 84px:
> **One marketplace. Everyone competing.**

**5. 12.0–15.5s — Pale ground. Product.**
Left third: ink line, 76px, word-by-word build:
> Founders post what they need — **agents deliver.**

Right two-thirds: a screenshot of the Pond web app slides in from the right on a
large white rounded card (radius 24px) with a soft blue shadow, tilted 0°, and
settles. Crop it so the "Describe Your Needs / Agents Deliver for You" headline
and the task input are readable.

**6. 15.5–18.5s — Pale ground. The work.**
A row of four task/bounty cards scrolls slowly right-to-left, each a white
rounded card with a title, a reward figure and a small logo chip. Caption
underneath, centred, 76px, with the last two words in `#2166F6`:
> Contributors **solve real challenges** — and get paid.

**7. 18.5–21.0s — Pale ground. Scale.**
Left: giant `#2166F6` numeral **150+** at 260px, weight 300, counting up from 0.
Underneath it, `Countries` at 84px in `#2166F6`.
Right: a **dotted halftone globe** in `#2166F6`, slowly rotating — dots only,
no solid landmasses.

**8. 21.0–22.5s — Hard cut. Full-bleed blue.**
White light type, centred, two lines, 96px, word-by-word build:
> **The future of building is connected.**
> **And it starts with Pond.**

**9. 22.5–24.0s — Hard cut. Pure white. End card.**
Centred lockup: the Pond mark in `#0B1526` beside **Pond AI** in weight 700 at
176px, letter-spacing `-0.045em`. It blur-resolves in from 30px blur at 0.9
scale. Below, after a beat, a thin hairline rule either side of `joinpond.ai`
in `#5C6B82` at 40px, letter-spacing `0.06em`.

## Backgrounds

Light scenes are never flat. Ground colour plus two or three very large, very
soft radial blue blobs (`#8FB9FB` / `#C3DAFC`) at 30–60% opacity drifting slowly
on the diagonal, plus a faint white diagonal sheen across the top-left and
bottom-right corners. The blue field carries a barely-visible 96px white grid at
5% opacity and one large soft white radial highlight.

## Deliverables

1. The nine artboards in playback order, with timings and motion notes beneath each.
2. A one-page style sheet: the palette swatches, type scale, the chip component,
   the card component, and the blur-resolve states of a single word shown as
   four steps (ghost → soft → nearly there → sharp).

---

## Assets to attach

**Must attach:**
1. `Material/vector/pond-mark.svg` — the mark as a true vector, traced from the
   supplied logo. Note it is deliberately **asymmetric**: four lobes with the
   inner counter offset up-and-left, so the black is a hairline at the upper
   left and thick down the right. Do not "tidy" it into a symmetric flower.
   Uses `fill-rule="evenodd"`; recolour via `currentColor`.
2. `Material/Simple Pond AI Logo with White Bg.png` — the full logo lockup

**Should attach — screenshot these yourself from joinpond.ai:**
3. The **homepage hero** ("Describe Your Needs / Agents Deliver for You" + the
   task input box) — needed for shot 5
4. The **task/bounty listing grid** (`joinpond.ai/tasks`) — needed for shot 6
5. The **stats bar** (users / countries / agents at work / tasks completed) —
   useful for shot 7
6. The **AI Marketplace** page, if it is live

**Reference for the look — attach 2 or 3 of these:**
7. A frame or two from your existing Pond motion video (the light-blue kinetic
   one) — this is the target style, say so explicitly
8. Screenshots of **linear.app**, **vercel.com** or an **Apple keynote** slide —
   for the airy light-blue gradient language
