# Harkat — project context for Claude Code

## What we're building
**Harkat** is a motion studio that makes agency-quality product/launch films for **AI & SaaS** startups, built with Claude and delivered in days instead of months.
- Founder: **Anas (Momin, @ana_momin)**, a BS AI student at NUTECH in Islamabad. He is also GTM Strategist and Community Manager at **Pond AI** (joinpond.ai), our first client and case study.
- Positioning: *"Your motion team, without the agency."*
- The edge is **taste + fast iteration**, not the tool.

This repo has two jobs:
1. **The website** (marketing site + order flow): harkat.<domain>
2. **The film pipeline**: a reusable system to make client videos quickly and consistently.

## Non-negotiables (apply to everything: site, films, copy)
- **No music, ever.** Sound effects only.
- **Never show photos or images of women.** Use abstract avatars or initials instead.
- **No 3D**: no 3D perspective, tilted planes or iris/circle wipes. Use 2D camera moves only (push, pan, zoom, whip), plus organic blob portals.
- **Honest claims only.** Every number must be real or clearly marked as example UI. No fake reviews, testimonials, logos or records.
- **Halal clients only.** Run everything within Islamic values.
- **Real brand logos.** Use official SVGs (e.g. the `simple-icons` npm package), minimal clean UI, and the client's own colours.
- **Change only what Anas asks for.** No unrequested extras. Work step by step: understand → plan → execute → ship.
- **Pond films stay private until Dylan (Pond CEO) approves.** Put them behind a flag: `SHOW_POND_WORK=false` by default.

## Source of truth: `/design`
`design/*.html` are the **approved final designs** (static HTML/CSS, open them in a browser). The site must match them **pixel-close at 1440px wide**: same layout, spacing, type, colours, buttons and animations. Don't "improve" or reinterpret them.
- `index.html`: Home
- `work.html`: Work
- `results.html`: Results
- `process.html`: Process
- `logo.html`: logo sheet

### Design tokens
| Token | Value |
|---|---|
| Page background | `#F6F7F9` |
| Ink (text) | `#0D1222` |
| Body text | `#3C4253` |
| Muted text | `#5B6275` / `#6B7183` |
| Hairlines | `#E2E5EC` |
| Brand cobalt | `#2E4BDB` |
| Deep blue | `#1F33B0`, `#16258A`, `#0B1340` |
| Light blue | `#4F6CEB`, `#7F96F4`, `#B8C6FB`, `#DCE4FF`, `#EEF2FF` |

- **Font:** Geist (300/400/500/600). Headings are weight 500 with tight tracking (−0.055em to −0.065em). Geist Mono is used for small labels.
- **Gradients:** single-hue blue only. Big panels use grainy radial gradients (an SVG `feTurbulence` overlay with soft-light blend at 0.5 opacity).
- **Buttons, 3 distinct roles:**
  1. **Primary** (hero + header): a black button whose right "tail" melts into blue (`#0D1222 → #1F33B0 → #4F6CEB`) and holds an arrow. The header uses a smaller version.
  2. **Secondary:** white, 1px ring, Harkat mark icon, small caption below it.
  3. **On-dark CTA:** a white button with a blue tail, plus a glass "Email us" button.
- **Radii:** buttons 9–12px, cards 18–28px.
- **Logo:** a 5-blade swirl mark (`assets/harkat-mark*.svg`) plus the lowercase "harkat" wordmark in Geist 500.

### Key interactions to rebuild
- **Hero:** autoplay, muted, looping `assets/harkat-hero.mp4` with poster `assets/harkat-hero-poster.jpg`, sitting on a soft blue grainy stage.
- **Selected films (home):** a sticky, scroll-driven section with one big 16:9 player. As the user scrolls, the films change, and a **blue highlight slides smoothly** between the 4 film titles in the bar below (CSS `animation-timeline: view()` with a JS/IntersectionObserver fallback). The background is a full-bleed soft blue glow.
- **Results:** 3 real stats: **14+** films shipped for Pond AI, **30–40s** typical length, **0** music tracks.
- **Final CTA:** a deep blue grainy panel with a slowly sliding filmstrip of real film titles.
- **Motion:** subtle rise-in on load. Respect `prefers-reduced-motion`.

### Films (4, all for Pond AI)
1. Introducing Pond for AI Agents *(holo style, our best)*
2. Meet Pond AI
3. Pond Bot launch
4. WhatsApp booking agent

The MP4s will be provided by Anas. Generate the poster frames and a 6–8s Results-page loop from them with ffmpeg. Until Dylan approves, use the in-design animated placeholders.

## Still to build (not in the designs yet)
1. **Responsive/mobile (390px):** headlines scale with `clamp()`, sections stack, the film bar becomes a 2×2 grid or a swipe row, and the footer wordmark shrinks. No horizontal scroll anywhere.
2. **Order flow:** a `/order` page reached from every "Order a film" / "Start your film" button, as a short multi-step form:
   - product link
   - film type: Spark 15–20s ($250), Launch 30–40s ($600), Launch Pack ($1,200). These are founding prices.
   - reference video link (optional)
   - deadline
   - name and email
   - Then submit → a confirmation screen, with an email to Anas (e.g. Resend) and the order saved. No payments yet.
3. **Wiring:** every nav link, "See our work", "Email us" (mailto) and footer link must work.
4. **SEO/meta:** OG image (use the poster), favicon from the mark, sitemap.
5. **Deploy:** Vercel (or similar) on Anas's domain.

**Suggested stack:** Next.js (App Router) + plain CSS modules, porting the design CSS as-is. Avoid UI kits that change the look.

## Film pipeline (`/films`)
This is how every Harkat video is made:
1. **Reference:** study a reference video frame by frame (transitions, camera, text animation, pacing) and copy its structure closely from the start.
2. **Build:** a deterministic HTML/JS film with `render(t)` per frame. The 2D camera moves on transitions, with kinetic text and real, rich UI (no empty tiles).
3. **Render:** Playwright captures it at 30fps, then ffmpeg encodes it (H.264, crf ~20, about 10MB for 40s). See `hero-film/render.py` + `hero-film/film.html` for a working example.
4. **SFX:** use our "better sound effects" kit (`Pond Better SFX Kit.zip`: sfxlib, sfxlib2 and the `pond_sfx2.py` mixer). Whooshes peak on cuts, plus UI hits, ticks, chimes and a thud, mixed to about −22 dBFS. **Never music.**
5. **Iterate:** the client gives point-by-point feedback and we change only what was asked.

Structure it as a reusable template: `films/_template/` (film.html scaffold, easing/camera/kinetic-text helpers, render.py, sfx mix step) plus one folder per client film. Videos run 30–40s, with a hook in the first 3s and a CTA with the URL at the end. Hero/montage films can be shorter (~20s).

**First film task:** mix SFX onto `assets/harkat-hero.mp4` using the kit, timed to its cuts. The cuts are at about 1.8s (blob portal), 6.4–7.2s (pin morph), 8.7s (UI comes alive), 10.5s (click/toast), 11.3–12.1s (morph to player), 12.6–13.9s (logo pops + "Posted" chips), 15.9s (blob portal) and 16.5–19s (logo bloom + CTA).
