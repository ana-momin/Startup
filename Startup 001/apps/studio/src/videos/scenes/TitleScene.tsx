import {
  Slot,
  boxFor,
  fitText,
  interpolate,
  streamFor,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { Palette } from '@motion/planner';
import { MaskedLine } from '../motion/MaskedText';
import { TypedLine } from '../motion/TypedLine';
import { PlainLine, PlainLineBox } from '../motion/PlainLine';
import { SceneShell } from '../motion/SceneShell';
import { StackedType } from '../motion/StackedType';
import { chooseTitleLayout } from '../compose/titleLayouts';
import { Badge, useBeats, useScale, useSeed, useStyle } from './shared';

type Props = {
  badge?: string;
  headline: string;
  sub?: string;
  palette: Palette;
  duration: number;
  index?: number;
  /** Where this scene sits in the video, 0 to 1. Sets how far back the camera stands. */
  position?: number;
};

/**
 * The opening scene, composed rather than selected.
 *
 * This component used to *be* the layout: a centred column of badge, headline and
 * subtitle, with three enum values that nudged it. That is why every video opened the
 * same way — not because the typography was wrong, but because the arrangement was
 * written into the code and there was no way to express any other one.
 *
 * Now the arrangement is a row in a table and this component only places what it is
 * given. The choice comes from the content (a nine-word headline cannot have the
 * full-bleed treatment) and then from the video's own seed, so two different prompts
 * genuinely compose differently while the same prompt always composes the same way.
 *
 * The choreography is unchanged and still matters: eyebrow, then rule, then headline,
 * then the supporting line. Everything landing at once is what makes a composition feel
 * flat, whatever shape it is.
 */
export const TitleScene = ({
  badge,
  headline,
  sub,
  palette,
  duration,
  index = 0,
  position,
}: Props) => {
  const scale = useScale();
  const style = useStyle();
  const tone = style.tone;
  const frame = useCurrentFrame();
  const on = useBeats();
  const seed = useSeed();
  const { width, height } = useVideoConfig();

  // A stream of its own, labelled, so adding a decision elsewhere never rearranges this
  // one. See `streamFor` — this is the property that makes the variation stable.
  const layout = chooseTitleLayout(headline, streamFor(seed, `title-layout-${index}`), {
    hasSub: Boolean(sub),
    vertical: height > width,
  });

  /*
   * Size the headline to the region it was actually given.
   *
   * The first version of this guessed a size from the column count and then shrank it by
   * word count, which worked until a headline had long words or a narrow region — and
   * then the type overflowed into whatever sat underneath it. A composition that hands
   * out regions has to be able to trust that what goes in them stays in them, or the
   * whole idea collapses the first time somebody writes a nine-word headline.
   */
  const box = boxFor(layout.headline, { width, height, margin: style.margin });
  const size = fitText({
    text: headline,
    width: box.width,
    height: box.height * 0.94,
    max: 210 * scale * layout.scale * tone.headlineScale,
    min: 30 * scale,
    leading: tone.leading,
    // Heavier weights are wider. Getting this roughly right is what keeps a bold tone
    // from overflowing where a clean one fits.
    // Heavier and wider-tracked type needs more room per character.
    ratio: (style.weight >= 800 ? 0.56 : style.weight <= 400 ? 0.49 : 0.52) + style.tracking * 0.4,
  });

  // A slow drift across the whole scene: barely perceptible frame to frame, and the
  // reason a held title feels alive rather than paused.
  const drift = interpolate(frame, [0, duration], [0, -14 * scale]);

  /*
   * How the one emphasised word is marked, chosen by the seed.
   *
   * Three treatments rather than one, because the same trick on every video is a tic —
   * and because the right answer genuinely varies: a solid bar suits a loud tone, an
   * outline suits a quiet one, and colour suits everything in between.
   */
  const emphasis = streamFor(seed, `mark-${index}`).pick(['colour', 'block', 'outline'] as const);

  /*
   * Does the supporting line type itself?
   *
   * Roughly two in five, and only when the line is short enough that watching it appear
   * is quicker than reading it. A caret in every video would be a tic; a caret in some of
   * them is a decision.
   */
  const typed = Boolean(sub) && sub!.length <= 46 && streamFor(seed, `typed-${index}`).next() < 0.4;

  /*
   * Plain by default; stacked only where the look is built for it.
   *
   * The poster look exists to set a short phrase enormously, so it keeps the stacked
   * treatment. Everything else gets one line at one size, which is what the references
   * do and what reads as professional rather than as a trick.
   */
  const plain = style.look.name !== 'poster';

  /*
   * One size for the whole line, fitted to the region it was given.
   *
   * Deliberately capped well below what the box could take. Every reference headline sits
   * around a tenth of the frame height with air on all sides; type that fills its box to
   * the edges is the thing that makes a frame look like a slide.
   */
  const plainSize = fitText({
    text: headline,
    width: box.width,
    height: box.height * 0.72,
    max: 116 * scale * tone.headlineScale * layout.scale,
    min: 26 * scale,
    leading: 1.15,
    ratio: style.charRatio,
  });


  return (
    <SceneShell duration={duration} index={index} position={position} kind="title">
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${drift}px)` }}>
        {badge ? (
          <Slot region={layout.eyebrow} anchor={layout.eyebrowAnchor} margin={style.margin}>
            <Badge text={badge} palette={palette} scale={scale} delay={on(0)} />
          </Slot>
        ) : null}

        {/*
          The rule is the thread's, not this scene's.

          Both drew one, so every title had two: this one, where the composition asked for
          it, and the through-line pinned to the middle of the frame. Two accent marks a
          few centimetres apart read as a rendering fault, not as structure.

          The thread reads this same layout now and takes the rule's place, which is the
          better of the two outcomes — the mark the composition wanted is also the object
          that came through the cut to get there, and that is the whole reason the thread
          exists.
        */}

        {/*
          Two ways to set a headline, and the plain one is now the default.

          `StackedType` breaks the line by meaning and sets each part at whatever size
          fills the measure, so a two-word line and a four-word line come out at wildly
          different scales. It is a real technique and it looks designed — for about two
          videos. After that every headline in every film is doing the same trick, and a
          trick repeated is a template, which is the exact complaint this engine keeps
          earning.

          The reference frames do the opposite and look more professional for it: one
          line, one size, regular weight, dead centre, a lot of air. The confidence is in
          the restraint. So plain carries most videos, and the stacked treatment is kept
          for the poster look, which is the one art direction that actually exists to set
          a short phrase enormously.
        */}
        <Slot region={layout.headline} anchor={layout.headlineAnchor} margin={style.margin}>
          {plain ? (
            <PlainLineBox align={layout.headlineAnchor.includes('left') ? 'left' : 'center'}>
              <PlainLine
                text={headline}
                size={plainSize}
                palette={palette}
                delay={badge ? on(0.75) : on(0.25)}
                align={layout.headlineAnchor.includes('left') ? 'left' : 'center'}
                // The one flourish the references allow themselves: the line ramps to the
                // brand colour so the last word lands in it.
                ramp
              />
            </PlainLineBox>
          ) : (
          <StackedType
            text={headline}
            palette={palette}
            measure={box.width}
            height={box.height}
            delay={badge ? on(0.75) : on(0.25)}
            stagger={Math.max(on(0.25), 3)}
            mark={emphasis}
          />
          )}
        </Slot>

        {/*
            A supporting line always keeps its distance from whatever is above it.

            The regions are correct and the type fits them — they are simply adjacent, so
            a headline filling the bottom of its box and a subtitle filling the top of the
            next one end up touching with nothing between them. Outlining the regions was
            the only way to see that the layout was right and the *spacing* was missing.

            Set from the headline's own size rather than a fixed number, so the gap stays
            proportional whether the headline is enormous or modest.
        */}
        {sub ? (
          <Slot
            region={layout.sub}
            anchor={layout.subAnchor}
            margin={style.margin}
            style={layout.subAnchor.startsWith('top') ? { paddingTop: size * 0.42 } : undefined}
          >
            {/*
              The supporting line either wipes on, or writes itself.

              Both reference films that use a caret put it on the SECOND line, never the
              first: "Write it once." lands, and then "Every agent knows how.|" is typed
              under it. That order is the whole effect — the headline is a statement and
              the line beneath it is someone still talking.

              Seeded rather than always on, because a device used in every video stops
              being a device and becomes a house style. Short lines only: watching forty
              characters appear is charming and watching ninety is waiting.
            */}
            {typed ? (
              <TypedLine
                text={sub}
                size={Math.max(size * style.supportRatio, 17 * scale)}
                palette={palette}
                delay={on(2)}
                align={layout.subAnchor.includes('left') ? 'left' : 'center'}
                tone={palette.muted}
                splitAt={0}
              />
            ) : (
              <MaskedLine delay={on(2)} duration={26} size={Math.max(size * style.supportRatio, 17 * scale)}>
                <span
                  style={{
                    display: 'block',
                    // Sized from the look's contrast ratio, which is the most
                    // characteristic number in any typographic system.
                    fontSize: Math.max(size * style.supportRatio, 17 * scale),
                    fontFamily: style.family,
                    fontWeight: 400,
                    lineHeight: 1.45,
                    color: palette.muted,
                  }}
                >
                  {sub}
                </span>
              </MaskedLine>
            )}
          </Slot>
        ) : null}
      </div>
    </SceneShell>
  );
};

