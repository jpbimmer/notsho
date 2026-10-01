"use client";
import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { Tab, Tabs, TabsList } from "../tabs";
import styles from "./segmented.module.css";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface SegmentedProps<T extends string = string> {
  options: readonly SegmentedOption<T>[];
  value?: T;
  defaultValue?: T;
  onValueChange?: (value: T) => void;
  /** Stretch to the container width with equal segments. */
  fullWidth?: boolean;
  /** Hide labels and show icons only (labels become aria-labels when they are strings). */
  iconOnly?: boolean;
  "aria-label"?: string;
  className?: string;
}

/**
 * Pick one of a few views or filters (List | Map, Day | Week | Month).
 * Built on Tabs' segmented variant so the two always look identical.
 */
export function Segmented<T extends string = string>({
  options, value, defaultValue, onValueChange, fullWidth, iconOnly, className, "aria-label": ariaLabel,
}: SegmentedProps<T>) {
  return (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? options[0]?.value}
      onValueChange={(v) => onValueChange?.(v as T)}
      data-full-width={fullWidth || undefined}
      className={cx(styles.root, className)}
    >
      <TabsList variant="segmented" aria-label={ariaLabel} className={styles.list}>
        {options.map((o) => (
          <Tab
            key={o.value}
            value={o.value}
            disabled={o.disabled}
            aria-label={iconOnly && typeof o.label === "string" ? o.label : undefined}
            className={styles.item}
          >
            {o.icon}
            {!iconOnly && o.label}
          </Tab>
        ))}
      </TabsList>
    </Tabs>
  );
}
