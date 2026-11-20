import type {
  Grid,
  TerminalLayout,
  TerminalMode,
  TerminalWidthRule,
} from "../../../shared/document";
import { sanitizeGlyph } from "../../../shared/safeGlyph";
import { clusterWidth } from "./width";

/** Terminal cells are about twice as tall as they are wide. */
export const CELL_ASPECT = 2;

export function measure(glyph: string, rule: TerminalWidthRule): 0 | 1 | 2 {
  return clusterWidth(glyph, rule);
}

export interface SampleSize {
  columns: number;
  rows: number;
}

/** Display width a list of source cells occupies, honoring zero-width marks. */
export function spanWidth(cells: SourceCell[], rule: TerminalWidthRule): number {
  return cells.reduce(
    (sum, cell) => sum + measure(sanitizeGlyph(cell.glyph), rule),
    0,
  );
}

/**
 * Window-mode viewport: the original grid at full resolution, cropped to what
 * the terminal can show. Panning only moves the origin.
 *
 * `sourceColumns` is the number of source cells whose measured glyph spans fit
 * inside the target; pass the value from `windowColumns`.
 */
export function windowViewport(
  source: SampleSize,
  targetColumns: number,
  targetRows: number,
  windowX: number,
  windowY: number,
  sourceColumns = targetColumns,
) {
  const width = Math.max(1, Math.min(source.columns, sourceColumns));
  const height = Math.max(1, Math.min(source.rows, targetRows));
  const maxX = Math.max(0, source.columns - width);
  const maxY = Math.max(0, source.rows - height);
  return {
    width,
    height,
    maxX,
    maxY,
    x: Math.min(maxX, Math.max(0, Math.round(windowX))),
    y: Math.min(maxY, Math.max(0, Math.round(windowY))),
  };
}

/**
 * How many source columns from `grid` can be shown inside `targetColumns`,
 * counting each cell by its real glyph span. The result is the widest window
 * that no row of the source can overflow.
 */
export function windowColumns(
  grid: Grid,
  targetColumns: number,
  rule: TerminalWidthRule,
): number {
  const cache = new Map<string, number>();
  const widthOf = (glyph: string) => {
    const key = glyph;
    const hit = cache.get(key);
    if (hit !== undefined) return hit;
    const w = measure(sanitizeGlyph(glyph), rule);
    cache.set(key, w);
    return w;
  };
  let fit = Math.min(grid.columns, targetColumns);
  for (let y = 0; y < grid.rows && fit > 0; y++) {
    let used = 0;
    let count = 0;
    const offset = y * grid.columns;
    for (let x = 0; x < grid.columns; x++) {
      const w = widthOf(grid.cells[offset + x]!.glyph);
      if (used + w > targetColumns) break;
      used += w;
      count++;
    }
    fit = Math.min(fit, count);
  }
  return Math.max(1, fit);
}

export interface SourceCell {
  glyph: string;
  color: string;
}

export interface PlacedGlyph {
  text: string;
  color: string;
  start: number;
  span: number;
}

export interface PlacedRow {
  text: string;
  glyphs: PlacedGlyph[];
  clipped: number;
  /** Display width the source cells actually filled, excluding padding. */
  used: number;
}

/**
 * Place one source row inside a fixed terminal width.
 *
 * - A color never consumes a column; only the glyph does.
 * - A double-width glyph that would straddle the final column is dropped and
 *   the leftover column is a space, so the host terminal has nothing to wrap.
 * - Combining marks attach to the preceding glyph and add zero columns.
 * - The row is padded to exactly `columns`, keeping its trailing spaces.
 */
export function placeRow(
  cells: SourceCell[],
  columns: number,
  rule: TerminalWidthRule,
  offset = 0,
): PlacedRow {
  let cursor = offset;
  let clipped = 0;
  let text = offset > 0 ? " ".repeat(offset) : "";
  const glyphs: PlacedGlyph[] = [];
  for (const cell of cells) {
    const glyph = sanitizeGlyph(cell.glyph);
    const span = measure(glyph, rule);
    if (span === 0) {
      if (glyphs.length) {
        text += glyph;
        glyphs[glyphs.length - 1]!.text += glyph;
      }
      continue;
    }
    if (cursor + span > columns) {
      clipped++;
      continue;
    }
    glyphs.push({ text: glyph, color: cell.color, start: cursor, span });
    text += glyph;
    cursor += span;
  }
  const used = cursor - offset;
  if (cursor < columns) text += " ".repeat(columns - cursor);
  return { text, glyphs, clipped, used };
}

/** Read a rectangular region out of a grid; out-of-range reads are skipped. */
export function sourceCells(
  grid: Grid,
  read: { x: number; y: number; width: number; height: number },
): SourceCell[][] {
  const rows: SourceCell[][] = [];
  for (let y = 0; y < read.height; y++) {
    const gridY = read.y + y;
    const row: SourceCell[] = [];
    if (gridY >= grid.rows) {
      rows.push(row);
      continue;
    }
    const offset = gridY * grid.columns + read.x;
    for (let x = 0; x < read.width; x++) {
      if (read.x + x >= grid.columns) break;
      const index = offset + x;
      if (index >= grid.cells.length) break;
      row.push({ glyph: grid.cells[index]!.glyph, color: grid.cells[index]!.color });
    }
    rows.push(row);
  }
  return rows;
}

export function layoutFromCells(
  rows: SourceCell[][],
  columns: number,
  rule: TerminalWidthRule,
  mode: TerminalMode,
  source: SampleSize,
  window: {
    x: number;
    y: number;
    width: number;
    height: number;
    maxX: number;
    maxY: number;
  },
  revision: number,
  offset = 0,
): TerminalLayout {
  const rowsText: string[] = [];
  const glyphRows: PlacedGlyph[][] = [];
  let clipped = 0;
  let maxRowWidth = 0;
  for (const row of rows) {
    const placed = placeRow(row, columns, rule, offset);
    rowsText.push(placed.text);
    glyphRows.push(placed.glyphs);
    clipped += placed.clipped;
    maxRowWidth = Math.max(maxRowWidth, placed.used);
  }
  return {
    columns,
    rows: rows.length,
    widthRule: rule,
    mode,
    rowsText,
    glyphRows,
    source,
    window,
    clipped,
    maxRowWidth,
    revision,
  };
}
