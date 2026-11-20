import type {
  TerminalColor,
  TerminalLayout,
} from "../../../shared/document";
import { colorSgr, RESET } from "./color";

const SGR = /\x1b\[[0-9;]*m/g;

/** Remove every ANSI SGR sequence; what remains is the literal grid. */
export function stripAnsi(text: string): string {
  return text.replace(SGR, "");
}

export interface EncodedTerminal {
  /** Exactly what is written to the file. */
  text: string;
  /** Number of SGR sequences (color changes + resets). */
  sequences: number;
  /** UTF-8 byte length. */
  bytes: number;
  /** Literal content with every style sequence removed. */
  plain: string;
  /** `text` with ESC rendered as ␛, safe to show inside the page. */
  visible: string;
}

/**
 * Render control bytes visibly for the file-inspector pane. This mirrors the
 * sanitizer's notation and guarantees the preview never executes a sequence.
 */
export function visibleControl(text: string): string {
  return text.replace(/\x1b/g, "␛").replace(/\x00/g, "␀");
}

/**
 * Encode a confirmed layout as terminal-ready text.
 *
 * - A color change emits one SGR sequence and never advances the cursor, so
 *   escape bytes never count as columns.
 * - Rows are padded to exactly `columns` visible cells and keep their trailing
 *   spaces. Empty cells simply carry no glyph, so the padding below is the
 *   same as writing the row text verbatim.
 * - Every row ends with an SGR reset (when a style was active) and the file
 *   ends with a reset, so the host terminal always recovers its own style.
 * - A newline follows each row. The host never needs to wrap, because no row
 *   exceeds `columns`.
 */
export function encodeTerminal(
  layout: TerminalLayout,
  colorMode: TerminalColor,
): EncodedTerminal {
  let text = "";
  let sequences = 0;
  for (let y = 0; y < layout.rowsText.length; y++) {
    const glyphs = layout.glyphRows[y] ?? [];
    let line = "";
    let cursor = 0;
    let active: string | null = null;
    for (const glyph of glyphs) {
      if (glyph.start > cursor) line += " ".repeat(glyph.start - cursor);
      if (glyph.color !== active) {
        const sgr = colorSgr(glyph.color, colorMode);
        if (sgr) {
          line += sgr;
          sequences++;
          active = glyph.color;
        } else if (active !== null) {
          // Switching from a colored run to a styleless one on a mono target
          // cannot happen; keep the guard explicit for future palettes.
          line += RESET;
          sequences++;
          active = null;
        }
      }
      line += glyph.text;
      cursor = glyph.start + glyph.span;
    }
    if (cursor < layout.columns) line += " ".repeat(layout.columns - cursor);
    if (active !== null) {
      line += RESET;
      sequences++;
    }
    text += line + "\n";
  }
  if (sequences > 0) {
    // Restore the host terminal's own style even if the reader stops mid-file.
    text += RESET;
    sequences++;
  }
  return {
    text,
    sequences,
    bytes: new TextEncoder().encode(text).length,
    plain: stripAnsi(text),
    visible: visibleControl(text),
  };
}
