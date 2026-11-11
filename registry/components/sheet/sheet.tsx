"use client";
import { Drawer } from "@base-ui/react/drawer";
import { createContext, useCallback, useContext, useRef, type ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import { usePortalContainer } from "../../lib/portal";
import { XIcon } from "../../lib/icons";
import styles from "./sheet.module.css";

export type SheetSide = "right" | "left" | "bottom";

const SheetContext = createContext<{ side: SheetSide; swipe: boolean }>({ side: "right", swipe: false });
const swipe = { right: "right", left: "left", bottom: "down" } as const;

export interface SheetProps extends Omit<ComponentPropsWithoutRef<typeof Drawer.Root>, "swipeDirection"> {
  /** Edge the sheet slides in from. Default "right". */
  side?: SheetSide;
  /**
   * Swipe toward the edge to dismiss (bottom sheets also show a drag handle). Default false: close with the
   * corner button, the backdrop, or Escape — swiping tends to fight scrolling on phones.
   */
  swipe?: boolean;
}

/** Root: controls open state. Compose: <Sheet><SheetTrigger/><SheetContent>…</SheetContent></Sheet> */
export function Sheet({ side = "right", swipe: canSwipe = false, ...rest }: SheetProps) {
  return (
    <SheetContext.Provider value={{ side, swipe: canSwipe }}>
      <Drawer.Root swipeDirection={swipe[side]} {...rest} />
    </SheetContext.Provider>
  );
}
export const SheetTrigger = Drawer.Trigger;

export interface SheetContentProps extends ComponentPropsWithoutRef<typeof Drawer.Popup> {
  /** Width for side sheets; ignored for bottom sheets. Default "md". */
  size?: "sm" | "md" | "lg";
  /** Hide the corner close button. */
  hideClose?: boolean;
}

/** Portal + backdrop + sliding panel. Put SheetHeader / SheetBody / SheetFooter inside. */
export function SheetContent({ size = "md", hideClose, className, children, ...rest }: SheetContentProps) {
  const { side, swipe: canSwipe } = useContext(SheetContext);
  const viewport = useKeyboardAwareViewport();
  return (
    <Drawer.Portal container={usePortalContainer()}>
      <Drawer.Backdrop className={styles.backdrop} />
      {/* Base UI has no swipe off switch; data-base-ui-swipe-ignore turns off drag-to-close for everything inside. */}
      <Drawer.Viewport
        ref={viewport}
        data-side={side}
        data-base-ui-swipe-ignore={canSwipe ? undefined : ""}
        className={styles.viewport}
      >
        <Drawer.Popup data-side={side} data-size={size} className={cx(styles.popup, className)} {...rest}>
          {canSwipe && side === "bottom" && <div className={styles.handle} aria-hidden />}
          {children}
          {!hideClose && (
            <Drawer.Close className={styles.close} aria-label="Close"><XIcon /></Drawer.Close>
          )}
        </Drawer.Popup>
      </Drawer.Viewport>
    </Drawer.Portal>
  );
}

export function SheetHeader({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.header, className)} {...rest} />;
}
export function SheetTitle({ className, ...rest }: ComponentPropsWithoutRef<typeof Drawer.Title>) {
  return <Drawer.Title className={cx(styles.title, className)} {...rest} />;
}
export function SheetDescription({ className, ...rest }: ComponentPropsWithoutRef<typeof Drawer.Description>) {
  return <Drawer.Description className={cx(styles.description, className)} {...rest} />;
}
/** Scrolling region between header and footer. */
export function SheetBody({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.body, className)} {...rest} />;
}
export function SheetFooter({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.footer, className)} {...rest} />;
}
/** Closes the sheet. Use `render={<Button variant="ghost" />}` to style it as a Button. */
export const SheetClose = Drawer.Close;

/**
 * Pins the sheet's viewport to the *visual* viewport, so an on-screen keyboard
 * shrinks the sheet (its body scrolls) instead of covering it or shoving the page.
 */
function useKeyboardAwareViewport() {
  const cleanup = useRef<(() => void) | null>(null);
  return useCallback((el: HTMLDivElement | null) => {
    cleanup.current?.();
    cleanup.current = null;
    const vv = window.visualViewport;
    if (!el || !vv) return;
    const sync = () => {
      el.style.setProperty("--sheet-vv-top", `${vv.offsetTop}px`);
      el.style.setProperty("--sheet-vv-height", `${vv.height}px`);
    };
    sync();
    vv.addEventListener("resize", sync);
    vv.addEventListener("scroll", sync);
    cleanup.current = () => {
      vv.removeEventListener("resize", sync);
      vv.removeEventListener("scroll", sync);
    };
  }, []);
}
