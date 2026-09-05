"use client";
import { Field as BaseField } from "@base-ui/react/field";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import styles from "./field.module.css";

export type FieldProps = ComponentPropsWithoutRef<typeof BaseField.Root>;

/**
 * Groups a control with its label, description, and error, and wires the
 * aria relationships. Put an <Input> (or any Base UI control) inside.
 */
export function Field({ className, ...rest }: FieldProps) {
  return <BaseField.Root className={cx(styles.field, className)} {...rest} />;
}

export function FieldLabel({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseField.Label>) {
  return <BaseField.Label className={cx(styles.label, className)} {...rest} />;
}

export function FieldDescription({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseField.Description>) {
  return <BaseField.Description className={cx(styles.description, className)} {...rest} />;
}

/** Renders only when the field is invalid (Base UI handles the condition). */
export function FieldError({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseField.Error>) {
  return <BaseField.Error className={cx(styles.error, className)} {...rest} />;
}
