import { esc, letterLine } from "./copy.js";
import { MS } from "./motion.js";

const RUNTIME = `
const $ = (id) => document.getElementById(id);
const STATE = JSON.parse(document.getElementById("state").textContent);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const q5 = (p) => (p < 0.5 ? 16 * p ** 5 : 1 - ((-2 * p + 2) ** 5) / 2);
const eo = (p) => (p >= 1 ? 1 : 1 - 2 ** (-10 * p));
const back = (p) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2; };
const FADE = ${MS.fade / 1000};
const COUNT = ${MS.count / 1000};
const hex = (h) => [0, 2, 4].map((i) => parseInt(String(h).slice(i + 1, i + 3), 16));
const mix = (a, b, p) => {
  const A = hex(a), B = hex(b);
  return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * p)).join(",") + ")";
};
function camera(t) {
  const stops = STATE.stops;
  let y = stops[0].y;
  let zoom = 1 + Math.min(t, 8) * 0.007;
  let blur = 0;
  for (let i = 1; i < stops.length; i++) {
    const start = stops[i].t;
    if (t < start) break;
    const u = seg(t, start, start + STATE.slide);
    const p = q5(u);
    y = lerp(stops[i - 1].y, stops[i].y, p);
    if (u > 0 && u < 1) {
      blur = Math.sin(Math.PI * u) * 3.2;
      zoom = lerp(1.1, 1, p);
    } else {
      const held = Math.max(0, t - (start + STATE.slide));
      zoom = 1 + Math.min(held, 8) * 0.007;
    }
  }
  const world = $("world");
  world.style.transformOrigin = "960px " + (y + 540) + "px";
  world.style.transform = "translateY(" + (-y) + "px) scale(" + zoom.toFixed(4) + ")";
  world.style.filter = blur > 0.35 ? "blur(" + blur.toFixed(2) + "px)" : "none";
  const back = $("back");
  if (back) {
    back.style.transformOrigin = "960px " + (y * 0.32 + 540) + "px";
    back.style.transform = "translateY(" + (-y * 0.32) + "px) scale(" + (1 + (zoom - 1) * 0.45).toFixed(4) + ")";
  }
  const grid = $("grid");
  if (grid) grid.style.transform = "translate(" + (Math.sin(t * 0.22) * 16).toFixed(1) + "px," + (-y * 0.62).toFixed(1) + "px)";
}
function paint(t) {
  document.querySelectorAll("[data-at]").forEach((el) => {
    if (el.closest("#slot") || el.closest(".hcard") || el.closest(".row") || el.closest(".node") || el.closest(".fcard") || el.closest(".stair") || el.closest(".metric")) return;
    const p = eo(seg(t, +el.dataset.at, +el.dataset.at + FADE));
    const light = el.dataset.tone === "light";
    el.style.opacity = String(p);
    el.style.color = mix(light ? "#D5DAE6" : STATE.grey, light ? "#FFFFFF" : STATE.ink, p);
    if (el.tagName === "SPAN") el.style.transform = "translateY(" + ((1 - p) * 18).toFixed(1) + "px)";
  });
  document.querySelectorAll("[data-rise]").forEach((el) => {
    const p = eo(seg(t, +el.dataset.rise, +el.dataset.rise + 0.34));
    el.style.opacity = String(p);
    el.style.transform = "translateY(" + ((1 - p) * 26).toFixed(1) + "px)";
  });
  document.querySelectorAll("[data-fade]").forEach((el) => {
    el.style.opacity = String(eo(seg(t, +el.dataset.fade, +el.dataset.fade + 0.45)));
  });
  document.querySelectorAll("[data-grow]").forEach((el) => {
    const p = q5(seg(t, +el.dataset.grow, +el.dataset.grow + 0.5));
    el.style.transform = "scaleX(" + p.toFixed(3) + ")";
  });
  document.querySelectorAll("[data-drift]").forEach((el) => {
    const k = +el.dataset.drift || 1;
    el.style.transform = "translate(" + (Math.sin(t * 0.35) * 16 * k) + "px," + (Math.cos(t * 0.28) * 10 * k) + "px)";
  });
  document.querySelectorAll("[data-count]").forEach((el) => {
    const p = eo(seg(t, +(el.dataset.from || 0), +(el.dataset.from || 0) + COUNT));
    const n = Math.round((+el.dataset.count) * p);
    el.textContent = n.toLocaleString("en-US") + (el.dataset.unit || "");
  });
  document.querySelectorAll(".caret").forEach((el) => {
    el.style.opacity = Math.sin(t * 9) > 0 ? "1" : "0";
  });
  document.querySelectorAll(".sweep").forEach((el) => {
    const p = seg(t, +el.dataset.a, +el.dataset.b);
    el.style.opacity = p > 0 && p < 1 ? "0.9" : "0";
    el.style.transform = "translateX(" + lerp(-220, 1760, q5(p)) + "px)";
  });
  document.querySelectorAll("[data-pop]").forEach((el) => {
    if (el.dataset.float) return;
    const p = seg(t, +el.dataset.pop, +el.dataset.pop + 0.45);
    const s = p <= 0 ? 0.92 : p >= 1 ? 1 : back(p);
    el.style.transform = "scale(" + s.toFixed(3) + ")";
  });
  document.querySelectorAll("[data-float]").forEach((el) => {
    const k = +el.dataset.float || 1;
    const dx = Math.sin(t * 0.55 + k * 1.7) * 5;
    const dy = Math.cos(t * 0.4 + k) * 4;
    let s = 1;
    if (el.dataset.pop) {
      const p = seg(t, +el.dataset.pop, +el.dataset.pop + 0.42);
      s = p <= 0 ? 0.9 : p >= 1 ? 1 : back(p);
    }
    if (el.dataset.at) el.style.opacity = String(eo(seg(t, +el.dataset.at, +el.dataset.at + 0.4)));
    el.style.transform = "translate(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px) scale(" + s.toFixed(3) + ")";
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
.letters{display:flex;justify-content:center;gap:0.012em;font-weight:560;letter-spacing:-.06em;line-height:.92;white-space:nowrap}
.letters span{display:inline-block;opacity:0}
.stack{display:flex;flex-direction:column;align-items:center;gap:14px}
.logo{display:none;height:64px;width:auto}
.ctaName{font-size:84px;font-weight:560;letter-spacing:-.055em;color:#0D1222}
.url{font-size:36px;font-weight:560;letter-spacing:-.04em;text-decoration:none;margin-top:18px}
.endRule{width:120px;height:3px;border-radius:99px;margin-top:22px;transform-origin:0 50%}
.badge{position:fixed;top:22px;left:22px;z-index:20;font-size:13px;font-weight:560;letter-spacing:.12em;text-transform:uppercase;color:#0D1222;background:#fff;border-radius:999px;padding:7px 12px;box-shadow:0 0 0 1px rgba(13,18,34,.18),0 8px 20px rgba(0,0,0,.28)}
#back{position:absolute;left:0;top:0;width:1920px;height:9000px;pointer-events:none}
#grid{position:absolute;left:0;top:0;width:1920px;height:9000px;pointer-events:none;opacity:.8;background-image:linear-gradient(rgba(13,18,34,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(13,18,34,.08) 1px,transparent 1px);background-size:64px 64px}
#grain{position:fixed;inset:0;width:1920px;height:1080px;pointer-events:none;opacity:.045;z-index:15}
.orb{position:absolute;width:520px;height:520px;border-radius:99px;opacity:.16;filter:blur(46px)}
.speck{position:absolute;width:7px;height:7px;border-radius:99px;opacity:.45}
.caret{display:inline-block;width:2px;height:.85em;background:currentColor;margin-left:3px;vertical-align:-1px}
.sweep{position:absolute;top:0;width:160px;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.7),transparent);pointer-events:none;opacity:0}
.cursor{position:absolute;z-index:6;width:28px;height:28px;pointer-events:none}
.cursor svg{display:block}
.ring{position:absolute;left:-10px;top:-10px;width:36px;height:36px;border-radius:99px;border:2px solid currentColor;opacity:0}
`;

export function page({ font, css, body, state, extra = "", accent = "#2E4BDB" }) {
  const safeFont = String(font || "/fonts/Geist-Variable.woff2").replace(/["'()\\\s]/g, "");
  const json = JSON.stringify(state).replace(/</g, "\\u003c");
  const orbs = [0, 1, 2, 3, 4, 5]
    .map(
      (i) =>
        `<i class="orb" data-drift="${i % 2 ? 1.2 : 0.7}" style="left:${i % 2 ? 1380 : 80}px;top:${i * 1080 + 160}px;background:${accent}"></i>`,
    )
    .join("");
  const specks = Array.from({ length: 16 }, (_, i) => {
    const left = (i * 211) % 1800;
    const top = (i * 347) % 8600;
    return `<i class="speck" data-drift="${(0.5 + (i % 4) * 0.25).toFixed(2)}" style="left:${left}px;top:${top}px;background:${accent}"></i>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:G;src:url("${safeFont}") format("woff2");font-weight:100 900;font-display:swap}
${BASE_CSS}
${css}
</style></head><body>
<div id="back">${orbs}${specks}</div>
<div id="grid"></div>
<svg id="grain" xmlns="http://www.w3.org/2000/svg"><filter id="grainf"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#grainf)"/></svg>
<div class="badge">Sample product</div>
<div id="world">${body}</div>
<script id="state" type="application/json">${json}</script>
<script>${RUNTIME}
${extra}
</script>
</body></html>`;
}

export function endScene(plan, top, at = 0) {
  return `<section class="scene" style="top:${top}px"><div class="mid">
    <img class="logo" alt="">
    <div class="ctaName">${esc(plan.name)}</div>
    <div class="url letters" style="color:${plan.accent}">${letterLine(plan.hostname, at + 0.12, 0.032)}</div>
    <div class="endRule" style="background:${plan.accent}" data-grow="${(at + 0.28).toFixed(2)}"></div>
    <div class="sweep" data-a="${(at + 0.18).toFixed(2)}" data-b="${(at + 1.05).toFixed(2)}"></div>
  </div></section>`;
}
