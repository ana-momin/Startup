import {
  Center,
  Easing,
  interpolate,
  spring,
  streamFor,
  useCurrentFrame,
  useVideoConfig,
} from '@motion/engine';
import type { DeviceKind, Palette, SurfaceKind } from '@motion/planner';
import { MaskedLine, MaskedText } from '../motion/MaskedText';
import { ScreenStage, choosePresentation, useScroll } from '../motion/Screen';
import { SceneShell } from '../motion/SceneShell';
import { FONT, onDark, useBeats, useScale, useSeed, useTone } from './shared';

/**
 * The product, on screen.
 *
 * This is the scene the whole product is for. Every competitor describes software with
 * words on a gradient; a founder making a launch video wants the thing itself, and
 * "here it is" beats any amount of describing it.
 *
 * The interface is drawn, not photographed. That is the only approach that can work from
 * a prompt — nobody uploads anything, nothing has to be kept in sync with a real app, and
 * it is in the right colours by construction. It is honest about what it is: a
 * representation, the way an illustration in a brochure is. The claim it makes is "this
 * is the shape of the thing", not "this is a screenshot".
 *
 * Three details do most of the convincing, and all three are about restraint.
 *
 * REAL SOFTWARE IS MOSTLY QUIET. A mockup where everything pulses reads as a toy. Here
 * one thing happens at a time — a row arrives, a toggle flips, a number ticks — and the
 * rest holds still.
 *
 * THE TEXT IS UNREADABLE ON PURPOSE. Interface copy at this size cannot be read anyway,
 * and inventing sentences to fill a fake product is how a video ends up making claims
 * nobody approved. Bars of colour at text weight say "words" without saying anything.
 *
 * THE CURSOR IS THE TELL. A pointer that travels somewhere and clicks turns a picture of
 * software into a recording of somebody using it, which is a completely different claim.
 */

type Props = {
  /**
   * The brand's real accent.
   *
   * Passed separately from the scene palette because on a colour-field scene the scene's
   * accent has become black or white — correct for text on that field, and useless as
   * the accent of a product interface, which should be the brand's own colour wherever
   * the scene happens to be.
   */
  brandAccent?: string;
  /** Whether the product itself is a dark-mode interface. */
  uiDark?: boolean;
  heading?: string;
  caption?: string;
  device?: DeviceKind;
  surface?: SurfaceKind;
  domain?: string;
  labels?: string[];
  palette: Palette;
  duration: number;
  index?: number;
  /** Where this scene sits in the video, 0 to 1. Sets how far back the camera stands. */
  position?: number;
};

export const ProductScene = ({
  brandAccent = '#4C7DFF',
  uiDark = false,
  heading,
  caption,
  device = 'browser',
  surface = 'dashboard',
  domain,
  labels = [],
  palette,
  duration,
  index,
  position,
}: Props) => {
  const scale = useScale();
  const tone = useTone();
  const on = useBeats();
  const seed = useSeed();
  const { width, height } = useVideoConfig();

  const portrait = height > width;
  const phone = device === 'phone' || (portrait && device !== 'browser');

  /*
   * The device is sized to the space that is actually left.
   *
   * Sizing it as a fraction of the frame put the heading off the top and the caption off
   * the bottom, because a window with a fixed aspect ratio does not care how much room
   * the words above and below it need. Measuring what is left and fitting the window
   * into that is the only version that survives a heading of any length, a caption or no
   * caption, and three aspect ratios.
   */
  // Generous, because a heading is allowed to wrap. The allowance was tuned against a
  // one-line heading and a two-line one pushed itself off the top of the frame — the
  // cost of over-reserving is a slightly smaller window, which nobody notices, and the
  // cost of under-reserving is a headline nobody can read.
  /*
   * The screen gets as much of the frame as the words will allow.
   *
   * It was sized conservatively and came out looking like an illustration of a product
   * rather than the product. This is the subject of the shot — in a launch video it is
   * most of what anyone is there to see — so the type above and below it gets exactly
   * what it needs and the window takes the rest.
   */
  /*
   * A phone is twice as tall as it is wide, so width and height trade very differently.
   *
   * Giving the browser more of the frame was right and applying the same allowance to a
   * phone was not: a phone sized to the available width is immediately taller than the
   * frame, and it got cut off at both ends with the heading pushed out entirely. The
   * aspect ratio is what decides which dimension is scarce, so each gets its own
   * allowance.
   */
  const headroom = (heading ? 200 : 0) + (caption ? 130 : 0) + (phone ? 210 : 90);
  const room = {
    width: width - (phone ? 300 : 90) * scale,
    height: height - headroom * scale,
  };

  const ratio = phone ? 0.5 : 1 / 0.62;
  // Fit by whichever runs out first, and never take the whole frame: a screen with no
  // air above it leaves the heading nowhere to go, and a shot with no air at all reads
  // as a screenshot rather than as a thing being presented.
  const deviceWidth = Math.min(room.width, room.height * ratio, height * 0.74 * ratio);
  const deviceHeight = deviceWidth / ratio;

  /*
   * How the screen is staged, and how far its contents drift.
   *
   * Staging is chosen per video from the seed, so two companies do not get the same shot
   * of their own product. The scroll is the cheapest thing in the engine that makes a
   * mockup read as software being used rather than as a screenshot.
   */
  /*
   * The interface has its own colours, independent of the scene behind it.
   *
   * It used to inherit the scene's palette, which is right for everything else in the
   * engine and completely wrong here: on a colour-field scene the background became the
   * brand blue, so the window was blue, so the interface inside it was blue on blue and
   * invisible. A screenshot does not change colour because the slide behind it did.
   *
   * A product surface is near-white or near-black — that is what software looks like —
   * and the brand colour appears inside it as the product's accent, which is also what
   * software looks like.
   */
  const ui: Palette = {
    bg: uiDark ? '#0E1016' : '#FDFDFE',
    text: uiDark ? '#F4F5F8' : '#12141C',
    muted: uiDark ? '#8C919F' : '#767C8C',
    accent: brandAccent,
    accentSoft: brandAccent,
  };

  const presentation = choosePresentation(streamFor(seed, `screen-${index ?? 0}`), {
    vertical: portrait,
    hasCaption: Boolean(caption),
  });

  const scroll = useScroll({
    delay: on(1.5),
    duration,
    /*
     * A drift, not a scroll.
     *
     * The first distance was large enough to carry the labelled rows clean off the top
     * of a phone, leaving a screen of blank placeholders — which is worse than not
     * moving at all, because the one part of the interface carrying their own words had
     * gone. The point is that the surface is alive, and a few per cent says that as well
     * as a page does.
     */
    distance: -deviceHeight * (phone ? 0.07 : 0.055),
  });

  return (
    <SceneShell palette={palette} duration={duration} index={index} position={position} kind="product">
      <Center style={{ gap: 26 * scale, padding: `${40 * scale}px 0` }}>
        {heading ? (
          <MaskedText
            text={heading}
            delay={on(0)}
            size={46 * scale * tone.headlineScale}
            color={palette.text}
            align="center"
            maxWidth={1300 * scale}
            stagger={2.2}
          />
        ) : null}

        <ScreenStage
          presentation={presentation}
          /* The stacked panel is a second window, not a scene element, so it is coloured
             like the interface rather than like the background behind it. */
          palette={ui}
          sceneBg={palette.bg}
          width={deviceWidth}
          height={deviceHeight}
          scale={scale}
          delay={on(0.5)}
          duration={duration}
        >
          <Device kind={phone ? 'phone' : 'browser'} palette={ui} scale={scale} domain={domain}>
            <Surface
              kind={surface}
              phone={phone}
              palette={ui}
              scale={scale}
              labels={labels}
              start={on(1)}
              beat={Math.max(on(0.5), 6)}
              width={deviceWidth}
              height={deviceHeight}
              /* How far the content drifts inside the window while the shot plays. */
              scroll={scroll}
            />
          </Device>
        </ScreenStage>

        {caption ? (
          <MaskedLine delay={on(2)} duration={24} size={27 * scale}>
            <span
              style={{
                display: 'block',
                fontSize: 27 * scale,
                fontWeight: 400,
                color: palette.muted,
                textAlign: 'center',
                maxWidth: 1100 * scale,
              }}
            >
              {caption}
            </span>
          </MaskedLine>
        ) : null}
      </Center>
    </SceneShell>
  );
};

/* ---------------- the frame around it ---------------- */

/**
 * Browser chrome, or a phone.
 *
 * Deliberately generic. Drawing a recognisable Chrome or iPhone would be using somebody
 * else's design as part of ours, and the whole point of this codebase is that everything
 * in it is ours to ship.
 */
const Device = ({
  kind,
  palette,
  scale,
  domain,
  children,
}: {
  kind: DeviceKind;
  palette: Palette;
  scale: number;
  domain?: string;
  children: React.ReactNode;
}) => {
  const chrome = mix(palette.bg, palette.text, 0.07);
  const edge = mix(palette.bg, palette.text, 0.16);
  const barHeight = kind === 'phone' ? 0 : 46 * scale;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: (kind === 'phone' ? 38 : 16) * scale,
        border: `${1.5 * scale}px solid ${edge}`,
        backgroundColor: chrome,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        // One long, soft shadow rather than a stack of them: it lifts the window off the
        // background without the grey halo that several shadows produce on a dark scene.
        // A window needs a shadow on any background; it is just far softer on paper.
        boxShadow: onDark(palette.bg)
          ? `0 ${40 * scale}px ${90 * scale}px rgba(0,0,0,0.5)`
          : `0 ${22 * scale}px ${50 * scale}px rgba(16,20,40,0.14)`,
      }}
    >
      {kind === 'browser' ? (
        <div
          style={{
            height: barHeight,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10 * scale,
            padding: `0 ${16 * scale}px`,
            borderBottom: `${1 * scale}px solid ${edge}`,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 10 * scale,
                height: 10 * scale,
                borderRadius: 999,
                backgroundColor: mix(chrome, palette.text, 0.22),
              }}
            />
          ))}
          <span
            style={{
              flex: 1,
              marginLeft: 12 * scale,
              height: 24 * scale,
              borderRadius: 999,
              backgroundColor: mix(chrome, palette.bg, 0.6),
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 14 * scale,
              fontFamily: FONT,
              fontSize: 13 * scale,
              color: palette.muted,
              letterSpacing: 0.3 * scale,
              overflow: 'hidden',
              whiteSpace: 'nowrap',
            }}
          >
            {domain ?? ''}
          </span>
        </div>
      ) : (
        // A phone gets a status strip rather than a notch: a notch is a specific
        // manufacturer's shape, and this frame should not look like anyone's hardware.
        <div
          style={{
            height: 34 * scale,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span
            style={{
              width: 86 * scale,
              height: 6 * scale,
              borderRadius: 999,
              backgroundColor: mix(chrome, palette.text, 0.2),
            }}
          />
        </div>
      )}

      {/* The window. Content moves inside it, and the clip is what makes that reading
          as scrolling rather than as the whole screen sliding. */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: palette.bg,
        }}
      >
        {children}
      </div>
    </div>
  );
};

/* ---------------- what is inside it ---------------- */

type SurfaceProps = {
  kind: SurfaceKind;
  /**
   * Whether this is running on a phone.
   *
   * Phones do not have sidebars. Drawing a desktop nav rail inside a phone frame is
   * exactly the kind of detail that makes a mockup read as fake — a viewer who has
   * never thought about interface conventions still knows instantly that their phone
   * does not look like that.
   */
  phone: boolean;
  palette: Palette;
  scale: number;
  labels: string[];
  /** Frame the interface starts filling in. */
  start: number;
  /** Frames between one thing happening and the next. */
  beat: number;
  width: number;
  height: number;
  /**
   * How far the content has drifted inside the window, in pixels.
   *
   * The cheapest thing in the engine that makes a mockup read as software being used
   * rather than as a screenshot: a static interface is a picture however well it is
   * staged, and the same interface moving a little is a recording.
   */
  scroll: number;
};

const Surface = (props: SurfaceProps) => {
  switch (props.kind) {
    case 'list':
      return <ListSurface {...props} />;
    case 'chat':
      return <ChatSurface {...props} />;
    case 'editor':
      return <EditorSurface {...props} />;
    case 'dashboard':
    default:
      return <DashboardSurface {...props} />;
  }
};

/** Sidebar, metric tiles, a chart block: the shape most B2B software actually has. */
const DashboardSurface = ({ palette, scale, labels, start, beat, width, phone, scroll }: SurfaceProps) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {!phone && (
        <Rail palette={palette} scale={scale} labels={labels} start={start} beat={beat * 0.4} width={width * 0.2} />
      )}

      {/* The rail stays put and the panel moves, which is how real software behaves —
          scrolling the navigation with the content is the giveaway of a fake. */}
      <div
        style={{
          flex: 1,
          padding: 22 * scale,
          display: 'flex',
          flexDirection: 'column',
          gap: 16 * scale,
          transform: `translateY(${scroll}px)`,
        }}
      >
        <Skeleton palette={palette} scale={scale} width="42%" height={16} delay={start} />

        {/* Tiles stack on a phone. Three across a narrow screen is a row of slivers. */}
        <div style={{ display: 'flex', flexDirection: phone ? 'column' : 'row', gap: 14 * scale }}>
          {[0, 1, 2].map((i) => (
            <Tile
              key={i}
              palette={palette}
              scale={scale}
              delay={start + beat * (0.5 + i * 0.35)}
              highlight={i === 1}
            />
          ))}
        </div>

        {/* A chart block, because every dashboard has one and its absence is noticed. */}
        <Panel palette={palette} scale={scale} delay={start + beat * 1.8} style={{ flex: 1 }}>
          <MiniBars palette={palette} scale={scale} delay={start + beat * 2.1} />
        </Panel>
      </div>

      <Cursor
        palette={palette}
        scale={scale}
        frame={frame}
        path={[
          { at: start + beat * 0.6, x: 0.8, y: 0.85 },
          { at: start + beat * 2.4, x: 0.52, y: 0.4 },
          { at: start + beat * 3.4, x: 0.42, y: 0.34, click: true },
        ]}
      />
    </div>
  );
};

/** Rows arriving one at a time, and a toggle that flips. Inboxes, tasks, tables. */
const ListSurface = ({ palette, scale, labels, start, beat, width, height, phone, scroll }: SurfaceProps) => {
  const frame = useCurrentFrame();
  /*
   * Enough rows to reach the bottom of the screen.
   *
   * A fixed count left a phone three-quarters empty, which reads as a list that failed
   * to load rather than as an inbox. Measuring the space and filling it is the only
   * version that works on a short browser window and a tall phone without two sets of
   * numbers. Capped, because past about a dozen the rows are too small to be anything.
   */
  /*
   * A phone row is a thumb, not a mouse pointer.
   *
   * Filling a tall screen by adding more desktop-sized rows was the wrong fix: a real
   * phone inbox shows about a dozen rows, each one a chunky touch target taking roughly
   * a twelfth of the screen. Adding rows made it look like a spreadsheet on a phone,
   * which is a stranger thing to see than an empty list.
   */
  const available = height - 90 * scale;
  const pitch = phone ? available / 11 : 50 * scale;
  const rows = Math.min(Math.max(Math.round(available / pitch), labels.length, 5), 13);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {!phone && (
        <Rail palette={palette} scale={scale} labels={labels} start={start} beat={beat * 0.4} width={width * 0.18} />
      )}

      <div
        style={{
          flex: 1,
          padding: 20 * scale,
          display: 'flex',
          flexDirection: 'column',
          gap: 10 * scale,
          transform: `translateY(${scroll}px)`,
        }}
      >
        <Skeleton palette={palette} scale={scale} width="34%" height={16} delay={start} />

        {Array.from({ length: rows }, (_, i) => (
          <Row
            key={i}
            palette={palette}
            scale={scale}
            delay={start + beat * (0.4 + i * (rows > 7 ? 0.22 : 0.45))}
            minHeight={phone ? pitch - 10 * scale : undefined}
            label={labels[i]}
            // One row has a toggle, and it flips once. One thing happening at a time is
            // what makes a mockup read as software rather than as a screensaver.
            toggle={i === 1}
            toggleAt={start + beat * 3.6}
          />
        ))}
      </div>

      <Cursor
        palette={palette}
        scale={scale}
        frame={frame}
        path={[
          { at: start + beat * 1.5, x: 0.85, y: 0.9 },
          { at: start + beat * 3.4, x: 0.93, y: 0.3 },
          { at: start + beat * 3.7, x: 0.93, y: 0.3, click: true },
        ]}
      />
    </div>
  );
};

/**
 * Messages alternating. Support tools, assistants, anything conversational.
 *
 * Two things were wrong with this and both showed up the moment it was photographed.
 *
 * The composer rode the scroll, so as the conversation moved the input slid out through
 * the bottom of the window and the chat ended with no way to type into it. A composer is
 * the one part of a chat that never moves; that is what makes it a composer.
 *
 * And four messages in a window this tall left the upper two thirds blank, which does
 * not read as a quiet conversation — it reads as a product with nothing in it. Six, with
 * the earliest already in place when the scene opens, says this has been going a while.
 */
const ChatSurface = ({ palette, scale, start, beat, scroll }: SurfaceProps) => (
  <div
    style={{
      width: '100%',
      height: '100%',
      padding: 22 * scale,
      display: 'flex',
      flexDirection: 'column',
      gap: 12 * scale,
    }}
  >
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        gap: 12 * scale,
        /*
         * A conversation grows upward as it fills.
         *
         * Upward, not downward: new messages arrive at the bottom and push the older
         * ones off the top. It was moving the whole thread down the screen, which is the
         * one direction a chat never goes.
         */
        transform: `translateY(${-Math.abs(scroll) * 0.4}px)`,
      }}
    >
      {/*
        Line counts, not just widths.

        Every bubble used to be two bars tall, so in a window this wide each one came out
        eleven times wider than it was high — a stack of coloured dashes rather than a
        conversation. Messages are different lengths, and that difference is most of what
        makes a thread look like one.
      */}
      {[
        { mine: false, w: '46%', lines: 2 },
        { mine: true, w: '34%', lines: 1 },
        { mine: false, w: '52%', lines: 3 },
        { mine: true, w: '30%', lines: 1 },
        { mine: false, w: '48%', lines: 2 },
        { mine: true, w: '38%', lines: 2 },
        { mine: false, w: '50%', lines: 3 },
        { mine: true, w: '32%', lines: 1 },
      ].map((bubble, i) => (
        <Bubble
          key={i}
          palette={palette}
          scale={scale}
          mine={bubble.mine}
          width={bubble.w}
          lines={bubble.lines}
          // The first two are already there when the scene opens. A conversation that
          // begins from nothing at the moment you look at it is a demo, not a product.
          delay={start + beat * Math.max(i - 1, 0) * 0.8}
        />
      ))}
    </div>

    {/* The composer, waiting. An empty input is what tells you it is a conversation and
        not a transcript. It sits outside the scrolling thread, because it does not move. */}
    <div
      style={{
        flexShrink: 0,
        height: 40 * scale,
        borderRadius: 12 * scale,
        border: `${1.5 * scale}px solid ${mix(palette.bg, palette.text, 0.14)}`,
      }}
    />
  </div>
);

/** A document filling in. Writing and editing tools. */
const EditorSurface = ({ palette, scale, start, beat, scroll }: SurfaceProps) => {
  const frame = useCurrentFrame();
  const lines = ['72%', '88%', '64%', '91%', '48%', '80%', '38%'];

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        padding: 30 * scale,
        display: 'flex',
        flexDirection: 'column',
        gap: 13 * scale,
        transform: `translateY(${scroll}px)`,
      }}
    >
      <Skeleton palette={palette} scale={scale} width="52%" height={22} delay={start} />
      <div style={{ height: 8 * scale }} />
      {lines.map((w, i) => (
        <Skeleton
          key={i}
          palette={palette}
          scale={scale}
          width={w}
          height={10}
          delay={start + beat * (0.4 + i * 0.35)}
          // Text fills in left to right, the way it is written.
          grow
        />
      ))}

      {/* A caret blinking at the end of the last line that has arrived. */}
      <Caret palette={palette} scale={scale} frame={frame} start={start} />
    </div>
  );
};

/* ---------------- interface parts ---------------- */

const Rail = ({
  palette,
  scale,
  labels,
  start,
  beat,
  width,
}: {
  palette: Palette;
  scale: number;
  labels: string[];
  start: number;
  beat: number;
  width: number;
}) => (
  <div
    style={{
      width,
      flexShrink: 0,
      borderRight: `${1 * scale}px solid ${mix(palette.bg, palette.text, 0.1)}`,
      padding: 16 * scale,
      display: 'flex',
      flexDirection: 'column',
      gap: 11 * scale,
    }}
  >
    {/* A mark where a logo goes, in the brand colour. */}
    <div
      style={{
        width: 22 * scale,
        height: 22 * scale,
        borderRadius: 7 * scale,
        backgroundColor: palette.accent,
        marginBottom: 8 * scale,
      }}
    />
    {Array.from({ length: 5 }, (_, i) => (
      <NavItem
        key={i}
        palette={palette}
        scale={scale}
        label={labels[i]}
        active={i === 0}
        delay={start + beat * i}
      />
    ))}
  </div>
);

const NavItem = ({
  palette,
  scale,
  label,
  active,
  delay,
}: {
  palette: Palette;
  scale: number;
  label?: string;
  active: boolean;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const show = reveal(frame - delay);
  if (show <= 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8 * scale,
        padding: `${6 * scale}px ${8 * scale}px`,
        margin: `0 ${-8 * scale}px`,
        borderRadius: 7 * scale,
        backgroundColor: active ? `${palette.accent}22` : 'transparent',
        opacity: show,
        transform: `translateX(${(1 - show) * -10 * scale}px)`,
      }}
    >
      <span
        style={{
          width: 11 * scale,
          height: 11 * scale,
          borderRadius: 3 * scale,
          backgroundColor: active ? palette.accent : mix(palette.bg, palette.text, 0.3),
          flexShrink: 0,
        }}
      />
      {label ? (
        <span
          style={{
            fontFamily: FONT,
            fontSize: 12 * scale,
            color: active ? palette.text : palette.muted,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {label}
        </span>
      ) : (
        <Bar palette={palette} scale={scale} width={54 * scale} height={7} tone={active ? 0.45 : 0.22} />
      )}
    </div>
  );
};

const Tile = ({
  palette,
  scale,
  delay,
  highlight,
}: {
  palette: Palette;
  scale: number;
  delay: number;
  highlight?: boolean;
}) => {
  const frame = useCurrentFrame();
  const show = reveal(frame - delay);
  if (show <= 0) return null;

  // The one number that moves. Everything else on a dashboard is context for it.
  const counted = interpolate(frame - delay, [8, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutExpo,
  });

  return (
    <div
      style={{
        flex: 1,
        borderRadius: 10 * scale,
        border: `${1 * scale}px solid ${mix(palette.bg, palette.text, 0.12)}`,
        backgroundColor: highlight ? `${palette.accent}14` : mix(palette.bg, palette.text, 0.03),
        padding: 12 * scale,
        display: 'flex',
        flexDirection: 'column',
        gap: 9 * scale,
        opacity: show,
        transform: `translateY(${(1 - show) * 14 * scale}px)`,
      }}
    >
      <Bar palette={palette} scale={scale} width={40 * scale} height={6} tone={0.22} />
      <span
        style={{
          fontFamily: FONT,
          fontSize: 26 * scale,
          fontWeight: 700,
          color: highlight ? palette.accent : palette.text,
          fontVariantNumeric: 'tabular-nums',
          lineHeight: 1,
        }}
      >
        {Math.round(counted * (highlight ? 94 : 38))}
        <span style={{ fontSize: 15 * scale, opacity: 0.6 }}>%</span>
      </span>
    </div>
  );
};

const Panel = ({
  palette,
  scale,
  delay,
  style,
  children,
}: {
  palette: Palette;
  scale: number;
  delay: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}) => {
  const frame = useCurrentFrame();
  const show = reveal(frame - delay);
  if (show <= 0) return null;

  return (
    <div
      style={{
        borderRadius: 10 * scale,
        border: `${1 * scale}px solid ${mix(palette.bg, palette.text, 0.12)}`,
        backgroundColor: mix(palette.bg, palette.text, 0.03),
        padding: 14 * scale,
        opacity: show,
        transform: `translateY(${(1 - show) * 16 * scale}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** The little chart inside the dashboard panel. Grows from the baseline. */
const MiniBars = ({ palette, scale, delay }: { palette: Palette; scale: number; delay: number }) => {
  const frame = useCurrentFrame();
  const heights = [0.35, 0.52, 0.44, 0.7, 0.62, 0.88, 0.76];

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 7 * scale, height: '100%' }}>
      {heights.map((h, i) => {
        const grow = interpolate(frame - delay - i * 2.2, [0, 18], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.easeOutExpo,
        });
        return (
          <span
            key={i}
            style={{
              flex: 1,
              height: `${h * grow * 100}%`,
              borderRadius: 3 * scale,
              backgroundColor: i === heights.length - 2 ? palette.accent : `${palette.accent}4D`,
            }}
          />
        );
      })}
    </div>
  );
};

const Row = ({
  palette,
  scale,
  delay,
  label,
  toggle,
  toggleAt,
  minHeight,
}: {
  palette: Palette;
  scale: number;
  delay: number;
  label?: string;
  toggle?: boolean;
  toggleAt: number;
  /** Forced row height, so a phone list fills its screen with real touch targets. */
  minHeight?: number;
}) => {
  const frame = useCurrentFrame();
  const show = reveal(frame - delay);
  if (show <= 0) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12 * scale,
        padding: `${10 * scale}px ${12 * scale}px`,
        minHeight,
        borderRadius: 9 * scale,
        backgroundColor: mix(palette.bg, palette.text, 0.04),
        opacity: show,
        transform: `translateY(${(1 - show) * 12 * scale}px)`,
      }}
    >
      <span
        style={{
          width: 20 * scale,
          height: 20 * scale,
          borderRadius: 999,
          backgroundColor: `${palette.accent}3D`,
          flexShrink: 0,
        }}
      />
      {label ? (
        <span
          style={{
            flex: 1,
            fontFamily: FONT,
            fontSize: 13 * scale,
            color: palette.text,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
          }}
        >
          {label}
        </span>
      ) : (
        <span style={{ flex: 1 }}>
          <Bar palette={palette} scale={scale} width="58%" height={8} tone={0.24} />
        </span>
      )}
      {toggle ? <Toggle palette={palette} scale={scale} at={toggleAt} /> : (
        <Bar palette={palette} scale={scale} width={34 * scale} height={8} tone={0.16} />
      )}
    </div>
  );
};

/** A switch that flips once, and springs as it lands. */
const Toggle = ({ palette, scale, at }: { palette: Palette; scale: number; at: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const flip = spring({ frame: frame - at, fps, config: 'snappy' });
  const w = 36 * scale;
  const h = 20 * scale;
  const knob = h - 5 * scale;

  return (
    <span
      style={{
        width: w,
        height: h,
        borderRadius: 999,
        flexShrink: 0,
        position: 'relative',
        backgroundColor: blend(mix(palette.bg, palette.text, 0.18), palette.accent, flip),
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2.5 * scale,
          left: 2.5 * scale + flip * (w - knob - 5 * scale),
          width: knob,
          height: knob,
          borderRadius: 999,
          backgroundColor: '#fff',
        }}
      />
    </span>
  );
};

const Bubble = ({
  palette,
  scale,
  mine,
  width,
  lines = 2,
  delay,
}: {
  palette: Palette;
  scale: number;
  mine: boolean;
  width: string;
  /** How many lines of text this message is. */
  lines?: number;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const show = reveal(frame - delay);
  if (show <= 0) return null;

  const rise = spring({ frame: frame - delay, fps, config: 'snappy' });

  // The last line of a message is short, the way the last line of a paragraph is.
  const widths = Array.from({ length: lines }, (_, i) =>
    i === lines - 1 ? (lines === 1 ? '78%' : '58%') : '94%',
  );

  return (
    <div
      style={{
        alignSelf: mine ? 'flex-end' : 'flex-start',
        width,
        /*
         * A ceiling in pixels as well as a share of the width.
         *
         * A percentage alone is fine in a phone frame and absurd in a browser one: half
         * of fifteen hundred pixels is a bubble three times wider than any real message,
         * and six of them stack into a bar chart. Real chat interfaces cap their bubbles
         * for exactly this reason.
         */
        maxWidth: 300 * scale,
        padding: `${13 * scale}px ${15 * scale}px`,
        borderRadius: 14 * scale,
        // The corner nearest the speaker is squared off, which is the convention that
        // tells you at a glance who said what.
        borderBottomRightRadius: mine ? 4 * scale : 14 * scale,
        borderBottomLeftRadius: mine ? 14 * scale : 4 * scale,
        // A received message needs to read as a surface, not as text on the page. Eight
        // percent of the text colour on a white window is almost nothing, so the thread
        // came out as grey dashes floating in space.
        backgroundColor: mine ? palette.accent : mix(palette.bg, palette.text, 0.07),
        opacity: show,
        transform: `translateY(${(1 - rise) * 14 * scale}px)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 7 * scale,
      }}
    >
      {widths.map((w, i) => (
        <Bar
          key={i}
          palette={palette}
          scale={scale}
          width={w}
          height={8}
          tone={mine ? 0.9 : 0.34}
          on={mine ? palette.bg : undefined}
        />
      ))}
    </div>
  );
};

const Caret = ({
  palette,
  scale,
  frame,
  start,
}: {
  palette: Palette;
  scale: number;
  frame: number;
  start: number;
}) => {
  if (frame < start) return null;
  // Half a second on, half a second off, which is roughly what a real one does.
  const blink = Math.floor((frame - start) / 15) % 2 === 0;
  return (
    <span
      style={{
        width: 2 * scale,
        height: 15 * scale,
        backgroundColor: palette.accent,
        opacity: blink ? 1 : 0,
        marginTop: -6 * scale,
      }}
    />
  );
};

/* ---------------- the cursor ---------------- */

type Waypoint = { at: number; x: number; y: number; click?: boolean };

/**
 * A pointer that travels and clicks.
 *
 * The single highest-value detail in the whole scene. A picture of an interface is a
 * claim about what the product looks like; an interface with something moving through it
 * is a claim about somebody using it, and the second is far more persuasive for almost
 * no extra work.
 *
 * It eases between waypoints rather than moving linearly, because a hand on a trackpad
 * accelerates and settles, and a cursor travelling at constant speed is the clearest
 * possible sign that nobody is holding it.
 */
const Cursor = ({
  palette,
  scale,
  frame,
  path,
}: {
  palette: Palette;
  scale: number;
  frame: number;
  path: Waypoint[];
}) => {
  const first = path[0];
  if (frame < first.at) return null;

  let from = first;
  let to = first;
  for (let i = 0; i < path.length - 1; i++) {
    if (frame >= path[i].at) {
      from = path[i];
      to = path[i + 1];
    }
  }

  const span = Math.max(to.at - from.at, 1);
  const t = Easing.easeInOutCubic(Math.min(Math.max((frame - from.at) / span, 0), 1));
  const x = from.x + (to.x - from.x) * t;
  const y = from.y + (to.y - from.y) * t;

  // The click ring: expands and fades, once, at the waypoint that asked for it.
  const clicked = path.find((p) => p.click);
  const sinceClick = clicked ? frame - clicked.at : -1;
  const ring = sinceClick >= 0 && sinceClick < 18 ? sinceClick / 18 : -1;
  // The pointer dips as it presses, the way a finger does.
  const press = ring >= 0 ? 1 - Math.sin(Math.min(ring * 3, 1) * Math.PI) * 0.16 : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        pointerEvents: 'none',
        transform: `scale(${press})`,
        transformOrigin: 'top left',
      }}
    >
      {ring >= 0 ? (
        <span
          style={{
            position: 'absolute',
            left: -18 * scale,
            top: -18 * scale,
            width: 36 * scale,
            height: 36 * scale,
            borderRadius: 999,
            border: `${2 * scale}px solid ${palette.accent}`,
            opacity: (1 - ring) * 0.8,
            transform: `scale(${0.4 + ring * 1.1})`,
          }}
        />
      ) : null}

      {/* Drawn rather than an emoji or an image: it has to be our shape, in our colours,
          at any resolution. */}
      <svg width={22 * scale} height={26 * scale} viewBox="0 0 22 26" style={{ display: 'block' }}>
        <path
          d="M1 1 L1 19 L6 14.5 L9.2 22.5 L12.8 21 L9.7 13.3 L16.5 13 Z"
          fill="#fff"
          stroke="rgba(0,0,0,0.45)"
          strokeWidth={1}
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/* ---------------- small pieces ---------------- */

/** A bar of colour standing in for a line of text. */
const Bar = ({
  palette,
  scale,
  width,
  height,
  tone,
  on,
}: {
  palette: Palette;
  scale: number;
  width: number | string;
  height: number;
  tone: number;
  on?: string;
}) => (
  <span
    style={{
      display: 'block',
      width: typeof width === 'number' ? width : width,
      height: height * scale,
      borderRadius: 999,
      backgroundColor: on ? withAlpha(on, tone) : mix(palette.bg, palette.text, tone),
    }}
  />
);

/** A bar that also arrives. */
const Skeleton = ({
  palette,
  scale,
  width,
  height,
  delay,
  grow,
}: {
  palette: Palette;
  scale: number;
  width: string;
  height: number;
  delay: number;
  grow?: boolean;
}) => {
  const frame = useCurrentFrame();
  const show = reveal(frame - delay);
  if (show <= 0) return null;

  return (
    <span
      style={{
        display: 'block',
        width: grow ? `calc(${width} * ${show})` : width,
        height: height * scale,
        borderRadius: 999,
        backgroundColor: mix(palette.bg, palette.text, 0.16),
        opacity: grow ? 1 : show,
      }}
    />
  );
};

/** The standard arrival for anything inside the interface. Short, and never bouncy. */
const reveal = (local: number): number =>
  interpolate(local, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.easeOutQuart,
  });

/* ---------------- colour helpers ---------------- */

/**
 * Mix two colours.
 *
 * Interface greys are built from the brand's own background and text rather than picked,
 * so a mockup on a near-white brand and one on a near-black brand are both correct
 * without a second set of values — and neither can drift away from the palette.
 */
const mix = (a: string, b: string, amount: number): string => {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const at = Math.min(Math.max(amount, 0), 1);
  return `rgb(${Math.round(ar + (br - ar) * at)}, ${Math.round(ag + (bg - ag) * at)}, ${Math.round(ab + (bb - ab) * at)})`;
};

const blend = mix;

const withAlpha = (color: string, alpha: number): string => {
  const [r, g, b] = rgb(color);
  return `rgba(${r}, ${g}, ${b}, ${Math.min(Math.max(alpha, 0), 1)})`;
};

const rgb = (color: string): [number, number, number] => {
  const value = color.trim();
  if (value.startsWith('#')) {
    let hex = value.slice(1);
    if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }
  const match = value.match(/-?\d+(\.\d+)?/g);
  if (match) return [Number(match[0]), Number(match[1]), Number(match[2])];
  return [0, 0, 0];
};
