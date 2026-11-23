import { mixHex, palette } from "./color.js";

const STOP = new Set(["your", "the", "a", "an", "in", "of", "for", "to", "and", "with", "on", "it", "from", "that", "this"]);

function words(text) {
  return String(text)
    .replace(/[.?!]+$/g, "")
    .replace(/[^a-zA-Z0-9'’+-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Two lines, final positions reserved so later words never shove earlier ones. */
function hookLines(problem) {
  const all = words(problem).slice(0, 12);
  const lines = all.length <= 5 ? [all] : [all.slice(0, Math.ceil(all.length / 2)), all.slice(Math.ceil(all.length / 2))];
  let t = 0.2;
  return lines.map((line, li) => {
    if (li) t += 0.16;
    return line.map((text) => {
      const at = t;
      t += 0.3;
      return { text, at };
    });
  });
}

function lastAt(lines) {
  const flat = lines.flat();
  return flat.length ? flat[flat.length - 1].at : 0.2;
}

function shortSwap(feature) {
  const raw = words(feature);
  const kept = raw.filter((w) => !STOP.has(w.toLowerCase()));
  const picked = (kept.length ? kept : raw).slice(0, 2);
  const text = picked.join(" ");
  return text.length > 22 ? picked[0] : text;
}

function timing(lastHook, count) {
  const name = Math.max(3.25, +(lastHook + 0.85).toFixed(2));
  const shift = name - 3.25;
  const ui = +(7.55 + shift).toFixed(2);
  const features = +(16.9 + shift).toFixed(2);
  const per = count === 1 ? 6.2 : count === 2 ? 3.6 : count === 4 ? 2.45 : 2.75;
  const flow = +(features + count * per).toFixed(2);
  const cta = +(flow + 4.7).toFixed(2);
  const end = +(cta + 4.15).toFixed(2);
  return { hook: 0, name, ui, features, per, flow, cta, end, slide: 0.7, count };
}

function events(time, hook, swaps) {
  const ev = [];
  const first = hook[0]?.[0];
  const second = hook[1]?.[0];
  if (first) ev.push({ t: +first.at.toFixed(2), sfx: "tick", gain: -8 });
  if (second) ev.push({ t: +second.at.toFixed(2), sfx: "tick", gain: -10 });
  ev.push({ t: time.name, sfx: "whoosh", align: "peak", gain: -2 });
  ev.push({ t: +(time.name + 0.45).toFixed(2), sfx: "ui", gain: -8 });
  for (const swap of swaps) ev.push({ t: swap.t, sfx: "click", gain: -8 });
  ev.push({ t: time.ui, sfx: "whoosh", align: "peak", gain: -2 });
  ev.push({ t: +(time.ui + 0.75).toFixed(2), sfx: "ui", gain: -6 });
  ev.push({ t: time.features, sfx: "whoosh", align: "peak", gain: -2 });
  for (let i = 0; i < time.count; i++) {
    ev.push({ t: +(time.features + i * time.per + 0.08).toFixed(2), sfx: "click", gain: -8 });
  }
  ev.push({ t: time.flow, sfx: "whoosh", align: "peak", gain: -2 });
  ev.push({ t: +(time.flow + 0.45).toFixed(2), sfx: "tick", gain: -8 });
  ev.push({ t: +(time.flow + 1.15).toFixed(2), sfx: "tick", gain: -8 });
  ev.push({ t: +(time.flow + 1.85).toFixed(2), sfx: "tick", gain: -8 });
  ev.push({ t: time.cta, sfx: "whoosh", align: "peak", gain: -1 });
  ev.push({ t: +(time.cta + 0.25).toFixed(2), sfx: "chime", gain: -6 });
  ev.push({ t: +(time.cta + 0.55).toFixed(2), sfx: "thud", gain: -4 });
  return ev;
}

const KINDS = ["document", "board", "thread", "document"];
const STATES = ["Open", "Draft", "On the board", "Needs a look"];

/**
 * The director. Rules choose the scenes and the words.
 * A model may only shorten copy first (see llm.js). It never writes animation.
 */
export function planFilm(brief) {
  const colors = palette(brief.accent);
  const hook = hookLines(brief.problem);
  const time = timing(lastAt(hook), brief.features.length);
  const swapSource = brief.swapOverride?.length ? brief.swapOverride : brief.features;
  const swaps = swapSource.slice(0, 3).map((feature, i) => ({
    text: shortSwap(feature),
    t: +(time.name + 1.35 + i * 0.85).toFixed(2),
  }));
  const nav = ["Overview", ...brief.features.slice(0, 3).map((f) => shortSwap(f))].slice(0, 4);
  const rows = [
    { title: brief.problem.replace(/[.?!]+$/, ""), meta: "Sample · the problem", state: STATES[0] },
    ...brief.features.slice(0, 3).map((title, i) => ({
      title,
      meta: "Sample",
      state: STATES[i + 1] || "Draft",
    })),
  ].slice(0, 4);
  const cards = brief.features.map((title, i) => ({
    title,
    kind: KINDS[i] || "document",
    detail: i === 0 ? brief.problem : brief.features[i],
  }));
  const flow = [
    { n: "01", title: words(brief.problem).slice(0, 2).join(" "), sub: "The snag" },
    { n: "02", title: brief.name, sub: "The product" },
    { n: "03", title: "Go live", sub: brief.hostname },
  ];
  const stops = [0, time.name, time.ui, time.features, time.flow, time.cta].map((t, i) => ({
    t,
    y: i * 1080,
  }));

  return {
    ...colors,
    hookBot: mixHex(colors.accent, "#061018", 0.28),
    name: brief.name,
    problem: brief.problem,
    hostname: brief.hostname,
    logo: brief.logo || null,
    sample: brief.sample !== false,
    hook,
    hookSize: Math.max(...hook.map((line) => line.length)) > 5 ? 68 : 84,
    nameSize: brief.name.length > 16 ? 92 : brief.name.length > 11 ? 116 : 140,
    kickerAt: +(time.name + 0.2).toFixed(2),
    nameAt: +(time.name + 0.42).toFixed(2),
    leadAt: +(time.name + 0.85).toFixed(2),
    swaps,
    nav,
    rows,
    rowAt: rows.map((_, i) => +(time.ui + 0.7 + i * 0.28).toFixed(2)),
    cards,
    flow,
    time,
    stops,
    events: events(time, hook, swaps),
  };
}

/** Keep model copy only when every word already exists in the brief. No new claims, no digits. */
export function acceptFill(brief, fill) {
  if (!fill || typeof fill !== "object") return null;
  const have = new Set(
    `${brief.problem} ${brief.name} ${brief.features.join(" ")}`
      .toLowerCase()
      .match(/[a-z0-9']+/g) ?? [],
  );
  const okWords = (value, maxWords) => {
    const text = String(value ?? "").replace(/\s+/g, " ").trim();
    if (!text || /\d/.test(text)) return null;
    const list = text.split(" ");
    if (list.length > maxWords) return null;
    if (!list.every((w) => have.has(w.toLowerCase().replace(/[^a-z0-9']/g, "")) || w.length < 3)) return null;
    return text;
  };
  const hook = okWords(fill.hook, 12);
  const swaps = Array.isArray(fill.swaps) ? fill.swaps.map((s) => okWords(s, 4)).filter(Boolean) : [];
  if (!hook && swaps.length < 1) return null;
  return { hook, swaps };
}

export function applyFill(brief, fill) {
  const accepted = acceptFill(brief, fill);
  if (!accepted) return brief;
  const next = { ...brief };
  if (accepted.hook) next.problem = accepted.hook;
  // Swaps only. The full feature lines stay on the cards.
  if (accepted.swaps.length) next.swapOverride = accepted.swaps;
  return next;
}
