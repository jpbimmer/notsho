import { SearchIcon, XIcon } from "../../lib/icons";
import type { ReactNode } from "react";
import { Button } from "../button";
import { Input } from "../input";
import { Select, SelectItem } from "../select";
import styles from "./filter-bar.module.css";

/** One row of filters above a view. Wraps on narrow screens; `trailing` sits at the right (counts, toggles). */
export function FilterBar({ children, trailing, onClear }: { children: ReactNode; trailing?: ReactNode; onClear?: () => void }) {
  return (
    <div className={styles.filterBar}>
      <div className={styles.filters}>
        {children}
        {onClear && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <XIcon width={14} height={14} /> Clear
          </Button>
        )}
      </div>
      {trailing && <div className={styles.filterTrailing}>{trailing}</div>}
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

/**
 * A compact select whose empty state reads as the filter's name ("Category"),
 * so no separate label is needed.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  allLabel,
}: {
  label: string;
  value: string | undefined;
  options: FilterOption[];
  onChange: (v: string | undefined) => void;
  /** First option, meaning "no filter". Defaults to "Any <label>". */
  allLabel?: string;
}) {
  const ANY = "__any";
  const items: Record<string, string> = { [ANY]: label, ...Object.fromEntries(options.map((o) => [o.value, o.label])) };
  return (
    <Select
      size="sm"
      className={value ? `${styles.filterSelect} ${styles.filterSelectActive}` : styles.filterSelect}
      items={items}
      value={value ?? ANY}
      onValueChange={(v) => onChange(v === ANY || v == null ? undefined : String(v))}
    >
      <SelectItem value={ANY}>{allLabel ?? `Any ${label.toLowerCase()}`}</SelectItem>
      {options.map((o) => (
        <SelectItem key={o.value} value={o.value}>
          <span className={styles.optionRow}>
            <span>{o.label}</span>
            {o.count != null && <span className={styles.optionCount}>{o.count.toLocaleString()}</span>}
          </span>
        </SelectItem>
      ))}
    </Select>
  );
}

/** Text filter with a leading search icon. */
export function FilterSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <span className={styles.filterSearch}>
      <SearchIcon width={14} height={14} className={styles.filterSearchIcon} />
      <Input
        size="sm"
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
}
