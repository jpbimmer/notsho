"use client";
import { Switch as BaseSwitch } from "@base-ui/react/switch";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./switch.module.css";

export interface SwitchProps extends ComponentPropsWithoutRef<typeof BaseSwitch.Root> {
  label?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md";
}

/** On/off toggle. Use for settings that apply immediately; use Checkbox in forms. */
export function Switch({ label, description, size = "md", className, ...rest }: SwitchProps) {
  const track = (
    <BaseSwitch.Root data-size={size} className={cx(styles.track, !label && className)} {...rest}>
      <BaseSwitch.Thumb className={styles.thumb} />
    </BaseSwitch.Root>
  );
  if (!label) return track;
  return (
    <label className={cx(styles.field, className)} data-disabled={rest.disabled || undefined}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
      {track}
    </label>
  );
}
