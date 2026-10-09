import type { ReactNode } from "react";
import styles from "./rank-list.module.css";

export interface RankItem {
  key: string;
  label: ReactNode;
  value: number;
  onClick?: () => void;
}

/**
 * Ranked rows with a thin magnitude bar behind each — "top venues", "top
 * cities". Single series, so one hue and no legend; values in text tokens.
 */
export function RankList({ items, empty }: { items: RankItem[]; empty?: ReactNode }) {
  if (!items.length) return <div className={styles.rankEmpty}>{empty ?? "Nothing yet"}</div>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ol className={styles.rankList}>
      {items.map((i) => {
        const body = (
          <>
            <span className={styles.rankBar} style={{ width: `${(i.value / max) * 100}%` }} aria-hidden />
            <span className={styles.rankLabel}>{i.label}</span>
            <span className={styles.rankValue}>{i.value.toLocaleString()}</span>
          </>
        );
        return (
          <li key={i.key}>
            {i.onClick ? (
              <button type="button" className={styles.rankRow} onClick={i.onClick}>
                {body}
              </button>
            ) : (
              <div className={styles.rankRow}>{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
