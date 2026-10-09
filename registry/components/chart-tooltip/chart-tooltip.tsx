import type { ReactNode } from "react";
import styles from "./chart-tooltip.module.css";

export interface TipState {
  x: number;
  y: number;
  content: ReactNode;
}

/** Hover card positioned inside a chart's relative container; flips left near the right edge. */
export function ChartTooltip({ tip, width }: { tip: TipState | null; width: number }) {
  if (!tip) return null;
  const flip = tip.x > width - 160;
  return (
    <div
      className={styles.tooltip}
      role="status"
      style={{ left: tip.x, top: tip.y, transform: `translate(${flip ? "calc(-100% - 12px)" : "12px"}, -50%)` }}
    >
      {tip.content}
    </div>
  );
}
