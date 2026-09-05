/** Typography derivation: font pairing, base size, heading weight → tokens. */
import type { ThemeOverrides } from "@notsho/tokens";

export interface FontOption {
  id: string;
  name: string;
  /** CSS font-family stack. */
  stack: string;
  /** Google Fonts family query, or null for system fonts. */
  google: string | null;
  category: "sans" | "serif" | "mono" | "display";
}

export const fonts: FontOption[] = [
  { id: "system", name: "System", stack: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif", google: null, category: "sans" },
  { id: "inter", name: "Inter", stack: "'Inter', system-ui, sans-serif", google: "Inter:wght@400;500;600;700", category: "sans" },
  { id: "plex", name: "IBM Plex Sans", stack: "'IBM Plex Sans', system-ui, sans-serif", google: "IBM+Plex+Sans:wght@400;500;600;700", category: "sans" },
  { id: "manrope", name: "Manrope", stack: "'Manrope', system-ui, sans-serif", google: "Manrope:wght@400;500;600;700", category: "sans" },
  { id: "grotesk", name: "Space Grotesk", stack: "'Space Grotesk', system-ui, sans-serif", google: "Space+Grotesk:wght@400;500;600;700", category: "display" },
  { id: "fraunces", name: "Fraunces", stack: "'Fraunces', Georgia, serif", google: "Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700", category: "display" },
  { id: "source-serif", name: "Source Serif", stack: "'Source Serif 4', Georgia, serif", google: "Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600;8..60,700", category: "serif" },
  { id: "lora", name: "Lora", stack: "'Lora', Georgia, serif", google: "Lora:wght@400;500;600;700", category: "serif" },
  { id: "system-mono", name: "System Mono", stack: "ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace", google: null, category: "mono" },
  { id: "jetbrains", name: "JetBrains Mono", stack: "'JetBrains Mono', ui-monospace, monospace", google: "JetBrains+Mono:wght@400;500;600", category: "mono" },
];

export const fontById = (id: string) => fonts.find((f) => f.id === id);

export interface TypographyChoices {
  body: string;
  /** "same" follows body. */
  heading: string;
  code: string;
  /** Base body size in px. */
  size: 14 | 15 | 16 | 17 | 18;
  headingWeight: 500 | 600 | 700;
}

export const DEFAULT_TYPOGRAPHY: TypographyChoices = { body: "system", heading: "same", code: "system-mono", size: 16, headingWeight: 600 };
export const BODY_SIZES: TypographyChoices["size"][] = [14, 15, 16, 17, 18];

export function deriveTypography(c: TypographyChoices): ThemeOverrides {
  const body = fontById(c.body) ?? fonts[0]!;
  const heading = c.heading === "same" ? null : fontById(c.heading);
  const code = fontById(c.code) ?? fonts.find((f) => f.id === "system-mono")!;
  const out: ThemeOverrides = {
    "font.body": body.stack,
    "font.heading": heading ? heading.stack : "var(--notsho-font-body)",
    "font.code": code.stack,
    "text.body-size": `${c.size / 16}rem`,
    "text.heading-weight": String(c.headingWeight),
  };
  // Display and serif headings breathe better with less negative tracking.
  const hcat = (heading ?? body).category;
  out["text.heading-tracking"] = hcat === "serif" || hcat === "display" ? "-0.005em" : "-0.02em";
  return out;
}

export const TYPOGRAPHY_DERIVED_TOKENS = Object.keys(deriveTypography(DEFAULT_TYPOGRAPHY)) as (keyof ThemeOverrides)[];

/** Google Fonts stylesheet URLs needed for a set of choices. Empty for system fonts. */
export function fontStylesheets(c: Partial<TypographyChoices> | undefined): string[] {
  if (!c) return [];
  const ids = [c.body, c.heading, c.code].filter((x): x is string => !!x && x !== "same");
  const families = [...new Set(ids.map((id) => fontById(id)?.google).filter((g): g is string => !!g))];
  if (!families.length) return [];
  return [`https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`];
}
