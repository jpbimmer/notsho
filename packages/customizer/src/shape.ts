/** Shape + density derivation: radius, border, shadow, spacing scale → tokens. */
import type { ThemeOverrides } from "@notsho/tokens";

export type Radius = "sharp" | "soft" | "rounded" | "round" | "pill";
export type Density = "compact" | "comfortable" | "spacious";
export type Elevation = "flat" | "soft" | "lifted";

export interface ShapeChoices { radius: Radius; density: Density; elevation: Elevation; borders: "hairline" | "bold" }
export const DEFAULT_SHAPE: ShapeChoices = { radius: "rounded", density: "comfortable", elevation: "soft", borders: "hairline" };

const RADIUS: Record<Radius, { control: string; card: string; overlay: string }> = {
  sharp:   { control: "0px", card: "0px", overlay: "0px" },
  soft:    { control: "0.25rem", card: "0.375rem", overlay: "0.5rem" },
  rounded: { control: "0.375rem", card: "0.5rem", overlay: "0.75rem" },
  round:   { control: "0.625rem", card: "0.875rem", overlay: "1.125rem" },
  pill:    { control: "9999px", card: "1.25rem", overlay: "1.5rem" },
};

const DENSITY: Record<Density, Partial<ThemeOverrides>> = {
  compact:     { "size.control": "2rem", "size.control-sm": "1.625rem", "size.control-lg": "2.375rem", "space.control-x": "0.625rem", "space.control-y": "0.375rem", "space.inset": "0.75rem", "space.inset-lg": "1.125rem", "space.stack": "0.5rem", "space.section": "1.5rem" },
  comfortable: { "size.control": "2.25rem", "size.control-sm": "1.875rem", "size.control-lg": "2.75rem", "space.control-x": "0.75rem", "space.control-y": "0.5rem", "space.inset": "1rem", "space.inset-lg": "1.5rem", "space.stack": "0.75rem", "space.section": "2rem" },
  spacious:    { "size.control": "2.625rem", "size.control-sm": "2.125rem", "size.control-lg": "3.125rem", "space.control-x": "1rem", "space.control-y": "0.625rem", "space.inset": "1.375rem", "space.inset-lg": "2rem", "space.stack": "1rem", "space.section": "2.75rem" },
};

const ELEVATION: Record<Elevation, Partial<ThemeOverrides>> = {
  flat:   { "shadow.raised": "none", "shadow.floating": "0 0 0 1px var(--notsho-color-border)", "shadow.overlay": "0 0 0 1px var(--notsho-color-border)" },
  soft:   { "shadow.raised": "var(--notsho-shadow-sm)", "shadow.floating": "var(--notsho-shadow-lg)", "shadow.overlay": "var(--notsho-shadow-xl)" },
  lifted: { "shadow.raised": "var(--notsho-shadow-md)", "shadow.floating": "var(--notsho-shadow-xl)", "shadow.overlay": "0 32px 80px oklch(0 0 0 / 0.28), 0 8px 24px oklch(0 0 0 / 0.12)" },
};

export function deriveShape(c: ShapeChoices): ThemeOverrides {
  const r = RADIUS[c.radius];
  return {
    "radius.control": r.control, "radius.card": r.card, "radius.overlay": r.overlay,
    "border.width": c.borders === "bold" ? "2px" : "1px",
    ...DENSITY[c.density],
    ...ELEVATION[c.elevation],
  };
}

export const SHAPE_DERIVED_TOKENS = Object.keys(deriveShape(DEFAULT_SHAPE)) as (keyof ThemeOverrides)[];
