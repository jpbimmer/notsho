/**
 * Bridge Notsho's motion tokens (CSS custom properties the customizer can
 * change at runtime) into numbers Motion can use.
 */
import { useTheme, useThemeRoot } from "@notsho/theme";
import { useMemo } from "react";

type Bezier = [number, number, number, number];

function readVarFrom(el: HTMLElement | undefined, name: string) {
  if (!el) return "";
  return getComputedStyle(el).getPropertyValue(name).trim();
}

function seconds(v: string, fallback: number) {
  const m = /^([\d.]+)(ms|s)$/.exec(v);
  if (!m) return fallback;
  return m[2] === "ms" ? Number(m[1]) / 1000 : Number(m[1]);
}

function bezier(v: string, fallback: Bezier): Bezier {
  const m = /cubic-bezier\(([^)]+)\)/.exec(v);
  const n = m?.[1]?.split(",").map(Number);
  return n && n.length === 4 && n.every((x) => Number.isFinite(x)) ? (n as Bezier) : fallback;
}

/** Current motion tokens; recomputed when the theme changes. */
export function useMotionTokens() {
  const { theme } = useTheme();
  // Inside an app's theme scope, read the scope's tokens rather than the page's.
  const root = useThemeRoot();
  const readVar = (name: string) => readVarFrom(root, name);
  // biome-ignore lint/correctness/useExhaustiveDependencies: theme changes rewrite the CSS variables we read
  return useMemo(
    () => ({
      fast: seconds(readVar("--notsho-motion-duration-fast"), 0.12),
      normal: seconds(readVar("--notsho-motion-duration-normal"), 0.2),
      slow: seconds(readVar("--notsho-motion-duration-slow"), 0.32),
      standard: bezier(readVar("--notsho-motion-easing-standard"), [0.2, 0, 0, 1]),
      enter: bezier(readVar("--notsho-motion-easing-enter"), [0, 0, 0, 1]),
      exit: bezier(readVar("--notsho-motion-easing-exit"), [0.3, 0, 1, 1]),
    }),
    [theme, root],
  );
}
