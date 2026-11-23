import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compose, composeWithModel, SAMPLE_BRIEF } from "./index.js";
import { synthKit } from "../../sfx/src/synth.js";
import { mix } from "../../sfx/src/mix.js";

const root = path.resolve(import.meta.dirname, "../../..");

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit" });
    child.on("close", (code) => (code ? reject(new Error(`${cmd} exited ${code}`)) : resolve()));
  });
}

const brief = SAMPLE_BRIEF;
const useModel = process.argv.includes("--llm");
const dir = path.join(root, "films/samples/northstar");
const silent = path.join(dir, "out/northstar-silent.mp4");
const final = path.join(dir, "out/northstar-sample.mp4");
const sfxDir = path.join(dir, "sfx");

mkdirSync(dir, { recursive: true });
const made = useModel
  ? await composeWithModel(brief, { fontUrl: "../../_template/lib/Geist-Variable.woff2" })
  : compose(brief, { fontUrl: "../../_template/lib/Geist-Variable.woff2" });
if (!made.ok) {
  console.error(made.reason);
  process.exit(1);
}
writeFileSync(path.join(dir, "film.html"), made.html);
writeFileSync(path.join(dir, "cues.json"), JSON.stringify({ duration: made.duration, events: made.events }, null, 2));
console.log(`film ${made.duration}s → films/samples/northstar/film.html`);

if (!process.argv.includes("--html-only")) {
  await run("node", [path.join(root, "films/_template/render.mjs"), dir, "--out", "northstar-silent.mp4"], root);
  synthKit(sfxDir);
  const mixed = await mix({ video: silent, cues: made.events, sfxDir, out: final, target: -22 });
  console.log(`mixed ${mixed.measured} LUFS → target ${mixed.target}`);
  console.log(final);
}
