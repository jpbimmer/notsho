import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import styles from "./card.module.css";

export interface CardProps extends ComponentPropsWithoutRef<"div"> {
  /** Remove padding so content (images, tables) can run edge to edge. */
  flush?: boolean;
  /** Lift on hover; use when the whole card is a link or button target. */
  interactive?: boolean;
}

/** Raised surface. Compose with CardHeader / CardContent / CardFooter for consistent internal rhythm. */
export function Card({ flush, interactive, className, ...rest }: CardProps) {
  return (
    <div
      data-flush={flush || undefined}
      data-interactive={interactive || undefined}
      className={cx(styles.card, className)}
      {...rest}
    />
  );
}

export function CardHeader({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.header, className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: ComponentPropsWithoutRef<"h3">) {
  return <h3 className={cx(styles.title, className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: ComponentPropsWithoutRef<"p">) {
  return <p className={cx(styles.description, className)} {...rest} />;
}

export function CardContent({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.content, className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.footer, className)} {...rest} />;
}
