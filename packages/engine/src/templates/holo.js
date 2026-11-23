import { base, cue, esc, lastAt, lineHtml } from "../copy.js";
import { endScene, page } from "../shell.js";

/**
 * Light launch, distilled from "Introducing Pond for AI Agents":
 * a gradient pill, a huge one-hue word, a glass prompt, then cards
 * around the name. No tilted cards, no second hue, no invented numbers.
 */
export function holoFilm(brief, opts = {}) {
  const plan = base(brief);
  const last = lastAt(plan.hook);
  const word = Math.max(3.4, +(last + 0.9).toFixed(2));
  const shift = word - 3.4;
  const glass = +(7.6 + shift).toFixed(2);
  const cards = +(12.4 + shift).toFixed(2);
  const cta = +(28.2 + shift).toFixed(2);
  const end = +(cta + 4.15).toFixed(2);
  const slide = 0.7;

  const hook = plan.hook
    .map((line) => `<div class="line" style="font-size:${Math.min(plan.hookSize, 64)}px">${lineHtml(line, "light")}</div>`)
    .join("");
  const spots = [
    [70, 80],
    [1500, 70],
    [80, 760],
    [1490, 730],
  ];
  const cardHtml = plan.features
    .slice(0, 4)
    .map((title, i) => {
      const [x, y] = spots[i];
      const wash = i % 2 === 0;
      return `<article class="hcard${wash ? " wash" : ""}" style="left:${x}px;top:${y}px" data-at="${(cards + 0.3 + i * 0.5).toFixed(2)}">
        <span>Sample</span>
        <h3>${esc(title)}</h3>
        <p>Sample only. Not a result.</p>
        <s></s><s style="width:70%"></s>
        <div class="bars">${[30, 55, 40, 70, 48, 62, 36].map((h) => `<b style="height:${h}%"></b>`).join("")}</div>
        <small>Running · sample</small>
      </article>`;
    })
    .join("");

  const css = `
.pill{padding:28px 48px;border-radius:999px;background:linear-gradient(100deg, ${plan.accentMid}, ${plan.accent} 45%, ${plan.accentDeep});box-shadow:0 20px 60px rgba(13,18,34,.12)}
.giant{font-weight:560;letter-spacing:-.07em;line-height:.9;background:linear-gradient(100deg, ${plan.accentDeep}, ${plan.accent} 40%, ${plan.accentMid});-webkit-background-clip:text;background-clip:text;color:transparent;opacity:0}
.field{background:
  linear-gradient(90deg, ${plan.accentMid} 0%, ${plan.accent} 22%, ${plan.accentDeep} 50%, ${plan.accent} 78%, ${plan.accentMid} 100%)}
.glass{width:920px;height:92px;border-radius:999px;background:rgba(255,255,255,.88);box-shadow:0 16px 50px rgba(13,18,34,.12);display:flex;align-items:center;padding:0 18px 0 32px;gap:16px}
.glass p{flex:1;font-size:28px;font-weight:500;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;opacity:0}
.send{width:64px;height:64px;border-radius:99px;background:#fff;color:${plan.accent};display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 0 0 1px rgba(13,18,34,.06)}
.chip{margin-top:22px;background:#fff;color:${plan.accent};border-radius:99px;padding:8px 14px;font-weight:560;opacity:0}
.hcard{position:absolute;width:340px;background:#fff;border-radius:22px;box-shadow:0 16px 40px rgba(13,18,34,.08);padding:18px 18px 16px;display:flex;flex-direction:column;gap:8px;opacity:0}
.hcard.wash{background:linear-gradient(160deg, ${plan.accent}, ${plan.accentDeep});color:#fff}
.hcard.wash span,.hcard.wash small{color:rgba(255,255,255,.8)}
.hcard.wash s{background:rgba(255,255,255,.35)}
.hcard.wash .bars b{background:rgba(255,255,255,.85)}
.hcard span{color:${plan.accent};font-size:12px;font-weight:560;letter-spacing:.08em;text-transform:uppercase}
.hcard h3{font-size:22px;font-weight:560;letter-spacing:-.04em;line-height:1.15}
.hcard s{height:7px;border-radius:99px;background:#E6E8EE;width:100%}
.bars{display:flex;align-items:flex-end;gap:5px;height:52px;margin-top:8px}
.hcard p{font-size:13px;line-height:1.35;opacity:.8}
.bars b{flex:1;background:${plan.accent};border-radius:3px 3px 1px 1px}
.hcard small{font-size:12px;color:${plan.muted}}
.centerWord{position:absolute;left:0;right:0;top:470px;text-align:center;font-size:92px;font-weight:560;letter-spacing:-.06em;opacity:0}
`;

  const body = `
<section class="scene" style="top:0;background:${plan.bg}"><div class="mid"><div class="pill">${hook}</div></div></section>
<section class="scene" style="top:1080px;background:${plan.bg}"><div class="mid">
  <img class="logo" alt="">
  <div class="giant" data-fade="${(word + 0.2).toFixed(2)}" style="font-size:${plan.nameSize}px">${esc(plan.name)}</div>
</div></section>
<section class="scene field" style="top:2160px"><div class="mid">
  <div class="glass">
    <p data-at="${(glass + 0.3).toFixed(2)}" data-tone="ink">${esc(plan.problem)}</p>
    <div class="send">↑</div>
  </div>
  <div id="chip" class="chip">Sample</div>
  <div id="cur" class="cursor" style="color:#fff"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3 L5 19 L10 15 L14 21 L17 19 L13 13 L19 13 Z" fill="#0D1222"/></svg><i id="ring" class="ring"></i></div>
</div></section>
<section class="scene" style="top:3240px;background:${plan.bg}">
  <div class="centerWord" data-at="${(cards + 0.12).toFixed(2)}" data-tone="ink">${esc(plan.name)}</div>
  ${cardHtml}
</section>
${endScene(plan, 4320)}`;

  const state = {
    grey: plan.grey,
    ink: plan.ink,
    slide,
    end,
    stops: [0, word, glass, cards, cta].map((t, i) => ({ t, y: i * 1080 })),
    glass,
    cards,
    logo: plan.logo,
  };
  const extra = `
function extra(t) {
  document.querySelectorAll(".hcard").forEach((el) => {
    el.style.opacity = String(eo(seg(t, +el.dataset.at, +el.dataset.at + 0.4)));
  });
  const move = q5(seg(t, STATE.glass + 0.8, STATE.glass + 1.55));
  $("cur").style.left = lerp(700, 1340, move) + "px";
  $("cur").style.top = lerp(640, 520, move) + "px";
  const click = seg(t, STATE.glass + 1.55, STATE.glass + 1.9);
  $("ring").style.opacity = String(click > 0 && click < 1 ? 1 - click : 0);
  $("chip").style.opacity = String(eo(seg(t, STATE.glass + 1.7, STATE.glass + 2.05)));
}`;

  const events = [
    cue(plan.hook[0][0].at, "tick", { gain: -8 }),
    plan.hook[1]?.[0] ? cue(plan.hook[1][0].at, "tick", { gain: -10 }) : null,
    cue(word, "whoosh", { align: "peak", gain: -2 }),
    cue(word + 0.3, "ui", { gain: -8 }),
    cue(glass, "whoosh", { align: "peak", gain: -2 }),
    cue(glass + 1.6, "click", { gain: -5 }),
    cue(cards, "whoosh", { align: "peak", gain: -2 }),
    ...plan.features.slice(0, 4).map((_, i) => cue(cards + 0.3 + i * 0.5, "tick", { gain: -9 })),
    cue(cta, "whoosh", { align: "peak", gain: -1 }),
    cue(cta + 0.25, "chime", { gain: -6 }),
    cue(cta + 0.55, "thud", { gain: -4 }),
  ].filter(Boolean);

  return { html: page({ font: opts.fontUrl, css, body, state, extra }), duration: end, events, hostname: plan.hostname, template: "holo" };
}
