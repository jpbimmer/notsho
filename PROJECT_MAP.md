# Project map — **Notsho**

> An open-source design system built for coding agents, whose differentiator is a
> drop-in, end-user-facing customization UI. Ship an app; your users get a real
> theming panel in Settings for free.

npm: `notsho` and `@notsho/*` are unclaimed. GitHub: `github.com/notsho` is taken
(a user account, 1 repo) — repo will live under your account or a `notsho-ui` org.

---

## 1. The core architectural decision

Everything hangs off one rule:

> **CSS custom properties are the single source of truth. Every other layer is a
> projection of them.**

This is what makes "Tailwind *and* CSS Modules" coherent instead of a fork:

```
tokens.json  (machine-readable, the real source)
     │
     ├─► generated CSS   :root { --notsho-color-accent: … }   ← runtime-mutable
     │        │
     │        ├─► @notsho/react components (CSS Modules, consume vars)
     │        └─► @notsho/tailwind preset (@theme maps utilities → the same vars)
     │
     ├─► generated TS types (Token unions, ThemeOverride)
     ├─► generated manifest.json (tokens + component props + constraints)
     │        │
     │        ├─► @notsho/mcp  (agent queries + validation)
     │        ├─► @notsho/cli  (init / add / doctor)
     │        └─► AGENTS.md + CLAUDE.md rules pack (generated, not hand-written)
     │
     └─► @notsho/customizer (the end-user UI; writes overrides back as CSS vars)
```

Components are authored **once**, in CSS Modules referencing vars. Tailwind is not
a second implementation — it's a preset so *consumer* app code (`bg-accent`,
`rounded-card`) resolves to the identical variables. One truth, two ergonomics.

Corollary: a theme change is `element.style.setProperty()`. No rebuild, no
re-render, no FOUC beyond a small blocking inline script.

---

## 2. Packages

| Package | Purpose |
|---|---|
| `@notsho/tokens` | `tokens.json` + build → CSS, TS types, JSON manifest. Zero runtime deps. |
| `registry/` | ~11 components, CSS Modules on **Base UI**. Not an npm package — copied into the user's repo via `notsho add`. |
| `@notsho/tailwind` | Tailwind v4 preset mapping `@theme` onto Notsho vars. |
| `@notsho/customizer` | The user-facing panel. Drop `<NotshoCustomizer />` into Settings. |
| `@notsho/theme` | `ThemeProvider`, storage adapters, serialize/deserialize, SSR script. |
| `@notsho/cli` | `init`, `add <component>` (copy-in from registry), `doctor`, `export-theme`. |
| `@notsho/mcp` | MCP server over the manifest: `list_tokens`, `get_component`, `validate_usage`. |
| `apps/docs` | Docs site that dogfoods the customizer as its own live playground. |

Monorepo: pnpm workspaces + Turborepo. Changesets for releases. MIT.

**Distribution: copy-in for components, npm for infrastructure.** Component source
lands in the consumer's repo where the agent can read and modify it; tokens,
theme runtime, customizer, CLI and MCP are versioned dependencies. `notsho doctor`
diffs local components against the registry so upgrades are visible, not silent.

---

## 3. Token architecture (three tiers — this is the part that must be right)

1. **Primitive** — raw values. `--notsho-blue-500`, `--notsho-space-4`. Users rarely touch.
2. **Semantic** — intent. `--notsho-color-accent`, `--notsho-color-surface-raised`,
   `--notsho-text-body`. **This is the layer the customization UI exposes.**
3. **Component** — `--notsho-button-radius`, scoped, defaults to semantic. The escape
   hatch for power users and for the "customize buttons specifically" requirement.

Categories: color, typography (family/scale/weight/tracking/leading), spacing,
radius, border, shadow, motion (duration/easing), and a small set of "feel" knobs.

**Derivation, not enumeration.** The user picks an accent; we derive hover/active/
subtle/border/on-accent via OKLCH transforms, and auto-solve for APCA contrast
against the current surface. Users pick ~6 things and get ~120 correct tokens.
Light/dark are two modes of one theme, not two themes.

---

## 4. The customization UI

The actual product. Design targets:

- **Preset first.** Ships with 6–8 curated themes; most users pick one and stop.
- **Then knobs**, progressively disclosed: Colors → Typography → Shape → Density → Motion.
- **Live preview beside the controls** — a mini component gallery, not the whole app.
- **Never let a user build an unreadable UI.** Contrast is enforced and shown, not
  merely warned about. Fonts come from a vetted list (+ optional custom).
- **Reset per-section**, not just global.
- Fully themed *by itself* — it's the largest proof the system works.
- Embeddable three ways: inline panel, drawer, or standalone route.

Persistence is a pluggable adapter: `localStorage` default, `cookie` (SSR-safe),
or bring-your-own (`{ get, set }` → your DB, per user account).

Also `export-theme` → a committable tokens file, so the loop closes: user themes
live, dev commits the result.

---

## 5. The agent surface

Generated from the manifest, never hand-maintained (that's how it stays true):

- **`manifest.json`** — every token (name, tier, type, description, allowed values)
  and every component (props, variants, slots, a11y contract, usage rules).
- **MCP server** — `list_tokens`, `search_components`, `get_component_api`,
  `validate_file` (flags hardcoded hex/px that should be tokens).
- **CLI** — `notsho init` (installs, wires provider, adds rules file),
  `notsho add dialog` (copies from registry), `notsho doctor` (lints for token drift).
- **Rules pack** — generated `AGENTS.md` / `CLAUDE.md` section. Free, and it's what
  most agents will actually read; the MCP is the precision layer on top.

---

## 6. v1 component list (11)

Button · Input · Select · Checkbox/Toggle · Card · Dialog · Tabs · Badge ·
Tooltip · Toast · Menu

Each must have: all states, dark mode, keyboard + SR support, RTL, and every
visual property traced to a token (enforced by `doctor` in CI).

---

## 7. Build order

1. **Tokens + generator** — `tokens.json` → CSS/TS/manifest. Nothing else can start first.
2. **ThemeProvider + storage + SSR script.** Prove runtime swap on a scratch page.
3. **Button + Card + Input.** Three components, fully tokenized, both consumption modes.
4. **Customizer v0** — colors only, live preview. *This is the earliest moment the
   idea is demonstrable; get here fast.*
5. Remaining 8 components.
6. Customizer full — typography, shape, density, motion, presets, export.
7. CLI + manifest generation + rules pack.
8. MCP server.
9. Docs site (dogfoods the customizer), landing page, launch.

Milestone to optimize for: **step 4**, a live page where a visitor changes the
accent and the whole thing re-skins. That screenshot is the pitch.

---

## 8. Decisions (settled 2026-09-04)

- **Name:** Notsho. npm `notsho` / `@notsho/*` available.
- **Distribution:** copy-in components, npm infra (see §2).
- **Primitives:** Base UI.
- **Customizer:** user-facing in production by default. Dev-only is a flag.
- **Default look:** neutral defaults, striking presets.

## 9. Status (2026-09-05)

Steps 1–8 complete. `apps/playground` serves as the docs/dogfooding surface for now;
a standalone docs site is deferred until the API settles.

| Step | Status |
|---|---|
| 1 Tokens + compiler | done — 205 tokens, CSS/manifest/types/Tailwind preset |
| 2 Theme runtime | done — provider, adapters, no-flash script |
| 3–5 Components | done — 13 in `registry/`, Base UI + CSS Modules |
| 4/6 Customizer | done — Colors/Type/Shape/Motion tabs, export, dock with settings view |
| 7 CLI + rules pack | done — `notsho init/add/doctor/rules/tokens/export-theme` |
| 8 MCP server | done — 7 tools, 2 resources |
| 9 Docs | README + playground; site deferred |

Backlog: contrast enforcement (APCA) in derivation · docs site · `dev` watch across
packages · publish to npm under `@notsho/*` · more presets · component tests.

## 10. Standing assumptions

- Tailwind **v4 only**. React 19. SSR-safe incl. Next App Router (no-flash inline script).
- Fonts: curated Google Fonts list + custom URL. Self-host guidance in docs.
- Contrast: **warn** in v1, **enforce** in v1.1. It's the hardest single piece and
  must not gate the step-4 demo.
- MIT.
