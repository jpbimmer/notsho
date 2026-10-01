"use client";
import { Slider as BaseSlider } from "@base-ui/react/slider";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./slider.module.css";

export interface SliderProps extends Omit<ComponentPropsWithoutRef<typeof BaseSlider.Root>, "children"> {
  /** Visible label above the track. */
  label?: ReactNode;
  /** Show the current value at the right of the label; pass a formatter for units ("72%"). */
  showValue?: boolean | ((value: number) => ReactNode);
  /** Track/thumb size. "lg" has a touch-sized thumb. Default "md". */
  size?: "md" | "lg";
}

/**
 * Single-value slider. Use `onValueChange` for live feedback and
 * `onValueCommitted` to save when the user lets go.
 */
export function Slider({ label, showValue, size = "md", className, ...rest }: SliderProps) {
  return (
    <BaseSlider.Root data-size={size} className={cx(styles.root, className)} {...rest}>
      {(label || showValue) && (
        <div className={styles.header}>
          {label && <BaseSlider.Label className={styles.label}>{label}</BaseSlider.Label>}
          {showValue && (
            <BaseSlider.Value className={styles.value}>
              {(_, values) => (typeof showValue === "function" ? showValue(values[0] ?? 0) : values[0])}
            </BaseSlider.Value>
          )}
        </div>
      )}
      <BaseSlider.Control className={styles.control}>
        <BaseSlider.Track className={styles.track}>
          <BaseSlider.Indicator className={styles.indicator} />
          <BaseSlider.Thumb className={styles.thumb} />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
