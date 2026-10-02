import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTheme, serializeTheme, themeToCss, tokenToVar, memoryAdapter, emptyTheme, mergeOverrides, mergeThemes, scopeToCss } from "./core.ts";
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

  const withMeta = parseTheme(serializeTheme({ scheme: "light", overrides: {}, meta: { colors: { accent: "#fff" } } }));
  assert.deepEqual(withMeta.meta, { colors: { accent: "#fff" } });
  assert.equal(parseTheme(JSON.stringify({ v: 1, scheme: "light", overrides: {}, meta: [1] })).meta, undefined);

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

test("mergeOverrides: later layers win, moded values merge per mode", () => {
  const m = mergeOverrides(
    { "color.accent": { light: "red", dark: "maroon" }, "radius.control": "0" },
    undefined,
    { "color.accent": { dark: "pink" }, "radius.control": "4px" },
  );
  assert.deepEqual(m, { "color.accent": { light: "red", dark: "pink" }, "radius.control": "4px" });
});

test("mergeThemes: highest explicit scheme wins, system falls through", () => {
  assert.equal(mergeThemes({ scheme: "dark", overrides: {} }, { scheme: "system", overrides: {} }).scheme, "dark");
  assert.equal(mergeThemes({ scheme: "dark", overrides: {} }, { scheme: "light", overrides: {} }).scheme, "light");
  assert.deepEqual(mergeThemes({ scheme: "system", overrides: {}, meta: { a: 1 } }, { scheme: "system", overrides: {}, meta: { b: 2 } }).meta, { a: 1, b: 2 });
});

test("scopeToCss re-declares every themable token, defaults keep their var() refs", () => {
  const css = scopeToCss('[data-notsho-scope="x"]', { "color.accent": { light: "red", dark: "pink" }, "radius.control": "0" });
  assert.match(css, /^\[data-notsho-scope="x"\]\[data-scheme\]\{color-scheme:light;/);
  assert.match(css, /--notsho-color-accent:red/);
  assert.match(css, /\[data-scheme="dark"\]\{color-scheme:dark;[^}]*--notsho-color-accent:pink/);
  assert.match(css, /--notsho-radius-control:0;/);
  // Untouched component tokens point back at the scope's own semantic tokens.
  assert.match(css, /--notsho-button-radius:var\(--notsho-radius-control\)/);
  // A value that's the same in both modes isn't repeated in the dark block.
  assert.doesNotMatch(css.split('[data-scheme="dark"]')[1]!, /--notsho-radius-control/);
});
