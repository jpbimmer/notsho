import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveTypography, fontStylesheets, DEFAULT_TYPOGRAPHY, TYPOGRAPHY_DERIVED_TOKENS, fonts } from "./typography.ts";
import { deriveShape, DEFAULT_SHAPE, SHAPE_DERIVED_TOKENS } from "./shape.ts";
import { deriveMotion, DEFAULT_MOTION, MOTION_DERIVED_TOKENS } from "./motion.ts";
import { tokenTier, tokens } from "@notsho/tokens";

const allThemable = (o: object) => { for (const k of Object.keys(o)) { assert.ok(k in tokens, `unknown token ${k}`); assert.notEqual(tokenTier[k as keyof typeof tokens], "primitive", `primitive ${k}`); } };

test("typography derives valid tokens and follows body for heading", () => {
  const d = deriveTypography(DEFAULT_TYPOGRAPHY);
  allThemable(d);
  assert.equal(d["font.heading"], "var(--notsho-font-body)");
  assert.equal(d["text.body-size"], "1rem");
  const serif = deriveTypography({ ...DEFAULT_TYPOGRAPHY, heading: "fraunces", size: 18 });
  assert.match(serif["font.heading"] as string, /Fraunces/);
  assert.equal(serif["text.heading-tracking"], "-0.005em");
  assert.equal(serif["text.body-size"], "1.125rem");
  assert.deepEqual(Object.keys(d), TYPOGRAPHY_DERIVED_TOKENS);
});

test("fontStylesheets only for google fonts, deduped", () => {
  assert.deepEqual(fontStylesheets(DEFAULT_TYPOGRAPHY), []);
  const [url] = fontStylesheets({ body: "inter", heading: "inter", code: "jetbrains" });
  assert.match(url!, /^https:\/\/fonts\.googleapis\.com\/css2\?family=Inter/);
  assert.equal((url!.match(/family=/g) ?? []).length, 2);
  assert.ok(fonts.every((f) => f.stack.length > 0));
});

test("shape derives radius/density/elevation/border", () => {
  const d = deriveShape(DEFAULT_SHAPE);
  allThemable(d);
  assert.equal(d["radius.control"], "0.375rem");
  assert.equal(deriveShape({ ...DEFAULT_SHAPE, radius: "pill" })["radius.control"], "9999px");
  assert.equal(deriveShape({ ...DEFAULT_SHAPE, density: "compact" })["size.control"], "2rem");
  assert.equal(deriveShape({ ...DEFAULT_SHAPE, borders: "bold" })["border.width"], "2px");
  assert.equal(deriveShape({ ...DEFAULT_SHAPE, elevation: "flat" })["shadow.raised"], "none");
  assert.deepEqual(Object.keys(d).sort(), [...SHAPE_DERIVED_TOKENS].sort());
});

test("motion derives durations", () => {
  allThemable(deriveMotion(DEFAULT_MOTION));
  assert.equal(deriveMotion({ speed: "off" })["motion.duration-slow"], "0ms");
  assert.equal(deriveMotion({ speed: "expressive" })["motion.duration-normal"], "320ms");
  assert.equal(MOTION_DERIVED_TOKENS.length, 6);
});
