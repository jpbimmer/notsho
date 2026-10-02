"use client";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type ComponentPropsWithoutRef, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref,
} from "react";
import { cx } from "../../lib/cx";
import { SearchIcon } from "../../lib/icons";
import styles from "./command.module.css";

export interface CommandPanelProps {
  /** Controlled query. Filtering is yours — render only the items that match. */
  query: string;
  onQueryChange: (query: string) => void;
  placeholder?: string;
  /** Shows a quiet progress bar under the input while results load. */
  loading?: boolean;
  /** Optional row under the list, e.g. keyboard hints. Hidden on narrow screens. */
  footer?: ReactNode;
  /** Replaces the leading search icon. */
  icon?: ReactNode;
  /** Trailing content in the input row (the dialog shows an esc hint here). */
  trailing?: ReactNode;
  /**
   * `dialog` is the bare panel that sits inside `Command`. `inline` is its own raised
   * surface for placing on a page (a home-screen prompt); its list shows only when there
   * are results.
   */
  variant?: "dialog" | "inline";
  /** `lg` is a hero-sized input for a page's primary prompt. */
  size?: "md" | "lg";
  autoFocus?: boolean;
  /** Called on Escape when there's nothing else for Escape to do. */
  onEscape?: () => void;
  /** Called on Enter when no item is active (e.g. submit the query as a question). */
  onSubmit?: (query: string) => void;
  inputRef?: Ref<HTMLInputElement>;
  children?: ReactNode;
  className?: string;
}

const ITEM = "[data-command-item]:not([data-disabled])";

/**
 * A search input over a keyboard-navigable list: ↑/↓ move, Enter selects.
 * `Command` puts it in a dialog; use it directly to put the same thing on a page.
 */
export function CommandPanel({
  query, onQueryChange, placeholder = "Search…", loading, footer, icon, trailing,
  variant = "inline", size = "md", autoFocus, onEscape, onSubmit, inputRef, children, className,
}: CommandPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const items = useCallback(() => Array.from(listRef.current?.querySelectorAll<HTMLElement>(ITEM) ?? []), []);

  // Reset to the first result whenever the result set changes.
  useEffect(() => setActive(0), [query, children]);

  useLayoutEffect(() => {
    const all = items();
    all.forEach((el, i) => el.toggleAttribute("data-active", i === active));
    all[active]?.scrollIntoView({ block: "nearest" });
  });

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const all = items();
    const n = all.length;
    if (e.key === "Escape" && onEscape) { e.preventDefault(); onEscape(); return; }
    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (all[active]) all[active].click();
      else onSubmit?.(query);
      return;
    }
    if (!n) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % n); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + n) % n); }
  };

  const onPointerMove = (e: PointerEvent) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>(ITEM);
    if (!el) return;
    const i = items().indexOf(el);
    if (i !== -1 && i !== active) setActive(i);
  };

  return (
    <div className={cx(styles.panel, className)} data-variant={variant} data-size={size}>
      <div className={styles.search}>
        {icon ?? <SearchIcon className={styles.searchIcon} width={size === "lg" ? 22 : 18} height={size === "lg" ? 22 : 18} />}
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          role="combobox"
          aria-expanded
          aria-autocomplete="list"
        />
        {trailing}
      </div>
      <div className={styles.progress} data-loading={loading || undefined} aria-hidden />
      <div ref={listRef} className={styles.list} role="listbox" onPointerMove={onPointerMove}>
        {children}
      </div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </div>
  );
}

export interface CommandProps extends Omit<CommandPanelProps, "variant" | "size" | "autoFocus" | "onEscape"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Command palette: a dialog with a search input and a keyboard-navigable list.
 * ↑/↓ move, Enter selects, Esc closes. Pair with `useCommandShortcut` for ⌘K.
 */
export function Command({ open, onOpenChange, placeholder = "Search…", className, ...panel }: CommandProps) {
  return (
    <BaseDialog.Root open={open} onOpenChange={onOpenChange}>
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={styles.backdrop} />
        <BaseDialog.Viewport className={styles.viewport}>
          <BaseDialog.Popup className={cx(styles.popup, className)} aria-label={placeholder}>
            <CommandPanel {...panel} placeholder={placeholder} variant="dialog" autoFocus trailing={<kbd className={styles.esc}>esc</kbd>} />
          </BaseDialog.Popup>
        </BaseDialog.Viewport>
      </BaseDialog.Portal>
    </BaseDialog.Root>
  );
}

export interface CommandGroupProps extends ComponentPropsWithoutRef<"div"> {
  heading?: ReactNode;
}
export function CommandGroup({ heading, className, children, ...rest }: CommandGroupProps) {
  return (
    <div role="group" className={cx(styles.group, className)} {...rest}>
      {heading && <div className={styles.heading}>{heading}</div>}
      {children}
    </div>
  );
}

export interface CommandItemProps extends Omit<ComponentPropsWithoutRef<"div">, "onSelect"> {
  onSelect?: () => void;
  icon?: ReactNode;
  /** Secondary text under the label. */
  description?: ReactNode;
  /** Trailing hint, e.g. a dataset name or shortcut. */
  hint?: ReactNode;
  disabled?: boolean;
}
export function CommandItem({ onSelect, icon, description, hint, disabled, className, children, ...rest }: CommandItemProps) {
  return (
    <div
      role="option"
      aria-selected={false}
      data-command-item=""
      data-disabled={disabled || undefined}
      className={cx(styles.item, className)}
      onClick={disabled ? undefined : onSelect}
      {...rest}
    >
      {icon && <span className={styles.itemIcon}>{icon}</span>}
      <span className={styles.itemText}>
        <span className={styles.itemLabel}>{children}</span>
        {description && <span className={styles.itemDescription}>{description}</span>}
      </span>
      {hint && <span className={styles.itemHint}>{hint}</span>}
    </div>
  );
}

export function CommandEmpty({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.empty, className)} {...rest} />;
}

/** Toggle the palette with ⌘K / Ctrl+K (or another key). */
export function useCommandShortcut(onToggle: () => void, key = "k") {
  const cb = useRef(onToggle);
  cb.current = onToggle;
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key.toLowerCase() === key && (e.metaKey || e.ctrlKey) && !e.altKey) { e.preventDefault(); cb.current(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [key]);
}
