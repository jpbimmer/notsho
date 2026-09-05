/**
 * Token-drift lint. Finds hardcoded visual values that should be tokens.
 * Pure: takes source text, returns findings. Shared by `notsho doctor` and the MCP server.
 */

export interface Finding {
  line: number;
  column: number;
  rule: "hardcoded-color" | "hardcoded-font-size" | "hardcoded-radius" | "hardcoded-shadow" | "hardcoded-font-family" | "hardcoded-duration";
  match: string;
  message: string;
  suggestion?: string;
}

const IGNORE_FILE = /notsho-ignore-file/;
const IGNORE_LINE = /notsho-ignore(?!-file)/;

interface Rule { rule: Finding["rule"]; re: RegExp; message: string; suggestion?: string; css?: boolean }

const RULES: Rule[] = [
  { rule: "hardcoded-color", re: /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b/gi, message: "Hex color literal.", suggestion: "Use a semantic color token, e.g. var(--notsho-color-accent)." },
  { rule: "hardcoded-color", re: /\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color)\(/gi, message: "Color function literal.", suggestion: "Use a semantic color token, e.g. var(--notsho-color-text-muted)." },
  { rule: "hardcoded-font-size", re: /font-size\s*:\s*\d[\d.]*(?:px|rem|em|pt)/gi, message: "Fixed font-size.", suggestion: "Use var(--notsho-size-*) or var(--notsho-text-body-size).", css: true },
  { rule: "hardcoded-font-family", re: /font-family\s*:\s*(?!var\(|inherit)[^;]+/gi, message: "Fixed font-family.", suggestion: "Use var(--notsho-font-body|heading|code).", css: true },
  { rule: "hardcoded-radius", re: /border-radius\s*:\s*\d[\d.]*(?:px|rem|em)/gi, message: "Fixed border-radius.", suggestion: "Use var(--notsho-radius-control|card|overlay|pill).", css: true },
  { rule: "hardcoded-shadow", re: /box-shadow\s*:\s*(?!none|var\()\d/gi, message: "Fixed box-shadow.", suggestion: "Use var(--notsho-shadow-raised|floating|overlay).", css: true },
  { rule: "hardcoded-duration", re: /(?:transition|animation)(?:-duration)?\s*:[^;]*?\b\d+m?s\b/gi, message: "Fixed duration.", suggestion: "Use var(--notsho-motion-duration-fast|normal|slow).", css: true },
];

// Tailwind arbitrary values like bg-[#fff] are also hardcoded; the hex rule catches them.

export interface LintOptions {
  /** Treat as CSS (also applies to .module.css). Inferred from filename when given. */
  css?: boolean;
  filename?: string;
}

export function lintSource(source: string, opts: LintOptions = {}): Finding[] {
  if (IGNORE_FILE.test(source)) return [];
  const isCss = opts.css ?? /\.css$/.test(opts.filename ?? "");
  const findings: Finding[] = [];
  const lines = source.split("\n");
  lines.forEach((text, i) => {
    if (IGNORE_LINE.test(text)) return;
    // Skip comment-only lines and import lines; colors in comments are documentation.
    const t = text.trim();
    if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("import ")) return;
    // Anything inside var(--…) fallbacks or oklch inside a token definition is allowed.
    const scrubbed = text.replace(/var\([^)]*\)/g, (m) => " ".repeat(m.length)).replace(/--[\w-]+\s*:[^;]*;/g, (m) => " ".repeat(m.length));
    for (const r of RULES) {
      if (r.css && !isCss && !/style=|className=/.test(text) && !/\b(?:font-size|border-radius|box-shadow|transition)\b/.test(text)) continue;
      r.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = r.re.exec(scrubbed))) {
        // Allow hex inside a url() or an id selector / anchor.
        if (r.rule === "hardcoded-color" && /^#/.test(m[0]) && (/url\(/.test(scrubbed.slice(Math.max(0, m.index - 12), m.index)) || /[\w-]$/.test(scrubbed.slice(Math.max(0, m.index - 1), m.index)))) continue;
        findings.push({ line: i + 1, column: m.index + 1, rule: r.rule, match: m[0].trim(), message: r.message, suggestion: r.suggestion });
      }
    }
  });
  return findings;
}

export function formatFindings(file: string, findings: Finding[]): string {
  return findings.map((f) => `${file}:${f.line}:${f.column}  ${f.rule}  ${f.message} (${f.match})${f.suggestion ? `\n    → ${f.suggestion}` : ""}`).join("\n");
}
