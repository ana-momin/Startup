export { screenText } from "./halal.js";
export { readBrief } from "./brief.js";
export { planFilm, acceptFill } from "./direct.js";
export { filmHtml } from "./film.js";
export { SAMPLE_BRIEF } from "./sample.js";

import { readBrief } from "./brief.js";
import { planFilm } from "./direct.js";
import { filmHtml } from "./film.js";
import { withOptionalModel } from "./llm.js";

function finish(brief, opts) {
  const plan = planFilm(brief);
  return {
    ok: true,
    html: filmHtml(plan, opts),
    duration: plan.time.end,
    events: plan.events,
    hostname: plan.hostname,
  };
}

/** Brief in, film HTML out. No network. The director is rules, not a model. */
export function compose(input, opts = {}) {
  const read = readBrief(input);
  if (!read.ok) return read;
  return finish(read.brief, opts);
}

/** Same as compose, but a model may shorten the words first when an API key is set. */
export async function composeWithModel(input, opts = {}) {
  const read = readBrief(input);
  if (!read.ok) return read;
  return finish(await withOptionalModel(read.brief), opts);
}
