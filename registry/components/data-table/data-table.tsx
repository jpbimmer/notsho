"use client";
import {
  flexRender, getCoreRowModel, getSortedRowModel, useReactTable,
  type ColumnDef, type OnChangeFn, type RowData, type SortingState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cx } from "../../lib/cx";
import { ArrowDownIcon, ArrowUpIcon } from "../../lib/icons";
import styles from "./data-table.module.css";

declare module "@tanstack/react-table" {
  interface ColumnMeta<TData extends RowData, TValue> {
    /** Cell alignment. Use "end" for numbers. */
    align?: "start" | "center" | "end";
    /** CSS grid track, e.g. "8rem" or "minmax(12rem, 2fr)". Default "minmax(8rem, 1fr)". */
    width?: string;
    /** Hide this column below 40rem. */
    hideOnMobile?: boolean;
  }
}

export interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  getRowId?: (row: T, index: number) => string;
  /** Controlled sorting. Omit to let the table sort itself. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Data arrives already sorted (e.g. from the server); headers only report the change. */
  manualSorting?: boolean;
  onRowClick?: (row: T) => void;
  /** Highlights the row with this id (e.g. the one open in a detail sheet). */
  activeRowId?: string | null;
  /** Fixed row height in px; rows are virtualized. Default 44. */
  rowHeight?: number;
  /** Below this width the table scrolls horizontally. Default "100%". */
  minWidth?: string;
  empty?: ReactNode;
  className?: string;
}

/**
 * Virtualized, sortable table on TanStack Table. Fills its parent's height —
 * give the parent a height (or flex: 1 with min-height: 0).
 */
export function DataTable<T>({
  data, columns, getRowId, sorting, onSortingChange, manualSorting, onRowClick, activeRowId,
  rowHeight = 44, minWidth = "100%", empty, className,
}: DataTableProps<T>) {
  const [localSorting, setLocalSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: { sorting: sorting ?? localSorting },
    onSortingChange: onSortingChange ?? setLocalSorting,
    manualSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: manualSorting ? undefined : getSortedRowModel(),
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const rows = table.getRowModel().rows;
  const virtual = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 12,
  });

  const leaf = table.getVisibleLeafColumns();
  const style = {
    "--_cols": leaf.map((c) => c.columnDef.meta?.width ?? "minmax(8rem, 1fr)").join(" "),
    // On phones, flexible tracks drop their minimum so the table fits the screen instead of scrolling sideways.
    "--_cols-mobile": leaf
      .filter((c) => !c.columnDef.meta?.hideOnMobile)
      .map((c) => (c.columnDef.meta?.width ?? "minmax(8rem, 1fr)").replace(/^minmax\([^,]+,/, "minmax(0,"))
      .join(" "),
    "--_row-h": `${rowHeight}px`,
    "--_min-w": minWidth,
  } as CSSProperties;

  const cellAttrs = (meta: { align?: string; hideOnMobile?: boolean } | undefined) => ({
    "data-align": meta?.align ?? "start",
    "data-hide-mobile": meta?.hideOnMobile || undefined,
  });

  return (
    <div ref={scrollRef} className={cx(styles.scroller, className)} style={style}>
      <div role="table" className={styles.table} aria-rowcount={rows.length}>
        <div role="rowgroup" className={styles.head}>
          {table.getHeaderGroups().map((hg) => (
            <div role="row" key={hg.id} className={styles.row}>
              {hg.headers.map((h) => {
                const sort = h.column.getIsSorted();
                const canSort = h.column.getCanSort();
                return (
                  <div
                    role="columnheader"
                    key={h.id}
                    aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
                    className={styles.th}
                    {...cellAttrs(h.column.columnDef.meta)}
                  >
                    {h.isPlaceholder ? null : canSort ? (
                      <button type="button" className={styles.sort} data-sorted={sort || undefined} onClick={h.column.getToggleSortingHandler()}>
                        <span>{flexRender(h.column.columnDef.header, h.getContext())}</span>
                        <span className={styles.sortIcon} aria-hidden>
                          {sort === "desc" ? <ArrowDownIcon width={12} height={12} /> : <ArrowUpIcon width={12} height={12} />}
                        </span>
                      </button>
                    ) : (
                      flexRender(h.column.columnDef.header, h.getContext())
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div role="rowgroup" className={styles.body} style={{ height: virtual.getTotalSize() }}>
          {virtual.getVirtualItems().map((vi) => {
            const row = rows[vi.index]!;
            return (
              <div
                role="row"
                key={row.id}
                aria-rowindex={vi.index + 1}
                data-active={activeRowId != null && row.id === activeRowId ? "" : undefined}
                data-clickable={onRowClick ? "" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cx(styles.row, styles.bodyRow)}
                style={{ transform: `translateY(${vi.start}px)` }}
                onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row.original); } : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <div role="cell" key={cell.id} className={styles.td} {...cellAttrs(cell.column.columnDef.meta)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {!rows.length && empty && <div className={styles.empty}>{empty}</div>}
    </div>
  );
}

export type { ColumnDef, SortingState } from "@tanstack/react-table";
export { createColumnHelper } from "@tanstack/react-table";
