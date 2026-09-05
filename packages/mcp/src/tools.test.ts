import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveTheme, getComponent, getToken, listComponents, listTokens, rules, validate, meta } from "./tools.ts";

test("list/get tokens", () => {
  const all = listTokens();
  assert.equal(all.length, meta.tokenCount);
  const acc = listTokens({ query: "accent", tier: "semantic" });
  assert.ok(acc.length >= 6 && acc.every((t) => t.tier === "semantic"));
  const t = getToken("color.accent")!;
  assert.equal(t.cssVar, "--notsho-color-accent");
  assert.ok(t.usedBy.includes("button"));
  assert.equal(t.themable, true);
  assert.equal(getToken("--notsho-color-blue-500")!.themable, false);
  assert.equal(getToken("nope"), null);
});

test("components expose props and files", () => {
  const list = listComponents("/nonexistent");
  assert.equal(list.length, meta.componentCount);
  const b = getComponent("button", "/nonexistent")!;
  assert.ok(b.exports.includes("Button"));
  const props = b.props.find((p) => p.name === "ButtonProps")!;
  assert.ok(props.members.some((m) => m.name === "variant" && m.doc?.includes("Visual weight")));
  assert.ok(b.files.some((f) => f.path.endsWith("button.module.css")));
  assert.equal(b.install, "npx notsho add button");
  assert.equal(getComponent("nope"), null);
});

test("validate finds hardcoded values", () => {
  const r = validate({ source: ".a{color:#fff}", filename: "a.css" });
  assert.equal(r.findings.length, 1);
  assert.equal(validate({ source: ".a{color:var(--notsho-color-text)}", filename: "a.css" }).findings.length, 0);
  assert.throws(() => validate({}), /Provide/);
});

test("derive_theme composes sections", () => {
  const r = deriveTheme({ preset: "violet", shape: { radius: "pill" }, motion: { speed: "off" } });
  assert.ok(r.overrides["color.accent"]);
  assert.equal(r.overrides["radius.control"], "9999px");
  assert.equal(r.overrides["motion.duration-slow"], "0ms");
  assert.match(r.css, /--notsho-radius-control:9999px/);
  assert.deepEqual(Object.keys(r.meta).sort(), ["colors", "motion", "shape"]);
  assert.throws(() => deriveTheme({ preset: "nope" }), /Unknown preset/);
});

test("rules render", () => {
  const r = rules("/nonexistent", "app/ui");
  assert.ok(r.includes("app/ui/"));
  assert.ok(r.includes("`color.accent`"));
});
