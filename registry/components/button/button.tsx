"use client";
import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import styles from "./button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ComponentPropsWithoutRef<typeof BaseButton> {
  /** Visual weight. Default "primary". */
  variant?: ButtonVariant;
  /** Control height; maps to the `size.control-*` tokens. Default "md". */
  size?: ButtonSize;
  /** Disables interaction, keeps focus, and shows the label dimmed. */
  loading?: boolean;
  /** Square button for a lone icon. Sets aria-label from `children` if it's a string; otherwise pass one. */
  iconOnly?: boolean;
}

/**
 * Button. Styles come only from tokens; variants and sizes are data attributes
 * so they can be targeted in CSS and read by tooling.
 */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  iconOnly = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <BaseButton
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      data-icon-only={iconOnly || undefined}
      disabled={disabled || loading}
      focusableWhenDisabled={loading}
      className={cx(styles.button, className)}
      {...rest}
    >
      {children}
    </BaseButton>
  );
}
