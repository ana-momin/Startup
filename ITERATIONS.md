# Iteration log

## Round 1 — shared motion

Looked at the Pond films and the three samples frame by frame.

Problems: each template timed itself. Relay’s stair was four thin cards in a blank frame. Lumen’s Approve button sat on a repeated title.

Fixed: `docs/motion-craft.md` and `packages/engine/src/motion.js` (280 ms words, 420 ms fade, 680 ms slide, 160 ms stagger, back-out pop, count-up). The film runtime reads those numbers. Relay’s stair became a queue with people, progress, and a week chart. A light sweep crosses the name. Dead `planFilm` removed.

Result: Relay’s middle scene is no longer empty. Lumen’s button is clear of the title. Worth another render.

## Round 2 — check the frames

Rendered stills of the queue, the Lumen cards, and the Northstar screen.

Problems: the queue’s lower half was still blank. The Approve overlap was gone. Northstar’s status pill no longer sat on the bar. Relay’s cursor sat in the empty side of a card, not on the words.

Fixed: a day chart fills the rest of the Relay queue.

Result: the next full render should show a full queue. Further layout tweaks were getting small, so this is the last picture change.

## Round 3 — encode

All three films rendered to mp4. Effects only, about −22.

The Relay count sat on its caption. That label now sits under the number, and Relay was rendered again. Further changes were getting small, so this round stops.

Scores after the last stills: Northstar 8, Lumen 8, Relay 7.5. None of them is a Pond film yet.
