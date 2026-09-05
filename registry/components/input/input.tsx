"use client";
import { Input as BaseInput } from "@base-ui/react/input";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import styles from "./input.module.css";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<ComponentPropsWithoutRef<typeof BaseInput>, "size"> {
  /** Control height; maps to the `size.control-*` tokens. Default "md". */
  size?: InputSize;
  /** Force the invalid style outside a Field. Inside a Field this comes from validation. */
  invalid?: boolean;
}

/**
 * Text input. Wrap in <Field> to get a label, description, and validation
 * messaging wired for accessibility.
 */
export function Input({ size = "md", invalid, className, ...rest }: InputProps) {
  return (
    <BaseInput
      data-size={size}
      aria-invalid={invalid || undefined}
      className={cx(styles.input, className)}
      {...rest}
    />
  );
}
