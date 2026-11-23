# Iteration log

## Gap table — Introducing Pond vs these films

Stills every half second from `pond-for-ai-agents.mp4` (38.7s) and `pond-bot-launch.mp4`, set next to Northstar, Lumen, and Relay. Scene changes in Introducing Pond land at about 2.7s, 4.8s, 12.2s, 14.9s, 28.7s, and 37.0s.

| | Pond | Us, before this pass | Fix |
|---|---|---|---|
| Cuts | 2–8 seconds. The long card scene never sits still. | Scenes held 6–10 seconds with a camera that only moved on the cut. | Zoom-through on every cut (scale 1.10 to 1, 680 ms). Then a slow push, about 0.7% a second, so no frame is frozen. |
| Type | Words bigger than the frame, one letter at a time, often cropped. | A sentence in a pill or a note, one word at a time. | Names and the closing URL are per letter (45 ms). Body lines are still per word, and each word rises 18 px. |
| Layers | Several things move at once: type, cards, glow. | One layer, then a stop. | Grid at 0.62 of the camera, glow at 0.32, specks drifting, free cards drifting a few pixels. 2D only. |
| Transitions | Match from a huge word into a field of cards, or into a full-bleed gradient. | A vertical slide. | The slide stays, and the frame punches in on the cut. |
| UI | A ring of a dozen product cards, or a dense screen. | Three cards, or a plain step list. | Lumen is eight cards. Relay’s board is six cards, wires, a moving dot, and a cursor that lands on Live. |
| Colour | White, then a full-bleed gradient, then white again. One hue. | Mostly flat grey. The gradient had a dark seam down the middle. | Smooth radial gradient. Grid and a soft glow show through the light scenes. |
| Close | A large word and a short URL. | A small grey name. | 84 px name, the URL in letters, a short rule. |

What we still do not copy: cards tilted in space, photos of people, real company logos we do not have, and numbers presented as a customer’s results. Avatars stay initials. One “Sample product” badge.

## Pass 1 — shared camera and the two weak scenes

Encoded the table in `packages/engine/src/motion.js`, `docs/motion-craft.md`, and the film runtime. Lumen’s three corner cards became eight. Relay’s plain nodes became a board with wires and a traveler that keeps moving after the path.

Stills at the glass scene showed a hard vertical seam. Relay’s title sat under the badge. Several cards were mostly empty white.

Scores against Introducing Pond: Northstar 8, Lumen 7.5, Relay 7.5.

## Pass 2 — seam, badge, empty cards

The glass scene is one radial gradient. The board starts below the badge. Light scenes no longer paint an opaque grey over the grid. Stat numbers sit large in the card instead of in a corner. Person cards gained a line and a meter.

Scores: Northstar 8.5, Lumen 8.5, Relay 8.

## Pass 3 — initials and copy-paste logs

“The snag” was marked TH, because the two letters were taken from “The”. Every Relay card said “9:02 Opened”. The mark is now SN, and each card has its own times.

Score: Relay stays 8. The board is no longer a repeated stamp. It is still a grid, not Pond’s loose ring of cards.

## Pass 4 — end card

The closing name was 26 px and grey. It is 84 px ink, with the URL under it and a short rule. The Relay cursor was short of the Live pill. It now finishes on the pill, and the click is on that beat.

Scores unchanged: 8.5 / 8.5 / 8. The end card is no longer the weak frame.

## Pass 5 — full films

All three samples rendered to mp4 with effects only, mixed near −22. Stills pulled from those files match the frames above. Further layout tweaks were getting small.

Honest scores next to Introducing Pond: **Northstar 8.5, Lumen 8.5, Relay 8.**

None is a 9. Pond still crops type off the frame, overlaps a dozen cards, and moves them as a loose field. Ours are upright, on a grid, and readable. That is as far as these templates should go without turning into a copy of one film.
