import { base, cue, esc, lastAt, lineHtml, words } from "../copy.js";
import { beats } from "../motion.js";
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
  const crew = [
    ["AM", "Amina M.", "9:14"],
    ["JK", "Jamal K.", "9:41"],
    ["RS", "Rafi S.", "10:06"],
    ["NL", "Noor L.", "10:28"],
  ];
  const tags = ["New", "Draft", "Check", "Logged"];
  const when = beats(stair + 0.4, plan.features.length);
  const stairs = plan.features
    .map((title, i) => {
      const [who, name, clock] = crew[i % crew.length];
      return `<div class="qrow" data-at="${when[i]}" data-pop="${when[i]}">
        <i>${who}</i>
        <span><b>${esc(title)}</b><small>${name} · ${clock}</small></span>
        <span class="meter"><u style="width:${[42, 68, 36, 84][i] || 50}%"></u></span>
        <em>${tags[i] || "Live"}</em>
      </div>`;
    })
    .join("");

  const nodes = [
    { title: "The snag", sub: plan.problem, who: "AM", name: "Amina M.", clock: "9:02", tag: "Open" },
    ...plan.features.map((title, i) => ({
      title,
      sub: ["Mail from Maya Chen", "Matched to last week's voice", "Waiting on a yes", "Written into the log"][i] || "In this run",
      who: ["MC", "JO", "AR", "NL"][i] || "RK",
      name: ["Maya Chen", "Jules Okonkwo", "Ari Rahman", "Noor L."][i] || "Rafi K.",
      clock: ["9:14", "9:28", "9:41", "10:02"][i] || "10:20",
      tag: ["Trigger", "Draft", "Check", "Log"][i] || "Step",
    })),
    { title: "Go live", sub: plan.hostname, who: "GO", name: "Ready", clock: "Thursday", tag: "Live" },
  ].slice(0, 6);
  const slots = [
    [36, 24], [620, 24], [1204, 24],
    [36, 430], [620, 430], [1204, 430],
  ].slice(0, nodes.length);
  const skip = new Set(["your", "the", "a", "an", "in", "of", "for", "to", "and", "with", "on", "it", "from", "that", "this", "one"]);
  const mark = (title) => {
    const parts = words(title).filter((w) => !skip.has(w.toLowerCase()));
    const use = parts.length ? parts : words(title);
    if (use.length >= 2) return (use[0][0] + use[1][0]).toUpperCase();
    return (use[0] || "go").slice(0, 2).toUpperCase();
  };
  const logLines = [
    [["9:02", "Opened"], ["9:14", "Amina M."]],
    [["9:06", "Mail in"], ["9:14", "Maya Chen"]],
    [["9:11", "Drafted"], ["9:28", "Jules Okonkwo"]],
    [["9:20", "Held"], ["9:41", "Ari Rahman"]],
    [["9:33", "Logged"], ["10:02", "Noor L."]],
    [["9:40", "Ready"], ["Thu", "Go live"]],
  ];
  const nodeHtml = nodes
    .map((n, i) => {
      const hot = i === nodes.length - 1 ? " hot" : "";
      const lines = logLines[i] || logLines[0];
      return `<div class="node${hot}" data-at="${(map + 0.22 + i * 0.28).toFixed(2)}" style="left:${slots[i][0]}px;top:${slots[i][1]}px">
        <div class="nh"><i>${esc(mark(n.title))}</i><span><b>${esc(n.title)}</b><small>${esc(n.name)} · ${n.clock}</small></span><em class="before">${n.tag}</em>${hot ? '<em class="after">Live</em>' : ""}</div>
        <p>${esc(n.sub)}</p>
        <ul class="log">${lines.map(([t, who]) => `<li><b>${t}</b> ${esc(who)}</li>`).join("")}<li><b>Now</b> ${n.tag}</li></ul>
        <div class="nmeter"><u style="width:${[28, 46, 62, 54, 74, 100][i] || 50}%"></u></div>
      </div>`;
    })
    .join("");
  const wires = slots
    .slice(0, -1)
    .map((a, i) => {
      const b = slots[i + 1];
      if (Math.abs(a[1] - b[1]) > 20) return "";
      const y = a[1] + 160;
      return `<line x1="${a[0] + 540}" y1="${y}" x2="${b[0]}" y2="${y}" />`;
    })
    .join("");

  const css = `
.hookWord{font-size:108px}
.qwin{width:1680px;height:900px;background:#fff;border-radius:28px;box-shadow:0 0 0 1px ${plan.line},0 30px 80px rgba(13,18,34,.1);display:flex;flex-direction:column;overflow:hidden}
.qwin header{height:72px;display:flex;align-items:center;gap:12px;padding:0 24px;border-bottom:1px solid ${plan.line}}
.qwin header .dot{width:12px;height:12px;border-radius:99px;background:${plan.accent}}
.qwin header small{color:${plan.muted}}
.qwin header span{margin-left:auto;background:${plan.accentSoft};color:${plan.accent};border-radius:99px;padding:6px 10px;font-size:13px;font-weight:560}
.qbody{flex:1;display:flex;min-height:0}
.qlist{flex:1;padding:20px;display:flex;flex-direction:column;gap:12px;min-height:0}
.qchart{flex:1;display:flex;align-items:flex-end;gap:14px;min-height:140px;padding-top:8px}
.qchart div{flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:6px}
.qchart b{width:100%;background:${plan.accent};border-radius:6px 6px 2px 2px;display:block}
.qchart div:nth-child(odd) b{background:${plan.accentSoft}}
.qchart small{color:${plan.muted};font-size:12px}
.qrow{height:92px;border:1px solid ${plan.line};border-radius:16px;display:flex;align-items:center;gap:14px;padding:0 16px;opacity:0}
.qrow i{width:40px;height:40px;border-radius:99px;background:${plan.accentSoft};color:${plan.accent};display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:560;font-size:12px;flex:none}
.qrow span{display:flex;flex-direction:column;gap:3px;min-width:0}
.qrow b{font-size:20px;font-weight:560;letter-spacing:-.03em}
.qrow small{color:${plan.muted};font-size:13px}
.qrow .meter{width:140px;height:6px;border-radius:99px;background:#E4E7EE;margin-left:auto;flex:none}
.qrow .meter u{display:block;height:100%;background:${plan.accent};border-radius:99px;text-decoration:none}
.qrow em{font-style:normal;background:${plan.accentSoft};color:${plan.accent};border-radius:99px;padding:6px 10px;font-size:13px;font-weight:560}
.qbody aside{width:380px;border-left:1px solid ${plan.line};padding:28px;display:flex;flex-direction:column;gap:12px}
.qbody aside p{font-size:22px;line-height:1.35;letter-spacing:-.03em}
.qstat{display:flex;flex-direction:column;gap:6px;line-height:1}
.qstat b{font-size:56px;letter-spacing:-.05em}
.qstat small{display:block;color:${plan.muted};font-size:14px}
.panel{position:absolute;left:40px;top:96px;width:1840px;height:940px;background:#fff;border-radius:32px;box-shadow:0 0 0 1px ${plan.line},0 30px 80px rgba(13,18,34,.08);display:flex;flex-direction:column;overflow:hidden}
.boardHead{height:72px;display:flex;align-items:center;gap:12px;padding:0 28px;border-bottom:1px solid ${plan.line};flex:none}
.boardHead b{font-size:20px;letter-spacing:-.03em}
.boardHead small{color:${plan.muted}}
.boardHead span{margin-left:auto;background:${plan.accentSoft};color:${plan.accent};border-radius:99px;padding:6px 12px;font-weight:560;font-size:14px}
.board{position:relative;flex:1;background-image:radial-gradient(${plan.line} 1.2px, transparent 1.2px);background-size:22px 22px}
.wires{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.wires line{stroke:${plan.accent};stroke-width:2;stroke-dasharray:6 8;opacity:.55}
#traveler{position:absolute;width:18px;height:18px;border-radius:99px;background:${plan.accent};box-shadow:0 0 0 6px ${plan.accentSoft};z-index:4}
.node{position:absolute;width:540px;height:340px;background:#fff;border-radius:22px;box-shadow:0 16px 40px rgba(13,18,34,.1);padding:20px 22px;display:flex;flex-direction:column;gap:12px;opacity:0}
.log{list-style:none;display:flex;flex-direction:column;gap:8px}
.log li{display:flex;gap:10px;font-size:15px;color:${plan.muted}}
.log b{width:64px;flex:none;color:${plan.ink};font-weight:560}
.nh{display:flex;align-items:center;gap:12px}
.nh i{width:42px;height:42px;border-radius:12px;background:${plan.accentSoft};color:${plan.accent};display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:560;font-size:13px;flex:none}
.nh span{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.nh b{font-size:22px;font-weight:560;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.nh small{color:${plan.muted};font-size:13px}
.nh em{font-style:normal;border-radius:99px;padding:6px 10px;font-size:13px;font-weight:560;flex:none}
.nh em.before{background:${plan.accentSoft};color:${plan.accent}}
.nh em.after{display:none;background:${plan.accent};color:#fff}
.node.show em.before{display:none}
.node.show em.after{display:inline}
.node p{font-size:18px;line-height:1.35;color:${plan.ink}}
.nmeter{margin-top:auto;height:8px;border-radius:99px;background:#E4E7EE}
.nmeter u{display:block;height:100%;border-radius:99px;background:${plan.accent};text-decoration:none}
`;

  const body = `
<section class="scene" style="top:0;background:radial-gradient(90% 80% at 50% 100%, ${plan.accentSoft} 0%, ${plan.bg} 55%)"><div class="mid"><div class="stack hookWord">${hook}</div></div></section>
<section class="scene" style="top:1080px"><div class="mid"><div class="qwin">
  <header><i class="dot"></i><b>${esc(plan.name)}</b><small>Queue · ${esc(plan.hostname)}</small><span>${plan.features.length} open</span></header>
  <div class="qbody">
    <div class="qlist">${stairs}<div class="qchart">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => `<div><b style="height:${[40, 62, 48, 80, 55, 30, 44][i]}%"></b><small>${d}</small></div>`).join("")}</div></div>
    <aside><strong>The snag</strong><p>${esc(plan.problem)}</p><div class="qstat"><b data-count="${plan.features.length}" data-from="${(stair + 0.5).toFixed(2)}">0</b><small>steps in this run</small></div></aside>
  </div>
</div></div></section>
<section class="scene" style="top:2160px">
  <div class="panel">
    <header class="boardHead"><i class="dot"></i><b>How ${esc(plan.name)} runs</b><small>${esc(plan.hostname)}</small><span>${nodes.length} steps</span></header>
    <div class="board">
      <svg class="wires" viewBox="0 0 1840 936">${wires}</svg>
      <i id="traveler"></i>${nodeHtml}
      <div id="cur" class="cursor" style="color:${plan.accent}"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 3 L5 19 L10 15 L14 21 L17 19 L13 13 L19 13 Z" fill="#0D1222"/></svg><i id="ring" class="ring"></i></div>
    </div>
  </div>
</section>
${endScene(plan, 3240, cta)}`;

  const state = {
    grey: plan.grey,
    ink: plan.ink,
    slide,
    end,
    stops: [0, stair, map, cta].map((t, i) => ({ t, y: i * 1080 })),
    map,
    points: slots.map(([x, y]) => [x + 520, y + 168]),
    hit: +(map + 5.15).toFixed(2),
    logo: plan.logo,
  };
  const extra = `
function extra(t) {
  document.querySelectorAll(".stair,.node").forEach((el) => {
    el.style.opacity = String(eo(seg(t, +el.dataset.at, +el.dataset.at + 0.35)));
  });
  const pts = STATE.points;
  let travel = q5(seg(t, STATE.map + 0.9, STATE.map + 4.4));
  if (t > STATE.map + 4.4) {
    const loop = (Math.sin((t - STATE.map - 4.4) * 1.6) + 1) / 2;
    travel = 0.78 + loop * 0.22;
  }
  const span = Math.max(pts.length - 1, 1);
  const f = travel * span;
  const i = Math.min(span - 1, Math.floor(f));
  const local = f - i;
  const x = lerp(pts[i][0], pts[Math.min(i + 1, pts.length - 1)][0], local);
  const y = lerp(pts[i][1], pts[Math.min(i + 1, pts.length - 1)][1], local);
  $("traveler").style.left = (x - 8) + "px";
  $("traveler").style.top = (y - 8) + "px";
  const move = q5(seg(t, STATE.map + 4.45, STATE.hit - 0.08));
  $("cur").style.opacity = String(eo(seg(t, STATE.map + 4.3, STATE.map + 4.65)));
  $("cur").style.left = lerp(280, 1660, move) + "px";
  $("cur").style.top = lerp(180, 446, move) + "px";
  const pressing = t >= STATE.hit && t < STATE.hit + 0.18;
  $("cur").style.transform = "scale(" + (pressing ? 0.82 : 1) + ")";
  const click = seg(t, STATE.hit, STATE.hit + 0.36);
  $("ring").style.opacity = String(click > 0 && click < 1 ? 1 - click : 0);
  const last = document.querySelector(".node.hot");
  if (last) last.classList.toggle("show", t > STATE.hit + 0.12);
}`;

  const events = [
    cue(plan.hook[0][0].at, "tick", { gain: -8 }),
    plan.hook[1]?.[0] ? cue(plan.hook[1][0].at, "tick", { gain: -10 }) : null,
    cue(stair, "whoosh", { align: "peak", gain: -2 }),
    ...when.map((t) => cue(t, "click", { gain: -7 })),
    cue(map, "whoosh", { align: "peak", gain: -2 }),
    ...nodes.map((_, i) => cue(map + 0.3 + i * 0.38, "tick", { gain: -10 })),
    cue(map + 1.6, "ui", { gain: -8 }),
    cue(map + 5.15, "click", { gain: -5 }),
    cue(cta, "whoosh", { align: "peak", gain: -1 }),
    cue(cta + 0.25, "chime", { gain: -6 }),
    cue(cta + 0.55, "thud", { gain: -4 }),
  ].filter(Boolean);

  return { html: page({ font: opts.fontUrl, css, body, state, extra, accent: plan.accent }), duration: end, events, hostname: plan.hostname, template: "workflow" };
}
