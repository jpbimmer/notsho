/**
 * Minimal OKLCH color math. No dependencies.
 * sRGB (hex) ⇄ linear ⇄ OKLab ⇄ OKLCH, plus WCAG relative luminance for
 * on-color decisions. Enough for derivation; APCA comes later.
 */

export interface Oklch { l: number; c: number; h: number }
export interface Rgb { r: number; g: number; b: number } // 0..1, gamma-encoded

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function hexToRgb(hex: string): Rgb | null {
  const m = hex.trim().replace(/^#/, "");
  const s = m.length === 3 ? m.split("").map((ch) => ch + ch).join("") : m;
  if (!/^[0-9a-f]{6}$/i.test(s)) return null;
  const n = parseInt(s, 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (x: number) => Math.round(clamp01(x) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklch(rgb: Rgb): Oklch {
  const r = toLinear(rgb.r), g = toLinear(rgb.g), b = toLinear(rgb.b);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const c = Math.hypot(A, B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c: c < 1e-4 ? 0 : c, h: c < 1e-4 ? 0 : h };
}

/** Returns gamma-encoded sRGB, possibly out of [0,1] when the color is out of gamut. */
export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  const hr = (h * Math.PI) / 180;
  const A = c * Math.cos(hr), B = c * Math.sin(hr);
  const l_ = l + 0.3963377774 * A + 0.2158037573 * B;
  const m_ = l - 0.1055613458 * A - 0.0638541728 * B;
  const s_ = l - 0.0894841775 * A - 1.291485548 * B;
  const L = l_ ** 3, M = m_ ** 3, S = s_ ** 3;
  const r = 4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S;
  const g = -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S;
  const b = -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S;
  return { r: toGamma(r), g: toGamma(g), b: toGamma(b) };
}

export const inGamut = (rgb: Rgb, eps = 0.0005) =>
  rgb.r >= -eps && rgb.r <= 1 + eps && rgb.g >= -eps && rgb.g <= 1 + eps && rgb.b >= -eps && rgb.b <= 1 + eps;

/** Reduce chroma until the color fits sRGB. Keeps L and H, which is what the eye tracks. */
export function clampToGamut(color: Oklch): Oklch {
  if (inGamut(oklchToRgb(color))) return color;
  let lo = 0, hi = color.c;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklchToRgb({ ...color, c: mid }))) lo = mid; else hi = mid;
  }
  return { ...color, c: lo };
}

export function hexToOklch(hex: string): Oklch | null {
  const rgb = hexToRgb(hex);
  return rgb && rgbToOklch(rgb);
}

export function oklchToHex(color: Oklch): string {
  return rgbToHex(oklchToRgb(clampToGamut(color)));
}

export function formatOklch({ l, c, h }: Oklch, alpha?: number): string {
  const r = (x: number, d: number) => Number(x.toFixed(d)).toString();
  return alpha === undefined
    ? `oklch(${r(l, 3)} ${r(c, 3)} ${r(h, 1)})`
    : `oklch(${r(l, 3)} ${r(c, 3)} ${r(h, 1)} / ${r(alpha, 2)})`;
}

/** WCAG 2 relative luminance from gamma-encoded sRGB. */
export function luminance(rgb: Rgb): number {
  const c = { r: clamp01(rgb.r), g: clamp01(rgb.g), b: clamp01(rgb.b) };
  return 0.2126 * toLinear(c.r) + 0.7152 * toLinear(c.g) + 0.0722 * toLinear(c.b);
}

/** WCAG 2 contrast ratio between two colors. */
export function contrast(a: Oklch, b: Oklch): number {
  const la = luminance(oklchToRgb(clampToGamut(a)));
  const lb = luminance(oklchToRgb(clampToGamut(b)));
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
