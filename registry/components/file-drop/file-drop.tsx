"use client";
import { useRef, useState, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./file-drop.module.css";

export interface FileDropProps {
  /** Called with the first dropped or chosen file. */
  onFile: (file: File) => void;
  /** Same as an <input type=file> accept, e.g. ".md,.jsonl". */
  accept?: string;
  /** Shown inside the zone. Defaults to "Drop file or click". */
  children?: ReactNode;
  disabled?: boolean;
  className?: string;
}

/** A dashed zone you can drop a file on or click to pick one. */
export function FileDrop({ onFile, accept, children = "Drop file or click", disabled, className }: FileDropProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <label
      className={cx(styles.zone, className)}
      data-over={over || undefined}
      data-disabled={disabled || undefined}
      onDragOver={(e) => {
        if (disabled || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const f = e.dataTransfer.files[0];
        if (f && !disabled) onFile(f);
      }}
    >
      <span className={styles.label}>{children}</span>
      <input
        ref={input}
        type="file"
        accept={accept}
        disabled={disabled}
        className={styles.input}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </label>
  );
}
