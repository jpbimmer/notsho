import type { ReactNode } from "react";
import { type ColumnDef, DataTable } from "../data-table";
import { EmptyState } from "../empty-state";
import styles from "./table-view.module.css";

export interface TableViewProps<T> {
  /** Undefined while loading. */
  data: T[] | undefined;
  error?: unknown;
  // biome-ignore lint/suspicious/noExplicitAny: column value types vary per column
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  selectedId?: string;
  onSelect?: (id: string) => void;
  empty: { icon: ReactNode; title: string; description?: string; action?: ReactNode };
}

/** A dataset's records as a full-height, virtualized table — with loading, error, and empty states. */
export function TableView<T>({ data, error, columns, getRowId, selectedId, onSelect, empty }: TableViewProps<T>) {
  if (error) {
    return <EmptyState className={styles.center} icon={empty.icon} title="Couldn't load this" description={String(error)} />;
  }
  if (data && !data.length) {
    return (
      <EmptyState className={styles.center} icon={empty.icon} title={empty.title} description={empty.description}>
        {empty.action}
      </EmptyState>
    );
  }
  return (
    <div className={styles.tableFrame} data-loading={!data || undefined}>
      <DataTable
        data={data ?? []}
        columns={columns}
        getRowId={getRowId}
        activeRowId={selectedId}
        onRowClick={onSelect ? (row) => onSelect(getRowId(row)) : undefined}
      />
    </div>
  );
}
