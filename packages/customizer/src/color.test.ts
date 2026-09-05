import { test } from "node:test";
import assert from "node:assert/strict";
import { hexToOklch, oklchToHex, contrast, clampToGamut, formatOklch, rgbToOklch, oklchToRgb } from "./color.ts";
import { deriveAccent, deriveSurfaces, deriveColors, presets, COLOR_DERIVED_TOKENS } from "./derive.ts";

const near = (a: number, b: number, eps = 0.01) => assert.ok(Math.abs(a - b) < eps, `${a} !≈ ${b}`);

test("hex ⇄ oklch round-trips", () => {
  for (const hex of ["#000000", "#ffffff", "#2563eb", "#15803d", "#db2777", "#abc"]) {
    const c = hexToOklch(hex)!;
    const back = oklchToHex(c);
    const expected = hex.length === 4 ? "#aabbcc" : hex;
    assert.equal(back, expected);
  }
  assert.equal(hexToOklch("nope"), null);
});

test("known reference values", () => {
  const white = rgbToOklch({ r: 1, g: 1, b: 1 });
  near(white.l, 1, 0.002); near(white.c, 0, 0.002);
  const red = rgbToOklch({ r: 1, g: 0, b: 0 });
  near(red.l, 0.628, 0.005); near(red.c, 0.258, 0.005); near(red.h, 29.2, 0.5);
});

test("gamut clamp reduces chroma only", () => {
  const wild = { l: 0.6, c: 0.4, h: 150 };
  const rgb = oklchToRgb(wild);
  assert.ok(rgb.r < 0 || rgb.g > 1, "should start out of gamut");
  const fixed = clampToGamut(wild);
  assert.equal(fixed.l, wild.l); assert.equal(fixed.h, wild.h); assert.ok(fixed.c < wild.c);
});

test("contrast", () => {
  near(contrast({ l: 1, c: 0, h: 0 }, { l: 0, c: 0, h: 0 }), 21, 0.1);
  assert.ok(contrast({ l: 0.5, c: 0, h: 0 }, { l: 0.5, c: 0, h: 0 }) < 1.01);
});

test("formatOklch", () => {
  assert.equal(formatOklch({ l: 0.53, c: 0.21, h: 255 }), "oklch(0.53 0.21 255)");
  assert.equal(formatOklch({ l: 1, c: 0, h: 0 }, 0.5), "oklch(1 0 0 / 0.5)");
});

test("deriveAccent produces readable on-accent for light and dark accents", () => {
  const blue = deriveAccent("#2563eb");
  assert.deepEqual(blue["color.on-accent"], { light: "oklch(1 0 0)", dark: "oklch(0.14 0.006 250)" });
  const yellow = deriveAccent("#facc15"); // very light: light-mode L gets clamped down, still needs dark text?
  const acc = yellow["color.accent"] as { light: string };
  assert.match(acc.light, /^oklch\(0\.66/); // clamped to the top of the band
  assert.equal(Object.keys(blue).length, 6);
  assert.deepEqual(deriveAccent("garbage"), {});
});

test("hover/active step away from the surface in each mode", () => {
  const d = deriveAccent("#2563eb");
  const L = (s: string) => Number(s.match(/oklch\(([\d.]+)/)![1]);
  const a = d["color.accent"] as { light: string; dark: string };
  const h = d["color.accent-hover"] as { light: string; dark: string };
  assert.ok(L(h.light) < L(a.light)); assert.ok(L(h.dark) > L(a.dark));
});

test("deriveSurfaces: tint 0 is a no-op, tint>0 tints toward accent hue", () => {
  assert.deepEqual(deriveSurfaces("#15803d", 0), {});
  const s = deriveSurfaces("#15803d", 1);
  assert.ok(Object.keys(s).length >= 8);
  for (const [k, v] of Object.entries(s)) {
    const m = v as { light: string; dark: string };
    assert.match(m.light, /oklch\([\d.]+ 0\.0\d+ 1\d\d(\.\d)?\)/, k); // low chroma, green hue
    if (k.startsWith("color.surface") || k.startsWith("color.border")) assert.match(m.light, /^oklch\((1|0\.[89])/, k); // light surfaces stay light
  }
});

test("presets all derive and COLOR_DERIVED_TOKENS covers them", () => {
  for (const p of presets) {
    const o = deriveColors(p);
    assert.ok(Object.keys(o).length >= 6, p.id);
    for (const k of Object.keys(o)) assert.ok(COLOR_DERIVED_TOKENS.includes(k as never), k);
  }
});
