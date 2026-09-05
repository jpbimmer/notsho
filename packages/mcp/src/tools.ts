/**
 * Pure tool implementations — no transport, so they can be tested directly
 * and reused by other hosts.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { deriveColors, deriveMotion, deriveShape, deriveTypography, DEFAULT_MOTION, DEFAULT_SHAPE, DEFAULT_TYPOGRAPHY, presets, type ShapeChoices, type MotionChoices, type TypographyChoices } from "@notsho/customizer";
import { themeToCss } from "@notsho/theme/core";
import type { ThemeOverrides } from "@notsho/tokens";
import { findProjectRoot, generateRules, lintSource, loadManifest, loadRegistry, readConfig, registryDir, type Finding } from "notsho";

const manifest = loadManifest();
const registry = loadRegistry();

type ManifestToken = ReturnType<typeof loadManifest>["tokens"][number];

export interface TokenSummary { name: string; tier: string; type: string; cssVar: string; description?: string; light: string; dark: string }

const summarize = (t: ManifestToken): TokenSummary => ({
  name: t.name, tier: t.tier, type: t.type, cssVar: t.cssVar, description: t.description ?? t.group, light: t.resolved.light, dark: t.resolved.dark,
});

export function listTokens(opts: { query?: string; tier?: string; type?: string } = {}): TokenSummary[] {
  const q = opts.query?.toLowerCase();
  return manifest.tokens
    .filter((t) => (!opts.tier || t.tier === opts.tier) && (!opts.type || t.type === opts.type))
    .filter((t) => !q || t.name.includes(q) || (t.description ?? "").toLowerCase().includes(q) || (t.group ?? "").toLowerCase().includes(q))
    .map(summarize);
}

export function getToken(name: string) {
  const t = manifest.tokens.find((x) => x.name === name || x.cssVar === name || x.cssVar === `--${manifest.prefix}-${name}`);
  if (!t) return null;
  const usedBy = Object.entries(registry.components).filter(([, c]) => c.tokens.some((p) => matchGlob(p, t.name))).map(([n]) => n);
  return {
    ...summarize(t), refs: t.refs, value: t.value,
    usage: { css: `var(${t.cssVar})`, tailwind: tailwindUtility(t) },
    themable: t.tier !== "primitive",
    usedBy,
    guidance: t.tier === "primitive"
      ? "Primitive: do not use directly in app code — it does not follow the user's theme. Use the semantic token that references it."
      : t.tier === "component" ? "Component-scoped: use only inside the matching component's stylesheet." : "Semantic: safe to use anywhere.",
  };
}

function matchGlob(pattern: string, name: string): boolean {
  if (!pattern.includes("*")) return pattern === name;
  const re = new RegExp("^" + pattern.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$");
  return re.test(name);
}

function tailwindUtility(t: ManifestToken): string | undefined {
  if (t.tier !== "semantic") return undefined;
  const [g, ...rest] = t.name.split("."); const k = rest.join("-");
  if (g === "color") return `bg-${k} / text-${k} / border-${k}`;
  if (g === "radius") return `rounded-${k}`;
  if (g === "shadow") return `shadow-${k}`;
  if (g === "space") return `p-${k} / gap-${k} / m-${k}`;
  if (g === "size") return `h-${k} / w-${k}`;
  if (g === "font") return `font-${k}`;
  return undefined;
}

export function listComponents(projectRoot?: string) {
  const installed = installedSet(projectRoot);
  return Object.entries(registry.components).map(([name, c]) => ({ name, description: c.description, installed: installed.has(name), dependsOn: c.registryDependencies }));
}

function installedSet(projectRoot?: string): Set<string> {
  try {
    const root = projectRoot ?? findProjectRoot();
    const cfg = readConfig(root);
    return new Set(Object.keys(cfg?.installed ?? {}));
  } catch { return new Set(); }
}

export function getComponent(name: string, projectRoot?: string) {
  const c = registry.components[name];
  if (!c) return null;
  const dir = registryDir();
  const files = c.files.map((f) => ({ path: f, content: readFileSync(join(dir, f), "utf8") }));
  const tsx = files.find((f) => f.path.endsWith(".tsx"))?.content ?? "";
  const root = safeRoot(projectRoot);
  const cfg = root ? readConfig(root) : null;
  const installed = installedSet(projectRoot).has(name);
  return {
    name, description: c.description, installed,
    importPath: cfg ? `${cfg.componentsDir}/${name}` : `<componentsDir>/${name}`,
    exports: [...tsx.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1]),
    props: [...tsx.matchAll(/export interface (\w+Props)[^{]*\{([\s\S]*?)\n\}/g)].map((m) => ({ name: m[1], members: summarizeProps(m[2]!) })),
    tokens: c.tokens, dependencies: c.dependencies, registryDependencies: c.registryDependencies,
    install: installed ? null : `npx notsho add ${name}`,
    files,
  };
}

function safeRoot(p?: string): string | null { try { return p ?? findProjectRoot(); } catch { return null; } }

/** Turn an interface body into { name, type, doc } rows. Good enough for hand-written props. */
function summarizeProps(body: string) {
  const out: { name: string; type: string; doc?: string }[] = [];
  let doc: string | undefined;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    const d = line.match(/^\/\*\*\s*(.*?)\s*\*\/$/); if (d) { doc = d[1]; continue; }
    const m = line.match(/^(\w+)\??:\s*(.+?);?$/); if (m) { out.push({ name: m[1]!, type: m[2]!, doc }); doc = undefined; }
  }
  return out;
}

export function validate(input: { source?: string; path?: string; filename?: string }): { file: string; findings: Finding[]; summary: string } {
  let source = input.source, file = input.filename ?? input.path ?? "<inline>";
  if (!source && input.path) { if (!existsSync(input.path)) throw new Error(`File not found: ${input.path}`); source = readFileSync(input.path, "utf8"); }
  if (source === undefined) throw new Error("Provide `source` or `path`.");
  const findings = lintSource(source, { filename: file });
  return { file, findings, summary: findings.length ? `${findings.length} hardcoded value(s) that will not follow the user's theme.` : "No hardcoded visual values. Looks token-clean." };
}

export interface DeriveInput {
  accent?: string; tint?: number; preset?: string;
  typography?: Partial<TypographyChoices>; shape?: Partial<ShapeChoices>; motion?: Partial<MotionChoices>;
}

/** Same derivation the customizer uses, so agents can produce a committed default theme. */
export function deriveTheme(input: DeriveInput): { overrides: ThemeOverrides; css: string; meta: Record<string, unknown> } {
  let overrides: ThemeOverrides = {};
  const meta: Record<string, unknown> = {};
  const preset = input.preset ? presets.find((p) => p.id === input.preset || p.name.toLowerCase() === input.preset!.toLowerCase()) : undefined;
  if (input.preset && !preset) throw new Error(`Unknown preset "${input.preset}". Presets: ${presets.map((p) => p.id).join(", ")}`);
  const accent = input.accent ?? preset?.accent;
  if (accent) {
    const colors = { accent, tint: input.tint ?? preset?.tint ?? 0 };
    overrides = { ...overrides, ...deriveColors(colors) }; meta.colors = colors;
  }
  if (input.typography) { const c = { ...DEFAULT_TYPOGRAPHY, ...input.typography }; overrides = { ...overrides, ...deriveTypography(c) }; meta.typography = c; }
  if (input.shape) { const c = { ...DEFAULT_SHAPE, ...input.shape }; overrides = { ...overrides, ...deriveShape(c) }; meta.shape = c; }
  if (input.motion) { const c = { ...DEFAULT_MOTION, ...input.motion }; overrides = { ...overrides, ...deriveMotion(c) }; meta.motion = c; }
  return { overrides, css: themeToCss(overrides), meta };
}

export function rules(projectRoot?: string, componentsDir?: string): string {
  const root = safeRoot(projectRoot);
  const cfg = root ? readConfig(root) : null;
  return generateRules(registry, manifest, { componentsDir: componentsDir ?? cfg?.componentsDir ?? "src/components/ui", installed: Object.keys(cfg?.installed ?? {}) });
}

export const meta = { prefix: manifest.prefix, version: manifest.version, tokenCount: manifest.tokens.length, componentCount: Object.keys(registry.components).length, presets: presets.map((p) => p.id) };
