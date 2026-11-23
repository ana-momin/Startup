/**
 * The scene library — our motion design system.
 *
 * Each scene is a professionally-timed piece of motion design, and each reads the
 * current tone for its type scale, weight, alignment and how the motion behaves. The
 * AI picks which scenes and writes the words; the craft is already baked in here.
 *
 * This library is the part a competitor cannot copy by calling the same model.
 */

export { TitleScene } from './TitleScene';
export { BigWordScene } from './BigWordScene';
export { FeatureScene } from './FeatureScene';
/*
 * StepsScene has been deleted.
 *
 * It drew a numbered version of the same picture FeatureScene drew, so every layout
 * improvement had to be made twice and drifted apart whenever it wasn't. Order is a
 * property of the content, not a reason for a second component — the arrangement chooser
 * reads it and picks a numbered layout.
 */
export { StatScene } from './StatScene';
export { QuoteScene } from './QuoteScene';
export { LogoScene } from './LogoScene';
export { ProductScene } from './ProductScene';
export { ChartScene } from './ChartScene';
export { OutroScene } from './OutroScene';
export { Watermark, LogoMark } from './Watermark';

export {
  Backdrop,
  WordReveal,
  FadeUp,
  Badge,
  Rule,
  ToneProvider,
  useTone,
  useScale,
  useSceneOpacity,
  FONT,
} from './shared';
