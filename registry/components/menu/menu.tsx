"use client";
import { Menu as BaseMenu } from "@base-ui/react/menu";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import styles from "./menu.module.css";

/** Root. Compose: <Menu><MenuTrigger render={<Button/>}/><MenuContent><MenuItem/>…</MenuContent></Menu> */
export const Menu = BaseMenu.Root;
export const MenuTrigger = BaseMenu.Trigger;

export interface MenuContentProps extends ComponentPropsWithoutRef<typeof BaseMenu.Popup> {
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}

export function MenuContent({ side = "bottom", align = "start", className, ...rest }: MenuContentProps) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner side={side} align={align} sideOffset={6} className={styles.positioner}>
        <BaseMenu.Popup className={cx(styles.popup, className)} {...rest} />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export interface MenuItemProps extends ComponentPropsWithoutRef<typeof BaseMenu.Item> {
  /** Red text for destructive actions. */
  danger?: boolean;
}

export function MenuItem({ danger, className, ...rest }: MenuItemProps) {
  return <BaseMenu.Item data-danger={danger || undefined} className={cx(styles.item, className)} {...rest} />;
}

export function MenuSeparator({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseMenu.Separator>) {
  return <BaseMenu.Separator className={cx(styles.separator, className)} {...rest} />;
}
export const MenuGroup = BaseMenu.Group;
export function MenuGroupLabel({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel>) {
  return <BaseMenu.GroupLabel className={cx(styles.groupLabel, className)} {...rest} />;
}
