import assert from "node:assert/strict";
import test from "node:test";
import { acceptFill } from "../src/direct.js";
import { compose, SAMPLE_BRIEF, screenText } from "../src/index.js";

test("halal screen declines gambling, betting, adult, alcohol and drugs", () => {
  assert.equal(screenText("a sportsbook for friends").ok, false);
  assert.equal(screenText("prediction market for elections").ok, false);
  assert.equal(screenText("onlyfans growth tool").ok, false);
  assert.equal(screenText("craft beer club").ok, false);
  assert.equal(screenText("we sell cannabis online").ok, false);
  assert.equal(screenText("Northstar writes launch posts").ok, true);
  assert.equal(screenText("calendar time slots for a team").ok, true);
});

test("sample brief becomes a 30–40s film with no 3D and a real URL", () => {
  const film = compose(SAMPLE_BRIEF, { fontUrl: "/fonts/Geist-Variable.woff2" });
  assert.equal(film.ok, true);
  assert.ok(film.duration >= 30 && film.duration <= 40, `duration ${film.duration}`);
  assert.match(film.html, /function render\(t\)/);
  assert.match(film.html, /northstar\.example/);
  assert.match(film.html, /Sample interface/);
  assert.match(film.html, /Sample film/);
  assert.match(film.html, /#0E7C66/i);
  assert.doesNotMatch(film.html, /perspective|rotateX|rotateY|matrix3d/i);
  assert.doesNotMatch(film.html, /soundtrack|spotify|music bed/i);
  assert.ok(film.events.some((e) => e.sfx === "whoosh" && e.align === "peak"));
  assert.ok(film.events.every((e) => e.t >= 0 && e.t < film.duration));
});

test("a gambling brief is refused before any film is made", () => {
  const film = compose({ ...SAMPLE_BRIEF, name: "Lucky Casino" });
  assert.equal(film.ok, false);
  assert.match(film.reason, /gambling|betting/i);
});

test("a model cannot invent claims that were not in the brief", () => {
  const brief = { ...SAMPLE_BRIEF };
  const dropped = acceptFill(brief, { hook: "10,000 teams switched", swaps: ["drafts"] });
  assert.equal(dropped.hook, null);
  assert.deepEqual(dropped.swaps, ["drafts"]);
  const ok = acceptFill(brief, { hook: "Launch posts look generic", swaps: ["brand drafts"] });
  assert.ok(ok);
  assert.equal(ok.hook, "Launch posts look generic");
});
