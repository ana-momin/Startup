const esc = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function wordsHtml(line, tone) {
  return line
    .map((w) => `<span data-at="${w.at}" data-tone="${tone}">${esc(w.text)}</span>`)
    .join("");
}

function cardHtml(card) {
  const title = esc(card.title);
  const detail = esc(String(card.detail).slice(0, 90));
  if (card.kind === "board") {
    const cols = ["M", "T", "W", "T", "F", "S", "S"]
      .map((d, i) => {
        const h = [18, 46, 28, 62, 36, 16, 22][i];
        return `<div class="col"><b style="height:${h}%"></b><small>${d}</small></div>`;
      })
      .join("");
    return `<article class="card"><span class="eyebrow">Sample</span><h3>${title}</h3><div class="board">${cols}</div><p>Sample week</p></article>`;
  }
  if (card.kind === "thread") {
    return `<article class="card"><span class="eyebrow">Sample</span><h3>${title}</h3>
      <div class="thread">
        <div class="msg"><i>NK</i><p>Can we ship this?</p></div>
        <div class="msg me"><i>AR</i><p>Looks right. This is sample copy.</p></div>
      </div>
      <span class="approve">Approve</span></article>`;
  }
  return `<article class="card"><span class="eyebrow">Sample</span><h3>${title}</h3>
    <div class="doc"><u></u><b>${title}</b><i></i><i></i><em>${detail}</em><i style="width:62%"></i></div>
    <p>Sample copy</p></article>`;
}

const PLAYER = `
const $ = (id) => document.getElementById(id);
const STATE = JSON.parse(document.getElementById("state").textContent);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const q5 = (p) => (p < 0.5 ? 16 * p ** 5 : 1 - ((-2 * p + 2) ** 5) / 2);
const eo = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
const hex = (h) => [0, 2, 4].map((i) => parseInt(h.slice(i + 1, i + 3), 16));
const mix = (a, b, p) => {
  const A = hex(a), B = hex(b);
  return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * p)).join(",") + ")";
};

function camera(t) {
  let y = STATE.stops[0].y;
  let blur = 0;
  for (let i = 1; i < STATE.stops.length; i++) {
    const start = STATE.stops[i].t;
    if (t < start) break;
    const p = q5(seg(t, start, start + STATE.slide));
    y = lerp(STATE.stops[i - 1].y, STATE.stops[i].y, p);
    const u = seg(t, start, start + STATE.slide);
    if (u > 0 && u < 1) blur = Math.sin(Math.PI * u) * 5;
  }
  $("world").style.transform = "translateY(" + (-y) + "px)";
  $("world").style.filter = blur > 0.35 ? "blur(" + blur.toFixed(2) + "px)" : "none";
}

function paint(t) {
  document.querySelectorAll("[data-at]").forEach((el) => {
    if (el.closest("#slot") || el.classList.contains("row")) return;
    const p = eo(seg(t, +el.dataset.at, +el.dataset.at + 0.42));
    const light = el.dataset.tone === "light";
    el.style.opacity = String(p);
    el.style.color = mix(light ? "#C5CAD6" : STATE.grey, light ? "#FFFFFF" : STATE.ink, p);
  });
}

function swaps(t) {
  const spans = [...document.querySelectorAll("#slot span")];
  let active = -1;
  spans.forEach((el, i) => { if (t >= +el.dataset.at) active = i; });
  spans.forEach((el, i) => {
    const p = i === active ? eo(seg(t, +el.dataset.at, +el.dataset.at + 0.28)) : 0;
    el.style.opacity = String(p);
  });
}

function ui(t) {
  const p = q5(seg(t, STATE.ui, STATE.ui + 0.75));
  $("uiStage").style.transform = "scale(" + lerp(0.94, 1, p) + ")";
  document.querySelectorAll(".row").forEach((el) => {
    el.style.opacity = String(eo(seg(t, +el.dataset.at, +el.dataset.at + 0.35)));
  });
  $("toast").style.opacity = String(eo(seg(t, STATE.ui + 4.5, STATE.ui + 4.85)));
  const active = t > STATE.ui + 4.1 ? 1 : 0;
  document.querySelectorAll(".navbtn").forEach((el, i) => el.classList.toggle("on", i === active));
}

function features(t) {
  const n = document.querySelectorAll("#track .card").length;
  const slide = 0.5;
  let idx = 0;
  for (let i = 1; i < n; i++) {
    const at = STATE.features + i * STATE.per;
    if (t < at - slide) break;
    idx = i - 1 + q5(seg(t, at - slide, at));
  }
  const step = 536;
  $("track").style.transform = "translateX(" + ((1920 - 500) / 2 - idx * step) + "px)";
}

function flow(t) {
  document.querySelectorAll(".step").forEach((el, i) => {
    const at = STATE.flow + 0.35 + i * 0.7;
    el.style.opacity = String(eo(seg(t, at, at + 0.4)));
  });
  const travel = q5(seg(t, STATE.flow + 0.5, STATE.flow + 2.65));
  $("dot").style.left = (16 + travel * 68) + "%";
}

function render(t) {
  camera(t);
  paint(t);
  swaps(t);
  ui(t);
  features(t);
  flow(t);
}
window.render = render;
window.DUR = STATE.end;
addEventListener("message", (e) => {
  if (e.data && e.data.type === "harkat-t" && typeof e.data.t === "number") render(e.data.t);
});
function boot() {
  if (STATE.logo) {
    const img = $("logo");
    img.src = STATE.logo;
    img.style.display = "block";
  }
  render(0);
  window.READY = true;
}
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(boot);
`;

export function filmHtml(plan, opts = {}) {
  const font = String(opts.fontUrl || "/fonts/Geist-Variable.woff2").replace(/["'()\\\s]/g, "");
  const slot = Math.max(...plan.swaps.map((s) => s.text.length), 4);
  const hook = plan.hook
    .map((line) => `<div class="line" style="font-size:${plan.hookSize}px">${wordsHtml(line, "light")}</div>`)
    .join("");
  const rows = plan.rows
    .map(
      (row, i) => `<div class="row" data-at="${plan.rowAt[i]}">
        <i></i><span><b>${esc(row.title)}</b><small>${esc(row.meta)}</small></span><em>${esc(row.state)}</em></div>`,
    )
    .join("");
  const nav = plan.nav
    .map((item, i) => `<div class="navbtn${i === 0 ? " on" : ""}">${esc(item)}</div>`)
    .join("");
  const swaps = plan.swaps
    .map((s) => `<span data-at="${s.t}">${esc(s.text)}</span>`)
    .join("");
  const cards = plan.cards.map(cardHtml).join("");
  const steps = plan.flow
    .map((s) => `<div class="step"><small>${s.n}</small><b>${esc(s.title)}</b><em>${esc(s.sub)}</em></div>`)
    .join("");
  const state = JSON.stringify({
    grey: plan.grey,
    ink: plan.ink,
    slide: plan.time.slide,
    stops: plan.stops,
    end: plan.time.end,
    ui: plan.time.ui,
    features: plan.time.features,
    per: plan.time.per,
    flow: plan.time.flow,
    logo: plan.logo,
  }).replace(/</g, "\\u003c");

  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:G;src:url("${font}") format("woff2");font-weight:100 900;font-display:swap}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:${plan.bg};font-family:G,sans-serif;color:${plan.ink}}
#world{position:absolute;left:0;top:0;width:1920px;will-change:transform}
.scene{position:absolute;left:0;width:1920px;height:1080px;overflow:hidden}
.mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.line{display:flex;justify-content:center;gap:.28em;font-weight:560;letter-spacing:-.055em;line-height:1.02;white-space:nowrap}
.line span{display:inline-block;opacity:0}
.stack{display:flex;flex-direction:column;align-items:center;gap:18px}
.kicker{font-size:28px;font-weight:500;letter-spacing:-.03em;opacity:0}
.nameRow{display:flex;align-items:center;gap:28px}
#logo{display:none;height:84px;width:auto}
.product{font-weight:560;letter-spacing:-.06em;line-height:.95;opacity:0}
.swapline{display:flex;align-items:baseline;gap:.4em;font-size:44px;font-weight:560;letter-spacing:-.045em;margin-top:18px}
.swapline > span{opacity:0}
#slot{position:relative;display:inline-block;height:1.15em;width:${(slot * 0.52).toFixed(2)}em}
#slot span{position:absolute;left:0;top:0;white-space:nowrap;color:${plan.accent};opacity:0}
.uiStage{transform-origin:50% 50%}
.window{width:1240px;height:700px;background:#fff;border-radius:28px;box-shadow:0 0 0 1px ${plan.line},0 30px 70px rgba(13,18,34,.08);display:flex;overflow:hidden}
.side{width:248px;border-right:1px solid ${plan.line};padding:22px 16px;display:flex;flex-direction:column;gap:6px}
.mark{display:flex;align-items:center;gap:10px;font-weight:560;letter-spacing:-.04em;font-size:18px;padding:8px 10px 18px}
.dot{width:14px;height:14px;border-radius:99px;background:${plan.accent}}
.navbtn{height:40px;border-radius:10px;display:flex;align-items:center;padding:0 12px;color:${plan.muted};font-size:15px;font-weight:500}
.navbtn.on{background:${plan.accentSoft};color:${plan.accent}}
.main{flex:1;display:flex;flex-direction:column;min-width:0}
.top{height:68px;border-bottom:1px solid ${plan.line};display:flex;align-items:center;gap:14px;padding:0 22px}
.lights{display:flex;gap:6px}
.lights i{width:10px;height:10px;border-radius:99px;background:#E4E7EE}
.top b{font-size:16px;font-weight:560;letter-spacing:-.03em}
.top small{color:${plan.muted};font-size:14px}
.pill{margin-left:auto;background:${plan.accentSoft};color:${plan.accent};border-radius:99px;padding:6px 10px;font-size:13px;font-weight:560}
.go{background:${plan.accent};color:${plan.onAccent};border-radius:9px;padding:8px 12px;font-size:14px;font-weight:560}
.list{position:relative;flex:1;padding:18px 22px;display:flex;flex-direction:column;gap:10px}
.row{height:78px;border:1px solid ${plan.line};border-radius:16px;display:flex;align-items:center;gap:14px;padding:0 16px;opacity:0}
.row > i{width:10px;height:10px;border-radius:99px;background:${plan.accent};flex:none}
.row span{display:flex;flex-direction:column;gap:3px;min-width:0}
.row b{font-size:18px;font-weight:560;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row small{color:${plan.muted};font-size:13px}
.row em{margin-left:auto;font-style:normal;color:${plan.accent};background:${plan.accentSoft};border-radius:99px;padding:5px 10px;font-size:13px;font-weight:560;flex:none}
.toast{position:absolute;right:22px;bottom:18px;background:${plan.ink};color:#fff;border-radius:12px;padding:12px 14px;font-size:14px;font-weight:500;opacity:0}
.panel{width:270px;border-left:1px solid ${plan.line};padding:22px;display:flex;flex-direction:column;gap:14px}
.panel strong{font-size:16px;font-weight:560}
.week{display:flex;align-items:flex-end;gap:8px;height:120px}
.week b{flex:1;height:100%;background:${plan.accentSoft};border-radius:6px 6px 2px 2px;position:relative}
.week b i{position:absolute;left:0;right:0;bottom:0;background:${plan.accent};border-radius:6px 6px 2px 2px}
.panel p{color:${plan.muted};font-size:13px;line-height:1.4}
.head{position:absolute;top:118px;left:0;right:0;text-align:center;font-size:54px;font-weight:560;letter-spacing:-.05em;opacity:0}
.track{position:absolute;top:250px;left:0;height:560px;display:flex;gap:36px}
.card{width:500px;height:540px;flex:none;background:#fff;border-radius:28px;box-shadow:0 0 0 1px ${plan.line},0 24px 50px rgba(13,18,34,.06);padding:32px;display:flex;flex-direction:column;gap:16px}
.card h3{font-size:32px;font-weight:560;letter-spacing:-.045em;line-height:1.05}
.card .eyebrow{color:${plan.accent};font-size:14px;font-weight:560;letter-spacing:.04em;text-transform:uppercase}
.card p{color:${plan.muted};font-size:16px;line-height:1.4;margin-top:auto}
.doc{background:${plan.bg};border-radius:16px;padding:18px;display:flex;flex-direction:column;gap:8px}
.doc u{display:block;height:8px;width:42%;background:${plan.accent};border-radius:99px;text-decoration:none}
.doc b{font-size:16px}
.doc i{display:block;height:8px;width:100%;background:#E4E7EE;border-radius:99px}
.doc em{display:block;background:${plan.accentSoft};color:${plan.ink};border-radius:8px;padding:8px 10px;font-style:normal;font-size:14px;line-height:1.35}
.board{display:flex;gap:8px;align-items:flex-end;height:180px}
.col{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:8px;height:100%}
.col b{display:block;width:100%;background:${plan.accent};border-radius:8px 8px 3px 3px;opacity:.9}
.col:nth-child(odd) b{background:${plan.accentSoft}}
.col small{color:${plan.muted};font-size:12px}
.thread{display:flex;flex-direction:column;gap:10px}
.msg{display:flex;gap:10px;align-items:flex-start}
.msg i{width:36px;height:36px;border-radius:99px;background:${plan.accentSoft};color:${plan.accent};display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:560;font-size:12px;flex:none}
.msg p{background:${plan.bg};border-radius:12px;padding:10px 12px;font-size:15px}
.approve{align-self:flex-start;background:${plan.accent};color:${plan.onAccent};border-radius:10px;padding:10px 14px;font-weight:560}
.rail{position:relative;width:1080px;height:2px;background:${plan.line};margin:54px 0 36px}
#dot{position:absolute;top:50%;width:16px;height:16px;border-radius:99px;background:${plan.accent};transform:translate(-50%,-50%);left:16%}
.steps{display:flex;width:1080px;justify-content:space-between}
.step{width:280px;display:flex;flex-direction:column;gap:8px;opacity:0}
.step small{color:${plan.accent};font-weight:560}
.step b{font-size:36px;font-weight:560;letter-spacing:-.045em;line-height:1.05}
.step em{font-style:normal;color:${plan.muted};font-size:16px}
.flowHead{font-size:52px;font-weight:560;letter-spacing:-.05em;opacity:0;margin-bottom:10px}
.ctaName{font-size:28px;font-weight:500;color:${plan.muted}}
.url{font-size:44px;font-weight:560;letter-spacing:-.04em;color:${plan.accent};text-decoration:none;margin-top:12px}
.sampleLine{margin-top:18px;color:${plan.muted};font-size:18px}
</style></head><body>
<div id="world">
  <section class="scene" style="top:0;background:radial-gradient(120% 80% at 50% 120%, ${plan.accentDeep} 0%, #070b14 58%)"><div class="mid stack">${hook}</div></section>
  <section class="scene" style="top:1080px;background:${plan.bg}"><div class="mid">
    <div class="kicker" data-at="${plan.kickerAt}" data-tone="ink">Introducing</div>
    <div class="nameRow"><img id="logo" alt=""><div class="product" data-at="${plan.nameAt}" data-tone="ink" style="font-size:${plan.nameSize}px">${esc(plan.name)}</div></div>
    <div class="swapline"><span data-at="${plan.leadAt}" data-tone="ink">You get</span><span id="slot">${swaps}</span></div>
  </div></section>
  <section class="scene" style="top:2160px;background:${plan.bg}"><div class="mid"><div id="uiStage" class="uiStage"><div class="window">
    <aside class="side"><div class="mark"><i class="dot"></i>${esc(plan.name)}</div>${nav}</aside>
    <div class="main">
      <div class="top"><span class="lights"><i></i><i></i><i></i></span><b>${esc(plan.name)}</b><small>${esc(plan.hostname)}</small><span class="pill">Sample interface</span><span class="go">New</span></div>
      <div class="list">${rows}<div id="toast" class="toast">Saved · sample</div></div>
    </div>
    <aside class="panel"><strong>This week</strong><div class="week"><b><i style="height:30%"></i></b><b><i style="height:55%"></i></b><b><i style="height:40%"></i></b><b><i style="height:72%"></i></b><b><i style="height:48%"></i></b></div><p>Sample week</p></aside>
  </div></div></div></section>
  <section class="scene" style="top:3240px;background:${plan.bg}">
    <div class="head" data-at="${plan.time.features + 0.05}" data-tone="ink">What it does</div>
    <div id="track" class="track">${cards}</div>
  </section>
  <section class="scene" style="top:4320px;background:${plan.bg}"><div class="mid">
    <div class="flowHead" data-at="${plan.time.flow + 0.1}" data-tone="ink">How it comes together</div>
    <div class="rail"><i id="dot"></i></div>
    <div class="steps">${steps}</div>
  </div></section>
  <section class="scene" style="top:5400px;background:${plan.bg}"><div class="mid">
    <div class="ctaName">${esc(plan.name)}</div>
    <div class="url">${esc(plan.hostname)}</div>
    ${plan.sample ? '<div class="sampleLine">Sample film · not a real product</div>' : ""}
  </div></section>
</div>
<script id="state" type="application/json">${state}</script>
<script>${PLAYER}</script>
</body></html>`;
}
