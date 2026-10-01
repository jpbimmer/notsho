"use client";
import { useState } from "react";
import { cx } from "../../lib/cx";
import styles from "./rating.module.css";

export interface RatingProps {
  /** 0 = unrated. */
  value?: number;
  onValueChange?: (value: number) => void;
  /** Number of stars. Default 5. */
  max?: number;
  readOnly?: boolean;
  size?: "sm" | "md";
  "aria-label"?: string;
  className?: string;
}

const Star = () => (
  <svg viewBox="0 0 24 24" aria-hidden width="100%" height="100%">
    <path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" />
  </svg>
);

/** Star rating as a radio group. Click the current value again to clear it. */
export function Rating({ value = 0, onValueChange, max = 5, readOnly, size = "md", className, "aria-label": ariaLabel = "Rating" }: RatingProps) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  if (readOnly) {
    return (
      <span className={cx(styles.root, className)} data-size={size} data-readonly role="img" aria-label={`${value} of ${max}`}>
        {Array.from({ length: max }, (_, i) => (
          <span key={i} className={styles.star} data-on={i < value || undefined}>
            <Star />
          </span>
        ))}
      </span>
    );
  }
  return (
    <div className={cx(styles.root, className)} data-size={size} role="radiogroup" aria-label={ariaLabel} onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, i) => {
        const n = i + 1;
        return (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={styles.star}
            data-on={n <= shown || undefined}
            onMouseEnter={() => setHover(n)}
            onClick={() => onValueChange?.(value === n ? 0 : n)}
          >
            <Star />
          </button>
        );
      })}
    </div>
  );
}
