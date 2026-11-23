import {
  Easing,
  Slot,
  boxFor,
  interpolate,
  spring,
  streamFor,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { Palette } from '@motion/planner';
import { SceneShell } from '../motion/SceneShell';
import { chooseBigWordLayout } from '../compose/bigWordLayouts';
import { useBeats, useScale, useSeed, useStyle, useTone } from './shared';

type Props = {
  words: string[];
  palette: Palette;
  duration: number;
  index?: number;
  /** Where this scene sits in the video, 0 to 1. Sets how far back the camera stands. */
  position?: number;
};

/**
 * Kinetic typography: one word at a time, filling the frame.
 *
 * The highest-energy thing in the library. Each word replaces the last rather than
 * joining it, so the viewer has nothing to scan — they can only read at the pace the
 * video sets.
 *
 * The word does not fade: it is masked, and the mask cuts on the beat. Alternating the
 * direction each word — up, down, up — is what turns a sequence of words into a rhythm
 * rather than a slideshow.
 *
 * Where the word SITS is no longer written into this component. It used to be a
 * `<Center>`, which meant every big word in every video the product had ever made was
 * the same frame with different letters in it. The arrangement is now a table — see
 * `bigWordLayouts.ts` — and this reads it.
 */
export const BigWordScene = ({ words, palette, duration, index, position }: Props) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const scale = useScale();
  const tone = useTone();
  const style = useStyle();
  const seed = useSeed();
  const on = useBeats();

  // A stream of its own, labelled, so adding a decision elsewhere never rearranges this
  // one — and so two big-word scenes in the same film can land on different designs.
  const layout = chooseBigWordLayout(words, streamFor(seed, `bigword-layout-${index}`), {
    vertical: height > width,
  });

  /*
   * Each word holds for a whole number of beats.
   *
   * Dividing the scene evenly gave holds like 19.33 frames, so the word changes drifted
   * against everything else in the video that lands on the pulse. Snapping to the grid
   * is the difference between a sequence that feels cut and one that feels approximate —
   * and it is the same reason a drummer is worth having.
   */
  const raw = duration / Math.max(words.length, 1);
  const beatLength = Math.max(on(1), 1);
  const snapped = Math.max(Math.round(raw / beatLength) * beatLength, beatLength);
  /*
   * Snap to the beat only when the beat is nearly there already.
   *
   * Forcing it cost more than it bought: at 120bpm a three-word scene went from 20
   * frames a word to 15, which is less time than the letters need to arrive, and there
   * were frames with no word on screen at all. Rhythm is worth bending the timing for,
   * not worth breaking the shot for — so if the nearest beat is more than a fifth away,
   * the even division wins.
   */
  const per = Math.abs(snapped - raw) / raw <= 0.2 ? snapped : raw;
  const current = Math.min(Math.floor(frame / per), words.length - 1);

  /*
   * Words hand over to each other rather than queueing.
   *
   * Only the current word used to be drawn, so the outgoing word had to be completely
   * gone before the next one could start — and for the few frames in between, the frame
   * was empty. A blank frame in the middle of a sequence reads as a dropped clip.
   *
   * Now each word is drawn whenever it is anywhere near its turn, all stacked in the
   * same place. The one leaving is still rising out of the top while the one arriving is
   * already coming up from the bottom, which is what a real cross-cut looks like and is
   * the reason the sequence has a pulse instead of a stutter.
   */
  const HANDOVER = Math.min(10, per * 0.4);

  /*
   * The word is sized to fill the region it was given.
   *
   * Not `min(240, 1600 / longest)` as before, which was one size for every composition
   * and the reason a word hung off the left margin would have looked like the centred
   * one with a gap beside it. A region's width IS the type's size: the same word in a
   * seven-column region and a twelve-column one is two different designs, and `scale`
   * is how hard the layout pushes against the room it has.
   */
  const box = boxFor(layout.word, { width, height, margin: style.margin });
  const longest = words.reduce((n, word) => Math.max(n, word.trim().length), 4);
  // 0.6em a character at this weight, with the tracking pulled back out of it.
  const perChar = 0.6 + layout.tracking;
  /*
   * Width drives the size; height is only a ceiling.
   *
   * Taking the smaller of the two made every short region produce small type, so the
   * compositions built on empty space came out looking forgotten rather than composed —
   * a modest word adrift in a frame, which is the one failure the emptier arrangements
   * cannot survive. The word is meant to FILL the columns it was given; the region's
   * height only stops it growing taller than the band it sits in.
   */
  const byWidth = (box.width / (longest * perChar)) * layout.scale;
  const size = Math.min(byWidth, box.height * 1.25);

  return (
    <SceneShell palette={palette} duration={duration} index={index} position={position} kind="bigword" transition="fade">
      {/* A flat field of colour, for the compositions built around one. Drawn first so
          everything else sits on top of it. */}
      {layout.block && (
        <div
          style={{
            position: 'absolute',
            ...(() => {
              const field = boxFor(layout.block!, { width, height, margin: style.margin });
              return { left: field.left, top: field.top, width: field.width, height: field.height };
            })(),
            backgroundColor: palette.accent,
            opacity: 0.1,
          }}
        />
      )}

      {layout.rule && (
        <Slot region={layout.rule} anchor="center" margin={style.margin}>
          <span
            style={{
              display: 'block',
              width: '100%',
              height: 2 * scale,
              backgroundColor: palette.accent,
              transform: `scaleX(${interpolate(frame, [0, 22], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.easeOutExpo,
              })})`,
              transformOrigin: 'left center',
            }}
          />
        </Slot>
      )}

      <Slot region={layout.word} anchor={layout.wordAnchor} margin={style.margin}>
        <span style={{ position: 'relative', display: 'block', width: '100%', height: '100%' }}>
          {words.map((entry, w) => {
            // Each word keeps its own clock, so two of them can be mid-move at once.
            const wordLocal = frame - w * per;
            if (wordLocal < -HANDOVER || wordLocal > per + HANDOVER) return null;

            // Alternating direction gives the sequence its beat: each word leaves the way
            // the next one arrives, so the handover reads as one continuous travel.
            const up = w % 2 === 0;
            const wordExit = interpolate(wordLocal, [per - HANDOVER, per], [0, up ? -110 : 110], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
              easing: Easing.easeInOutQuad,
            });
            const wordPush = interpolate(wordLocal, [0, per], [1, 1.06], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });

            const shown = layout.upper ? entry.toUpperCase() : entry;

            return (
              <span
                key={w}
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  // The word sits where its anchor says, inside the region it was given.
                  justifyContent:
                    layout.wordAnchor.endsWith('left')
                      ? 'flex-start'
                      : layout.wordAnchor.endsWith('right')
                        ? 'flex-end'
                        : 'center',
                  /*
                   * Pay back the negative margins at the ends of the word.
                   *
                   * Each letter is inset by a negative margin so the masks overlap and
                   * the tracking reads correctly — which means the first and last
                   * letters hang outside the row. Against a centred region nobody
                   * notices; against a region on the frame's left margin the S was
                   * sliced down its spine.
                   */
                  paddingInline: size * 0.05,
                }}
              >
                {/*
                  A letter at a time.

                  This is the one place in the whole video where per-letter animation is
                  the right call. There is nothing to read here — one word, filling the
                  frame — so the viewer is watching rather than reading, and letters
                  landing separately give the word a physical size the eye can feel. On a
                  sentence the same move fights the reader, because the eye wants whole
                  words and is handed a queue of glyphs.
                */}
                {[...shown].map((char, i) => {
                  // Each letter trails the one before it, and the gaps close as the word
                  // fills in, so it assembles briskly and the last letter takes its time.
                  const lead = i * 1.8 * (1 - (i / Math.max(shown.length, 1)) * 0.35);
                  /*
                   * The arrival starts before the slot does.
                   *
                   * Letting each word begin at its own slot left a real gap: the previous
                   * word was completely gone a few frames before this one had risen far
                   * enough to see, and an empty frame mid-sequence reads as a dropped
                   * clip. Starting a handover early means the incoming word is already on
                   * its way up while the outgoing one is still leaving — which is what
                   * makes it a handover rather than a queue.
                   */
                  const letterRise = spring({
                    frame: wordLocal + HANDOVER - lead,
                    fps,
                    config: tone.spring,
                  });
                  const letterOffset = (1 - letterRise) * (up ? 110 : -110);

                  return (
                    <span
                      key={i}
                      style={{
                        display: 'inline-block',
                        overflow: 'hidden',
                        padding: `${size * 0.16}px ${size * 0.04}px`,
                        margin: `0 ${size * -0.04}px`,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          transform: `translateY(${letterOffset + wordExit}%) scale(${wordPush}) rotate(${(1 - letterRise) * 4.5 * (i % 2 === 0 ? 1 : -1)}deg)`,
                          transformOrigin: 'center bottom',
                          fontSize: size,
                          fontWeight: 800,
                          letterSpacing: size * layout.tracking,
                          lineHeight: 1,
                          color: w % 2 === 1 ? palette.accent : palette.text,
                          whiteSpace: 'pre',
                        }}
                      >
                        {char}
                      </span>
                    </span>
                  );
                })}
              </span>
            );
          })}
        </span>
      </Slot>

      {/* Which word of how many. A detail for the compositions with room for one — and
          a reason the emptier arrangements do not read as unfinished. */}
      {layout.counter && (
        <Slot region={layout.counter} anchor={layout.counterAnchor ?? 'center'} margin={style.margin}>
          <span
            style={{
              fontSize: 15 * scale,
              fontWeight: 600,
              letterSpacing: 1.4 * scale,
              fontVariantNumeric: 'tabular-nums',
              color: palette.muted,
            }}
          >
            {String(current + 1).padStart(2, '0')} / {String(words.length).padStart(2, '0')}
          </span>
        </Slot>
      )}

      {/* A progress rule: shows the beat without stealing focus. Not every composition
          wants one — an arrangement built on empty space is spoiled by a row of dots
          sitting in it. */}
      {layout.dots && (
        <Slot region={layout.dots} anchor={layout.dotsAnchor ?? 'center'} margin={style.margin}>
          <span style={{ display: 'flex', gap: 8 * scale }}>
            {words.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 46 * scale,
                  height: 4 * scale,
                  borderRadius: 999,
                  backgroundColor: i <= current ? palette.accent : `${palette.muted}44`,
                }}
              />
            ))}
          </span>
        </Slot>
      )}
    </SceneShell>
  );
};
