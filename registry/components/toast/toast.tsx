"use client";
import { Toast as BaseToast } from "@base-ui/react/toast";
import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { XIcon } from "../../lib/icons";
import styles from "./toast.module.css";

export type ToastType = "default" | "success" | "warning" | "danger";

export interface ToasterProps {
  children: ReactNode;
  /** Corner to stack in. Default "bottom-right". */
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left" | "bottom-center" | "top-center";
  /** Auto-dismiss after ms. Default 5000. */
  timeout?: number;
  limit?: number;
}

/**
 * Mount once near the app root. Then call `useToast().add({ title, description, type })`.
 * `type` maps to the color variants above.
 */
export function Toaster({ children, position = "bottom-right", timeout = 5000, limit = 3 }: ToasterProps) {
  return (
    <BaseToast.Provider timeout={timeout} limit={limit}>
      {children}
      <BaseToast.Portal>
        <BaseToast.Viewport data-position={position} className={styles.viewport}>
          <ToastList />
        </BaseToast.Viewport>
      </BaseToast.Portal>
    </BaseToast.Provider>
  );
}

/** `add`, `close`, `update`, `promise` — see Base UI's useToastManager. */
export const useToast = BaseToast.useToastManager;

function ToastList() {
  const { toasts } = BaseToast.useToastManager();
  return toasts.map((toast) => (
    <BaseToast.Root key={toast.id} toast={toast} className={cx(styles.toast)} swipeDirection={["down", "right"]}>
      <BaseToast.Content className={styles.content}>
        <div className={styles.text}>
          <BaseToast.Title className={styles.title} />
          <BaseToast.Description className={styles.description} />
        </div>
        <BaseToast.Close className={styles.close} aria-label="Dismiss"><XIcon width={14} height={14} /></BaseToast.Close>
      </BaseToast.Content>
    </BaseToast.Root>
  ));
}
