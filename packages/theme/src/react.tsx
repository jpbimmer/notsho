"use client";
/**
 * React bindings. ThemeProvider owns the theme state, applies it to the DOM,
 * and persists it through a storage adapter. ThemeScript prevents first-paint
 * flash when rendered in <head>.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ThemableTokenName, ThemeOverrides, Mode } from "@notsho/tokens";
import {
  applyTheme, emptyTheme, localStorageAdapter, parseTheme, resolveScheme, serializeTheme,
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
