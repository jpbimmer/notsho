import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./empty-state.module.css";

export interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Actions, usually one Button. Pass as children. */
  children?: ReactNode;
  size?: "sm" | "md";
}

/** What to show when there's nothing to show — and what to do about it. */
export function EmptyState({ icon, title, description, size = "md", className, children, ...rest }: EmptyStateProps) {
  return (
    <div data-size={size} className={cx(styles.root, className)} {...rest}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <div className={styles.text}>
        <div className={styles.title}>{title}</div>
        {description && <div className={styles.description}>{description}</div>}
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}
