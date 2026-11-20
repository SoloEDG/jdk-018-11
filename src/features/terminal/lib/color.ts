import type { TerminalColor } from "../../../shared/document";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const RESET = "\x1b[0m";

/** Standard xterm 16-colour palette (normal + bright). */
const ANSI16_HEX = [
  "#000000",
  "#800000",
  "#008000",
  "#808000",
  "#000080",
  "#800080",
  "#008080",
  "#c0c0c0",
  "#808080",
  "#ff0000",
  "#00ff00",
  "#ffff00",
  "#0000ff",
  "#ff00ff",
  "#00ffff",
  "#ffffff",
];

function hexToRgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(c: Rgb): string {
  return (
    "#" +
    [c.r, c.g, c.b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function parseHex(hex: string): Rgb {
  const value = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#000000";
  return hexToRgb(value);
}

const CUBE = [0, 95, 135, 175, 215, 255];

function cubeRgb(index: number): Rgb {
  const n = index - 16;
  return {
    r: CUBE[Math.floor(n / 36) % 6]!,
    g: CUBE[Math.floor(n / 6) % 6]!,
    b: CUBE[n % 6]!,
  };
}

/** sRGB → CIE Lab (D65), used so palette error is perceptual, not channel-wise. */
export function rgbToLab(c: Rgb): [number, number, number] {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const r = lin(c.r),
    g = lin(c.g),
    b = lin(c.b);
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (v: number) => (v > 0.008856 ? Math.cbrt(v) : 7.787 * v + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

export interface PaletteEntry {
  sgr: string;
  rgb: Rgb;
  lab: [number, number, number];
}

function paletteEntry(rgb: Rgb, sgr: string): PaletteEntry {
  return { sgr, rgb, lab: rgbToLab(rgb) };
}

function ansi16Sgr(index: number): string {
  return `\x1b[${index < 8 ? 30 + index : 82 + index}m`;
}

function buildPalette(): Record<TerminalColor, PaletteEntry[]> {
  const ansi16 = ANSI16_HEX.map((hex, i) => paletteEntry(hexToRgb(hex), ansi16Sgr(i)));
  const ansi256 = [
    ...ANSI16_HEX.map((hex, i) =>
      paletteEntry(hexToRgb(hex), `\x1b[38;5;${i}m`),
    ),
    ...Array.from({ length: 216 }, (_, i) =>
      paletteEntry(cubeRgb(16 + i), `\x1b[38;5;${16 + i}m`),
    ),
    ...Array.from({ length: 24 }, (_, i) => {
      const v = 8 + i * 10;
      return paletteEntry(
        { r: v, g: v, b: v },
        `\x1b[38;5;${232 + i}m`,
      );
    }),
  ];
  return { truecolor: [], ansi256, ansi16, mono: [] };
}

export const palettes = buildPalette();

export function nearest(
  palette: PaletteEntry[],
  rgb: Rgb,
  lab = rgbToLab(rgb),
): PaletteEntry {
  let best = palette[0]!;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const entry of palette) {
    const d =
      (entry.lab[0] - lab[0]) ** 2 +
      (entry.lab[1] - lab[1]) ** 2 +
      (entry.lab[2] - lab[2]) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = entry;
    }
  }
  return best;
}

export function colorSgr(color: string, mode: TerminalColor): string {
  const rgb = parseHex(color);
  if (mode === "mono") return "";
  if (mode === "truecolor")
    return `\x1b[38;2;${rgb.r};${rgb.g};${rgb.b}m`;
  const palette = mode === "ansi16" ? palettes.ansi16 : palettes.ansi256;
  return nearest(palette, rgb).sgr;
}

/** The color a target actually displays after quantization. */
export function quantizedColor(color: string, mode: TerminalColor): string {
  const rgb = parseHex(color);
  if (mode === "mono") return "#e8ebe4";
  if (mode === "truecolor") return rgbToHex(rgb);
  const palette = mode === "ansi16" ? palettes.ansi16 : palettes.ansi256;
  return rgbToHex(nearest(palette, rgb).rgb);
}

export { RESET };
