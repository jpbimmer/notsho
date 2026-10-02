"use client";
/**
 * React bindings. ThemeProvider owns the theme state, applies it to the DOM,
 * and persists it through a storage adapter. ThemeScript prevents first-paint
 * flash when rendered in <head>.
 */
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { ThemableTokenName, ThemeOverrides, Mode } from "@notsho/tokens";
import {
  applyTheme, emptyTheme, localStorageAdapter, mergeThemes, parseTheme, resolveScheme, scopeStorageKey, scopeToCss, serializeTheme,
  type ColorScheme, type Theme, type ThemeStorage,
} from "./core.js";
import { themeScript, type ThemeScriptOptions } from "./script.js";

export * from "./core.js";
export { themeScript };

export interface ThemeContextValue {
  theme: Theme;
  /** The scheme in effect after resolving "system". */
  resolvedScheme: Mode;
  setTheme(theme: Theme): void;
  setScheme(scheme: ColorScheme): void;
  setOverride(name: ThemableTokenName, value: ThemeOverrides[ThemableTokenName] | undefined): void;
  setOverrides(patch: ThemeOverrides): void;
  /** Clear one token, or everything when called with no argument. */
  reset(name?: ThemableTokenName): void;
  /** True once the persisted theme has been read. */
  hydrated: boolean;
  /**
   * The provided layer under this theme (a scope's shipped defaults). `theme` is
   * only the user's layer; resetting falls back to this, not to Notsho defaults.
   */
  provided?: Theme;
  /** Scope id when this context belongs to a ThemeScope. */
  scope?: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: ReactNode;
  /** Defaults to localStorage under "notsho-theme". Pass cookieAdapter() or your own. */
  storage?: ThemeStorage | null;
  /** Applied when storage is empty. */
  defaultTheme?: Theme;
  /** Element that receives data-theme. Defaults to <html>. */
  root?: HTMLElement;
  prefix?: string;
}

export function ThemeProvider({ children, storage, defaultTheme, root, prefix }: ThemeProviderProps) {
  const store = useMemo<ThemeStorage | null>(
    () => (storage === undefined ? (typeof window === "undefined" ? null : localStorageAdapter()) : storage),
    [storage],
  );
  const [theme, setThemeState] = useState<Theme>(defaultTheme ?? emptyTheme());
  const [hydrated, setHydrated] = useState(false);
  const [systemScheme, setSystemScheme] = useState<Mode>("light");
  const skipPersist = useRef(true);

  // Hydrate from storage once.
  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = store ? await store.get() : null;
      if (!alive) return;
      if (raw) setThemeState(parseTheme(raw));
      setHydrated(true);
    })();
    return () => { alive = false; };
  }, [store]);

  // Track the OS scheme so resolvedScheme stays live.
  useEffect(() => {
    if (typeof matchMedia === "undefined") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemScheme(mq.matches ? "dark" : "light");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Apply + persist on every change (skip the persist on the hydration pass).
  useEffect(() => {
    applyTheme(theme, { root, prefix });
    if (!hydrated) return;
    if (skipPersist.current) { skipPersist.current = false; return; }
    void store?.set(serializeTheme(theme));
  }, [theme, hydrated, store, root, prefix]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const setScheme = useCallback((scheme: ColorScheme) => setThemeState((t) => ({ ...t, scheme })), []);
  const setOverrides = useCallback(
    (patch: ThemeOverrides) => setThemeState((t) => ({ ...t, overrides: { ...t.overrides, ...patch } })),
    [],
  );
  const setOverride = useCallback<ThemeContextValue["setOverride"]>((name, value) => {
    setThemeState((t) => {
      const overrides = { ...t.overrides };
      if (value === undefined) delete overrides[name];
      else overrides[name] = value;
      return { ...t, overrides };
    });
  }, []);
  const reset = useCallback((name?: ThemableTokenName) => {
    if (name === undefined) {
      setThemeState(defaultTheme ?? emptyTheme());
      void store?.remove?.();
      return;
    }
    setOverride(name, undefined);
  }, [defaultTheme, store, setOverride]);

  const value = useMemo<ThemeContextValue>(() => ({
    theme,
    resolvedScheme: theme.scheme === "system" ? systemScheme : theme.scheme,
    setTheme, setScheme, setOverride, setOverrides, reset, hydrated,
  }), [theme, systemScheme, setTheme, setScheme, setOverride, setOverrides, reset, hydrated]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ─── Scopes ──────────────────────────────────────────────────────────────────

/** One user layer per scope id, shared by every ThemeScope / ThemeScopeProvider with that id. */
interface ScopeState { theme: Theme; hydrated: boolean; listeners: Set<() => void>; store: ThemeStorage | null }
const scopes = new Map<string, ScopeState>();

function scopeState(id: string, storage?: ThemeStorage | null): ScopeState {
  let s = scopes.get(id);
  if (!s) {
    const store = storage === undefined ? (typeof window === "undefined" ? null : localStorageAdapter(scopeStorageKey(id))) : storage;
    s = { theme: emptyTheme(), hydrated: false, listeners: new Set(), store };
    scopes.set(id, s);
    const st = s;
    void (async () => {
      const raw = store ? await store.get() : null;
      if (raw) st.theme = parseTheme(raw);
      st.hydrated = true;
      for (const l of st.listeners) l();
    })();
  }
  return s;
}

function writeScope(s: ScopeState, theme: Theme) {
  s.theme = theme;
  void s.store?.set(serializeTheme(theme));
  for (const l of s.listeners) l();
}

export interface ThemeScopeOptions {
  /** Stable id; the user's changes are stored under it ("notsho-theme:<id>"). */
  id: string;
  /** The scope's shipped defaults. The user's layer sits on top. */
  provided?: Theme;
  /** Defaults to localStorage. */
  storage?: ThemeStorage | null;
}

/** The context value for a scope, without rendering anything — for editing a scope from elsewhere. */
export function useScopedTheme({ id, provided, storage }: ThemeScopeOptions): ThemeContextValue {
  const s = scopeState(id, storage);
  const subscribe = useCallback((l: () => void) => { s.listeners.add(l); return () => { s.listeners.delete(l); }; }, [s]);
  const theme = useSyncExternalStore(subscribe, () => s.theme, () => s.theme);
  const hydrated = useSyncExternalStore(subscribe, () => s.hydrated, () => false);
  const parent = useContext(ThemeContext);

  return useMemo<ThemeContextValue>(() => {
    const set = (next: Theme) => writeScope(s, next);
    const scheme = theme.scheme !== "system" ? theme.scheme : provided?.scheme ?? "system";
    return {
      theme,
      provided,
      scope: id,
      hydrated,
      // "system" inside a scope follows the page around it.
      resolvedScheme: scheme === "system" ? (parent?.resolvedScheme ?? resolveScheme("system")) : scheme,
      setTheme: set,
      setScheme: (sc) => set({ ...s.theme, scheme: sc }),
      setOverrides: (patch) => set({ ...s.theme, overrides: { ...s.theme.overrides, ...patch } }),
      setOverride: (name, value) => {
        const overrides = { ...s.theme.overrides };
        if (value === undefined) delete overrides[name];
        else overrides[name] = value;
        set({ ...s.theme, overrides });
      },
      reset: (name) => {
        if (name === undefined) { s.theme = emptyTheme(); void s.store?.remove?.(); for (const l of s.listeners) l(); return; }
        const overrides = { ...s.theme.overrides };
        delete overrides[name];
        set({ ...s.theme, overrides });
      },
    };
  }, [theme, hydrated, provided, id, s, parent?.resolvedScheme]);
}

/** Provides a scope's context to descendants without a wrapper element (e.g. a settings sheet). */
export function ThemeScopeProvider({ children, ...opts }: ThemeScopeOptions & { children: ReactNode }) {
  const value = useScopedTheme(opts);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export interface ThemeScopeProps extends ThemeScopeOptions {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * Applies a theme to one subtree: Notsho defaults → `provided` → the user's
 * changes for this scope. Every Notsho component inside follows it; the page's
 * global theme doesn't leak in. Descendants' useTheme() edits this scope.
 */
/**
 * Where portaled UI (dialogs, menus, tooltips) should mount. Inside a ThemeScope it's
 * a host element within the scope, so overlays get the scope's theme; elsewhere
 * undefined, meaning <body>.
 */
const PortalContainerContext = createContext<HTMLElement | null>(null);
export function usePortalContainer(): HTMLElement | undefined {
  return useContext(PortalContainerContext) ?? undefined;
}

/**
 * An element whose computed style carries the current theme's tokens — for code
 * that has to read them in JS (animation timings, canvas or map colors). Inside a
 * ThemeScope it's in the scope; elsewhere <html>.
 */
export function useThemeRoot(): HTMLElement | undefined {
  const host = useContext(PortalContainerContext);
  return host ?? (typeof document === "undefined" ? undefined : document.documentElement);
}

export function ThemeScope({ children, className, style, ...opts }: ThemeScopeProps) {
  const value = useScopedTheme(opts);
  const [host, setHost] = useState<HTMLElement | null>(null);
  const attr = `${opts.id.replace(/[^\w-]/g, "_")}-${useId().replace(/[^\w-]/g, "")}`;
  const css = useMemo(() => {
    const merged = mergeThemes(opts.provided, value.theme);
    return scopeToCss(`[data-notsho-scope="${attr}"]`, merged.overrides);
  }, [opts.provided, value.theme, attr]);
  return (
    <ThemeContext.Provider value={value}>
      <style>{css}</style>
      <div data-notsho-scope={attr} data-scheme={value.resolvedScheme} data-theme={value.resolvedScheme} className={className} style={style}>
        <PortalContainerContext.Provider value={host}>{children}</PortalContainerContext.Provider>
        {/* Overlays mount here so they inherit the scope's tokens. */}
        <div ref={setHost} data-notsho-portal-host="" style={{ display: "contents" }} />
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>.");
  return ctx;
}

/** Render in <head> (Next: in the root layout) to avoid a flash of the default theme. */
export function ThemeScript(props: ThemeScriptOptions) {
  return <script dangerouslySetInnerHTML={{ __html: themeScript(props) }} />;
}

export { resolveScheme };
