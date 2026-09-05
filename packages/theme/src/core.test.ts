import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTheme, serializeTheme, themeToCss, tokenToVar, memoryAdapter, emptyTheme } from "./core.ts";
import { themeScript } from "./script.ts";

test("tokenToVar matches compiler naming", () => {
  assert.equal(tokenToVar("color.accent"), "--notsho-color-accent");
  assert.equal(tokenToVar("color.gray.500", "x"), "--x-color-gray-500");
});

test("serialize/parse round-trips and drops junk", () => {
  const t = serializeTheme({ scheme: "dark", overrides: { "color.accent": "red", "radius.control": { light: "0", dark: "1px" } } });
  const back = parseTheme(t);
  assert.equal(back.scheme, "dark");
  assert.deepEqual(back.overrides, { "color.accent": "red", "radius.control": { light: "0", dark: "1px" } });

  const junk = parseTheme(JSON.stringify({ v: 1, scheme: "purple", overrides: { "not.a.token": "x", "color.blue.500": "red", "color.accent": 42, "color.text": "a;b{c}" } }));
  assert.equal(junk.scheme, "system");
  assert.deepEqual(junk.overrides, { "color.text": "abc" });

  assert.deepEqual(parseTheme("not json"), emptyTheme());
  assert.deepEqual(parseTheme(null), emptyTheme());
});

test("themeToCss emits base, light, dark and media blocks", () => {
  const css = themeToCss({ "color.accent": "red", "color.surface": { light: "white", dark: "black" } });
  assert.equal(
    css,
    ':root{--notsho-color-accent:red}:root,[data-theme="light"]{--notsho-color-surface:white}[data-theme="dark"]{--notsho-color-surface:black}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--notsho-color-surface:black}}',
  );
  assert.equal(themeToCss({}), "");
});

test("memory adapter", () => {
  const m = memoryAdapter();
  assert.equal(m.get(), null);
  m.set("a"); assert.equal(m.get(), "a");
  m.remove!(); assert.equal(m.get(), null);
});

test("themeScript is self-contained and produces the same CSS as themeToCss", () => {
  const src = themeScript();
  assert.doesNotMatch(src, /import|require/);
  // Execute the script against a fake DOM.
  const stored = serializeTheme({ scheme: "dark", overrides: { "color.accent": "red", "color.surface": { light: "white", dark: "black" } } });
  const head: { appendChild(e: { id: string; textContent: string }): void; el?: { id: string; textContent: string } } = { appendChild(e) { this.el = e; } };
  const attrs: Record<string, string> = {};
  const fakeDoc = {
    documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } },
    createElement: () => ({ id: "", textContent: "" }),
    head,
  };
  const fn = new Function("document", "localStorage", src);
  fn(fakeDoc, { getItem: () => stored });
  assert.equal(attrs["data-theme"], "dark");
  assert.equal(head.el?.id, "notsho-theme");
  assert.equal(head.el?.textContent, themeToCss({ "color.accent": "red", "color.surface": { light: "white", dark: "black" } }));
});

test("themeScript cookie variant reads document.cookie", () => {
  const src = themeScript({ storage: "cookie", storageKey: "k" });
  const stored = encodeURIComponent(serializeTheme({ scheme: "light", overrides: {} }));
  const attrs: Record<string, string> = {};
  const fakeDoc = { cookie: `other=1; k=${stored}`, documentElement: { setAttribute: (a: string, v: string) => { attrs[a] = v; } }, createElement: () => ({}), head: { appendChild() {} } };
  new Function("document", src)(fakeDoc);
  assert.equal(attrs["data-theme"], "light");
});
