"use client";
import { useEffect, useState } from "react";
import { useTheme } from "@notsho/theme";
import { Customizer, type CustomizerProps } from "./Customizer.js";

export type DockPosition = "bottom" | "top" | "left" | "right";

export interface CustomizerDockProps extends Pick<CustomizerProps, "title"> {
  /** Controlled position. Omit to let the dock manage (and persist) it. */
  position?: DockPosition;
  defaultPosition?: DockPosition;
  onPositionChange?(position: DockPosition): void;
  /** Controlled open state. Omit to let the dock manage it. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
  /** localStorage key for position + open state. Pass null to disable persistence. */
  storageKey?: string | null;
  /** Hide the position switcher (fixed placement). */
  allowReposition?: boolean;
  className?: string;
}

const POSITIONS: DockPosition[] = ["top", "right", "bottom", "left"];
const DEFAULT_KEY = "notsho-dock";

function readPrefs(key: string | null): { position?: DockPosition; open?: boolean } {
  if (!key || typeof localStorage === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? "{}") as { position?: unknown; open?: unknown };
    return {
      position: POSITIONS.includes(raw.position as DockPosition) ? (raw.position as DockPosition) : undefined,
      open: typeof raw.open === "boolean" ? raw.open : undefined,
    };
  } catch { return {}; }
}

/**
 * The customizer pinned to a viewport edge, macOS-dock style. Customization is
 * occasional, so it collapses to a slim handle and the app stays the focus.
 * Renders position: fixed — mount it once at the app root inside <ThemeProvider>.
 */
export function CustomizerDock({
  position: positionProp, defaultPosition = "bottom", onPositionChange,
  open: openProp, defaultOpen = false, onOpenChange,
  storageKey = DEFAULT_KEY, allowReposition = true, title = "Appearance", className,
}: CustomizerDockProps) {
  const [positionState, setPositionState] = useState<DockPosition>(defaultPosition);
  const [openState, setOpenState] = useState(defaultOpen);
  const [restored, setRestored] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    const p = readPrefs(storageKey);
    if (p.position && positionProp === undefined) setPositionState(p.position);
    if (p.open !== undefined && openProp === undefined) setOpenState(p.open);
    setRestored(true);
  }, [storageKey, positionProp, openProp]);

  const position = positionProp ?? positionState;
  const open = openProp ?? openState;

  const persist = (patch: { position?: DockPosition; open?: boolean }) => {
    if (!storageKey || typeof localStorage === "undefined") return;
    try { localStorage.setItem(storageKey, JSON.stringify({ position, open, ...patch })); } catch { /* noop */ }
  };
  const setPosition = (p: DockPosition) => { setPositionState(p); onPositionChange?.(p); persist({ position: p }); };
  const setOpen = (o: boolean) => { setOpenState(o); onOpenChange?.(o); persist({ open: o }); };

  const horizontal = position === "top" || position === "bottom";
  const accent = (theme.meta?.colors as { accent?: string } | undefined)?.accent ?? "var(--notsho-color-accent)";

  return (
    <div
      className={`ncd${className ? ` ${className}` : ""}`}
      data-position={position}
      data-open={open || undefined}
      data-restored={restored || undefined}
      role="region"
      aria-label={title ?? "Appearance"}
    >
      {open ? (
        <div className="ncd-panel">
          <Customizer
            preview={false}
            layout={horizontal ? "row" : "column"}
            title={title}
            headerActions={
              <>
                {allowReposition && <PositionSwitcher value={position} onChange={setPosition} />}
                <button type="button" className="ncd-icon" onClick={() => setOpen(false)} aria-label="Collapse appearance panel">
                  <ChevronIcon direction={position} />
                </button>
              </>
            }
          />
        </div>
      ) : (
        <button type="button" className="ncd-handle" onClick={() => setOpen(true)} aria-expanded={false} aria-label={`Open ${title ?? "appearance"} panel`}>
          <span className="ncd-handle-swatch" style={{ background: accent }} aria-hidden />
          <span className="ncd-handle-label">{title}</span>
        </button>
      )}
    </div>
  );
}

function PositionSwitcher({ value, onChange }: { value: DockPosition; onChange(p: DockPosition): void }) {
  return (
    <div className="ncd-pos" role="radiogroup" aria-label="Panel position">
      {POSITIONS.map((p) => (
        <button key={p} type="button" role="radio" aria-checked={value === p} aria-label={`Dock ${p}`}
          className="ncd-pos-item" data-active={value === p || undefined} onClick={() => onChange(p)}>
          <PositionIcon position={p} />
        </button>
      ))}
    </div>
  );
}

function PositionIcon({ position }: { position: DockPosition }) {
  const bar = { top: "M2.5 3.5h11", right: "M12.5 2.5v11", bottom: "M2.5 12.5h11", left: "M3.5 2.5v11" }[position];
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <rect x="2.5" y="2.5" width="11" height="11" rx="2" opacity="0.45" />
      <path d={bar} strokeWidth="2.5" />
    </svg>
  );
}

/** Points toward the edge the panel collapses into. */
function ChevronIcon({ direction }: { direction: DockPosition }) {
  const d = { bottom: "m4 6 4 4 4-4", top: "m4 10 4-4 4 4", left: "m10 4-4 4 4 4", right: "m6 4 4 4-4 4" }[direction];
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}
