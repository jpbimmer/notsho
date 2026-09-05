"use client";
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { CheckIcon, MinusIcon } from "../../lib/icons";
import styles from "./checkbox.module.css";

export interface CheckboxProps extends ComponentPropsWithoutRef<typeof BaseCheckbox.Root> {
  /** Label rendered beside the box and wired via <label>. */
  label?: ReactNode;
  /** Secondary text under the label. */
  description?: ReactNode;
}

/** Checkbox with optional inline label. Supports indeterminate via Base UI. */
export function Checkbox({ label, description, className, ...rest }: CheckboxProps) {
  const box = (
    <BaseCheckbox.Root className={cx(styles.box, !label && className)} {...rest}>
      <BaseCheckbox.Indicator className={styles.indicator} keepMounted>
        {rest.indeterminate ? <MinusIcon width={12} height={12} strokeWidth={2.5} /> : <CheckIcon width={12} height={12} strokeWidth={2.5} />}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
  if (!label) return box;
  return (
    <label className={cx(styles.field, className)} data-disabled={rest.disabled || undefined}>
      {box}
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </span>
    </label>
  );
}
