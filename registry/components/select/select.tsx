"use client";
import { Select as BaseSelect } from "@base-ui/react/select";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { CheckIcon, ChevronUpDownIcon } from "../../lib/icons";
import styles from "./select.module.css";

type RootProps<V> = ComponentPropsWithoutRef<typeof BaseSelect.Root<V>>;

export interface SelectProps<V = string> extends Omit<RootProps<V>, "children"> {
  /** Shown when nothing is selected. */
  placeholder?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Trigger className; use `popupClassName` for the list. */
  className?: string;
  popupClassName?: string;
  /** <SelectItem>s (and optional groups/separators). */
  children: ReactNode;
  /** Pass `items` (value → label) to Base UI so the trigger can render labels for values. */
  items?: RootProps<V>["items"];
}

/**
 * Single-value select. Pass `items` so the trigger shows the label of the
 * current value, and render <SelectItem> children for the list.
 */
export function Select<V = string>({ placeholder = "Select…", size = "md", className, popupClassName, children, ...rest }: SelectProps<V>) {
  return (
    <BaseSelect.Root {...(rest as RootProps<V>)}>
      <BaseSelect.Trigger data-size={size} className={cx(styles.trigger, className)}>
        <BaseSelect.Value className={styles.value} placeholder={placeholder} />
        <BaseSelect.Icon className={styles.icon}><ChevronUpDownIcon /></BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className={styles.positioner} sideOffset={6} alignItemWithTrigger={false}>
          <BaseSelect.Popup className={cx(styles.popup, popupClassName)}>
            <BaseSelect.List className={styles.list}>{children}</BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}

export type SelectItemProps = ComponentPropsWithoutRef<typeof BaseSelect.Item>;

export function SelectItem({ className, children, ...rest }: SelectItemProps) {
  return (
    <BaseSelect.Item className={cx(styles.item, className)} {...rest}>
      <BaseSelect.ItemText className={styles.itemText}>{children}</BaseSelect.ItemText>
      <BaseSelect.ItemIndicator className={styles.indicator}><CheckIcon /></BaseSelect.ItemIndicator>
    </BaseSelect.Item>
  );
}

export function SelectSeparator({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseSelect.Separator>) {
  return <BaseSelect.Separator className={cx(styles.separator, className)} {...rest} />;
}
export function SelectGroup(props: ComponentPropsWithoutRef<typeof BaseSelect.Group>) {
  return <BaseSelect.Group {...props} />;
}
export function SelectGroupLabel({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseSelect.GroupLabel>) {
  return <BaseSelect.GroupLabel className={cx(styles.groupLabel, className)} {...rest} />;
}
