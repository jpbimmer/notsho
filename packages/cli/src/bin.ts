#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseTheme, themeToCss } from "@notsho/theme/core";
import {
  copyComponent, copyShared, detectPackageManager, findProjectRoot, installCommand, installedHash, loadRegistry,
  readConfig, readPackageDeps, resolveComponents, rewrittenRegistryHash, walk, writeConfig, type Config,
} from "./lib.js";
import { formatFindings, lintSource } from "./lint.js";
import { generateRules, loadManifest, mergeRules } from "./rules.js";

const [, , cmd, ...rest] = process.argv;
const flags = new Set(rest.filter((a) => a.startsWith("--")));
const args = rest.filter((a) => !a.startsWith("--"));
const flagValue = (name: string) => { const i = rest.indexOf(name); return i !== -1 && rest[i + 1] && !rest[i + 1]!.startsWith("--") ? rest[i + 1] : undefined; };

const CORE_DEPS = ["@notsho/tokens", "@notsho/theme", "@notsho/customizer"];

const log = (s = "") => console.log(s);
const ok = (s: string) => log(`  ✓ ${s}`);
const warn = (s: string) => log(`  ! ${s}`);
const fail = (s: string): never => { console.error(`\n  ✗ ${s}\n`); process.exit(1); };

function requireConfig(root: string): Config {
  return readConfig(root) ?? fail(`No ${"notsho.json"} found. Run \`notsho init\` first.`);
}

function run(command: string, cwd: string) {
  log(`  $ ${command}`);
  execSync(command, { cwd, stdio: "inherit" });
}

// ─── init ────────────────────────────────────────────────────────────────────
function init() {
  const root = findProjectRoot();
  const dir = flagValue("--dir") ?? "src/components/ui";
  const pm = detectPackageManager(root);
  const registry = loadRegistry();
  log(`\n  Notsho → ${relative(process.cwd(), root) || "."}\n`);

  const config: Config = readConfig(root) ?? { $schema: "https://notsho.dev/schema/notsho.json", componentsDir: dir, installed: {} };
  config.componentsDir = dir;
  writeConfig(root, config);
  ok(`notsho.json (components in ${dir}/)`);

  const shared = copyShared(registry, root, dir);
  for (const f of shared.written) ok(f);

  const have = readPackageDeps(root);
  const deps = [...CORE_DEPS, ...registry.shared.dependencies, "@base-ui/react"].filter((d) => !have.has(d));
  if (deps.length && !flags.has("--no-install")) run(installCommand(pm, deps), root);
  else if (deps.length) warn(`Install deps: ${installCommand(pm, deps)}`);

  writeRules(root, config, flagValue("--rules") ?? "AGENTS.md");

  log(`
  Next:
    1. Import tokens once (root layout / main.tsx):
         import "@notsho/tokens/tokens.css";
         import "@notsho/customizer/styles.css";
    2. Wrap the app:
         <ThemeProvider>…</ThemeProvider>           from "@notsho/theme"
    3. Avoid a flash on load — in <head>:
         <ThemeScript />                              from "@notsho/theme"
    4. Give users the controls:
         <Customizer /> or <CustomizerDock />        from "@notsho/customizer"
    5. Add components:  npx notsho add button card input
`);
}

// ─── add ─────────────────────────────────────────────────────────────────────
function add() {
  const registry = loadRegistry();
  if (flags.has("--list") || (!args.length && !flags.has("--all"))) {
    log("\n  Components:\n");
    for (const [n, c] of Object.entries(registry.components)) log(`  ${n.padEnd(10)} ${c.description}`);
    log(`\n  notsho add <name…> | --all\n`);
    return;
  }
  const root = findProjectRoot();
  const config = requireConfig(root);
  const names = flags.has("--all") ? Object.keys(registry.components) : args;
  const ordered = resolveComponents(registry, names);
  const force = flags.has("--force");
  log("");
  copyShared(registry, root, config.componentsDir).written.forEach(ok);
  const needDeps = new Set<string>(registry.shared.dependencies);
  for (const n of ordered) {
    const res = copyComponent(registry, n, root, config.componentsDir, force);
    res.written.forEach(ok);
    res.skipped.forEach((f) => warn(`${f} exists (use --force to overwrite)`));
    registry.components[n]!.dependencies.forEach((d) => needDeps.add(d));
    config.installed[n] = { hash: rewrittenRegistryHash(registry, n), files: registry.components[n]!.files };
  }
  writeConfig(root, config);
  const have = readPackageDeps(root);
  const missing = [...needDeps].filter((d) => !have.has(d));
  if (missing.length) {
    const pm = detectPackageManager(root);
    if (flags.has("--install")) run(installCommand(pm, missing), root);
    else warn(`Missing deps: ${installCommand(pm, missing)}  (or pass --install)`);
  }
  for (const f of ["AGENTS.md", "CLAUDE.md"]) if (existsSync(join(root, f)) && readFileSync(join(root, f), "utf8").includes("<!-- notsho:start -->")) writeRules(root, config, f);
  log(`\n  Import from "${config.componentsDir}/<name>".\n`);
}

// ─── doctor ──────────────────────────────────────────────────────────────────
function doctor() {
  const root = findProjectRoot();
  const config = readConfig(root);
  const registry = loadRegistry();
  let problems = 0;
  log("");

  if (config) {
    log("  Components");
    for (const [n, rec] of Object.entries(config.installed)) {
      if (!registry.components[n]) { warn(`${n}: no longer in registry`); continue; }
      const local = installedHash(root, config.componentsDir, registry, n);
      const current = rewrittenRegistryHash(registry, n);
      if (!local) { warn(`${n}: files missing — notsho add ${n} --force`); problems++; }
      else if (local !== rec.hash && rec.hash !== current) { warn(`${n}: modified locally AND registry updated — review manually`); problems++; }
      else if (local !== rec.hash) ok(`${n}: modified locally (yours)`);
      else if (rec.hash !== current) { warn(`${n}: registry has updates — notsho add ${n} --force`); problems++; }
      else ok(`${n}: up to date`);
    }
    if (!Object.keys(config.installed).length) log("    (none installed)");
    log("");
  }

  const targets = args.length ? args.map((a) => join(root, a)) : [join(root, "src"), join(root, "app"), join(root, "components")].filter(existsSync);
  const files = targets.flatMap((t) => walk(t, [".css", ".tsx", ".jsx", ".ts", ".js", ".vue", ".svelte", ".html"]));
  const skipDir = config ? join(root, config.componentsDir) : null;
  let count = 0;
  log(`  Token drift (${files.length} files)`);
  for (const f of files) {
    if (skipDir && f.startsWith(skipDir) && !flags.has("--include-components")) continue; // component internals may legitimately use component tokens
    const findings = lintSource(readFileSync(f, "utf8"), { filename: f });
    if (!findings.length) continue;
    count += findings.length;
    log(formatFindings(relative(root, f), findings).split("\n").map((l) => "    " + l).join("\n"));
  }
  if (!count) ok("no hardcoded visual values");
  problems += count;
  log("");
  if (problems && !flags.has("--no-fail")) process.exit(1);
}

// ─── rules ───────────────────────────────────────────────────────────────────
function writeRules(root: string, config: Config, file: string) {
  const rules = generateRules(loadRegistry(), loadManifest(), { componentsDir: config.componentsDir, installed: Object.keys(config.installed) });
  const p = join(root, file);
  const existing = existsSync(p) ? readFileSync(p, "utf8") : null;
  writeFileSync(p, mergeRules(existing, rules));
  ok(`${file} (${existing ? "updated" : "created"} notsho section)`);
}
function rules() {
  const root = findProjectRoot();
  const config = readConfig(root) ?? { componentsDir: flagValue("--dir") ?? "src/components/ui", installed: {} };
  const file = flagValue("--write");
  if (file) writeRules(root, config, file);
  else process.stdout.write(generateRules(loadRegistry(), loadManifest(), { componentsDir: config.componentsDir, installed: Object.keys(config.installed) }));
}

// ─── tokens ──────────────────────────────────────────────────────────────────
function tokens() {
  const m = loadManifest();
  const q = args[0]?.toLowerCase();
  const tier = flagValue("--tier");
  const list = m.tokens.filter((t) => (!tier || t.tier === tier) && (!q || t.name.includes(q) || t.type.includes(q) || (t.description ?? "").toLowerCase().includes(q)));
  if (flags.has("--json")) { log(JSON.stringify(list, null, 2)); return; }
  for (const t of list) log(`${t.name.padEnd(26)} ${t.tier.padEnd(10)} ${t.cssVar.padEnd(36)} ${t.resolved.light}${t.resolved.dark !== t.resolved.light ? `  |  ${t.resolved.dark}` : ""}`);
  log(`\n${list.length} tokens`);
}

// ─── export-theme ────────────────────────────────────────────────────────────
function exportTheme() {
  const file = args[0] ?? fail("Usage: notsho export-theme <theme.json> [--css]");
  const theme = parseTheme(readFileSync(file, "utf8"));
  if (flags.has("--css")) process.stdout.write(themeToCss(theme.overrides) + "\n");
  else process.stdout.write(JSON.stringify(theme, null, 2) + "\n");
}

const commands: Record<string, () => void> = { init, add, doctor, rules, tokens, "export-theme": exportTheme };

if (!cmd || flags.has("--help") || !commands[cmd]) {
  log(`
  notsho — design system tooling for agent-built apps

  notsho init [--dir src/components/ui] [--no-install] [--rules AGENTS.md]
  notsho add <component…> | --all | --list   [--force] [--install]
  notsho doctor [paths…] [--no-fail] [--include-components]
  notsho rules [--write AGENTS.md]
  notsho tokens [query] [--tier semantic] [--json]
  notsho export-theme <theme.json> [--css]
`);
  process.exit(cmd && !commands[cmd] ? 1 : 0);
}
try { commands[cmd]!(); } catch (e) { fail((e as Error).message); }
