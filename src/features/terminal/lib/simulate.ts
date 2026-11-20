import type {
  TerminalColor,
  TerminalLayout,
  TerminalWidthRule,
} from "../../../shared/document";
import { clusterWidth, textWidth } from "./width";
import { stripAnsi } from "./encode";

export interface SimCell {
  text: string;
  color: string | null;
  /** Head of a double-width glyph; the tail cell is reserved beside it. */
  head: boolean;
  tail: boolean;
}

export interface SimRow {
  cells: SimCell[];
  /** True when the host had to wrap this row onto the next line. */
  wrapped: boolean;
  /** Graphemes the host could not fit at the right margin. */
  clipped: number;
}

export interface SimScreen {
  columns: number;
  rows: SimRow[];
  /** Total graphemes pushed past the right margin. */
  overflow: number;
}

const SGR = /\x1b\[([0-9;]*)m/y;

function blankRow(columns: number): SimRow {
  return {
    cells: Array.from({ length: columns }, () => ({
      text: " ",
      color: null,
      head: false,
      tail: false,
    })),
    wrapped: false,
    clipped: 0,
  };
}

function ansiColor(params: string): string | null {
  const parts = params.split(";").filter(Boolean).map(Number);
  if (!parts.length || parts.includes(0)) return null;
  if (parts[0] === 38) {
    if (parts[1] === 2) {
      return (
        "#" +
        [parts[2]!, parts[3]!, parts[4]!]
          .map((v) => v.toString(16).padStart(2, "0"))
          .join("")
      );
    }
    if (parts[1] === 5) return `256:${parts[2]}`;
  }
  if (parts[0]! >= 30 && parts[0]! <= 37) return `16:${parts[0]! - 30}`;
  if (parts[0]! >= 90 && parts[0]! <= 97) return `16:${parts[0]! - 90 + 8}`;
  return null;
}

/**
 * Replay terminal output the way an emulator would.
 *
 * This starts from the bytes, not from the layout: SGR sequences are consumed
 * and consume no columns, then every remaining grapheme is placed at the next
 * free column under the target's width rule. A grapheme that would cross the
 * right margin sets `wrapped`, so a row that is even one column too wide is
 * caught even if the layout object claims otherwise.
 */
export function simulate(
  text: string,
  columns: number,
  rule: TerminalWidthRule,
): SimScreen {
  const rows: SimRow[] = [];
  let current = blankRow(columns);
  let cursor = 0;
  let color: string | null = null;

  for (let i = 0; i < text.length; ) {
    const ch = text[i]!;
    if (ch === "\x1b") {
      SGR.lastIndex = i;
      const match = SGR.exec(text);
      if (match) {
        color = ansiColor(match[1]!);
        i = SGR.lastIndex;
        continue;
      }
      // An unknown escape would have been sanitized away before this point.
      i++;
      cursor++;
      continue;
    }
    const cp = text.codePointAt(i)!;
    const glyph = String.fromCodePoint(cp);
    i += glyph.length;
    if (glyph === "\n") {
      rows.push(current);
      current = blankRow(columns);
      cursor = 0;
      continue;
    }
    if (glyph === "\r") {
      cursor = 0;
      continue;
    }
    const span = clusterWidth(glyph, rule);
    if (span === 0) {
      const prev = current.cells[cursor - 1];
      if (prev) prev.text += glyph;
      continue;
    }
    if (cursor + span > columns) {
      current.wrapped = true;
      current.clipped++;
      rows.push(current);
      current = blankRow(columns);
      cursor = 0;
      continue;
    }
    current.cells[cursor] = { text: glyph, color, head: span === 2, tail: false };
    if (span === 2 && cursor + 1 < columns) {
      current.cells[cursor + 1] = { text: "", color, head: false, tail: true };
    }
    cursor += span;
  }
  rows.push(current);
  return {
    columns,
    rows,
    overflow: rows.reduce((sum, r) => sum + r.clipped, 0),
  };
}

export interface Verification {
  ok: boolean;
  checkedRows: number;
  maxWidth: number;
  wrapped: number;
  clipped: number;
  mismatchedRows: number;
  restoredStyle: boolean;
  plainRows: string[];
  notes: string[];
}

/**
 * Verify an exported file against the layout the user confirmed:
 *
 * - no row is wider than `columns`, so the host never auto-wraps
 * - no grapheme was pushed past the margin
 * - stripping every style sequence reproduces the confirmed rows exactly
 * - the file ends in a style reset
 * - a no-color target carries no control sequences at all
 */
export function verify(
  text: string,
  layout: TerminalLayout,
  colorMode: TerminalColor,
): Verification {
  const plain = stripAnsi(text);
  const plainRows = plain.split("\n");
  if (plainRows.length && plainRows[plainRows.length - 1] === "") plainRows.pop();

  const screen = simulate(text, layout.columns, layout.widthRule);
  const wrapped = screen.rows.filter((r) => r.wrapped).length;
  const clipped = screen.rows.reduce((sum, r) => sum + r.clipped, 0);

  let maxWidth = 0;
  let mismatchedRows = 0;
  for (let y = 0; y < layout.rowsText.length; y++) {
    const expected = layout.rowsText[y] ?? "";
    const actual = plainRows[y] ?? "";
    maxWidth = Math.max(maxWidth, textWidth(actual, layout.widthRule));
    if (actual !== expected) mismatchedRows++;
  }
  if (plainRows.length !== layout.rowsText.length) {
    mismatchedRows += Math.abs(plainRows.length - layout.rowsText.length);
  }

  // A no-color target has no style to restore, so a trailing reset is optional.
  const restoredStyle =
    colorMode === "mono" ? !/\x1b\[/.test(text) : /\x1b\[0m$/.test(text);
  const notes: string[] = [];
  if (wrapped) notes.push(`${wrapped} 行会被终端折行`);
  if (clipped) notes.push(`${clipped} 个字符在右边界被裁切`);
  if (mismatchedRows) notes.push(`${mismatchedRows} 行与确认网格不一致`);
  if (maxWidth > layout.columns)
    notes.push(`最宽一行 ${maxWidth} 列，超过目标 ${layout.columns} 列`);
  if (!restoredStyle) notes.push("文件结尾缺少样式复位");
  if (colorMode === "mono" && /\x1b\[/.test(text))
    notes.push("无颜色目标仍包含控制序列");

  return {
    ok:
      !wrapped &&
      !clipped &&
      !mismatchedRows &&
      maxWidth <= layout.columns &&
      restoredStyle,
    checkedRows: layout.rowsText.length,
    maxWidth,
    wrapped,
    clipped,
    mismatchedRows,
    restoredStyle,
    plainRows,
    notes,
  };
}
