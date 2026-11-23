Hi Claude! I'm Anas, founder of **Harkat**, a motion studio making product films for AI & SaaS startups.

I've attached `harkat-handoff.zip`. Please unzip it and read **CLAUDE.md** first. It has the full context, our non-negotiable rules, design tokens and what to build.

**Your job:** turn the approved designs in `/design` into a real, working, deployed website, and set up our reusable film pipeline.

Rules:
- `/design/*.html` is the source of truth. Match it **exactly** at 1440px: same layout, type, colours, buttons and animations. Don't redesign or "improve" anything I didn't ask for.
- Work step by step: **understand → plan → execute → ship.** Show me a short plan before coding, then build in small steps I can review.
- Keep replies short and simple.

Order of work:
1. Read everything and give me a short plan, including the stack and folder structure.
2. Rebuild Home, Work, Results and Process pixel-close. All links and buttons should work.
3. Make it fully responsive (mobile 390px).
4. Build the `/order` flow as specified in CLAUDE.md.
5. Set up `/films` (template + render pipeline) and mix SFX onto the hero film using my SFX kit (I'll upload it).
6. When I share the Pond MP4s: add them, generate posters and the Results loop. Keep them behind `SHOW_POND_WORK=false` until I confirm Dylan approved.
7. Deploy to my domain.

Let's go. Start with step 1.
