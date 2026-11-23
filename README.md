# Harkat AI

Agency-quality product films for AI and SaaS startups, made with code and sold for much less than an agency.

The public site is the Harkat site. The studio on that site turns a short brief into a sample film. A person still finishes the film a client pays for.

## What’s in here

```
apps/web          the site (home, work, process, docs, orders, studio)
packages/engine   turns a brief into a film. Rules pick the scenes. A model is optional.
packages/sfx      makes short sound effects and mixes them to about −22 dBFS
films             hand-made films (harkat-hero) and the sample film
docs              brand, pipeline, craft rules, prices, quality checklist
```

Sound is effects only. There is no music anywhere in the product.

## Run the site

```bash
npm install
cp .env.example apps/web/.env.local   # optional
npm run dev
```

Open http://localhost:3000. Studio is at http://localhost:3000/studio.

## Render the sample film

The sample product is **Northstar**. It is fake. The film says so on screen.

```bash
cd films
npm install
npx playwright install chromium
cd ..
npm install --prefix packages/sfx
npm run sample
```

That writes:

- `films/samples/northstar/film.html` (the source)
- `films/samples/northstar/out/northstar-sample.mp4` (picture + effects)

`npm run sample -- --html-only` writes the HTML and skips the render. `npm run sample -- --llm` asks a model to shorten the words first, if `GROQ_API_KEY` or `OPENAI_API_KEY` is set. With no key, the same rules run. The model is not allowed to invent claims, and it never writes animation code.

## Render a hand-made film

```bash
cd films
npm run render -- harkat-hero
```

1080p, 30fps, ffmpeg crf 20. Add a `cues.json` and run `npm run sfx -- harkat-hero` once the effect files are in `films/sfx`. The old Pond effect kit was never in this repo, so the sample film uses effects we generate in `packages/sfx`.

## Deploy

The site is a Next.js app. On Vercel, set the **Root Directory** to `apps/web`.

This repo used to build from `harkat/web`. If Vercel still points there, the next deploy will fail until you change it. A failed deploy should leave the current site up. Don’t deploy until that setting is updated.

Set the same env vars as `.env.example` in the Vercel project. `NEXT_PUBLIC_SHOW_POND_WORK=true` is what shows the Pond films.

## Prices

The site still shows the prices that are live today: Spark $30, Launch $50, Studio $100. The handoff notes list higher founding prices ($250 / $600 / $1,200). Those were not changed.

## What we kept, and what we dropped

Kept: the Harkat site, orders and crypto payments, the Pond portfolio films, the hero film source, the render pipeline, the brand.

Dropped: the old chat app (it wrote animation from scratch and the films were weak), MotionGPT colours and files, duplicate design mockups, and the larger duplicate copies of the Pond videos. The copies the site actually plays are still in `apps/web/public/films`.
