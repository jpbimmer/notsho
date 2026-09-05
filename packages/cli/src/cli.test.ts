import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lintSource } from "./lint.ts";
import { generateRules, loadManifest, mergeRules, RULES_START, RULES_END } from "./rules.ts";
import { copyComponent, copyShared, loadRegistry, resolveComponents, rewriteImports, rewrittenRegistryHash, installedHash } from "./lib.ts";

test("lint flags hardcoded values and respects ignores", () => {
  const css = `.a { color: #fff; background: rgb(0 0 0); font-size: 14px; border-radius: 8px; box-shadow: 0 1px 2px #000; transition: all 200ms; }
.b { color: var(--notsho-color-text, #000); border-radius: var(--notsho-radius-card); } /* fallback allowed */
.c { background: url(#grad); } /* notsho-ignore */
/* #abcdef in a comment */
--notsho-color-x: #123456;`;
  const f = lintSource(css, { filename: "x.module.css" });
  const rules = f.map((x) => x.rule);
  assert.ok(rules.includes("hardcoded-color"));
  assert.ok(rules.includes("hardcoded-font-size"));
  assert.ok(rules.includes("hardcoded-radius"));
  assert.ok(rules.includes("hardcoded-shadow"));
  assert.ok(rules.includes("hardcoded-duration"));
  assert.ok(f.every((x) => x.line === 1), "only line 1 should be flagged: " + JSON.stringify(f.map((x) => [x.line, x.match])));
  assert.deepEqual(lintSource("/* notsho-ignore-file */\n.a{color:#fff}", { css: true }), []);
});

test("lint on tsx catches inline styles and tailwind arbitrary colors", () => {
  const tsx = `import x from "#internal";
const a = <div style={{ color: "#ff0000", fontSize: 14 }} className="bg-[#00ff00] rounded-[8px]" />;
const ok = <div style={{ color: "var(--notsho-color-accent)" }} />;`;
  const f = lintSource(tsx, { filename: "a.tsx" });
  assert.equal(f.filter((x) => x.rule === "hardcoded-color").length, 2);
  assert.ok(f.every((x) => x.line === 2));
});

test("rules pack lists components and tokens and merges idempotently", () => {
  const reg = loadRegistry();
  const rules = generateRules(reg, loadManifest(), { componentsDir: "src/ui", installed: ["button"] });
  assert.ok(rules.startsWith(RULES_START));
  assert.ok(rules.includes("| `button` | installed |"));
  assert.ok(rules.includes("| `dialog` | available |"));
  assert.ok(rules.includes("`color.accent`"));
  assert.ok(rules.includes("var(--notsho-color-accent)"));
  const merged1 = mergeRules("# My project\n\nHello.\n", rules);
  assert.ok(merged1.startsWith("# My project"));
  const merged2 = mergeRules(merged1, rules.replace("v0", "v9"));
  assert.equal((merged2.match(new RegExp(RULES_START, "g")) ?? []).length, 1);
  assert.ok(merged2.includes(RULES_END));
});

test("resolveComponents orders dependencies first and rejects unknown", () => {
  const reg = loadRegistry();
  const order = resolveComponents(reg, ["field"]);
  assert.deepEqual(order, ["input", "field"]);
  assert.throws(() => resolveComponents(reg, ["nope"]), /Unknown component/);
});

test("copyComponent rewrites lib imports and hashes match", () => {
  const reg = loadRegistry();
  const root = mkdtempSync(join(tmpdir(), "notsho-"));
  writeFileSync(join(root, "package.json"), "{}");
  copyShared(reg, root, "src/ui");
  const res = copyComponent(reg, "button", root, "src/ui");
  assert.ok(res.written.includes("src/ui/button/button.tsx"));
  const src = readFileSync(join(root, "src/ui/button/button.tsx"), "utf8");
  assert.ok(src.includes('from "../lib/cx"'), "import rewritten");
  assert.ok(!src.includes("../../lib/"));
  assert.ok(existsSync(join(root, "src/ui/lib/cx.ts")));
  assert.equal(installedHash(root, "src/ui", reg, "button"), rewrittenRegistryHash(reg, "button"));
  // Local edit changes the hash.
  writeFileSync(join(root, "src/ui/button/button.tsx"), src + "\n// local\n");
  assert.notEqual(installedHash(root, "src/ui", reg, "button"), rewrittenRegistryHash(reg, "button"));
  // Second copy skips existing files.
  assert.equal(copyComponent(reg, "button", root, "src/ui").written.length, 0);
  assert.equal(rewriteImports(`import { cx } from '../../lib/cx';`), `import { cx } from '../lib/cx';`);
});
