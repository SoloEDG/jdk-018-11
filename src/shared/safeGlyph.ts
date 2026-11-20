/**
 * User-entered glyph text must never carry bytes a terminal interprets as
 * commands. Control characters are escaped to visible, single-cell notation:
 *
 * - C0 (00–1F) becomes the Unicode Control Picture ␀–␟, so ESC shows as ␛
 *   instead of starting a sequence.
 * - DEL becomes ␡.
 * - C1 (80–9F), which includes the single-byte CSI, becomes U+FFFD.
 * - U+2028 / U+2029 (line / paragraph separators) become ↵.
 *
 * Nothing here can alter terminal state; the result is plain, printable text.
 */
export function sanitizeGlyph(text: string): string {
  let out = "";
  for (const ch of Array.from(text)) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x20) {
      out += String.fromCodePoint(0x2400 + cp);
    } else if (cp === 0x7f) {
      out += "␡";
    } else if (cp >= 0x80 && cp <= 0x9f) {
      out += "�";
    } else if (cp === 0x2028 || cp === 0x2029) {
      out += "↵";
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Split a custom charset into sanitized entries. Line breaks and tabs are
 * removed rather than escaped, because they are paste artifacts rather than
 * intended glyphs.
 */
export function glyphList(custom: string): string[] {
  const chars = Array.from(custom)
    .filter((c) => c !== "\n" && c !== "\r" && c !== "\t")
    .map(sanitizeGlyph)
    .filter((c) => c !== "");
  const unique = [...new Set(chars)];
  return unique.length ? unique : [" "];
}
