"use client";
import { useEffect, useState } from "react";
import { useTheme } from "@notsho/theme";
import { Customizer, type CustomizerProps } from "./Customizer.js";

export type DockPosition = "bottom" | "top" | "left" | "right";

export interface DockState { position: DockPosition; open: boolean }

export interface CustomizerDockProps extends Pick<CustomizerProps, "title"> {
  /** Controlled position. Omit to let the dock manage (and persist) it. */
  position?: DockPosition;
  defaultPosition?: DockPosition;
  /** Fires on user change and once on restore from storage, so hosts can lay out around the dock. */
  onPositionChange?(position: DockPosition): void;
  /** Controlled open state. Omit to let the dock manage it. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?(open: boolean): void;
  /** localStorage key for position + open state. Pass null to disable persistence. */
  storageKey?: string | null;
  /** Hide the panel-settings gear (fixed placement). */
  allowReposition?: boolean;
  className?: string;
}

const POSITIONS: DockPosition[] = ["left", "top", "bottom", "right"];
const LABELS: Record<DockPosition, string> = { left: "Left", top: "Top", bottom: "Bottom", right: "Right" };
const DEFAULT_KEY = "notsho-dock";

function readPrefs(key: string | null): Partial<DockState> {
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
 * Top/bottom overlay the page; left/right are full-height side panels — listen
 * to onPositionChange/onOpenChange to push your layout aside (see `useDockInset`).
 * Renders position: fixed — mount once at the app root inside <ThemeProvider>.
 */
export function CustomizerDock({
  position: positionProp, defaultPosition = "bottom", onPositionChange,
  open: openProp, defaultOpen = false, onOpenChange,
  storageKey = DEFAULT_KEY, allowReposition = true, title = "Appearance", className,
}: CustomizerDockProps) {
  const [positionState, setPositionState] = useState<DockPosition>(defaultPosition);
  const [openState, setOpenState] = useState(defaultOpen);
  const [restored, setRestored] = useState(false);
  const [view, setView] = useState<"controls" | "settings">("controls");
  const { theme } = useTheme();

  // Restore once, then report the effective state so hosts can lay out around us.
  useEffect(() => {
    const p = readPrefs(storageKey);
    const pos = positionProp ?? p.position ?? defaultPosition;
    const op = openProp ?? p.open ?? defaultOpen;
    if (positionProp === undefined) setPositionState(pos);
    if (openProp === undefined) setOpenState(op);
    onPositionChange?.(pos);
    onOpenChange?.(op);
    setRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const position = positionProp ?? positionState;
  const open = openProp ?? openState;

  const persist = (patch: Partial<DockState>) => {
    if (!storageKey || typeof localStorage === "undefined") return;
    try { localStorage.setItem(storageKey, JSON.stringify({ position, open, ...patch })); } catch { /* noop */ }
  };
  const setPosition = (p: DockPosition) => { setPositionState(p); onPositionChange?.(p); persist({ position: p }); };
  const setOpen = (o: boolean) => { setOpenState(o); onOpenChange?.(o); persist({ open: o }); if (!o) setView("controls"); };

  const horizontal = position === "top" || position === "bottom";
  const accent = (theme.meta?.colors as { accent?: string } | undefined)?.accent ?? "var(--notsho-color-accent)";
  const label = title ?? "Appearance";

  return (
    <div
      className={`ncd${className ? ` ${className}` : ""}`}
      data-position={position}
      data-open={open || undefined}
      data-restored={restored || undefined}
      role="region"
      aria-label={label}
    >
      {open ? (
        <div className="ncd-panel" data-view={view} key={view}>
          {view === "controls" ? (
            <Customizer
              preview={false}
              layout={horizontal ? "row" : "column"}
              title={title}
              headerActions={
                <>
                  {allowReposition && (
                    <button type="button" className="ncd-icon" onClick={() => setView("settings")} aria-label="Panel settings">
                      <GearIcon />
                    </button>
                  )}
                  <button type="button" className="ncd-icon" onClick={() => setOpen(false)} aria-label={`Collapse ${label.toLowerCase()} panel`}>
                    <ChevronIcon direction={position} />
                  </button>
                </>
              }
            />
          ) : (
            <PanelSettings position={position} onPosition={setPosition} onBack={() => setView("controls")} onCollapse={() => setOpen(false)} />
          )}
        </div>
      ) : (
        <button type="button" className="ncd-handle" onClick={() => setOpen(true)} aria-expanded={false} aria-label={`Open ${label.toLowerCase()} panel`}>
          <span className="ncd-handle-swatch" style={{ background: accent }} aria-hidden />
          <span className="ncd-handle-label">{label}</span>
        </button>
      )}
    </div>
  );
}

/** Settings "back side" of the panel: where the panel lives and how it behaves. */
function PanelSettings({ position, onPosition, onBack, onCollapse }: {
  position: DockPosition; onPosition(p: DockPosition): void; onBack(): void; onCollapse(): void;
}) {
  return (
    <div className="nc ncd-settings" data-layout="column">
      <div className="nc-controls">
        <header className="nc-head">
          <h2 className="nc-title">Panel settings</h2>
          <div className="nc-head-actions">
            <button type="button" className="ncd-icon" data-active onClick={onBack} aria-label="Back to appearance">
              <GearIcon />
            </button>
            <button type="button" className="ncd-icon" onClick={onCollapse} aria-label="Collapse panel">
              <ChevronIcon direction={position} />
            </button>
          </div>
        </header>
        <div className="nc-sections">
          <section className="nc-section">
            <div className="nc-label">Position</div>
            <div className="ncd-pos" role="radiogroup" aria-label="Panel position">
              {POSITIONS.map((p) => (
                <button key={p} type="button" role="radio" aria-checked={position === p} aria-label={`Dock ${p}`}
                  className="ncd-pos-item" data-active={position === p || undefined} onClick={() => onPosition(p)}>
                  <PositionIcon position={p} />
                  <span>{LABELS[p]}</span>
                </button>
              ))}
            </div>
            <p className="ncd-hint">Top and bottom float over the page. Left and right sit beside it.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

/** Frame with a solid bar on the docked edge. Bar is inset so it can't be confused with the frame stroke. */
function PositionIcon({ position }: { position: DockPosition }) {
  const bar = {
    left:   { x: 4, y: 4, width: 3.5, height: 8 },
    right:  { x: 8.5, y: 4, width: 3.5, height: 8 },
    top:    { x: 4, y: 4, width: 8, height: 3.5 },
    bottom: { x: 4, y: 8.5, width: 8, height: 3.5 },
  }[position];
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="1.5" y="1.5" width="13" height="13" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.25" opacity="0.5" />
      <rect {...bar} rx="1" fill="currentColor" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="8" r="2.25" />
      <path d="M8 1.75v1.5M8 12.75v1.5M1.75 8h1.5M12.75 8h1.5M3.58 3.58l1.06 1.06M11.36 11.36l1.06 1.06M3.58 12.42l1.06-1.06M11.36 4.64l1.06-1.06" />
    </svg>
  );
}

/** Points toward the edge the panel collapses into. */
function ChevronIcon({ direction }: { direction: DockPosition }) {
  const d = { bottom: "m4 6 4 4 4-4", top: "m4 10 4-4 4 4", left: "m10 4-4 4 4 4", right: "m6 4 4 4-4 4" }[direction];
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>;
}

/**
 * Host helper: the inline padding a layout should reserve for an open side dock.
 * Returns e.g. { paddingLeft: "22rem" } — spread onto your frame's style.
 */
export function dockInset(state: DockState, width = "22rem"): React.CSSProperties {
  if (!state.open) return {};
  if (state.position === "left") return { paddingLeft: width };
  if (state.position === "right") return { paddingRight: width };
  return {};
}
