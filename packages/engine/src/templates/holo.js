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
  const layouts = [
    { x: 48, y: 150, w: 620, h: 460, wash: true },
    { x: 1280, y: 70, w: 580, h: 420, wash: false },
    { x: 1240, y: 560, w: 620, h: 440, wash: true },
  ];
  const bodies = [
    `<div class="mail"><b>To Maya Chen · 9:41</b><p>${esc(plan.problem)}</p><p>I kept your last three replies in the same tone.</p><p>Draft saved. Nothing has been sent.</p></div><div class="stat"><b data-count="12" data-from="${(cards + 0.6).toFixed(2)}">0</b><small>drafts today</small></div>`,
    `<div class="threads"><div><i>MC</i><span><b>Maya Chen</b><small>9:41 · Follow-up</small></span></div><div><i>JL</i><span><b>Jules Okonkwo</b><small>8:15 · Waiting</small></span></div><div><i>AR</i><span><b>Ari Rahman</b><small>Yesterday · Sent</small></span></div></div><div class="stat"><b data-count="48" data-from="${(cards + 1.1).toFixed(2)}">0</b><small>open threads</small></div>`,
    `<div class="approve"><b>Ready for Thursday, 2:00</b><p>${esc(plan.features[2] || plan.features[0])}</p><em>Approve</em></div><div class="stat"><b data-count="6" data-from="${(cards + 1.6).toFixed(2)}">0</b><small>waiting on you</small></div>`,
  ];
  const cardHtml = plan.features
    .slice(0, 3)
    .map((title, i) => {
      const box = layouts[i];
      return `<article class="hcard${box.wash ? " wash" : ""}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px" data-at="${(cards + 0.2 + i * 0.45).toFixed(2)}">
        <small>${esc(title)}</small>
        <h3>${esc(title)}</h3>
        ${bodies[i]}
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
.hcard{position:absolute;background:#fff;color:${plan.ink};border-radius:28px;box-shadow:0 24px 60px rgba(13,18,34,.12);padding:28px;display:flex;flex-direction:column;gap:12px;opacity:0}
.hcard.wash{background:linear-gradient(165deg, ${plan.accent} 0%, ${plan.accentDeep} 100%);color:#fff}
.hcard.wash h3,.hcard.wash p,.hcard.wash b,.hcard.wash small,.hcard.wash span{color:#fff}
.hcard.wash small{color:rgba(255,255,255,.78)}
.hcard small{font-size:13px;font-weight:560;letter-spacing:.08em;text-transform:uppercase;color:${plan.accent}}
.hcard h3{font-size:32px;font-weight:560;letter-spacing:-.045em;line-height:1.05;color:${plan.ink}}
.hcard .stat{margin-top:auto;display:flex;align-items:baseline;gap:8px}
.hcard .stat b{font-size:42px;letter-spacing:-.05em}
.mail p,.approve p{font-size:16px;line-height:1.4}
.threads{display:flex;flex-direction:column;gap:10px}
.threads div{display:flex;gap:10px;align-items:center}
.threads i{width:36px;height:36px;border-radius:99px;background:${plan.accentSoft};color:${plan.accent};display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:560;font-size:12px}
.threads span{display:flex;flex-direction:column}
.threads small{letter-spacing:0;text-transform:none;font-weight:500;color:${plan.muted}}
.approve em{align-self:flex-start;font-style:normal;background:#fff;color:${plan.accentDeep};border-radius:12px;padding:10px 14px;font-weight:560}
.centerWord{position:absolute;left:0;right:0;top:430px;text-align:center;font-size:168px;font-weight:560;letter-spacing:-.07em;opacity:0}
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
  <div id="chip" class="chip">Queued</div>
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

  return { html: page({ font: opts.fontUrl, css, body, state, extra, accent: plan.accent }), duration: end, events, hostname: plan.hostname, template: "holo" };
}
