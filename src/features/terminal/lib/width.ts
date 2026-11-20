import type { TerminalWidthRule } from "../../../shared/document";
import { clusters } from "../../../shared/graphemes";

export { clusters };

/**
 * Code points that advance zero columns: combining marks, joiners, variation
 * selectors, bidi controls, and the like.
 */
const ZERO_WIDTH =
  /[̀-ͯ҃-҉֑-ֽؐ-ًؚ-ٰٟۖ-ۭऀ-ःऺ-ॏ॑-ॗั-ฺ็-๎᪰-᫿᷀-᷿​-‏‪-‮⁠-⁤⃐-⃿︀-️﻿￹-￻]|\u{1d167}-\u{1d169}|\u{1d17b}-\u{1d182}|\u{1d185}-\u{1d18b}|\u{1d1aa}-\u{1d1ad}|\u{e0100}-\u{e01ef}/u;

const WIDE_RANGES: [number, number][] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xa960, 0xa97f],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1b000, 0x1b2ff],
  [0x1f200, 0x1f251],
  [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
];

const VARIATION_SELECTOR_16 = "️";
const ZWJ = "‍";

export function isWideCodePoint(cp: number): boolean {
  if (cp >= 0x1f1e6 && cp <= 0x1f1ff) return true;
  for (const [start, end] of WIDE_RANGES) {
    if (cp >= start && cp <= end) return true;
  }
  return false;
}

function singleWidth(cp: number, rule: TerminalWidthRule): 0 | 1 | 2 {
  if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) return 0;
  if (rule === "narrow") return 1;
  if (rule === "wide") return cp < 0x7f ? 1 : 2;
  return isWideCodePoint(cp) ? 2 : 1;
}

/**
 * Columns one grapheme occupies under a target rule.
 *
 * Combining marks advance zero columns; a double-width base occupies two and
 * the marks that follow it ride along inside the same two columns.
 */
export function clusterWidth(
  cluster: string,
  rule: TerminalWidthRule,
): 0 | 1 | 2 {
  if (!cluster) return 0;
  const cps = Array.from(cluster);
  // Only the base decides the advance; a zero-width base (a lone combining
  // mark) occupies nothing, while marks following a normal base ride along.
  if (ZERO_WIDTH.test(cps[0]!)) return 0;
  const baseWidth = singleWidth(cps[0]!.codePointAt(0)!, rule);
  if (cps.length === 1) return baseWidth;
  if (baseWidth === 0) return 0;
  if (cps.includes(ZWJ)) return Math.max(baseWidth, 2) as 1 | 2;
  if (cps.some((c) => isWideCodePoint(c.codePointAt(0)!)))
    return Math.max(baseWidth, 2) as 1 | 2;
  if (cps.includes(VARIATION_SELECTOR_16)) return 2;
  return Math.max(baseWidth, 1) as 1 | 2;
}

/** Total display columns of a string under the target's width rules. */
export function textWidth(text: string, rule: TerminalWidthRule): number {
  return clusters(text).reduce((sum, c) => sum + clusterWidth(c, rule), 0);
}
