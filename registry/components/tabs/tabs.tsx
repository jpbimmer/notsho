"use client";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import styles from "./tabs.module.css";

/** Root. `defaultValue`/`value` select the active tab. */
export function Tabs({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseTabs.Root>) {
  return <BaseTabs.Root className={cx(styles.root, className)} {...rest} />;
}

export interface TabsListProps extends ComponentPropsWithoutRef<typeof BaseTabs.List> {
  /** "underline" (default) for page sections; "segmented" for compact toggles. */
  variant?: "underline" | "segmented";
}

export function TabsList({ variant = "underline", className, children, ...rest }: TabsListProps) {
  return (
    <BaseTabs.List data-variant={variant} className={cx(styles.list, className)} {...rest}>
      {children}
      <BaseTabs.Indicator className={styles.indicator} renderBeforeHydration />
    </BaseTabs.List>
  );
}

export function Tab({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseTabs.Tab>) {
  return <BaseTabs.Tab className={cx(styles.tab, className)} {...rest} />;
}

export function TabPanel({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseTabs.Panel>) {
  return <BaseTabs.Panel className={cx(styles.panel, className)} {...rest} />;
}
