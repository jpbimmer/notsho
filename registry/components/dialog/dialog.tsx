"use client";
import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ComponentPropsWithoutRef } from "react";
import { cx } from "../../lib/cx";
import { XIcon } from "../../lib/icons";
import styles from "./dialog.module.css";

/** Root: controls open state. Compose: <Dialog><DialogTrigger/><DialogContent>…</DialogContent></Dialog> */
export const Dialog = BaseDialog.Root;
export const DialogTrigger = BaseDialog.Trigger;

export interface DialogContentProps extends ComponentPropsWithoutRef<typeof BaseDialog.Popup> {
  /** Hide the corner close button. */
  hideClose?: boolean;
  size?: "sm" | "md" | "lg";
}

/** Portal + backdrop + centered popup. Put DialogHeader/DialogFooter inside. */
export function DialogContent({ hideClose, size = "md", className, children, ...rest }: DialogContentProps) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop className={styles.backdrop} />
      <BaseDialog.Viewport className={styles.viewport}>
        <BaseDialog.Popup data-size={size} className={cx(styles.popup, className)} {...rest}>
          {children}
          {!hideClose && (
            <BaseDialog.Close className={styles.close} aria-label="Close"><XIcon /></BaseDialog.Close>
          )}
        </BaseDialog.Popup>
      </BaseDialog.Viewport>
    </BaseDialog.Portal>
  );
}

export function DialogHeader({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.header, className)} {...rest} />;
}
export function DialogTitle({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseDialog.Title>) {
  return <BaseDialog.Title className={cx(styles.title, className)} {...rest} />;
}
export function DialogDescription({ className, ...rest }: ComponentPropsWithoutRef<typeof BaseDialog.Description>) {
  return <BaseDialog.Description className={cx(styles.description, className)} {...rest} />;
}
export function DialogFooter({ className, ...rest }: ComponentPropsWithoutRef<"div">) {
  return <div className={cx(styles.footer, className)} {...rest} />;
}
/** Closes the dialog. Use `render={<Button variant="ghost" />}` to style it as a Button. */
export const DialogClose = BaseDialog.Close;
