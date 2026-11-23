import { esc } from "./copy.js";

const RUNTIME = `
const $ = (id) => document.getElementById(id);
const STATE = JSON.parse(document.getElementById("state").textContent);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const q5 = (p) => (p < 0.5 ? 16 * p ** 5 : 1 - ((-2 * p + 2) ** 5) / 2);
const eo = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
const hex = (h) => [0, 2, 4].map((i) => parseInt(String(h).slice(i + 1, i + 3), 16));
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
    if (u > 0 && u < 1) blur = Math.sin(Math.PI * u) * 4;
  }
  $("world").style.transform = "translateY(" + (-y) + "px)";
  $("world").style.filter = blur > 0.3 ? "blur(" + blur.toFixed(2) + "px)" : "none";
}
function paint(t) {
  document.querySelectorAll("[data-at]").forEach((el) => {
    if (el.closest("#slot") || el.classList.contains("row") || el.classList.contains("node") || el.classList.contains("fcard") || el.classList.contains("stair")) return;
    const p = eo(seg(t, +el.dataset.at, +el.dataset.at + 0.4));
    const light = el.dataset.tone === "light";
    el.style.opacity = String(p);
    el.style.color = mix(light ? "#D5DAE6" : STATE.grey, light ? "#FFFFFF" : STATE.ink, p);
  });
  document.querySelectorAll("[data-fade]").forEach((el) => {
    el.style.opacity = String(eo(seg(t, +el.dataset.fade, +el.dataset.fade + 0.45)));
  });
}
function render(t) {
  camera(t);
  paint(t);
  if (typeof extra === "function") extra(t);
}
window.render = render;
window.DUR = STATE.end;
addEventListener("message", (e) => {
  if (e.data && e.data.type === "harkat-t" && typeof e.data.t === "number") render(e.data.t);
});
function boot() {
  if (STATE.logo) {
    document.querySelectorAll(".logo").forEach((img) => {
      img.src = STATE.logo;
      img.style.display = "block";
    });
  }
  render(0);
  window.READY = true;
}
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))]).then(boot);
`;

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1920px;height:1080px;overflow:hidden;background:#F6F7F9;font-family:G,sans-serif;color:#0D1222;-webkit-font-smoothing:antialiased}
#world{position:absolute;left:0;top:0;width:1920px}
.scene{position:absolute;left:0;width:1920px;height:1080px;overflow:hidden}
.mid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.line{display:flex;justify-content:center;gap:.26em;font-weight:560;letter-spacing:-.055em;line-height:1.02;white-space:nowrap}
.line span{display:inline-block;opacity:0}
.stack{display:flex;flex-direction:column;align-items:center;gap:14px}
.logo{display:none;height:64px;width:auto}
.ctaName{font-size:26px;font-weight:500;color:#5B6275}
.url{font-size:42px;font-weight:560;letter-spacing:-.04em;text-decoration:none;margin-top:10px}
.sampleLine{margin-top:16px;color:#5B6275;font-size:18px}
.cursor{position:absolute;z-index:6;width:28px;height:28px;pointer-events:none}
.cursor svg{display:block}
.ring{position:absolute;left:-10px;top:-10px;width:36px;height:36px;border-radius:99px;border:2px solid currentColor;opacity:0}
`;

export function page({ font, css, body, state, extra = "" }) {
  const safeFont = String(font || "/fonts/Geist-Variable.woff2").replace(/["'()\\\s]/g, "");
  const json = JSON.stringify(state).replace(/</g, "\\u003c");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:G;src:url("${safeFont}") format("woff2");font-weight:100 900;font-display:swap}
${BASE_CSS}
${css}
</style></head><body>
<div id="world">${body}</div>
<script id="state" type="application/json">${json}</script>
<script>${RUNTIME}
${extra}
</script>
</body></html>`;
}

export function endScene(plan, top) {
  return `<section class="scene" style="top:${top}px;background:${plan.bg}"><div class="mid">
    <img class="logo" alt="">
    <div class="ctaName">${esc(plan.name)}</div>
    <div class="url" style="color:${plan.accent}">${esc(plan.hostname)}</div>
    ${plan.sample ? '<div class="sampleLine">Sample film · not a real product</div>' : ""}
  </div></section>`;
}
