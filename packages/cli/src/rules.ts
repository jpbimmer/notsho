/**
 * Rules pack generator: an AGENTS.md / CLAUDE.md section derived from the token
 * manifest and the component registry. Regenerated, never hand-edited.
 */
import { createRequire } from "node:module";
import type { Registry } from "./lib.js";

const require = createRequire(import.meta.url);

export interface ManifestToken { name: string; tier: string; type: string; cssVar: string; description?: string; group?: string; value: string | Record<string, string>; refs: string[]; resolved: { light: string; dark: string } }
interface Manifest { prefix: string; version: string; tokens: ManifestToken[] }

export function loadManifest(): Manifest {
  return require("@notsho/tokens/manifest.json") as Manifest;
}

export const RULES_START = "<!-- notsho:start -->";
export const RULES_END = "<!-- notsho:end -->";

export interface RulesOptions { componentsDir: string; installed?: string[] }

export function generateRules(registry: Registry, manifest: Manifest, opts: RulesOptions): string {
  const semantic = manifest.tokens.filter((t) => t.tier === "semantic");
  const component = manifest.tokens.filter((t) => t.tier === "component");
  const groups = new Map<string, ManifestToken[]>();
  for (const t of semantic) { const g = t.name.split(".")[0]!; (groups.get(g) ?? groups.set(g, []).get(g))!.push(t); }

  const comps = Object.entries(registry.components);
  const installed = new Set(opts.installed ?? []);

  const lines: string[] = [
    RULES_START,
    `# Notsho design system (v${manifest.version})`,
    ``,
    `This project uses Notsho. Components live in \`${opts.componentsDir}/\` (copied source you may edit). Tokens are CSS custom properties prefixed \`--${manifest.prefix}-\`. End users can retheme the app at runtime through \`<Customizer />\`, so **every visual value must come from a token** — hardcoded colors, radii, font sizes, shadows, and durations will not respond to the user's theme.`,
    ``,
    `## Rules`,
    ``,
    `1. Never write a literal color, radius, font-size, font-family, shadow, or duration in CSS or inline styles. Use \`var(--${manifest.prefix}-…)\`. Run \`npx notsho doctor\` to check.`,
    `2. Use **semantic** tokens (\`color.accent\`, \`space.inset\`) in app code. Use **component** tokens (\`button.radius\`) only inside that component. Never reference **primitive** tokens (\`color.blue.500\`, \`space.4\`) — they don't follow the theme.`,
    `3. Prefer an existing component over a new one. \`npx notsho add <name>\` copies it in; then import from \`${opts.componentsDir}/<name>\`.`,
    `4. Variants are data attributes (\`data-variant\`, \`data-size\`), styled in the component's \`.module.css\`. Add variants there, not with ad-hoc classes at call sites.`,
    `5. In Tailwind, use the Notsho preset's utilities (\`bg-accent\`, \`text-muted\`, \`rounded-control\`) — they map to the same variables. Avoid arbitrary values like \`bg-[#…]\`.`,
    `6. Light/dark is automatic: tokens flip with \`data-theme\` / \`prefers-color-scheme\`. Do not write dark-mode overrides by hand.`,
    `7. Keep \`<ThemeProvider>\` at the app root and \`<ThemeScript />\` in \`<head>\`; put \`<Customizer />\` (or \`<CustomizerDock />\`) where users manage appearance.`,
    ``,
    `## Components`,
    ``,
    `| Component | Status | Use for |`,
    `|---|---|---|`,
    ...comps.map(([n, c]) => `| \`${n}\` | ${installed.has(n) ? "installed" : "available"} | ${c.description} |`),
    ``,
    `## Semantic tokens`,
    ``,
    `Use as \`var(--${manifest.prefix}-<name with dots as dashes>)\`, e.g. \`color.accent\` → \`var(--${manifest.prefix}-color-accent)\`.`,
    ``,
  ];
  for (const [g, toks] of groups) {
    lines.push(`### ${g}`, ``, `| Token | Purpose | Light | Dark |`, `|---|---|---|---|`);
    for (const t of toks) lines.push(`| \`${t.name}\` | ${t.description ?? t.group ?? ""} | \`${t.resolved.light}\` | \`${t.resolved.dark}\` |`);
    lines.push(``);
  }
  lines.push(`## Component tokens`, ``, `Scoped overrides that default to semantic values. Edit only inside the matching component.`, ``, `| Token | Default |`, `|---|---|`);
  for (const t of component) lines.push(`| \`${t.name}\` | \`${t.resolved.light}\` |`);
  lines.push(``, `## Tooling`, ``, `- \`npx notsho add <component…>\` — copy components in (resolves dependencies).`, `- \`npx notsho doctor\` — flag hardcoded values and components that drifted from the registry.`, `- \`npx notsho tokens [query]\` — search tokens.`, `- \`npx notsho rules --write AGENTS.md\` — refresh this section.`, `- MCP: \`@notsho/mcp\` exposes the same as tools (\`list_tokens\`, \`get_component\`, \`validate\`).`, ``, RULES_END, ``);
  return lines.join("\n");
}

/** Insert or replace the managed section in an existing file's content. */
export function mergeRules(existing: string | null, rules: string): string {
  if (!existing) return rules;
  const s = existing.indexOf(RULES_START), e = existing.indexOf(RULES_END);
  if (s !== -1 && e !== -1) return existing.slice(0, s) + rules.trimEnd() + existing.slice(e + RULES_END.length);
  return existing.trimEnd() + "\n\n" + rules;
}
