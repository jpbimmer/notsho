/**
 * Framework-agnostic theme runtime.
 *
 * A Theme is a color-scheme preference plus a set of token overrides. Applying
 * it writes one <style> element (so per-mode overrides get real cascade blocks)
 * and sets `data-theme` on the root. Nothing here touches React.
 */
import { tokens, tokenTier, prefix as defaultPrefix, type ThemableTokenName, type ThemeOverrides, type Mode } from "@notsho/tokens";

export type ColorScheme = Mode | "system";

export interface Theme {
  /** "system" follows prefers-color-scheme. */
  scheme: ColorScheme;
  overrides: ThemeOverrides;
  /** Free-form, JSON-safe state for tools that write overrides (e.g. the customizer's choices). */
  meta?: Record<string, unknown>;
}

export const THEME_FORMAT_VERSION = 1;
export const DEFAULT_STORAGE_KEY = "notsho-theme";
export const STYLE_ELEMENT_ID = "notsho-theme";

export const emptyTheme = (): Theme => ({ scheme: "system", overrides: {} });

/** Token name → CSS custom property name. Kept in sync with the compiler's naming rule. */
export function tokenToVar(name: string, prefix: string = defaultPrefix): string {
  return `--${prefix}-${name.replace(/\./g, "-")}`;
}

export const isThemable = (name: string): name is ThemableTokenName =>
  name in tokens && tokenTier[name as keyof typeof tokens] !== "primitive";

// ─── Serialization ───────────────────────────────────────────────────────────

interface Stored { v: number; scheme: ColorScheme; overrides: Record<string, unknown>; meta?: Record<string, unknown> }

export function serializeTheme(theme: Theme): string {
  const s: Stored = { v: THEME_FORMAT_VERSION, scheme: theme.scheme, overrides: theme.overrides };
  if (theme.meta && Object.keys(theme.meta).length) s.meta = theme.meta;
  return JSON.stringify(s);
}

/**
 * Parse a stored theme. Unknown tokens and malformed values are dropped rather
 * than thrown, because storage is user-controlled and must never break the app.
 */
export function parseTheme(input: string | null | undefined): Theme {
  if (!input) return emptyTheme();
  let raw: unknown;
  try { raw = JSON.parse(input); } catch { return emptyTheme(); }
  if (typeof raw !== "object" || raw === null) return emptyTheme();
  const s = raw as Partial<Stored>;
  const scheme: ColorScheme = s.scheme === "light" || s.scheme === "dark" ? s.scheme : "system";
  const overrides: ThemeOverrides = {};
  if (s.overrides && typeof s.overrides === "object") {
    for (const [k, v] of Object.entries(s.overrides)) {
      if (!isThemable(k)) continue;
      if (typeof v === "string") overrides[k] = sanitize(v);
      else if (typeof v === "object" && v !== null) {
        const mv = v as Record<string, unknown>;
        const out: Partial<Record<Mode, string>> = {};
        if (typeof mv.light === "string") out.light = sanitize(mv.light);
        if (typeof mv.dark === "string") out.dark = sanitize(mv.dark);
        if (out.light || out.dark) overrides[k] = out;
      }
    }
  }
  const meta = s.meta && typeof s.meta === "object" && !Array.isArray(s.meta) ? (s.meta as Record<string, unknown>) : undefined;
  return meta ? { scheme, overrides, meta } : { scheme, overrides };
}

/** Values land inside a <style> element: strip anything that could close a declaration or block. */
function sanitize(v: string): string {
  return v.replace(/[;{}<>]/g, "").trim();
}

// ─── CSS generation ──────────────────────────────────────────────────────────

/**
 * Turn overrides into CSS. Plain values go on :root; moded values get a light
 * block, a dark block, and a prefers-color-scheme block mirroring tokens.css.
 */
export function themeToCss(overrides: ThemeOverrides, prefix: string = defaultPrefix): string {
  const base: string[] = [];
  const light: string[] = [];
  const dark: string[] = [];
  for (const [name, value] of Object.entries(overrides)) {
    if (value === undefined) continue;
    const v = tokenToVar(name, prefix);
    if (typeof value === "string") base.push(`${v}:${value}`);
    else {
      if (value.light) light.push(`${v}:${value.light}`);
      if (value.dark) dark.push(`${v}:${value.dark}`);
    }
  }
  let css = "";
  if (base.length) css += `:root{${base.join(";")}}`;
  if (light.length) css += `:root,[data-theme="light"]{${light.join(";")}}`;
  if (dark.length) {
    const d = dark.join(";");
    css += `[data-theme="dark"]{${d}}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${d}}}`;
  }
  return css;
}

// ─── DOM application ─────────────────────────────────────────────────────────

export interface ApplyOptions {
  /** Defaults to document.documentElement. */
  root?: HTMLElement;
  /** Where to inject the style element. Defaults to document.head. */
  container?: HTMLElement;
  prefix?: string;
}

/** Idempotent: replaces any previously applied theme. Safe to call on every change. */
export function applyTheme(theme: Theme, opts: ApplyOptions = {}): void {
  if (typeof document === "undefined") return;
  const root = opts.root ?? document.documentElement;
  const container = opts.container ?? document.head;

  if (theme.scheme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme.scheme;

  let el = container.querySelector<HTMLStyleElement>(`#${STYLE_ELEMENT_ID}`);
  const css = themeToCss(theme.overrides, opts.prefix);
  if (!css) { el?.remove(); return; }
  if (!el) {
    el = document.createElement("style");
    el.id = STYLE_ELEMENT_ID;
    container.appendChild(el);
  }
  if (el.textContent !== css) el.textContent = css;
}

/** The mode actually in effect, resolving "system" against the media query. */
export function resolveScheme(scheme: ColorScheme): Mode {
  if (scheme !== "system") return scheme;
  if (typeof matchMedia === "undefined") return "light";
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// ─── Storage adapters ────────────────────────────────────────────────────────

/** Sync or async. Apps bring their own (per-user DB) by implementing this. */
export interface ThemeStorage {
  get(): string | null | Promise<string | null>;
  set(value: string): void | Promise<void>;
  remove?(): void | Promise<void>;
}

export function localStorageAdapter(key = DEFAULT_STORAGE_KEY): ThemeStorage {
  return {
    get: () => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (v) => { try { localStorage.setItem(key, v); } catch { /* quota / private mode */ } },
    remove: () => { try { localStorage.removeItem(key); } catch { /* noop */ } },
  };
}

/** SSR-friendly: the server can read the cookie and render the right scheme on first paint. */
export function cookieAdapter(key = DEFAULT_STORAGE_KEY, opts: { maxAgeDays?: number; path?: string } = {}): ThemeStorage {
  const maxAge = (opts.maxAgeDays ?? 365) * 86400;
  const path = opts.path ?? "/";
  return {
    get: () => {
      if (typeof document === "undefined") return null;
      const m = document.cookie.match(new RegExp(`(?:^|; )${key}=([^;]*)`));
      return m ? decodeURIComponent(m[1]!) : null;
    },
    set: (v) => {
      if (typeof document === "undefined") return;
      document.cookie = `${key}=${encodeURIComponent(v)}; Max-Age=${maxAge}; Path=${path}; SameSite=Lax`;
    },
    remove: () => {
      if (typeof document === "undefined") return;
      document.cookie = `${key}=; Max-Age=0; Path=${path}`;
    },
  };
}

export function memoryAdapter(initial: string | null = null): ThemeStorage {
  let v = initial;
  return { get: () => v, set: (n) => { v = n; }, remove: () => { v = null; } };
}
