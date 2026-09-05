/**
 * Notsho token compiler.
 *
 *   src/tokens.json  ─►  dist/tokens.css      CSS custom properties (light/dark modes)
 *                    ─►  dist/manifest.json   flat, machine-readable token list for agents + customizer
 *                    ─►  src/generated/index.ts  typed token map (tsc → dist/index.js + .d.ts)
 *
 * Rules enforced:
 *   - token names (path minus tier) are globally unique
 *   - every {reference} resolves
 *   - tiers flow downward only: primitive ← semantic ← component
 *   - a mode-less token may not reference a moded token unless it is itself
 *     resolvable per mode (we just let var() cascade handle it; see compileCss)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "../src/tokens.json");
const DIST = join(here, "../dist");

export const TIERS = ["primitive", "semantic", "component"] as const;
export type Tier = (typeof TIERS)[number];
export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];

type ModedValue = Partial<Record<Mode, string>>;
type RawToken = { $value: string | ModedValue; $type?: string; $description?: string };
type RawGroup = { [key: string]: RawGroup | RawToken | string | undefined; $type?: string; $description?: string };

export interface Token {
  /** Dot path without tier, e.g. "color.accent". This is the token's identity. */
  name: string;
  tier: Tier;
  type: string;
  cssVar: string;
  description?: string;
  /** Raw authored value(s), references intact. */
  value: string | ModedValue;
  /** Value(s) with references compiled to var(). */
  css: string | ModedValue;
  /** Value(s) with references fully resolved to literals, per mode. */
  resolved: Record<Mode, string>;
  /** Names of tokens this one references directly. */
  refs: string[];
  /** Group-level description inherited from the nearest ancestor, for docs. */
  group?: string;
}

export interface Manifest {
  prefix: string;
  version: string;
  modes: readonly Mode[];
  tiers: readonly Tier[];
  tokens: Token[];
}

const isToken = (n: unknown): n is RawToken =>
  typeof n === "object" && n !== null && "$value" in (n as object);

const REF = /\{([a-z0-9.-]+)\}/gi;

export function compile(rawJson: string, version: string): Manifest {
  const root = JSON.parse(rawJson) as RawGroup & { $prefix: string };
  const prefix = root.$prefix ?? "notsho";
  const tokens: Token[] = [];

  // 1. Walk each tier, flatten to tokens, inherit $type / group description.
  for (const tier of TIERS) {
    const group = root[tier];
    if (!group || typeof group !== "object") continue;
    walk(group as RawGroup, [], undefined, undefined);

    function walk(node: RawGroup, path: string[], type: string | undefined, groupDesc: string | undefined) {
      const t = node.$type ?? type;
      const gd = node.$description ?? groupDesc;
      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith("$") || child === undefined || typeof child === "string") continue;
        const p = [...path, key];
        if (isToken(child)) {
          const name = p.join(".");
          const ty = child.$type ?? t;
          if (!ty) throw new Error(`Token "${name}" has no $type (own or inherited).`);
          const refs = [...new Set(collectRefs(child.$value))];
          tokens.push({
            name,
            tier,
            type: ty,
            cssVar: `--${prefix}-${name.replace(/\./g, "-")}`,
            description: child.$description,
            value: child.$value,
            css: "" as never, // filled below
            resolved: { light: "", dark: "" },
            refs,
            group: child.$description ? undefined : gd,
          });
        } else {
          walk(child as RawGroup, p, t, gd);
        }
      }
    }
  }

  // 2. Uniqueness.
  const byName = new Map<string, Token>();
  for (const tok of tokens) {
    if (byName.has(tok.name)) {
      throw new Error(`Duplicate token name "${tok.name}" (${byName.get(tok.name)!.tier} and ${tok.tier}).`);
    }
    byName.set(tok.name, tok);
  }

  // 3. Reference validity + tier direction.
  const rank: Record<Tier, number> = { primitive: 0, semantic: 1, component: 2 };
  for (const tok of tokens) {
    for (const ref of tok.refs) {
      const target = byName.get(ref);
      if (!target) throw new Error(`Token "${tok.name}" references unknown token "{${ref}}".`);
      if (rank[target.tier] > rank[tok.tier]) {
        throw new Error(
          `Token "${tok.name}" (${tok.tier}) may not reference "${ref}" (${target.tier}). Tiers flow primitive → semantic → component.`,
        );
      }
    }
  }

  // 4. Compile references to var() and resolve literals per mode.
  const toVar = (v: string) => v.replace(REF, (_, name: string) => `var(${byName.get(name)!.cssVar})`);
  const resolve = (v: string, mode: Mode, seen: string[] = []): string =>
    v.replace(REF, (_, name: string) => {
      if (seen.includes(name)) throw new Error(`Circular reference: ${[...seen, name].join(" → ")}`);
      const target = byName.get(name)!;
      const tv = typeof target.value === "string" ? target.value : (target.value[mode] ?? target.value.light ?? "");
      return resolve(tv, mode, [...seen, name]);
    });

  for (const tok of tokens) {
    if (typeof tok.value === "string") {
      tok.css = toVar(tok.value);
      tok.resolved = { light: resolve(tok.value, "light"), dark: resolve(tok.value, "dark") };
    } else {
      const css: ModedValue = {};
      for (const m of MODES) if (tok.value[m] !== undefined) css[m] = toVar(tok.value[m]!);
      tok.css = css;
      tok.resolved = {
        light: resolve(tok.value.light ?? tok.value.dark ?? "", "light"),
        dark: resolve(tok.value.dark ?? tok.value.light ?? "", "dark"),
      };
    }
  }

  return { prefix, version, modes: MODES, tiers: TIERS, tokens };
}

function collectRefs(v: string | ModedValue): string[] {
  const out: string[] = [];
  const scan = (s: string) => { for (const m of s.matchAll(REF)) out.push(m[1]!); };
  if (typeof v === "string") scan(v);
  else for (const s of Object.values(v)) if (s) scan(s);
  return out;
}

// ─── Emitters ────────────────────────────────────────────────────────────────

export function compileCss(m: Manifest): string {
  const base: string[] = [];
  const light: string[] = [];
  const dark: string[] = [];
  for (const t of m.tokens) {
    if (typeof t.css === "string") base.push(`  ${t.cssVar}: ${t.css};`);
    else {
      if (t.css.light) light.push(`  ${t.cssVar}: ${t.css.light};`);
      if (t.css.dark) dark.push(`  ${t.cssVar}: ${t.css.dark};`);
    }
  }
  return [
    `/* Generated by @${m.prefix}/tokens v${m.version}. Do not edit; edit src/tokens.json. */`,
    ``,
    `/* Mode-independent tokens (primitives, and semantic/component tokens without modes). */`,
    `:root {`,
    ...base,
    `}`,
    ``,
    `/* Light is the default; an explicit data-theme wins over system preference. */`,
    `:root,`,
    `[data-theme="light"] {`,
    `  color-scheme: light;`,
    ...light,
    `}`,
    ``,
    `[data-theme="dark"] {`,
    `  color-scheme: dark;`,
    ...dark,
    `}`,
    ``,
    `@media (prefers-color-scheme: dark) {`,
    `  :root:not([data-theme="light"]) {`,
    `    color-scheme: dark;`,
    ...dark.map((l) => `  ${l}`),
    `  }`,
    `}`,
    ``,
  ].join("\n");
}

export function compileTs(m: Manifest): string {
  const line = (t: Token) => `  ${JSON.stringify(t.name)}: ${JSON.stringify(t.cssVar)},`;
  const union = (tier: Tier) =>
    m.tokens.filter((t) => t.tier === tier).map((t) => `  | ${JSON.stringify(t.name)}`).join("\n") || "  | never";
  return `// Generated by @${m.prefix}/tokens v${m.version}. Do not edit; edit src/tokens.json.

export const prefix = ${JSON.stringify(m.prefix)} as const;
export const modes = ${JSON.stringify(m.modes)} as const;
export type Mode = (typeof modes)[number];

/** Token name → CSS custom property. */
export const tokens = {
${m.tokens.map(line).join("\n")}
} as const;

export type TokenName = keyof typeof tokens;

export type PrimitiveTokenName =
${union("primitive")};

export type SemanticTokenName =
${union("semantic")};

export type ComponentTokenName =
${union("component")};

/** The tokens a theme may override at runtime. Primitives are derived, not overridden. */
export type ThemableTokenName = SemanticTokenName | ComponentTokenName;

/**
 * A theme override. Values are raw CSS values (\`oklch(...)\`, \`0.5rem\`, a font stack…).
 * A moded override applies per color scheme.
 */
export type ThemeOverrides = Partial<Record<ThemableTokenName, string | Partial<Record<Mode, string>>>>;

/** \`var(--${m.prefix}-color-accent)\` from \`"color.accent"\`. */
export function cssVar(name: TokenName, fallback?: string): string {
  return fallback === undefined ? \`var(\${tokens[name]})\` : \`var(\${tokens[name]}, \${fallback})\`;
}

/** \`--${m.prefix}-color-accent\` from \`"color.accent"\`. */
export function cssVarName(name: TokenName): string {
  return tokens[name];
}
`;
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const pkg = JSON.parse(readFileSync(join(here, "../package.json"), "utf8")) as { version: string };
  const manifest = compile(readFileSync(SRC, "utf8"), pkg.version);
  mkdirSync(DIST, { recursive: true });
  writeFileSync(join(DIST, "tokens.css"), compileCss(manifest));
  writeFileSync(join(DIST, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  mkdirSync(join(here, "../src/generated"), { recursive: true });
  writeFileSync(join(here, "../src/generated/index.ts"), compileTs(manifest));
  const counts = TIERS.map((t) => `${manifest.tokens.filter((x) => x.tier === t).length} ${t}`).join(", ");
  console.log(`@${manifest.prefix}/tokens: ${manifest.tokens.length} tokens (${counts}) → dist/`);
}
