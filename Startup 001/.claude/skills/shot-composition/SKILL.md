---
name: shot-composition
description: Add or review a shot composition in the Pond motion-graphics engine. Use when a scene type looks the same in every video, when adding layout variety to a scene (bigword, stat, product, logo, overlay, quote, flow, chart, constellation), when writing or editing a *Layouts.ts table, or when judging whether generated frames look designed rather than generated.
---

# Shot composition

## The problem this exists to solve

Measured on 2026-10-18: nine of twelve scene types in this engine draw **one picture**.
`BigWordScene`, `StatScene`, `ProductScene`, `LogoScene`, `OverlayScene`, `QuoteScene`,
`FlowScene`, `ChartScene` and `ConstellationScene` arrange themselves identically in
every video ever made. Only `TitleScene` (10 compositions), `OutroScene` (7) and
`FeatureScene` (3) vary.

So a six-scene film shows one designed shot and five that are pixel-siblings of every
other film the product has produced. That — not the motion, not the model, not the
prompt — is why output looks generated.

**The motion is not the gap.** The engine already has springs with anticipation and
follow-through, eighteen easings, a camera, masked type and beat-synced timing. Adding
more easing does nothing. Adding more *pictures* is the whole job.

## The rule

> A viewer who sees two of our videos must not be able to tell they came from the same
> tool.

Two compositions are different when they answer differently: **where is the subject, how
big is it, and what is the rest of the frame doing.** Two centred layouts at different
sizes are one composition, not two.

## How a composition is expressed

Never inside a component. The arrangement is data; the component reads it. The pattern to
copy is `apps/studio/src/videos/compose/titleLayouts.ts`.

The frame is a **12 column × 8 row** grid (`COLUMNS`, `ROWS` from `@motion/engine`). A
`Region` is `{ col, row, span, rows }` in grid *lines*, not cells. An `Anchor` is one of
nine: `top-left top top-right left center right bottom-left bottom bottom-right`.
`boxFor(region, { width, height, margin })` turns a region into pixels.

A layout table entry carries, for each element in the scene:

- its `Region` — where on the grid
- its `Anchor` — how it sits inside that region
- `scale` — a multiplier on the element's base size, because **size is part of a
  composition, not a separate setting**. A headline given four columns and one given
  eleven are different ideas about what the frame is for, not the same idea resized.
- `measure` — how many columns the type is set to fill, for line-length maths

Type is set to **fill** its measure, not to sit inside it. This is why a region's width
*is* the type's size.

## Writing a new layout table

1. Create `apps/studio/src/videos/compose/<kind>Layouts.ts` beside the existing ones.
2. Export a `<Kind>Layout` type, a `const LAYOUTS: <Kind>Layout[]`, and a
   `choose<Kind>Layout(content, random, options)`.
3. The chooser **filters before it picks**:
   - drop layouts whose `scale` is too large for the content length (a 1.4-scale layout
     with seven words is a wall of text in a big box)
   - in vertical frames, drop layouts that hang off a margin — `headline.span >= 8` only,
     because a 9:16 frame has no width to give them and the words wrap to two per line
   - then draw from the seeded `Random` so the same brief always looks the same
4. The scene component imports the chooser and reads regions. It must contain **no
   arrangement of its own**.
5. Use `streamFor(seed, \`<kind>-layout-${index}\`)` so each scene's choice is an
   independent stream — two scenes of the same kind in one film must be able to differ.

## Designing the compositions themselves

Aim for **six to ten per scene kind**, and make them genuinely different designs:

- **Centred and generous** — the classic. Have exactly one.
- **Hung off a margin** — subject on the left or right third, the rest deliberately empty.
- **Full bleed** — type filling the frame edge to edge, nothing else.
- **Lower third / upper quarter** — subject off the vertical centre, which is where
  almost all editorial design actually sits.
- **Split** — a colour block taking half the frame, content in the other half.
- **Stacked tower** — words on separate lines at different scales.
- **Cornered** — subject small in one corner against a large empty field. The hardest to
  get right and the most distinctive when it works.

Rules that stop a composition failing:

- **Empty space is the composition.** A layout whose elements fill every region is a
  form. If you cannot say which part of the frame is deliberately empty, it is not
  designed yet.
- **One thing is biggest.** If the headline and the number are the same size, the eye has
  no entry point.
- **Optical centre sits above true centre.** Content centred by measurement looks low.
- **Nothing starts at the midline.** A subject that begins exactly halfway reads as an
  accident.
- **A supporting line belongs near what it supports**, not pinned to the bottom of the
  frame because there was room.

## Verifying — mandatory

A passing build proves nothing here. Shoot frames and look:

```
SPEC="$(cat spec.json)" FRAMES="50,140,250" COLS=3 THUMB=520 \
  node <scratchpad>/shoot.mjs <scratchpad>/sheet
```

Then **read the image**. The test is not "did it render" but:

- Could you tell these two frames came from the same tool?
- Is anything clipped, overlapping, or touching the frame edge?
- Does the empty space look intended or forgotten?

Generate the **same brief several times** and compare — if the only difference is the
words, the chooser is not working. Then run the audit (`audit.mjs`) to confirm duration
and scene shape did not regress.

## What not to do

- Do not add a layout by adding a prop to the component. That is how the engine ended up
  with one picture per scene.
- Do not vary only the entrance animation and call it a new shot. Motion is not
  composition.
- Do not add a tenth centred variation. Count the distinct *answers* to where/how
  big/what else, not the number of rows in the table.
