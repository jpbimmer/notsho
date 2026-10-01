"use client";
import { Drawer } from "@base-ui/react/drawer";
import { createContext, useContext, type ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import { XIcon } from "../../lib/icons";
import styles from "./sheet.module.css";

export type SheetSide = "right" | "left" | "bottom";

const SideContext = createContext<SheetSide>("right");
const swipe = { right: "right", left: "left", bottom: "down" } as const;

export interface SheetProps extends Omit<ComponentPropsWithoutRef<typeof Drawer.Root>, "swipeDirection"> {
  /** Edge the sheet slides in from. Swipe toward that edge to dismiss. Default "right". */
  side?: SheetSide;
}

/** Root: controls open state. Compose: <Sheet><SheetTrigger/><SheetContent>…</SheetContent></Sheet> */
export function Sheet({ side = "right", ...rest }: SheetProps) {
  return (
    <SideContext.Provider value={side}>
      <Drawer.Root swipeDirection={swipe[side]} {...rest} />
    </SideContext.Provider>
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
  const side = useContext(SideContext);
  return (
    <Drawer.Portal>
      <Drawer.Backdrop className={styles.backdrop} />
      <Drawer.Viewport data-side={side} className={styles.viewport}>
        <Drawer.Popup data-side={side} data-size={size} className={cx(styles.popup, className)} {...rest}>
          {side === "bottom" && <div className={styles.handle} aria-hidden />}
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
