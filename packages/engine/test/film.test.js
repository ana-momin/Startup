import assert from "node:assert/strict";
import test from "node:test";
import { acceptFill } from "../src/direct.js";
import { chooseTemplate, compose, SAMPLE_BRIEF, SAMPLES, screenText } from "../src/index.js";
import { beats } from "../src/motion.js";

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
  assert.match(film.html, /Sample product/);
  assert.doesNotMatch(film.html, /Sample only|Running · sample|Sample interface/);
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

test("three templates stay distinct and inside 30–40 seconds", () => {
  const films = SAMPLES.map((brief) => compose(brief, { fontUrl: "/fonts/Geist-Variable.woff2" }));
  for (const film of films) {
    assert.equal(film.ok, true);
    assert.ok(film.duration >= 30 && film.duration <= 40, `${film.template} ${film.duration}`);
    assert.match(film.html, /Sample product/);
    assert.doesNotMatch(film.html, /perspective|rotateX|rotateY|matrix3d/i);
  }
  assert.equal(films[0].template, "launch");
  assert.equal(films[1].template, "holo");
  assert.equal(films[2].template, "workflow");
  assert.match(films[1].html, /class="pill"/);
  assert.match(films[2].html, /class="node"/);
  assert.notEqual(films[0].html, films[1].html);
});

test("a supplied logo is placed, and an invented claim is not", () => {
  const logo = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>');
  const film = compose({ ...SAMPLE_BRIEF, logo });
  assert.equal(film.ok, true);
  assert.match(film.html, /class="logo"/);
  assert.match(film.html, /data:image\/svg\+xml/);
});

test("the brief picks a template when the user does not", () => {
  assert.equal(chooseTemplate({ name: "A", problem: "Handoffs stall", features: ["A trigger"] }), "workflow");
  assert.equal(chooseTemplate({ name: "A", problem: "The inbox piles up", features: ["An agent drafts it"] }), "holo");
  assert.equal(chooseTemplate({ name: "Northstar", problem: "Posts take a week", features: ["Drafts"] }), "launch");
});

test("the same brief always makes the same film", () => {
  const a = compose(SAMPLE_BRIEF);
  const b = compose(SAMPLE_BRIEF);
  assert.equal(a.html, b.html);
  assert.deepEqual(a.events, b.events);
});

test("a name cannot inject markup into the film", () => {
  const film = compose({ ...SAMPLE_BRIEF, name: "<script>alert(1)</script>" });
  assert.equal(film.ok, true);
  assert.doesNotMatch(film.html, /<script>alert/);
});

test("stagger beats follow the shared motion scale", () => {
  assert.deepEqual(beats(1, 3), [1, 1.16, 1.32]);
});

test("workflow uses the shared queue, not an empty stair", () => {
  const film = compose(SAMPLES[2]);
  assert.match(film.html, /class="qrow"/);
  assert.match(film.html, /class="qwin"/);
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
