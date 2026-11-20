const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/**
 * Split text into user-perceived characters. A combining mark stays attached
 * to its base, so a glyph occupies one cell rather than splitting apart.
 */
export function clusters(text: string): string[] {
  if (segmenter) return Array.from(segmenter.segment(text), (s) => s.segment);
  return Array.from(text);
}
