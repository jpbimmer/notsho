/** Shared plumbing: config file, registry access, file copying, hashing. */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CONFIG_FILE = "notsho.json";

export interface Config {
  $schema?: string;
  /** Where components are copied, relative to the project root. */
  componentsDir: string;
  /** Files installed by `add`, with the registry hash at install time. */
  installed: Record<string, { hash: string; files: string[] }>;
}

export interface RegistryComponent {
  description: string;
  files: string[];
  dependencies: string[];
  registryDependencies: string[];
  tokens: string[];
}
export interface Registry {
  version: number;
  shared: { files: string[]; dependencies: string[] };
  components: Record<string, RegistryComponent>;
}

const here = dirname(fileURLToPath(import.meta.url));

/** The bundled registry (copied in at build), or the monorepo source when running from the repo. */
export function registryDir(): string {
  for (const c of [join(here, "../registry"), join(here, "../../../registry")]) {
    if (existsSync(join(c, "registry.json"))) return c;
  }
  throw new Error("Registry not found. Reinstall the notsho package.");
}

export function loadRegistry(): Registry {
  return JSON.parse(readFileSync(join(registryDir(), "registry.json"), "utf8")) as Registry;
}

export function findProjectRoot(start = process.cwd()): string {
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, CONFIG_FILE)) || existsSync(join(dir, "package.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
}

export function readConfig(root: string): Config | null {
  const p = join(root, CONFIG_FILE);
  if (!existsSync(p)) return null;
  const c = JSON.parse(readFileSync(p, "utf8")) as Partial<Config>;
  return { componentsDir: c.componentsDir ?? "src/components/ui", installed: c.installed ?? {}, $schema: c.$schema };
}

export function writeConfig(root: string, config: Config): void {
  writeFileSync(join(root, CONFIG_FILE), JSON.stringify(config, null, 2) + "\n");
}

export function detectPackageManager(root: string): "pnpm" | "yarn" | "bun" | "npm" {
  if (existsSync(join(root, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(root, "yarn.lock"))) return "yarn";
  if (existsSync(join(root, "bun.lockb")) || existsSync(join(root, "bun.lock"))) return "bun";
  return "npm";
}

export function installCommand(pm: string, deps: string[]): string {
  if (!deps.length) return "";
  return pm === "npm" ? `npm install ${deps.join(" ")}` : `${pm} add ${deps.join(" ")}`;
}

export function hashFiles(paths: string[]): string {
  const h = createHash("sha256");
  for (const p of paths.sort()) h.update(readFileSync(p));
  return h.digest("hex").slice(0, 16);
}

/** Resolve a component list plus transitive registryDependencies, in install order. */
export function resolveComponents(registry: Registry, names: string[]): string[] {
  const out: string[] = [];
  const visit = (n: string) => {
    if (out.includes(n)) return;
    const c = registry.components[n];
    if (!c) throw new Error(`Unknown component "${n}". Run \`notsho add --list\`.`);
    for (const d of c.registryDependencies) visit(d);
    out.push(n);
  };
  names.forEach(visit);
  return out;
}

/**
 * Registry files import shared code as `../../lib/x` (components/<name>/ → lib/).
 * In a project they land at <componentsDir>/<name>/ with lib at <componentsDir>/lib/, so one level shallower.
 */
export function rewriteImports(source: string): string {
  return source.replace(/(["'])\.\.\/\.\.\/lib\//g, "$1../lib/");
}

export interface CopyResult { written: string[]; skipped: string[] }

/** Copy a component's files into the project. Existing files are skipped unless `force`. */
export function copyComponent(registry: Registry, name: string, root: string, componentsDir: string, force = false): CopyResult {
  const src = registryDir();
  const res: CopyResult = { written: [], skipped: [] };
  const c = registry.components[name]!;
  for (const f of c.files) {
    const rel = f.replace(/^components\//, "");
    const dest = join(root, componentsDir, rel);
    if (existsSync(dest) && !force) { res.skipped.push(relative(root, dest)); continue; }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, rewriteImports(readFileSync(join(src, f), "utf8")));
    res.written.push(relative(root, dest));
  }
  return res;
}

export function copyShared(registry: Registry, root: string, componentsDir: string): CopyResult {
  const src = registryDir();
  const res: CopyResult = { written: [], skipped: [] };
  for (const f of registry.shared.files) {
    const dest = join(root, componentsDir, f);
    if (existsSync(dest)) { res.skipped.push(relative(root, dest)); continue; }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, readFileSync(join(src, f), "utf8"));
    res.written.push(relative(root, dest));
  }
  return res;
}

export function componentHash(registry: Registry, name: string): string {
  const src = registryDir();
  return hashFiles(registry.components[name]!.files.map((f) => join(src, f)));
}

/** Local hash of an installed component (undefined if any file is missing). */
export function installedHash(root: string, componentsDir: string, registry: Registry, name: string): string | undefined {
  const files = registry.components[name]!.files.map((f) => join(root, componentsDir, f.replace(/^components\//, "")));
  if (!files.every((f) => existsSync(f))) return undefined;
  // Compare against the *rewritten* registry source so import rewriting isn't flagged as a local change.
  const h = createHash("sha256");
  for (const f of files.sort()) h.update(readFileSync(f));
  return h.digest("hex").slice(0, 16);
}

export function rewrittenRegistryHash(registry: Registry, name: string): string {
  const src = registryDir();
  const h = createHash("sha256");
  for (const f of [...registry.components[name]!.files].sort()) h.update(rewriteImports(readFileSync(join(src, f), "utf8")));
  return h.digest("hex").slice(0, 16);
}

/** Recursively list files under dir with one of the extensions, skipping heavy directories. */
export function walk(dir: string, exts: string[], skip = ["node_modules", ".git", "dist", "build", ".next", ".turbo"]): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!skip.includes(e.name)) out.push(...walk(join(dir, e.name), exts, skip)); continue; }
    if (exts.some((x) => e.name.endsWith(x))) out.push(join(dir, e.name));
  }
  return out;
}

export function readPackageDeps(root: string): Set<string> {
  const p = join(root, "package.json");
  if (!existsSync(p)) return new Set();
  const pkg = JSON.parse(readFileSync(p, "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
  return new Set([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
}
