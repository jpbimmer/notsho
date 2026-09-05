/** Motion derivation: one speed choice → durations and easing. */
import type { ThemeOverrides } from "@notsho/tokens";

export type Speed = "off" | "reduced" | "normal" | "expressive";
export interface MotionChoices { speed: Speed }
export const DEFAULT_MOTION: MotionChoices = { speed: "normal" };

const SPEED: Record<Speed, ThemeOverrides> = {
  off:        { "motion.duration-fast": "0ms", "motion.duration-normal": "0ms", "motion.duration-slow": "0ms", "motion.easing-standard": "linear", "motion.easing-enter": "linear", "motion.easing-exit": "linear" },
  reduced:    { "motion.duration-fast": "60ms", "motion.duration-normal": "100ms", "motion.duration-slow": "160ms", "motion.easing-standard": "cubic-bezier(0.2, 0, 0, 1)", "motion.easing-enter": "cubic-bezier(0, 0, 0.2, 1)", "motion.easing-exit": "cubic-bezier(0.4, 0, 1, 1)" },
  normal:     { "motion.duration-fast": "120ms", "motion.duration-normal": "200ms", "motion.duration-slow": "320ms", "motion.easing-standard": "cubic-bezier(0.2, 0, 0, 1)", "motion.easing-enter": "cubic-bezier(0, 0, 0.2, 1)", "motion.easing-exit": "cubic-bezier(0.4, 0, 1, 1)" },
  expressive: { "motion.duration-fast": "180ms", "motion.duration-normal": "320ms", "motion.duration-slow": "520ms", "motion.easing-standard": "cubic-bezier(0.2, 0, 0, 1)", "motion.easing-enter": "cubic-bezier(0.34, 1.4, 0.64, 1)", "motion.easing-exit": "cubic-bezier(0.4, 0, 1, 1)" },
};

export const deriveMotion = (c: MotionChoices): ThemeOverrides => ({ ...SPEED[c.speed] });
export const MOTION_DERIVED_TOKENS = Object.keys(SPEED.normal) as (keyof ThemeOverrides)[];
