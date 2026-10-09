import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "../../lib/cx";
import { PHONE, useMediaQuery } from "../../lib/media-query";
import { Segmented } from "../segmented";
import styles from "./app-page.module.css";

export interface AppPageView {
  value: string;
  label: string;
  icon?: ReactNode;
}

export interface AppPageProps extends Omit<ComponentPropsWithoutRef<"div">, "title"> {
  icon?: ReactNode;
  title: ReactNode;
  /** Sits right after the title (a lock, a badge). */
  titleAdornment?: ReactNode;
  /** One muted line under the title; hidden on phones. */
  description?: ReactNode;
  /** Buttons/menus at the right of the header. */
  actions?: ReactNode;
  /** Two or more views show a switcher. */
  views?: AppPageView[];
  view?: string;
  onViewChange?: (view: string) => void;
  /** Fill the window (tables, maps) instead of scrolling as a page. */
  fill?: boolean;
}

/**
 * The default app page: icon, title and description, actions and a view
 * switcher on the right, then the current view. The view fades in whenever
 * `view` changes.
 */
export function AppPage({
  icon,
  title,
  titleAdornment,
  description,
  actions,
  views = [],
  view,
  onViewChange,
  fill,
  className,
  children,
  ...props
}: AppPageProps) {
  const phone = useMediaQuery(PHONE);
  return (
    <div {...props} className={cx(styles.page, className)} data-fill={fill || undefined}>
      <header className={styles.header}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>
            {title}
            {titleAdornment && <span className={styles.adornment}>{titleAdornment}</span>}
          </h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
        {views.length > 1 && view && (
          <Segmented
            aria-label="View"
            className={styles.switcher}
            value={view}
            fullWidth={phone}
            iconOnly={phone && views.length > 3}
            onValueChange={(next) => onViewChange?.(next)}
            options={views}
          />
        )}
      </header>
      <div key={view} className={styles.body}>
        {children}
      </div>
    </div>
  );
}
