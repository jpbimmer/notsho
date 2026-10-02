"use client";
import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { ChevronRightIcon } from "../../lib/icons";
import styles from "./tree.module.css";

export interface TreeProps extends ComponentPropsWithoutRef<"div"> {
  "aria-label": string;
}

/** A nested, collapsible list: groups that open to items, items that can nest a level. */
export function Tree({ className, children, ...rest }: TreeProps) {
  return (
    <div role="tree" className={cx(styles.tree, className)} {...rest}>
      {children}
    </div>
  );
}

export interface TreeGroupProps {
  label: ReactNode;
  /** Muted number after the label, e.g. how many items are inside. */
  count?: ReactNode;
  /** Extra controls at the row's end (they don't toggle the group). */
  actions?: ReactNode;
  /** Controlled open state; omit to let the group manage it. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Highlights the row, e.g. when the whole group is what's shown. */
  selected?: boolean;
  title?: string;
  children?: ReactNode;
  className?: string;
}

export function TreeGroup({ label, count, actions, open, defaultOpen = false, onOpenChange, selected, title, children, className }: TreeGroupProps) {
  const [own, setOwn] = useState(defaultOpen);
  const isOpen = open ?? own;
  const toggle = () => {
    setOwn(!isOpen);
    onOpenChange?.(!isOpen);
  };
  return (
    <div role="treeitem" aria-expanded={isOpen} aria-selected={selected || undefined} className={cx(styles.group, className)} data-open={isOpen || undefined}>
      <div className={styles.groupRow} data-selected={selected || undefined}>
        <button type="button" className={styles.groupToggle} onClick={toggle} title={title}>
          <ChevronRightIcon className={styles.chevron} width={12} height={12} />
          <span className={styles.label}>{label}</span>
          {count != null && <span className={styles.count}>{count}</span>}
        </button>
        {actions && <span className={styles.actions}>{actions}</span>}
      </div>
      {isOpen && (
        <div role="group" className={styles.items}>
          {children}
        </div>
      )}
    </div>
  );
}

export interface TreeItemProps extends Omit<ComponentPropsWithoutRef<"button">, "onSelect"> {
  selected?: boolean;
  /** 0 for direct children of a group; 1 for an item nested under another. */
  depth?: 0 | 1;
  onSelect?: () => void;
  /** Muted text at the row's end. */
  hint?: ReactNode;
}

export function TreeItem({ selected, depth = 0, onSelect, hint, className, children, ...rest }: TreeItemProps) {
  return (
    <button
      type="button"
      role="treeitem"
      aria-selected={selected || false}
      data-selected={selected || undefined}
      data-depth={depth}
      className={cx(styles.item, className)}
      onClick={onSelect}
      {...rest}
    >
      {depth > 0 && <span className={styles.branch} aria-hidden>↳</span>}
      <span className={styles.label}>{children}</span>
      {hint != null && <span className={styles.count}>{hint}</span>}
    </button>
  );
}
