# Motion craft

Rules taken from the Pond films in this repo (especially Introducing Pond for AI Agents and the workflow boards) and from ordinary SaaS launch films. Every template uses these numbers. Do not invent a new timing inside a scene.

## Time

| Beat | Duration | Use |
|------|----------|-----|
| Word stagger | 280 ms | Next word in a line. The line is already laid out, so nothing shifts. |
| Word fade | 420 ms | Grey to ink, or light grey to white on a dark open. |
| Scene slide | 680 ms | Quint in-out. Camera moves only here, and on a kinetic line. |
| Stagger | 160 ms | Next row, card, or node. |
| Count-up | 1100 ms | A number draws itself. Expo out. |
| Hold | 1600 ms minimum | After the last item has arrived, leave it still so it can be read. |
| Hook | under 3000 ms | The problem is readable before 3 seconds. |

## Easing

- **Out** (words, fades): `1 - 2^(-10p)`. Fast start, soft landing.
- **In-out** (scene slides): quintic. Slow, fast, slow. No linear cuts.
- **Overshoot** (a card popping in): back-out, about 8% past 1, then settle. 2D scale only. No tilt, no perspective.

## Space

8, 12, 16, 24, 32, 48, 64 px. Type sits on that grid. Safe margin from the frame edge: 48 px. One font. One hue per film, plus ink, white, and a grey for type that has not arrived yet.

## What a scene is allowed to do

- Words appear in their final place. Grey, then ink.
- Rows and cards stagger in. They do not push their neighbours.
- A 2D camera slide between scenes. A slower background layer moves at about half speed (parallax). No 3D.
- A light band may cross a word once (a sweep). It does not loop.
- A cursor moves, presses (scale 0.82 for about 160 ms), then a result appears.
- Numbers count up once.
- A caret blinks in a text field.
- Sound hits the same beat: a whoosh peaks on the cut, a click on a press, a tick on a new word.

## What we do not do

Music. Photos of people. Tilted cards. Iris wipes. A second brand colour. Fake partner logos. The word “sample” on every box. One small “Sample product” badge is the only label.
