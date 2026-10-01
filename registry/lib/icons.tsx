import type { ComponentProps } from "react";

/** Tiny inline icons so the registry has no icon dependency. Swap for your icon set freely. */
const base = (props: ComponentProps<"svg">) => ({
  width: 16, height: 16, viewBox: "0 0 16 16", fill: "none", stroke: "currentColor",
  strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
  ...props, style: { display: "block", flex: "none", ...props.style },
});

export const CheckIcon = (p: ComponentProps<"svg">) => <svg {...base(p)}><path d="m3 8.5 3.5 3.5L13 4.5" /></svg>;
export const ChevronDownIcon = (p: ComponentProps<"svg">) => <svg {...base(p)}><path d="m4 6 4 4 4-4" /></svg>;
export const ChevronUpDownIcon = (p: ComponentProps<"svg">) => <svg {...base(p)}><path d="m5 6 3-3 3 3M5 10l3 3 3-3" /></svg>;
export const XIcon = (p: ComponentProps<"svg">) => <svg {...base(p)}><path d="m4 4 8 8M12 4l-8 8" /></svg>;
export const MinusIcon = (p: ComponentProps<"svg">) => <svg {...base(p)}><path d="M3.5 8h9" /></svg>;
export const SearchIcon = (p: ComponentProps<"svg">) => <svg {...base(p)}><circle cx="7" cy="7" r="4.25" /><path d="m10.25 10.25 3.25 3.25" /></svg>;
export const ChevronRightIcon = (p: ComponentProps<"svg">) => <svg {...base(p)}><path d="m6 4 4 4-4 4" /></svg>;
export const ArrowUpIcon = (p: ComponentProps<"svg">) => <svg {...base(p)}><path d="M8 13V3.5M4 7l4-4 4 4" /></svg>;
export const ArrowDownIcon = (p: ComponentProps<"svg">) => <svg {...base(p)}><path d="M8 3v9.5M4 9l4 4 4-4" /></svg>;
