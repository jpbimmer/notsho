import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./stat.module.css";

export interface StatProps extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  label: ReactNode;
  value: ReactNode;
  /** Small unit after the value, e.g. "bottles". */
  unit?: ReactNode;
  /** Change vs. a previous period, e.g. "+12". */
  delta?: ReactNode;
  /** Colors the delta. "neutral" by default. */
  trend?: "up" | "down" | "neutral";
  /** Muted line under the value. */
  hint?: ReactNode;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
}

/** A headline number with its label. Group several in StatGroup. */
export function Stat({ label, value, unit, delta, trend = "neutral", hint, icon, size = "md", className, ...rest }: StatProps) {
  return (
    <div data-size={size} className={cx(styles.stat, className)} {...rest}>
      <div className={styles.label}>
        {icon && <span className={styles.icon}>{icon}</span>}
        {label}
      </div>
      <div className={styles.valueRow}>
        <span className={styles.value}>{value}</span>
        {unit && <span className={styles.unit}>{unit}</span>}
        {delta != null && <span data-trend={trend} className={styles.delta}>{delta}</span>}
      </div>
      {hint && <div className={styles.hint}>{hint}</div>}
    </div>
  );
}

/** Responsive row of stats that wraps on narrow screens. */
export function StatGroup({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.group, className)} {...rest} />;
}
