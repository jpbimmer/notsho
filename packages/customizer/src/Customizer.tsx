"use client";
import { useCallback, useMemo } from "react";
import { useTheme, type ColorScheme } from "@notsho/theme";
import type { ThemeOverrides } from "@notsho/tokens";
import { COLOR_DERIVED_TOKENS, deriveColors, presets, type ColorChoices } from "./derive.js";
import { hexToOklch, oklchToHex } from "./color.js";

const META_KEY = "colors";
const DEFAULT_CHOICES: ColorChoices = { accent: "#2563eb", tint: 0 };

export interface CustomizerProps {
  /** Hide the live preview column (e.g. when embedding beside your own UI). */
  preview?: boolean;
  /** Section heading. Defaults to "Appearance". */
  title?: string;
  className?: string;
}

/**
 * End-user theme customizer. Drop into a settings page inside <ThemeProvider>.
 * v0: color scheme, presets, accent, surface tint. Import "@notsho/customizer/styles.css" once.
 */
export function Customizer({ preview = true, title = "Appearance", className }: CustomizerProps) {
  const { theme, setTheme, setScheme } = useTheme();

  const choices = useMemo<ColorChoices>(() => {
    const m = theme.meta?.[META_KEY] as Partial<ColorChoices> | undefined;
    return {
      accent: typeof m?.accent === "string" && hexToOklch(m.accent) ? m.accent : DEFAULT_CHOICES.accent,
      tint: typeof m?.tint === "number" ? m.tint : DEFAULT_CHOICES.tint,
    };
  }, [theme.meta]);
  const isDefault = !theme.meta?.[META_KEY];

  const apply = useCallback((next: ColorChoices) => {
    const overrides: ThemeOverrides = { ...theme.overrides };
    for (const k of COLOR_DERIVED_TOKENS) delete overrides[k];
    setTheme({
      ...theme,
      overrides: { ...overrides, ...deriveColors(next) },
      meta: { ...theme.meta, [META_KEY]: next },
    });
  }, [theme, setTheme]);

  const resetColors = useCallback(() => {
    const overrides: ThemeOverrides = { ...theme.overrides };
    for (const k of COLOR_DERIVED_TOKENS) delete overrides[k];
    const meta = { ...theme.meta };
    delete meta[META_KEY];
    setTheme({ ...theme, overrides, meta });
  }, [theme, setTheme]);

  const activePreset = presets.find((p) => p.accent.toLowerCase() === choices.accent.toLowerCase() && p.tint === choices.tint)?.id;

  return (
    <div className={`nc${className ? ` ${className}` : ""}`} data-notsho-customizer>
      <div className="nc-controls">
        <header className="nc-head">
          <h2 className="nc-title">{title}</h2>
          <button type="button" className="nc-link" onClick={resetColors} disabled={isDefault}>Reset</button>
        </header>

        <section className="nc-section">
          <div className="nc-label">Mode</div>
          <div className="nc-seg" role="radiogroup" aria-label="Color scheme">
            {(["system", "light", "dark"] as ColorScheme[]).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={theme.scheme === s}
                className="nc-seg-item" data-active={theme.scheme === s || undefined} onClick={() => setScheme(s)}>
                {s === "system" ? "Auto" : s === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </section>

        <section className="nc-section">
          <div className="nc-label">Presets</div>
          <div className="nc-presets">
            {presets.map((p) => (
              <button key={p.id} type="button" className="nc-preset" data-active={activePreset === p.id || undefined}
                onClick={() => apply({ accent: p.accent, tint: p.tint })} aria-pressed={activePreset === p.id}>
                <span className="nc-preset-dot" style={{ background: p.accent }} aria-hidden />
                <span className="nc-preset-name">{p.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="nc-section">
          <label className="nc-label" htmlFor="nc-accent">Accent</label>
          <div className="nc-accent">
            <span className="nc-swatch" style={{ background: choices.accent }}>
              <input id="nc-accent" type="color" value={normalizeHex(choices.accent)}
                onChange={(e) => apply({ ...choices, accent: e.target.value })} aria-label="Accent color" />
            </span>
            <input className="nc-hex" type="text" value={choices.accent} spellCheck={false} aria-label="Accent hex"
              onChange={(e) => { const v = e.target.value; if (hexToOklch(v)) apply({ ...choices, accent: v.startsWith("#") ? v : `#${v}` }); }} />
          </div>
        </section>

        <section className="nc-section">
          <label className="nc-label nc-label-row" htmlFor="nc-tint">
            <span>Surface tint</span><span className="nc-value">{Math.round(choices.tint * 100)}%</span>
          </label>
          <input id="nc-tint" className="nc-range" type="range" min={0} max={100} step={5} value={Math.round(choices.tint * 100)}
            onChange={(e) => apply({ ...choices, tint: Number(e.target.value) / 100 })}
            style={{ "--nc-fill": `${Math.round(choices.tint * 100)}%` } as React.CSSProperties} />
        </section>
      </div>

      {preview && <Preview />}
    </div>
  );
}

function normalizeHex(hex: string): string {
  const c = hexToOklch(hex);
  return c ? oklchToHex(c) : "#000000";
}

/** Self-contained mini gallery so the customizer never depends on the copy-in registry. */
function Preview() {
  return (
    <div className="nc-preview" aria-hidden>
      <div className="nc-pv-card">
        <div className="nc-pv-head">
          <div className="nc-pv-title">Project settings</div>
          <span className="nc-pv-badge">Pro</span>
        </div>
        <p className="nc-pv-text">Changes apply instantly and are saved to this device.</p>
        <div className="nc-pv-field">
          <div className="nc-pv-label">Workspace name</div>
          <div className="nc-pv-input">Acme Inc.</div>
        </div>
        <div className="nc-pv-row">
          <span className="nc-pv-btn" data-variant="primary">Save changes</span>
          <span className="nc-pv-btn" data-variant="secondary">Cancel</span>
          <span className="nc-pv-link">Learn more</span>
        </div>
      </div>
      <div className="nc-pv-list">
        <div className="nc-pv-item" data-active><span className="nc-pv-dot" />Overview</div>
        <div className="nc-pv-item"><span className="nc-pv-dot" />Members</div>
        <div className="nc-pv-item"><span className="nc-pv-dot" />Billing</div>
      </div>
    </div>
  );
}
