import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import styles from "./badge.module.css";

export type BadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";

export interface BadgeProps extends ComponentPropsWithoutRef<"span"> {
  /** Semantic color. Default "neutral". */
  variant?: BadgeVariant;
  /** Show a leading status dot. */
  dot?: boolean;
}

/** Small status label. Pill by default (badge.radius token). */
export function Badge({ variant = "neutral", dot, className, children, ...rest }: BadgeProps) {
  return (
    <span data-variant={variant} className={cx(styles.badge, className)} {...rest}>
      {dot && <span className={styles.dot} aria-hidden />}
      {children}
    </span>
  );
}
