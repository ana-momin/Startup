import { base, cue, esc, initials, lastAt, lineHtml, shortLabel } from "../copy.js";
import { endScene, page } from "../shell.js";

function timing(last, n) {
  const name = Math.max(3.35, +(last + 0.85).toFixed(2));
  const shift = name - 3.35;
  const ui = +(7.7 + shift).toFixed(2);
  const span = n <= 1 ? 6.4 : n === 2 ? 7.2 : n >= 4 ? 9.4 : 8.3;
  const features = +(ui + 9.1).toFixed(2);
  const flow = +(features + span).toFixed(2);
  const cta = +(flow + 4.55).toFixed(2);
  const end = +(cta + 4.05).toFixed(2);
  return { name, ui, features, flow, cta, end, slide: 0.68, span, shift };
}

export function launchFilm(brief, opts = {}) {
  const plan = base(brief);
  const time = timing(lastAt(plan.hook), plan.features.length);
  const hook = plan.hook.map((line) => `<div class="line" style="font-size:${plan.hookSize}px">${lineHtml(line, "light")}</div>`).join("");
  const rows = [plan.problem.replace(/[.?!]+$/, ""), ...plan.features].slice(0, 5);
  const states = ["Open", "Draft", "Queued", "Needs a look", "Sample"];
  const rowHtml = rows
    .map(
      (title, i) => `<div class="row" data-at="${(time.ui + 0.55 + i * 0.22).toFixed(2)}">
        <i></i><span><b>${esc(title)}</b><small>Sample</small></span><em>${states[i]}</em></div>`,
    )
    .join("");
  const nav = ["Overview", ...plan.features.map(shortLabel)].slice(0, 5);
  const navHtml = nav.map((item, i) => `<div class="navbtn${i === 0 ? " on" : ""}">${esc(item)}</div>`).join("");
  const bars = [28, 46, 38, 62, 44, 70, 52, 58].map((h) => `<b style="height:${h}%"></b>`).join("");
  const chats = [
    [initials(plan.name), plan.problem],
    ["AR", "Sample reply. Nothing here is sent."],
    [initials(plan.features[0]), plan.features[0]],
  ]
    .map(([who, text]) => `<div class="msg"><i>${esc(who)}</i><p>${esc(text)}</p></div>`)
    .join("");
  const cards = plan.features
    .map((title, i) => {
      const kind = ["doc", "board", "thread"][i % 3];
      const body =
        kind === "board"
          ? `<div class="mini">${[40, 70, 48, 86, 55, 30, 44].map((h) => `<b style="height:${h}%"></b>`).join("")}</div><small>Sample week</small>`
          : kind === "thread"
            ? `<div class="bubble">${esc(plan.problem.slice(0, 72))}</div><div class="bubble me">Sample. Not sent.</div>`
            : `<u></u><s></s><s></s><em>${esc(title)}</em>`;
      return `<article class="fcard"><span>Sample</span><h3>${esc(title)}</h3><div class="mock ${kind}">${body}</div></article>`;
    })
    .join("");
  const steps = [
    { n: "01", title: plan.hook[0].slice(0, 2).map((w) => w.text).join(" "), sub: "The snag" },
    { n: "02", title: plan.name, sub: "The product" },
    { n: "03", title: "Go live", sub: plan.hostname },
  ]
    .map((s) => `<div class="step"><small>${s.n}</small><b>${esc(s.title)}</b><em>${esc(s.sub)}</em></div>`)
    .join("");

  const css = `
.url{color:${plan.accent}}
.kicker{font-size:26px;font-weight:500;opacity:0}
.product{font-weight:560;letter-spacing:-.06em;line-height:.95;opacity:0}
.nameRow{display:flex;align-items:center;gap:22px}
.swap{margin-top:16px;font-size:40px;font-weight:560;letter-spacing:-.04em;opacity:0}
.uiStage{transform-origin:50% 50%}
.window{width:1360px;height:780px;background:#fff;border-radius:28px;box-shadow:0 0 0 1px ${plan.line},0 28px 70px rgba(13,18,34,.08);display:flex;overflow:hidden;position:relative}
.side{width:230px;border-right:1px solid ${plan.line};padding:18px 14px;display:flex;flex-direction:column;gap:4px}
.mark{display:flex;align-items:center;gap:10px;font-weight:560;letter-spacing:-.04em;font-size:18px;padding:6px 8px 16px}
.dot{width:12px;height:12px;border-radius:99px;background:${plan.accent};flex:none}
.navbtn{height:38px;border-radius:10px;display:flex;align-items:center;padding:0 12px;color:${plan.muted};font-size:15px;font-weight:500}
.navbtn.on{background:${plan.accentSoft};color:${plan.accent}}
.main{flex:1;display:flex;min-width:0}
.col{flex:1;display:flex;flex-direction:column;min-width:0}
.top{height:64px;border-bottom:1px solid ${plan.line};display:flex;align-items:center;gap:12px;padding:0 18px}
.lights{display:flex;gap:6px}.lights i{width:9px;height:9px;border-radius:99px;background:#E4E7EE}
.top b{font-size:15px;font-weight:560}.top small{color:${plan.muted};font-size:13px}
.pill{margin-left:auto;background:${plan.accentSoft};color:${plan.accent};border-radius:99px;padding:5px 10px;font-size:12px;font-weight:560}
.list{padding:14px 16px;display:flex;flex-direction:column;gap:8px}
.row{height:64px;border:1px solid ${plan.line};border-radius:14px;display:flex;align-items:center;gap:12px;padding:0 14px;opacity:0}
.row>i{width:8px;height:8px;border-radius:99px;background:${plan.accent};flex:none}
.row span{display:flex;flex-direction:column;gap:2px;min-width:0}
.row b{font-size:16px;font-weight:560;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:520px}
.row small{color:${plan.muted};font-size:12px}
.row em{margin-left:auto;font-style:normal;color:${plan.accent};background:${plan.accentSoft};border-radius:99px;padding:4px 9px;font-size:12px;font-weight:560}
.chart{height:150px;margin:4px 16px 0;border:1px solid ${plan.line};border-radius:14px;display:flex;align-items:flex-end;gap:8px;padding:14px}
.today{display:flex;gap:8px;padding:10px 16px 14px}
.today span{flex:1;background:${plan.bg};border-radius:10px;padding:8px 10px;font-size:12px;color:${plan.muted}}
.today b{display:block;color:${plan.ink};font-size:13px;margin-bottom:2px}
.chart b{flex:1;background:${plan.accent};border-radius:5px 5px 2px 2px;opacity:.85}
.chart b:nth-child(odd){background:${plan.accentSoft}}
.sideR{width:320px;border-left:1px solid ${plan.line};display:flex;flex-direction:column;padding:16px;gap:10px}
.sideR strong{font-size:14px}
.msg{display:flex;gap:8px;align-items:flex-start}
.msg i{width:28px;height:28px;border-radius:99px;background:${plan.accentSoft};color:${plan.accent};display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:560;font-size:11px;flex:none}
.msg p{background:${plan.bg};border-radius:12px;padding:8px 10px;font-size:13px;line-height:1.35}
.composer{margin-top:auto;border:1px solid ${plan.line};border-radius:12px;padding:10px 12px;color:${plan.muted};font-size:13px}
.toast{position:absolute;right:340px;bottom:28px;background:${plan.ink};color:#fff;border-radius:12px;padding:10px 12px;font-size:13px;opacity:0}
.head{position:absolute;top:92px;left:0;right:0;text-align:center;font-size:52px;font-weight:560;letter-spacing:-.05em;opacity:0}
.track{position:absolute;top:230px;left:0;display:flex;gap:28px}
.fcard{width:460px;height:560px;flex:none;background:#fff;border-radius:28px;box-shadow:0 0 0 1px ${plan.line},0 20px 50px rgba(13,18,34,.06);padding:28px;display:flex;flex-direction:column;gap:14px}
.fcard h3{font-size:30px;font-weight:560;letter-spacing:-.045em;line-height:1.05}
.fcard>span{color:${plan.accent};font-size:13px;font-weight:560;letter-spacing:.06em;text-transform:uppercase}
.mock{background:${plan.bg};border-radius:16px;padding:16px;display:flex;flex-direction:column;gap:8px;min-height:180px}
.mock u{height:8px;width:40%;background:${plan.accent};border-radius:99px}
.mock s{height:8px;background:#E4E7EE;border-radius:99px}
.mock em{background:${plan.accentSoft};border-radius:8px;padding:8px 10px;font-style:normal;font-size:15px}
.mini{display:flex;align-items:flex-end;gap:6px;height:120px}
.mini b{flex:1;background:${plan.accent};border-radius:6px 6px 2px 2px}
.mini b:nth-child(odd){background:${plan.accentSoft}}
.bubble{background:#fff;border-radius:12px;padding:8px 10px;font-size:14px}
.bubble.me{background:${plan.accentSoft}}
.fcard small{color:${plan.muted}}
.flowHead{font-size:48px;font-weight:560;letter-spacing:-.05em;opacity:0}
.rail{position:relative;width:980px;height:2px;background:${plan.line};margin:48px 0 28px}
#dot{position:absolute;top:50%;width:14px;height:14px;border-radius:99px;background:${plan.accent};transform:translate(-50%,-50%)}
.steps{display:flex;width:980px;justify-content:space-between}
.step{width:260px;display:flex;flex-direction:column;gap:6px;opacity:0}
.step small{color:${plan.accent};font-weight:560}
.step b{font-size:34px;font-weight:560;letter-spacing:-.04em}
.step em{font-style:normal;color:${plan.muted};font-size:16px}
`;

  const body = `
<section class="scene" style="top:0;background:radial-gradient(120% 80% at 50% 120%, ${plan.accentDeep} 0%, #070b14 58%)"><div class="mid stack">${hook}</div></section>
<section class="scene" style="top:1080px;background:${plan.bg}"><div class="mid">
  <div class="kicker" data-at="${(time.name + 0.15).toFixed(2)}" data-tone="ink">Introducing</div>
  <div class="nameRow"><img class="logo" alt=""><div class="product" data-at="${(time.name + 0.4).toFixed(2)}" data-tone="ink" style="font-size:${Math.min(plan.nameSize, 140)}px">${esc(plan.name)}</div></div>
  <div class="swap" data-at="${(time.name + 0.9).toFixed(2)}" data-tone="ink">You get ${esc(shortLabel(plan.features[0]))}</div>
</div></section>
<section class="scene" style="top:2160px;background:${plan.bg}"><div class="mid"><div id="uiStage" class="uiStage"><div class="window">
  <aside class="side"><div class="mark"><img class="logo" alt="" style="height:22px"><i class="dot"></i>${esc(plan.name)}</div>${navHtml}</aside>
  <div class="main">
    <div class="col">
      <div class="top"><span class="lights"><i></i><i></i><i></i></span><b>${esc(plan.name)}</b><small>${esc(plan.hostname)}</small><span class="pill">Sample interface</span></div>
      <div class="list">${rowHtml}</div>
      <div class="chart">${bars}</div>
      <div class="today">${plan.features.slice(0, 3).map((f) => `<span><b>${esc(shortLabel(f))}</b>Sample</span>`).join("")}</div>
    </div>
    <aside class="sideR"><strong>Thread · sample</strong>${chats}<div class="composer">Sample reply</div></aside>
  </div>
  <div id="toast" class="toast">Saved · sample</div>
  <div id="cur" class="cursor" style="color:${plan.accent}"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3 L5 19 L10 15 L14 21 L17 19 L13 13 L19 13 Z" fill="#0D1222"/></svg><i id="ring" class="ring"></i></div>
</div></div></div></section>
<section class="scene" style="top:3240px;background:${plan.bg}">
  <div class="head" data-at="${(time.features + 0.08).toFixed(2)}" data-tone="ink">What it does</div>
  <div id="track" class="track">${cards}</div>
</section>
<section class="scene" style="top:4320px;background:${plan.bg}"><div class="mid">
  <div class="flowHead" data-at="${(time.flow + 0.1).toFixed(2)}" data-tone="ink">How it comes together</div>
  <div class="rail"><i id="dot"></i></div>
  <div class="steps">${steps}</div>
</div></section>
${endScene(plan, 5400)}`;

  const per = time.span / Math.max(plan.features.length, 1);
  const state = {
    grey: plan.grey,
    ink: plan.ink,
    slide: time.slide,
    end: time.end,
    stops: [0, time.name, time.ui, time.features, time.flow, time.cta].map((t, i) => ({ t, y: i * 1080 })),
    ui: time.ui,
    features: time.features,
    per,
    flow: time.flow,
    logo: plan.logo,
    n: plan.features.length,
  };
  const extra = `
function extra(t) {
  const p = q5(seg(t, STATE.ui, STATE.ui + 0.7));
  $("uiStage").style.transform = "scale(" + lerp(0.94, 1, p) + ")";
  document.querySelectorAll(".row").forEach((el) => {
    el.style.opacity = String(eo(seg(t, +el.dataset.at, +el.dataset.at + 0.32)));
  });
  $("toast").style.opacity = String(eo(seg(t, STATE.ui + 3.4, STATE.ui + 3.7)));
  const active = t > STATE.ui + 3.2 ? 1 : 0;
  document.querySelectorAll(".navbtn").forEach((el, i) => el.classList.toggle("on", i === active));
  const c1 = t < STATE.ui + 1.1 ? 0 : q5(seg(t, STATE.ui + 1.1, STATE.ui + 1.9));
  const x = lerp(260, 520, c1);
  const y = lerp(120, 250, c1);
  $("cur").style.left = x + "px";
  $("cur").style.top = y + "px";
  const click = seg(t, STATE.ui + 2.1, STATE.ui + 2.45);
  $("ring").style.opacity = String(click > 0 && click < 1 ? 1 - click : 0);
  $("ring").style.transform = "scale(" + lerp(0.4, 1.6, click) + ")";
  const n = document.querySelectorAll("#track .fcard").length || 1;
  let idx = 0;
  for (let i = 1; i < n; i++) {
    const at = STATE.features + i * STATE.per;
    if (t < at - 0.45) break;
    idx = i - 1 + q5(seg(t, at - 0.45, at));
  }
  $("track").style.transform = "translateX(" + ((1920 - 460) / 2 - idx * 488) + "px)";
  document.querySelectorAll(".step").forEach((el, i) => {
    const at = STATE.flow + 0.35 + i * 0.55;
    el.style.opacity = String(eo(seg(t, at, at + 0.35)));
  });
  $("dot").style.left = (16 + q5(seg(t, STATE.flow + 0.4, STATE.flow + 2.4)) * 68) + "%";
}`;

  const events = [
    cue(plan.hook[0][0].at, "tick", { gain: -8 }),
    plan.hook[1]?.[0] ? cue(plan.hook[1][0].at, "tick", { gain: -10 }) : null,
    cue(time.name, "whoosh", { align: "peak", gain: -2 }),
    cue(time.name + 0.4, "ui", { gain: -8 }),
    cue(time.ui, "whoosh", { align: "peak", gain: -2 }),
    cue(time.ui + 0.7, "ui", { gain: -6 }),
    cue(time.ui + 2.15, "click", { gain: -5 }),
    cue(time.features, "whoosh", { align: "peak", gain: -2 }),
    ...plan.features.map((_, i) => cue(time.features + i * per + 0.05, "click", { gain: -8 })),
    cue(time.flow, "whoosh", { align: "peak", gain: -2 }),
    cue(time.flow + 0.4, "tick", { gain: -8 }),
    cue(time.flow + 1.0, "tick", { gain: -8 }),
    cue(time.cta, "whoosh", { align: "peak", gain: -1 }),
    cue(time.cta + 0.25, "chime", { gain: -6 }),
    cue(time.cta + 0.55, "thud", { gain: -4 }),
  ].filter(Boolean);

  return {
    html: page({ font: opts.fontUrl, css, body, state, extra }),
    duration: time.end,
    events,
    hostname: plan.hostname,
    template: "launch",
  };
}
