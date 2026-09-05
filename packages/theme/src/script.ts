/**
 * No-flash hydration script.
 *
 * Emit this inline in <head>, before any stylesheet paints. It reads the stored
 * theme and applies scheme + overrides synchronously so the first frame is
 * already themed. Deliberately duplicates a minimal `themeToCss` — it must not
 * import anything.
 */
import { DEFAULT_STORAGE_KEY, STYLE_ELEMENT_ID } from "./core.js";

export interface ThemeScriptOptions {
  /** Must match the storage adapter the ThemeProvider uses. */
  storageKey?: string;
  /** "localStorage" (default) or "cookie". */
  storage?: "localStorage" | "cookie";
  prefix?: string;
}

export function themeScript(opts: ThemeScriptOptions = {}): string {
  const key = JSON.stringify(opts.storageKey ?? DEFAULT_STORAGE_KEY);
  const prefix = JSON.stringify(opts.prefix ?? "notsho");
  const id = JSON.stringify(STYLE_ELEMENT_ID);
  const read =
    opts.storage === "cookie"
      ? `var m=document.cookie.match(new RegExp("(?:^|; )"+k+"=([^;]*)"));var raw=m?decodeURIComponent(m[1]):null;`
      : `var raw=localStorage.getItem(k);`;

  // Kept as one expression-light IIFE so it minifies well and never throws past the try.
  return (
    `(function(){try{var k=${key},p=${prefix};${read}if(!raw)return;var t=JSON.parse(raw);var r=document.documentElement;` +
    `if(t.scheme==="light"||t.scheme==="dark")r.setAttribute("data-theme",t.scheme);` +
    `var o=t.overrides||{},b=[],l=[],d=[];` +
    `function s(v){return String(v).replace(/[;{}<>]/g,"")}` +
    `for(var n in o){var v=o[n],c="--"+p+"-"+n.replace(/\\./g,"-");` +
    `if(typeof v==="string")b.push(c+":"+s(v));else if(v){if(v.light)l.push(c+":"+s(v.light));if(v.dark)d.push(c+":"+s(v.dark));}}` +
    `var css="";if(b.length)css+=":root{"+b.join(";")+"}";if(l.length)css+=':root,[data-theme="light"]{'+l.join(";")+"}";` +
    `if(d.length){var dd=d.join(";");css+='[data-theme="dark"]{'+dd+'}@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){'+dd+"}}"}` +
    `if(!css)return;var e=document.createElement("style");e.id=${id};e.textContent=css;document.head.appendChild(e);}catch(_){}})();`
  );
}
