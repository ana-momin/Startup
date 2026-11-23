import { mixHex, palette } from "./color.js";

export const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STOP = new Set(["your", "the", "a", "an", "in", "of", "for", "to", "and", "with", "on", "it", "from", "that", "this", "one"]);

export function words(text) {
  return String(text)
    .replace(/[.?!]+$/g, "")
    .replace(/[^a-zA-Z0-9'’+-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Words stay in their final places. Later words never push earlier ones. */
export function hookLines(problem) {
  const all = words(problem).slice(0, 12);
  const lines = all.length <= 5 ? [all] : [all.slice(0, Math.ceil(all.length / 2)), all.slice(Math.ceil(all.length / 2))];
  let t = 0.22;
  return lines.map((line, li) => {
    if (li) t += 0.18;
    return line.map((text) => {
      const at = +t.toFixed(2);
      t += 0.28;
      return { text, at };
    });
  });
}

export function lastAt(lines) {
  const flat = lines.flat();
  return flat.length ? flat[flat.length - 1].at : 0.22;
}

export function lineHtml(line, tone = "ink") {
  return line.map((w) => `<span data-at="${w.at}" data-tone="${tone}">${esc(w.text)}</span>`).join("");
}

export function shortLabel(feature) {
  const raw = words(feature);
  const kept = raw.filter((w) => !STOP.has(w.toLowerCase()));
  const picked = (kept.length ? kept : raw).slice(0, 2);
  const text = (picked.join(" ").length > 18 ? picked[0] : picked.join(" ")) || feature;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function initials(text) {
  const raw = words(text).filter((w) => !STOP.has(w.toLowerCase()));
  const parts = (raw.length ? raw : words(text)).slice(0, 2);
  const out = parts.map((w) => w[0]?.toUpperCase() ?? "").join("");
  return out || "•";
}

/** Shared facts every template draws from. Timing belongs to the template. */
export function base(brief) {
  const colors = palette(brief.accent);
  const hook = hookLines(brief.problem);
  return {
    ...colors,
    hookBot: mixHex(colors.accent, "#061018", 0.28),
    accentMid: mixHex(colors.accent, "#FFFFFF", 0.35),
    name: brief.name,
    problem: brief.problem,
    features: brief.features,
    hostname: brief.hostname,
    logo: brief.logo || null,
    sample: brief.sample !== false,
    hook,
    hookSize: Math.max(...hook.map((line) => line.length)) > 5 ? 64 : 80,
    nameSize: brief.name.length > 16 ? 88 : brief.name.length > 10 ? 120 : brief.name.length > 7 ? 168 : 220,
  };
}

export function cue(t, sfx, extra = {}) {
  return { t: +Number(t).toFixed(2), sfx, ...extra };
}
