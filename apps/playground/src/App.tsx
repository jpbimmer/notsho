import { useTheme } from "@notsho/theme";

export function App() {
  const { theme, resolvedScheme, setScheme, setOverride, reset, hydrated } = useTheme();
  const accent = typeof theme.overrides["color.accent"] === "string" ? theme.overrides["color.accent"] : "";
  return (
    <main className="pg">
      <h1>Notsho playground</h1>
      <p data-testid="status">scheme={theme.scheme} resolved={resolvedScheme} hydrated={String(hydrated)} overrides={Object.keys(theme.overrides).length}</p>
      <div className="pg-toolbar">
        <label>Scheme
          <select value={theme.scheme} onChange={(e) => setScheme(e.target.value as never)} data-testid="scheme">
            <option value="system">system</option><option value="light">light</option><option value="dark">dark</option>
          </select>
        </label>
        <label>Accent
          <input data-testid="accent" placeholder="oklch(0.62 0.22 300)" value={accent}
            onChange={(e) => setOverride("color.accent", e.target.value || undefined)} />
        </label>
        <button className="pg-btn" onClick={() => setOverride("radius.control", "9999px")}>Pill controls</button>
        <button className="pg-btn" onClick={() => reset()}>Reset</button>
      </div>
      <div className="pg-card">
        <strong>Card</strong>
        <p style={{ color: "var(--notsho-color-text-muted)" }}>Reload the page: the theme should already be applied on first paint.</p>
        <button className="pg-btn">Primary action</button>
      </div>
    </main>
  );
}
