/**
 * Resolve a Notsho color token to "rgb(r g b)" for consumers that can't read
 * CSS variables or oklch() — MapLibre paint properties, canvas.
 */
let ctx: CanvasRenderingContext2D | null = null;

/** `from`: an element inside the theme scope whose tokens you want (defaults to <html>). */
export function tokenColor(token: string, alpha = 1, from: Element = document.documentElement) {
  const raw = getComputedStyle(from).getPropertyValue(`--notsho-${token}`).trim();
  ctx ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return raw;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000"; // notsho-ignore — reset before parsing the token
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`; // notsho-ignore — computed from a token
}
