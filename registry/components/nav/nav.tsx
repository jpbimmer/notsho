"use client";
import { useRender } from "@base-ui/react/use-render";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./nav.module.css";

export interface NavProps extends ComponentPropsWithoutRef<"nav"> {
  /** "vertical" (default) for a sidebar; "horizontal" for a bottom tab bar (icon over label). */
  orientation?: "vertical" | "horizontal";
}

/** App navigation. Sidebar on desktop, tab bar on phones. */
export function Nav({ orientation = "vertical", className, ...rest }: NavProps) {
  return <nav data-orientation={orientation} className={cx(styles.nav, className)} {...rest} />;
}

export interface NavSectionProps extends ComponentPropsWithoutRef<"div"> {
  label?: ReactNode;
}

/** Labelled group of items. */
export function NavSection({ label, className, children, ...rest }: NavSectionProps) {
  return (
    <div className={cx(styles.section, className)} {...rest}>
      {label && <div className={styles.label}>{label}</div>}
      <div className={styles.items}>{children}</div>
    </div>
  );
}

export interface NavItemProps extends ComponentPropsWithoutRef<"a"> {
  icon?: ReactNode;
  /** Trailing count or badge. */
  count?: ReactNode;
  /** Mark active manually. Router links that set aria-current="page" or data-status="active" are detected automatically. */
  active?: boolean;
  /** Render as your router's link, e.g. `render={<Link to="/x" />}`. */
  render?: ReactElement;
}

export function NavItem({ icon, count, active, render, className, children, ...rest }: NavItemProps) {
  return useRender({
    render,
    defaultTagName: "a",
    props: {
      ...rest,
      "data-active": active || undefined,
      "aria-current": active ? "page" : rest["aria-current"],
      className: cx(styles.item, className),
      children: (
        <>
          {icon && <span className={styles.icon}>{icon}</span>}
          <span className={styles.text}>{children}</span>
          {count != null && <span className={styles.count}>{count}</span>}
        </>
      ),
    },
  });
}
