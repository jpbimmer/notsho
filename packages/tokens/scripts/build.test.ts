import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, compileCss, compileTs, compileTailwind } from "./build.ts";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(join(here, "../src/tokens.json"), "utf8");

test("compiles the real token source", () => {
  const m = compile(src, "test");
  assert.ok(m.tokens.length > 100);
  const accent = m.tokens.find((t) => t.name === "color.accent")!;
  assert.equal(accent.tier, "semantic");
  assert.equal(accent.type, "color");
  assert.equal(accent.cssVar, "--notsho-color-accent");
  assert.deepEqual(accent.css, { light: "var(--notsho-color-blue-600)", dark: "var(--notsho-color-blue-400)" });
  assert.equal(accent.resolved.light, "oklch(0.53 0.210 255)");
  assert.equal(accent.resolved.dark, "oklch(0.70 0.160 255)");
});

test("chained references resolve per mode", () => {
  const m = compile(src, "test");
  const fr = m.tokens.find((t) => t.name === "color.focus-ring")!;
  assert.equal(fr.css, "var(--notsho-color-accent)");
  assert.equal(fr.resolved.light, "oklch(0.53 0.210 255)");
  assert.equal(fr.resolved.dark, "oklch(0.70 0.160 255)");
  const heading = m.tokens.find((t) => t.name === "font.heading")!;
  assert.equal(heading.css, "var(--notsho-font-body)");
  assert.match(heading.resolved.light, /^system-ui/);
});

test("css has mode blocks and no unresolved braces", () => {
  const css = compileCss(compile(src, "test"));
  assert.doesNotMatch(css, /\{[a-z]/i, "unresolved {reference} in CSS");
  assert.match(css, /\[data-theme="dark"\] \{[\s\S]*--notsho-color-accent: var\(--notsho-color-blue-400\)/);
  assert.match(css, /:root,\n\[data-theme="light"\] \{[\s\S]*--notsho-color-accent: var\(--notsho-color-blue-600\)/);
  assert.match(css, /prefers-color-scheme: dark/);
});

test("ts output exposes every token name", () => {
  const m = compile(src, "test");
  const ts = compileTs(m);
  for (const t of m.tokens) assert.ok(ts.includes(JSON.stringify(t.name)), t.name);
  assert.match(ts, /export type ThemeOverrides/);
});

const wrap = (body: object) => JSON.stringify({ $prefix: "x", ...body });

test("rejects duplicate names across tiers", () => {
  assert.throws(
    () => compile(wrap({ primitive: { a: { $type: "color", $value: "red" } }, semantic: { a: { $type: "color", $value: "blue" } } }), "t"),
    /Duplicate token name "a"/,
  );
});

test("rejects unknown references", () => {
  assert.throws(() => compile(wrap({ semantic: { a: { $type: "color", $value: "{nope}" } } }), "t"), /unknown token "\{nope\}"/);
});

test("rejects upward tier references", () => {
  assert.throws(
    () => compile(wrap({ primitive: { a: { $type: "color", $value: "{b}" } }, semantic: { b: { $type: "color", $value: "red" } } }), "t"),
    /may not reference/,
  );
});

test("rejects circular references", () => {
  assert.throws(
    () => compile(wrap({ semantic: { a: { $type: "color", $value: "{b}" }, b: { $type: "color", $value: "{a}" } } }), "t"),
    /Circular reference/,
  );
});

test("rejects missing $type", () => {
  assert.throws(() => compile(wrap({ semantic: { a: { $value: "red" } } }), "t"), /has no \$type/);
});

test("tailwind preset maps semantic namespaces", () => {
  const tw = compileTailwind(compile(src, "test"));
  assert.match(tw, /@theme inline \{/);
  assert.match(tw, /--color-accent: var\(--notsho-color-accent\);/);
  assert.match(tw, /--radius-control: var\(--notsho-radius-control\);/);
  assert.match(tw, /--spacing-inset: var\(--notsho-space-inset\);/);
  assert.match(tw, /--text-xl: var\(--notsho-size-xl\);/);
  assert.doesNotMatch(tw, /--color-blue-500/, "primitives must not leak into utilities");
});
