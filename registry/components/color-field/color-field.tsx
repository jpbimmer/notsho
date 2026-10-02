"use client";
import { useEffect, useId, useState } from "react";
import { cx } from "../../lib/cx";
import styles from "./color-field.module.css";

export interface ColorFieldProps {
  /** A #rgb or #rrggbb hex. */
  value: string;
  onValueChange: (hex: string) => void;
  /** Labels the swatch and the text input for assistive tech. */
  "aria-label": string;
  disabled?: boolean;
  className?: string;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;
const normalize = (v: string) => {
  const m = HEX.exec(v.trim());
  if (!m) return null;
  const h = m[1]!.length === 3 ? [...m[1]!].map((c) => c + c).join("") : m[1]!;
  return `#${h.toLowerCase()}`;
};

/** A color swatch (opens the system picker) beside an editable hex value. */
export function ColorField({ value, onValueChange, disabled, className, "aria-label": label }: ColorFieldProps) {
  const id = useId();
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = (v: string) => {
    const n = normalize(v);
    if (n) onValueChange(n);
    else setText(value);
  };
  return (
    <div className={cx(styles.root, className)} data-disabled={disabled || undefined}>
      <span className={styles.swatch} style={{ background: normalize(value) ?? undefined }}>
        <input
          id={id}
          type="color"
          value={normalize(value) ?? "#000000"} // notsho-ignore — fallback for an unparseable value
          disabled={disabled}
          aria-label={label}
          onChange={(e) => onValueChange(e.target.value)}
        />
      </span>
      <input
        className={styles.hex}
        value={text}
        disabled={disabled}
        spellCheck={false}
        aria-label={`${label} hex`}
        onChange={(e) => {
          setText(e.target.value);
          const n = normalize(e.target.value);
          if (n && e.target.value.replace("#", "").length === 6) onValueChange(n);
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && commit((e.target as HTMLInputElement).value)}
      />
    </div>
  );
}
