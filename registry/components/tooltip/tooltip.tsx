"use client";
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { ComponentPropsWithoutRef, ReactElement, ReactNode } from "react";
import { cx } from "../../lib/cx";
import styles from "./tooltip.module.css";

/** Wrap a region once so adjacent tooltips open instantly after the first. */
export const TooltipProvider = BaseTooltip.Provider;

export interface TooltipProps extends Omit<ComponentPropsWithoutRef<typeof BaseTooltip.Root>, "children"> {
  /** Tooltip text. */
  content: ReactNode;
  /** The element that triggers it. Must accept a ref (Button, a native element…). */
  children: ReactElement;
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
}

/** Short, non-interactive hint on hover/focus. Never put essential content here. */
export function Tooltip({ content, children, side = "top", className, ...rest }: TooltipProps) {
  return (
    <BaseTooltip.Root {...rest}>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner side={side} sideOffset={6} className={styles.positioner}>
          <BaseTooltip.Popup className={cx(styles.popup, className)}>
            <BaseTooltip.Arrow className={styles.arrow} />
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  );
}
