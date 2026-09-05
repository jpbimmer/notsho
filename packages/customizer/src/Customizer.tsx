"use client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme, serializeTheme, themeToCss, type ColorScheme, type Theme } from "@notsho/theme";
import type { ThemeOverrides } from "@notsho/tokens";
import { COLOR_DERIVED_TOKENS, deriveColors, presets, type ColorChoices } from "./derive.js";
import { hexToOklch, oklchToHex } from "./color.js";
import { BODY_SIZES, DEFAULT_TYPOGRAPHY, TYPOGRAPHY_DERIVED_TOKENS, deriveTypography, fontStylesheets, fonts, type TypographyChoices } from "./typography.js";
import { DEFAULT_SHAPE, SHAPE_DERIVED_TOKENS, deriveShape, type ShapeChoices } from "./shape.js";
import { DEFAULT_MOTION, MOTION_DERIVED_TOKENS, deriveMotion, type MotionChoices } from "./motion.js";

const DEFAULT_COLORS: ColorChoices = { accent: "#2563eb", tint: 0 };

/** Every section: meta key, defaults, derivation, and the tokens it owns. */
const SECTIONS = {
  colors: { defaults: DEFAULT_COLORS, derive: deriveColors, tokens: COLOR_DERIVED_TOKENS },
  typography: { defaults: DEFAULT_TYPOGRAPHY, derive: deriveTypography, tokens: TYPOGRAPHY_DERIVED_TOKENS },
  shape: { defaults: DEFAULT_SHAPE, derive: deriveShape, tokens: SHAPE_DERIVED_TOKENS },
  motion: { defaults: DEFAULT_MOTION, derive: deriveMotion, tokens: MOTION_DERIVED_TOKENS },
} as const;
type SectionKey = keyof typeof SECTIONS;
type Choices<K extends SectionKey> = (typeof SECTIONS)[K]["defaults"];

export type CustomizerTab = "colors" | "type" | "shape" | "motion";
const TABS: { id: CustomizerTab; label: string }[] = [
  { id: "colors", label: "Colors" }, { id: "type", label: "Type" }, { id: "shape", label: "Shape" }, { id: "motion", label: "Motion" },
];

export interface CustomizerProps {
  /** Hide the live preview column (e.g. when embedding beside your own UI). */
  preview?: boolean;
  /** Section heading. Defaults to "Appearance". Pass null to omit the header. */
  title?: string | null;
  /** "column" stacks sections (default); "row" lays them side by side for a horizontal dock. */
  layout?: "column" | "row";
  /** Extra controls rendered in the header, right of the title. */
  headerActions?: ReactNode;
  /** Which tabs to show. Default: all. */
  tabs?: CustomizerTab[];
  className?: string;
}

/** Read a section's choices from theme.meta, falling back to defaults per key. */
function readChoices<K extends SectionKey>(theme: Theme, key: K): Choices<K> {
  const m = theme.meta?.[key];
  const d = SECTIONS[key].defaults as unknown as Record<string, unknown>;
  if (!m || typeof m !== "object") return SECTIONS[key].defaults;
  const out: Record<string, unknown> = { ...d };
  for (const k of Object.keys(d)) if (k in (m as object)) out[k] = (m as Record<string, unknown>)[k];
  return out as unknown as Choices<K>;
}

/**
 * End-user theme customizer. Drop into a settings page inside <ThemeProvider>.
 * Tabs: Colors, Type, Shape, Motion. Import "@notsho/customizer/styles.css" once.
 */
export function Customizer({ preview = true, title = "Appearance", layout = "column", headerActions, tabs, className }: CustomizerProps) {
  const { theme, setTheme, setScheme } = useTheme();
  const visibleTabs = tabs ? TABS.filter((t) => tabs.includes(t.id)) : TABS;
  const [tab, setTab] = useState<CustomizerTab>(visibleTabs[0]?.id ?? "colors");
  const [exporting, setExporting] = useState(false);

  const colors = useMemo(() => readChoices(theme, "colors"), [theme]);
  const typography = useMemo(() => readChoices(theme, "typography"), [theme]);
  const shape = useMemo(() => readChoices(theme, "shape"), [theme]);
  const motion = useMemo(() => readChoices(theme, "motion"), [theme]);
  const isDefault = !Object.keys(SECTIONS).some((k) => theme.meta?.[k]);

  const apply = useCallback(<K extends SectionKey>(key: K, next: Choices<K>) => {
    const s = SECTIONS[key];
    const overrides: ThemeOverrides = { ...theme.overrides };
    for (const t of s.tokens) delete overrides[t];
    setTheme({ ...theme, overrides: { ...overrides, ...(s.derive as (c: Choices<K>) => ThemeOverrides)(next) }, meta: { ...theme.meta, [key]: next } });
  }, [theme, setTheme]);

  const resetAll = useCallback(() => {
    const overrides: ThemeOverrides = { ...theme.overrides };
    const meta = { ...theme.meta };
    for (const k of Object.keys(SECTIONS) as SectionKey[]) { for (const t of SECTIONS[k].tokens) delete overrides[t]; delete meta[k]; }
    setTheme({ ...theme, overrides, meta });
  }, [theme, setTheme]);

  return (
    <div className={`nc${className ? ` ${className}` : ""}`} data-notsho-customizer data-layout={layout} data-preview={preview || undefined}>
      <FontLoader choices={typography} />
      <div className="nc-controls">
        {title !== null && (
          <header className="nc-head">
            <h2 className="nc-title">{exporting ? "Export theme" : title}</h2>
            <div className="nc-head-actions">
              {!exporting && <button type="button" className="nc-link" onClick={resetAll} disabled={isDefault}>Reset</button>}
              <button type="button" className="ncd-icon" data-active={exporting || undefined} onClick={() => setExporting((v) => !v)} aria-label={exporting ? "Back to controls" : "Export theme"} aria-pressed={exporting}>
                <ExportIcon />
              </button>
              {headerActions}
            </div>
          </header>
        )}

        {exporting ? (
          <ExportView theme={theme} />
        ) : (
          <>
            {visibleTabs.length > 1 && (
              <div className="nc-tabs" role="tablist">
                {visibleTabs.map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="nc-tab" data-active={tab === t.id || undefined} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>
            )}
            <div className="nc-sections" key={tab}>
              {tab === "colors" && <ColorsTab scheme={theme.scheme} setScheme={setScheme} choices={colors} apply={(c) => apply("colors", c)} />}
              {tab === "type" && <TypeTab choices={typography} apply={(c) => apply("typography", c)} />}
              {tab === "shape" && <ShapeTab choices={shape} apply={(c) => apply("shape", c)} />}
              {tab === "motion" && <MotionTab choices={motion} apply={(c) => apply("motion", c)} />}
            </div>
          </>
        )}
      </div>

      {preview && <Preview />}
    </div>
  );
}

// ─── Shared controls ─────────────────────────────────────────────────────────

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange(v: T): void; label: string }) {
  return (
    <div className="nc-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="nc-seg-item" data-active={value === o.value || undefined} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

function Section({ label, children, htmlFor, trailing }: { label: string; children: ReactNode; htmlFor?: string; trailing?: ReactNode }) {
  const Tag = htmlFor ? "label" : "div";
  return (
    <section className="nc-section">
      <Tag className={`nc-label${trailing ? " nc-label-row" : ""}`} htmlFor={htmlFor}>
        <span>{label}</span>{trailing && <span className="nc-value">{trailing}</span>}
      </Tag>
      {children}
    </section>
  );
}

// ─── Tabs ────────────────────────────────────────────────────────────────────

function ColorsTab({ scheme, setScheme, choices, apply }: { scheme: ColorScheme; setScheme(s: ColorScheme): void; choices: ColorChoices; apply(c: ColorChoices): void }) {
  const activePreset = presets.find((p) => p.accent.toLowerCase() === choices.accent.toLowerCase() && p.tint === choices.tint)?.id;
  return (
    <>
      <Section label="Mode">
        <Segmented label="Color scheme" value={scheme} onChange={setScheme} options={[{ value: "system", label: "Auto" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
      </Section>
      <Section label="Presets">
        <div className="nc-presets">
          {presets.map((p) => (
            <button key={p.id} type="button" className="nc-preset" data-active={activePreset === p.id || undefined} aria-pressed={activePreset === p.id} onClick={() => apply({ accent: p.accent, tint: p.tint })}>
              <span className="nc-preset-dot" style={{ background: p.accent }} aria-hidden />
              <span className="nc-preset-name">{p.name}</span>
            </button>
          ))}
        </div>
      </Section>
      <Section label="Accent" htmlFor="nc-accent">
        <div className="nc-accent">
          <span className="nc-swatch" style={{ background: choices.accent }}>
            <input id="nc-accent" type="color" value={normalizeHex(choices.accent)} onChange={(e) => apply({ ...choices, accent: e.target.value })} aria-label="Accent color" />
          </span>
          <input className="nc-hex" type="text" value={choices.accent} spellCheck={false} aria-label="Accent hex"
            onChange={(e) => { const v = e.target.value; if (hexToOklch(v)) apply({ ...choices, accent: v.startsWith("#") ? v : `#${v}` }); }} />
        </div>
      </Section>
      <Section label="Surface tint" htmlFor="nc-tint" trailing={`${Math.round(choices.tint * 100)}%`}>
        <input id="nc-tint" className="nc-range" type="range" min={0} max={100} step={5} value={Math.round(choices.tint * 100)}
          onChange={(e) => apply({ ...choices, tint: Number(e.target.value) / 100 })}
          style={{ "--nc-fill": `${Math.round(choices.tint * 100)}%` } as React.CSSProperties} />
      </Section>
    </>
  );
}

function FontPicker({ id, value, onChange, allowSame, category }: { id: string; value: string; onChange(v: string): void; allowSame?: boolean; category: "text" | "mono" }) {
  const list = fonts.filter((f) => (category === "mono" ? f.category === "mono" : f.category !== "mono"));
  return (
    <select id={id} className="nc-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {allowSame && <option value="same">Same as body</option>}
      {list.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
    </select>
  );
}

function TypeTab({ choices, apply }: { choices: TypographyChoices; apply(c: TypographyChoices): void }) {
  return (
    <>
      <Section label="Body font" htmlFor="nc-font-body">
        <FontPicker id="nc-font-body" value={choices.body} onChange={(body) => apply({ ...choices, body })} category="text" />
      </Section>
      <Section label="Heading font" htmlFor="nc-font-heading">
        <FontPicker id="nc-font-heading" value={choices.heading} onChange={(heading) => apply({ ...choices, heading })} allowSame category="text" />
      </Section>
      <Section label="Code font" htmlFor="nc-font-code">
        <FontPicker id="nc-font-code" value={choices.code} onChange={(code) => apply({ ...choices, code })} category="mono" />
      </Section>
      <Section label="Base size" trailing={`${choices.size}px`}>
        <Segmented label="Base size" value={String(choices.size)} onChange={(v) => apply({ ...choices, size: Number(v) as TypographyChoices["size"] })}
          options={BODY_SIZES.map((s) => ({ value: String(s), label: String(s) }))} />
      </Section>
      <Section label="Heading weight">
        <Segmented label="Heading weight" value={String(choices.headingWeight)} onChange={(v) => apply({ ...choices, headingWeight: Number(v) as TypographyChoices["headingWeight"] })}
          options={[{ value: "500", label: "Medium" }, { value: "600", label: "Semibold" }, { value: "700", label: "Bold" }]} />
      </Section>
    </>
  );
}

function ShapeTab({ choices, apply }: { choices: ShapeChoices; apply(c: ShapeChoices): void }) {
  return (
    <>
      <Section label="Corners">
        <Segmented label="Corner radius" value={choices.radius} onChange={(radius) => apply({ ...choices, radius })}
          options={[{ value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "rounded", label: "Rounded" }, { value: "round", label: "Round" }, { value: "pill", label: "Pill" }]} />
      </Section>
      <Section label="Density">
        <Segmented label="Density" value={choices.density} onChange={(density) => apply({ ...choices, density })}
          options={[{ value: "compact", label: "Compact" }, { value: "comfortable", label: "Comfortable" }, { value: "spacious", label: "Spacious" }]} />
      </Section>
      <Section label="Elevation">
        <Segmented label="Elevation" value={choices.elevation} onChange={(elevation) => apply({ ...choices, elevation })}
          options={[{ value: "flat", label: "Flat" }, { value: "soft", label: "Soft" }, { value: "lifted", label: "Lifted" }]} />
      </Section>
      <Section label="Borders">
        <Segmented label="Border weight" value={choices.borders} onChange={(borders) => apply({ ...choices, borders })}
          options={[{ value: "hairline", label: "Hairline" }, { value: "bold", label: "Bold" }]} />
      </Section>
    </>
  );
}

function MotionTab({ choices, apply }: { choices: MotionChoices; apply(c: MotionChoices): void }) {
  return (
    <Section label="Animation">
      <Segmented label="Animation speed" value={choices.speed} onChange={(speed) => apply({ ...choices, speed })}
        options={[{ value: "off", label: "Off" }, { value: "reduced", label: "Reduced" }, { value: "normal", label: "Normal" }, { value: "expressive", label: "Expressive" }]} />
      <p className="ncd-hint">"Off" also respects users who prefer reduced motion.</p>
    </Section>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

function ExportView({ theme }: { theme: Theme }) {
  const json = useMemo(() => JSON.stringify(JSON.parse(serializeTheme(theme)), null, 2), [theme]);
  const css = useMemo(() => prettyCss(themeToCss(theme.overrides)), [theme]);
  return (
    <div className="nc-sections nc-export">
      <CopyBlock label="theme.json" hint="Load with parseTheme(), or commit as your app's default theme." value={json} />
      <CopyBlock label="theme.css" hint="Static overrides — drop after tokens.css for a no-JS build." value={css || "/* no overrides */"} />
    </div>
  );
}

function CopyBlock({ label, hint, value }: { label: string; hint: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <section className="nc-section nc-export-block">
      <div className="nc-label nc-label-row"><span>{label}</span><button type="button" className="nc-link" onClick={copy}>{copied ? "Copied" : "Copy"}</button></div>
      <textarea className="nc-code" readOnly value={value} rows={8} spellCheck={false} onFocus={(e) => e.currentTarget.select()} />
      <p className="ncd-hint">{hint}</p>
    </section>
  );
}

function prettyCss(css: string): string {
  return css.replace(/\{/g, " {\n  ").replace(/;/g, ";\n  ").replace(/\s*\}/g, "\n}\n").replace(/\n  \n\}/g, "\n}").trim();
}

// ─── Fonts ───────────────────────────────────────────────────────────────────

/** Injects Google Fonts <link>s for the chosen families. Hosts can SSR them via fontStylesheets(). */
function FontLoader({ choices }: { choices: TypographyChoices }) {
  const hrefs = useMemo(() => fontStylesheets(choices), [choices]);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const existing = [...document.querySelectorAll<HTMLLinkElement>('link[data-notsho-font]')];
    for (const l of existing) if (!hrefs.includes(l.href)) l.remove();
    for (const href of hrefs) {
      if (existing.some((l) => l.href === href)) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet"; link.href = href; link.dataset.notshoFont = "";
      document.head.appendChild(link);
    }
  }, [hrefs]);
  return null;
}

// ─── Misc ────────────────────────────────────────────────────────────────────

function normalizeHex(hex: string): string {
  const c = hexToOklch(hex);
  return c ? oklchToHex(c) : "#000000";
}

function ExportIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 2v8M5 7l3 3 3-3M3 11v1.5A1.5 1.5 0 0 0 4.5 14h7a1.5 1.5 0 0 0 1.5-1.5V11" />
    </svg>
  );
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
