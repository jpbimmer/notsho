# Notsho

**An open-source design system built for coding agents — with a free, drop-in customization UI for your users.**

Ship an app with Notsho and your users get a real Appearance panel: pick a preset or an accent color, a typeface, corner radius, density, motion — and the whole app re-skins instantly, in light and dark, with readable contrast guaranteed. Your coding agent gets a machine-readable manifest, an MCP server, a CLI that copies components in and lints for drift, and a generated rules file so it uses the system correctly.

```
 tokens.json ──► CSS variables ──► components (CSS Modules) + Tailwind preset
      │                 ▲
      │                 └── <Customizer /> writes overrides at runtime
      └──► manifest.json ──► CLI · MCP server · AGENTS.md rules pack
```

One rule holds it together: **CSS custom properties are the single source of truth.** Every layer is a projection of them, which is why a user's theme change is one `<style>` element and needs no rebuild.

---

## Quick start

```bash
npx notsho init                      # config, shared lib, deps, AGENTS.md
npx notsho add button card input     # copy components into src/components/ui/
```

```tsx
// main.tsx / root layout
import "@notsho/tokens/tokens.css";
import "@notsho/customizer/styles.css";
import { ThemeProvider, ThemeScript } from "@notsho/theme";
import { CustomizerDock } from "@notsho/customizer";

// In <head>, to avoid a flash of the default theme on load:
<ThemeScript />

<ThemeProvider>
  <App />
  <CustomizerDock />        {/* or <Customizer /> inside your Settings page */}
</ThemeProvider>
```

```tsx
import { Button } from "@/components/ui/button";
<Button variant="secondary" size="lg">Save</Button>
```

Give your agent the tools:

```bash
claude mcp add notsho -- npx -y @notsho/mcp     # Claude Code
npx notsho rules --write AGENTS.md              # or CLAUDE.md — regenerable
npx notsho doctor                               # CI: fails on hardcoded colors/radii/etc.
```

---

## Packages

| Package | What it is |
|---|---|
| `@notsho/tokens` | `tokens.json` (W3C DTCG, 3 tiers, light/dark) → `tokens.css`, `tailwind.css`, `manifest.json`, typed exports |
| `@notsho/theme` | Runtime: `ThemeProvider`, `useTheme`, `applyTheme`, storage adapters, no-flash `ThemeScript` |
| `@notsho/customizer` | `<Customizer />` and `<CustomizerDock />` — the end-user UI, plus pure derivation functions |
| `registry/` | 13 components on Base UI + CSS Modules. **Copied into your repo**, not installed — your agent can read and edit them |
| `notsho` (CLI) | `init` · `add` · `doctor` · `rules` · `tokens` · `export-theme` |
| `@notsho/mcp` | MCP server: `list_tokens` · `get_token` · `list_components` · `get_component` · `validate` · `derive_theme` · `get_rules` |

Components: Button · Card · Input · Field · Badge · Checkbox · Switch · Select · Dialog · Tabs · Tooltip · Menu · Toast.

---

## How theming works

**Three token tiers, flowing one way.**

- **Primitive** — raw ramps and scales (`color.blue.500`, `space.4`). Never used in app code.
- **Semantic** — intent (`color.accent`, `space.inset`, `radius.control`). What components consume and what the customizer overrides.
- **Component** — scoped knobs (`button.radius`) that default to semantic values.

**Derivation, not enumeration.** The user picks ~6 things; Notsho derives ~120 tokens. An accent hex becomes a full family — hover/active step *away from the surface* in each mode, subtle/border tints, and on-accent text chosen by contrast — in OKLCH, for light and dark. Radius, density, elevation, and motion work the same way. The functions are pure and exported, so `derive_theme` over MCP gives an agent the exact result a user would get.

**Persistence is yours.** `ThemeProvider` defaults to `localStorage`; pass `cookieAdapter()` for SSR, or any `{ get, set }` to store per-user in your database. The inline `ThemeScript` applies the stored theme before first paint.

**Export.** The customizer's export view (and `notsho export-theme`) gives you `theme.json` to load as a default and `theme.css` for a no-JS build.

---

## For agents

- `AGENTS.md` (generated) states the rules: no literal colors/radii/sizes/shadows/durations; semantic tokens in app code; variants as data attributes; prefer registry components.
- `notsho doctor` enforces it — run in CI.
- The MCP server answers "what token do I use for…", "what props does Dialog take", "is this file token-clean", and "derive a violet theme with pill corners".
- Component source is in your repo. Change it. `doctor` tells you when the registry has moved.

---

## Development

```bash
pnpm install
pnpm -r build          # tokens → theme → customizer → cli → mcp
pnpm -r test
pnpm --filter playground dev    # http://localhost:5180
```

The playground is a non-scrolling frame with every component on stage and the customizer docked to an edge — the dogfooding surface for the whole system. Package edits need a rebuild (`pnpm --filter <pkg> build`); registry components hot-reload.

See [PROJECT_MAP.md](./PROJECT_MAP.md) for architecture and status.

## License

MIT
