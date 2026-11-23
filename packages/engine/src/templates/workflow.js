import { base, cue, esc, initials, lastAt, lineHtml } from "../copy.js";
import { endScene, page } from "../shell.js";

/**
 * Distilled from the Pond workflow scenes: a stair of real cards,
 * then a node map you can read, held still once it is complete.
 * Lines are flat. Nothing is tilted.
 */
export function workflowFilm(brief, opts = {}) {
  const plan = base(brief);
  const last = lastAt(plan.hook);
  const stair = Math.max(3.4, +(last + 0.85).toFixed(2));
  const shift = stair - 3.4;
  const map = +(12.2 + shift).toFixed(2);
  const cta = +(27.6 + shift).toFixed(2);
  const end = +(cta + 4.3).toFixed(2);
  const slide = 0.72;

  const hook = plan.hook.map((line) => `<div class="line" style="font-size:${plan.hookSize}px">${lineHtml(line, "ink")}</div>`).join("");
  const stairItems = plan.features.map((title) => ({ title, k: "Live" }));
  const stairs = stairItems
    .map(
      (item, i) => `<article class="stair" data-at="${(stair + 0.4 + i * 0.7).toFixed(2)}" style="margin-left:${i * 56}px">
        <i>${esc(initials(item.title))}</i>
        <div><small>${["9:14", "9:41", "10:06", "10:28"][i] || "11:02"} · ${esc(item.k)}</small><b>${esc(item.title)}</b></div>
        <em>On</em>
      </article>`,
    )
    .join("");

  const nodes = [
    { title: "The snag", sub: plan.problem },
    ...plan.features.map((title) => ({ title, sub: "In progress" })),
    { title: "Go live", sub: plan.hostname },
  ];
  const slots = [
    [70, 150], [670, 150], [1270, 150],
    [70, 520], [670, 520], [1270, 520],
  ].slice(0, nodes.length);
  const nodeHtml = nodes
    .map(
      (n, i) => `<div class="node" data-at="${(map + 0.25 + i * 0.32).toFixed(2)}" style="left:${slots[i][0]}px;top:${slots[i][1]}px">
        <i>${esc(initials(n.title))}</i><b>${esc(n.title)}</b><small>${esc(n.sub)}</small><p>${esc(["Opened at 9:02", "Mail from Maya Chen", "Matched to last week's voice", "Waiting on a yes", "Three runs written down", "Thursday, 2:00"][i] || "Ready")}</p>
        <u style="width:${[30, 55, 40, 70, 48, 90][i] || 50}%"></u>
      </div>`,
    )
    .join("");

  const css = `
.note{width:860px;background:#fff;border-radius:28px;box-shadow:0 0 0 1px ${plan.line},0 24px 60px rgba(13,18,34,.06);padding:42px 48px}
.note small{color:${plan.muted};font-size:16px}
.stairs{display:flex;flex-direction:column;gap:18px;width:1080px}
.stair{height:108px;background:#fff;border-radius:20px;box-shadow:0 0 0 1px ${plan.line},0 12px 30px rgba(13,18,34,.05);display:flex;align-items:center;gap:16px;padding:0 22px;opacity:0}
.stair{height:128px}
.stair i{width:48px;height:48px;border-radius:14px;background:${plan.accentSoft};color:${plan.accent};display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:560;flex:none}
.stair div{display:flex;flex-direction:column;gap:4px;min-width:0}
.stair small{color:${plan.accent};font-size:13px;font-weight:560}
.stair b{font-size:22px;font-weight:560;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px}
.stair em{margin-left:auto;font-style:normal;background:${plan.accent};color:${plan.onAccent};border-radius:99px;padding:6px 12px;font-size:13px;font-weight:560}
.panel{position:absolute;left:60px;top:70px;width:1800px;height:940px;background:#fff;border-radius:32px;box-shadow:0 0 0 1px ${plan.line},0 30px 80px rgba(13,18,34,.08)}
#traveler{position:absolute;width:16px;height:16px;border-radius:99px;background:${plan.accent};z-index:3}
.node{position:absolute;width:500px;height:200px;background:#fff;border-radius:22px;box-shadow:0 16px 40px rgba(13,18,34,.08);padding:20px;display:flex;flex-direction:column;gap:8px;opacity:0}
.node u{display:block;height:6px;border-radius:99px;background:${plan.accent};margin-top:auto;text-decoration:none}
.node i{width:32px;height:32px;border-radius:10px;background:${plan.accentSoft};color:${plan.accent};display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:560;font-size:12px}
.node b{font-size:22px;font-weight:560;letter-spacing:-.03em;line-height:1.2}
.node p{font-size:15px;color:${plan.muted};line-height:1.35}
.node small{color:${plan.muted};font-size:13px}
.mapTitle{position:absolute;top:28px;left:0;right:0;text-align:center;font-size:42px;font-weight:560;letter-spacing:-.05em;opacity:0}
`;

  const body = `
<section class="scene" style="top:0;background:${plan.bg}"><div class="mid"><div class="note"><small>The snag</small><div class="stack" style="margin-top:18px">${hook}</div></div></div></section>
<section class="scene" style="top:1080px;background:${plan.bg}"><div class="mid"><div class="stairs">${stairs}</div></div></section>
<section class="scene" style="top:2160px;background:${plan.bg}">
  <div class="panel">
    <div class="mapTitle" data-at="${(map + 0.12).toFixed(2)}" data-tone="ink">How ${esc(plan.name)} runs</div>
    <i id="traveler"></i>${nodeHtml}
    <div id="cur" class="cursor" style="color:${plan.accent}"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3 L5 19 L10 15 L14 21 L17 19 L13 13 L19 13 Z" fill="#0D1222"/></svg><i id="ring" class="ring"></i></div>
  </div>
</section>
${endScene(plan, 3240)}`;

  const state = {
    grey: plan.grey,
    ink: plan.ink,
    slide,
    end,
    stops: [0, stair, map, cta].map((t, i) => ({ t, y: i * 1080 })),
    map,
    points: slots.map(([x, y]) => [x + 430, y + 158]),
    logo: plan.logo,
  };
  const extra = `
function extra(t) {
  document.querySelectorAll(".stair,.node").forEach((el) => {
    el.style.opacity = String(eo(seg(t, +el.dataset.at, +el.dataset.at + 0.35)));
  });
  const pts = STATE.points;
  const travel = q5(seg(t, STATE.map + 1.3, STATE.map + 4.8));
  const span = Math.max(pts.length - 1, 1);
  const f = travel * span;
  const i = Math.min(span - 1, Math.floor(f));
  const local = f - i;
  const x = lerp(pts[i][0], pts[Math.min(i + 1, pts.length - 1)][0], local);
  const y = lerp(pts[i][1], pts[Math.min(i + 1, pts.length - 1)][1], local);
  $("traveler").style.left = (x - 8) + "px";
  $("traveler").style.top = (y - 8) + "px";
  const aim = pts[pts.length - 1][0];
  const move = q5(seg(t, STATE.map + 5, STATE.map + 5.8));
  $("cur").style.opacity = String(eo(seg(t, STATE.map + 4.3, STATE.map + 4.7)));
  $("cur").style.left = lerp(400, aim - 40, move) + "px";
  $("cur").style.top = lerp(300, 560, move) + "px";
  const click = seg(t, STATE.map + 5.5, STATE.map + 5.9);
  $("ring").style.opacity = String(click > 0 && click < 1 ? 1 - click : 0);
}`;

  const events = [
    cue(plan.hook[0][0].at, "tick", { gain: -8 }),
    plan.hook[1]?.[0] ? cue(plan.hook[1][0].at, "tick", { gain: -10 }) : null,
    cue(stair, "whoosh", { align: "peak", gain: -2 }),
    ...stairItems.map((_, i) => cue(stair + 0.4 + i * 0.7, "click", { gain: -7 })),
    cue(map, "whoosh", { align: "peak", gain: -2 }),
    ...nodes.map((_, i) => cue(map + 0.3 + i * 0.38, "tick", { gain: -10 })),
    cue(map + 1.6, "ui", { gain: -8 }),
    cue(map + 5.55, "click", { gain: -5 }),
    cue(cta, "whoosh", { align: "peak", gain: -1 }),
    cue(cta + 0.25, "chime", { gain: -6 }),
    cue(cta + 0.55, "thud", { gain: -4 }),
  ].filter(Boolean);

  return { html: page({ font: opts.fontUrl, css, body, state, extra, accent: plan.accent }), duration: end, events, hostname: plan.hostname, template: "workflow" };
}
