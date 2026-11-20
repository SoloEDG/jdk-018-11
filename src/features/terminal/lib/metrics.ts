import type {
  TerminalColor,
  TerminalLayout,
} from "../../../shared/document";
import { palettes, parseHex, quantizedColor, rgbToLab } from "./color";

export interface ColorStats {
  /** Mean CIE76 ΔE over visible glyphs. */
  mean: number;
  p95: number;
  max: number;
  samples: number;
}

/**
 * Perceptual error of the target's adaptive palette against the source colors
 * the layout actually shows. Comparing targets uses the same statistic, so
 * 16-color vs 256-color vs truecolor is a like-for-like number.
 */
export function colorError(
  layout: TerminalLayout,
  mode: TerminalColor,
): ColorStats {
  const errors: number[] = [];
  for (const row of layout.glyphRows) {
    for (const glyph of row) {
      if (!glyph.text.trim()) continue;
      const [l1, a1, b1] = rgbToLab(parseHex(glyph.color));
      const [l2, a2, b2] = rgbToLab(parseHex(quantizedColor(glyph.color, mode)));
      errors.push(Math.hypot(l1 - l2, a1 - a2, b1 - b2));
    }
  }
  if (!errors.length) return { mean: 0, p95: 0, max: 0, samples: 0 };
  errors.sort((a, b) => a - b);
  return {
    mean: errors.reduce((s, e) => s + e, 0) / errors.length,
    p95: errors[Math.min(errors.length - 1, Math.floor(errors.length * 0.95))]!,
    max: errors[errors.length - 1]!,
    samples: errors.length,
  };
}

/** How many distinct palette entries a target can display. */
export function paletteSize(mode: TerminalColor): number {
  if (mode === "mono") return 1;
  if (mode === "truecolor") return 16_777_216;
  return palettes[mode].length;
}
