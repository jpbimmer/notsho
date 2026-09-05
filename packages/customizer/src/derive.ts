/**
 * Theme derivation: a few user choices → a coherent set of token overrides.
 * Everything here is pure so it can be tested and reused by the CLI.
 */
import type { ThemeOverrides } from "@notsho/tokens";
import { clampToGamut, contrast, formatOklch, hexToOklch, type Oklch } from "./color.js";

export interface ColorChoices {
  /** Accent as a hex string, e.g. "#2563eb". */
  accent: string;
  /** 0..1. How much of the accent hue bleeds into neutrals. 0 = pure gray. */
  tint: number;
}

export const WHITE: Oklch = { l: 1, c: 0, h: 0 };
export const NEAR_BLACK: Oklch = { l: 0.14, c: 0.006, h: 250 };

const range = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const mode = (light: Oklch, dark: Oklch) => ({ light: formatOklch(clampToGamut(light)), dark: formatOklch(clampToGamut(dark)) });

/**
 * Derive the accent family. The user's lightness is respected within a band
 * that keeps white-or-black text readable; hover/active step away from the
 * surface (darker in light mode, lighter in dark mode).
 */
export function deriveAccent(hex: string): ThemeOverrides {
  const base = hexToOklch(hex);
  if (!base) return {};
  const { c, h } = base;

  const light: Oklch = { l: range(base.l, 0.42, 0.66), c, h };
  const dark: Oklch = { l: range(base.l, 0.66, 0.82), c: Math.min(c, 0.2), h };

  const onLight = contrast(light, WHITE) >= contrast(light, NEAR_BLACK) ? WHITE : NEAR_BLACK;
  const onDark = contrast(dark, WHITE) >= contrast(dark, NEAR_BLACK) ? WHITE : NEAR_BLACK;

  return {
    "color.accent": mode(light, dark),
    "color.accent-hover": mode({ ...light, l: light.l - 0.06 }, { ...dark, l: dark.l + 0.06 }),
    "color.accent-active": mode({ ...light, l: light.l - 0.12 }, { ...dark, l: dark.l + 0.12 }),
    "color.accent-subtle": mode({ l: 0.965, c: Math.min(c, 0.035), h }, { l: 0.26, c: Math.min(c, 0.07), h }),
    "color.accent-border": mode({ l: 0.87, c: Math.min(c, 0.09), h }, { l: 0.42, c: Math.min(c, 0.13), h }),
    "color.on-accent": mode(onLight, onDark),
  };
}

/**
 * Tint the neutral surfaces toward the accent hue. Lightness values mirror the
 * gray ramp in tokens.json so tint=0 is visually identical to the default.
 */
export function deriveSurfaces(hex: string, tint: number): ThemeOverrides {
  const base = hexToOklch(hex);
  if (!base || tint <= 0) return {};
  const h = base.h;
  const t = range(tint, 0, 1);
  // Max chroma per lightness band: light surfaces can carry very little before looking dirty.
  const cl = (max: number) => t * max;

  return {
    "color.surface": mode({ l: 0.995, c: cl(0.006), h }, { l: 0.14, c: cl(0.02), h }),
    "color.surface-raised": mode({ l: 1, c: cl(0.004), h }, { l: 0.2, c: cl(0.024), h }),
    "color.surface-sunken": mode({ l: 0.975, c: cl(0.01), h }, { l: 0.12, c: cl(0.018), h }),
    "color.surface-overlay": mode({ l: 1, c: cl(0.004), h }, { l: 0.27, c: cl(0.026), h }),
    "color.surface-hover": mode({ l: 0.955, c: cl(0.014), h }, { l: 0.27, c: cl(0.026), h }),
    "color.surface-active": mode({ l: 0.915, c: cl(0.018), h }, { l: 0.36, c: cl(0.028), h }),
    "color.border": mode({ l: 0.915, c: cl(0.018), h }, { l: 0.27, c: cl(0.026), h }),
    "color.border-strong": mode({ l: 0.855, c: cl(0.022), h }, { l: 0.38, c: cl(0.03), h }),
    "color.text-muted": mode({ l: 0.48, c: cl(0.03), h }, { l: 0.72, c: cl(0.03), h }),
    "color.text-subtle": mode({ l: 0.58, c: cl(0.03), h }, { l: 0.58, c: cl(0.03), h }),
  };
}

export function deriveColors(choices: ColorChoices): ThemeOverrides {
  return { ...deriveAccent(choices.accent), ...deriveSurfaces(choices.accent, choices.tint) };
}

/** All tokens the color derivation may write; used to clear them on reset. */
export const COLOR_DERIVED_TOKENS = Object.keys({
  ...deriveAccent("#2563eb"),
  ...deriveSurfaces("#2563eb", 1),
}) as (keyof ThemeOverrides)[];

export interface Preset { id: string; name: string; accent: string; tint: number }

export const presets: Preset[] = [
  { id: "default", name: "Default", accent: "#2563eb", tint: 0 },
  { id: "graphite", name: "Graphite", accent: "#3f3f46", tint: 0 },
  { id: "forest", name: "Forest", accent: "#15803d", tint: 0.35 },
  { id: "violet", name: "Violet", accent: "#7c3aed", tint: 0.3 },
  { id: "ember", name: "Ember", accent: "#dc4a1f", tint: 0.25 },
  { id: "ocean", name: "Ocean", accent: "#0e7490", tint: 0.45 },
  { id: "rose", name: "Rose", accent: "#db2777", tint: 0.2 },
  { id: "sand", name: "Sand", accent: "#a16207", tint: 0.5 },
];
