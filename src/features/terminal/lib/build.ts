import type { Grid, StudioDocument } from "../../../shared/document";
import { generate } from "../../mapping/model/generate";
import {
  layoutFromCells,
  measure,
  sourceCells,
  spanWidth,
  windowViewport,
  windowColumns,
} from "./layout";
import type { SampleSize, SourceCell } from "./layout";

function cropAspect(doc: StudioDocument): number {
  const asset = doc.asset!;
  const width = Math.max(1, asset.width * doc.crop.width);
  const height = Math.max(1, asset.height * doc.crop.height);
  return width / height;
}

function resample(doc: StudioDocument, size: SampleSize): Grid {
  const grid = generate(doc, size);
  if (!grid) throw new Error("无法生成终端字符网格");
  return grid;
}

function gridRows(grid: Grid): SourceCell[][] {
  return sourceCells(grid, {
    x: 0,
    y: 0,
    width: grid.columns,
    height: grid.rows,
  });
}

/**
 * Display width the whole image should occupy.
 *
 * A character cell is two units tall. To show the image without distortion
 * the rows and columns must relate by `width = 2 * aspect * rows`. Filling the
 * target width may demand more rows than the terminal has; in that case the
 * image is letterboxed at the width those rows allow rather than stretched.
 */
function displayWidth(aspect: number, target: SampleSize): number {
  return Math.max(
    1,
    Math.min(
      target.columns,
      Math.round(2 * Math.max(0.0001, aspect) * target.rows),
    ),
  );
}

/**
 * The fit version must show the whole image, fill as much of the terminal as
 * the aspect allows, and never clip. Glyph spans vary (ASCII is one column,
 * CJK is two), so a fixed column count cannot guarantee the display width;
 * instead the sample is widened or narrowed until its measured span lands on
 * the aspect-derived target.
 */
function fitGridFor(
  doc: StudioDocument,
  aspect: number,
  target: SampleSize,
  rule: StudioDocument["terminal"]["widthRule"],
): { grid: Grid; width: number } {
  const goal = displayWidth(aspect, target);
  const rows = Math.max(
    1,
    Math.min(target.rows, Math.round(goal / (2 * Math.max(0.0001, aspect)))),
  );
  let columns = Math.max(1, Math.min(target.columns, goal));
  let best = resample(doc, { columns, rows });
  let bestWidth = Math.max(...gridRows(best).map((r) => spanWidth(r, rule)), 0);
  for (let attempt = 0; attempt < 7; attempt++) {
    const close = Math.abs(bestWidth - goal) <= Math.max(1, goal * 0.02);
    if (close && bestWidth <= target.columns) break;
    if (bestWidth === 0) break;
    const next = Math.max(
      1,
      Math.min(
        target.columns,
        Math.round(columns * (goal / Math.max(1, bestWidth))),
      ),
    );
    if (next === columns) break;
    columns = next;
    const candidate = resample(doc, { columns, rows });
    const candidateWidth = Math.max(
      ...gridRows(candidate).map((r) => spanWidth(r, rule)),
      0,
    );
    // Never accept a candidate that would overflow the target: the fit version
    // must show the whole image, so clipping is worse than a slightly narrow
    // letterbox.
    if (candidateWidth <= target.columns) {
      const candidateError = Math.abs(candidateWidth - goal);
      const bestError = Math.abs(bestWidth - goal);
      if (candidateError < bestError || (candidateError === bestError && candidateWidth > bestWidth)) {
        best = candidate;
        bestWidth = candidateWidth;
        continue;
      }
    }
    break;
  }
  return { grid: best, width: bestWidth };
}

/**
 * Produce both layout versions from one document state:
 *
 * - `fit` resamples the whole crop to the target width, preserving the
 *   complete image (aspect-aware, never taller than the terminal).
 * - `window` reads the untouched original grid at full character density and
 *   shows a target-sized viewport that can pan over the detail.
 *
 * Both layouts are returned and stored, so switching modes never discards the
 * other version. Both carry the same target, width rule, and revision.
 */
export function buildTerminal(
  doc: StudioDocument,
  previous?: { layouts: StudioDocument["terminalLayouts"]; key: string } | null,
) {
  if (!doc.asset || !doc.grid) return null;
  const settings = doc.terminal;
  const rule = settings.widthRule;
  const target = {
    columns: Math.max(1, Math.floor(settings.columns)),
    rows: Math.max(1, Math.floor(settings.rows)),
  };
  const revision = doc.revision;
  const aspect = cropAspect(doc);

  const fitKey = fitSignature(doc, target, rule);
  // Panning only moves the window origin. Reuse the fit result so a pan does
  // not pay for another round of canvas resampling. The clone keeps the cached
  // layout immutable while stamping the current revision for downstream
  // freshness checks.
  const cachedFit =
    previous && previous.layouts && previous.key === fitKey
      ? { ...previous.layouts.fit, revision }
      : null;
  const fitLayout = cachedFit ?? buildFit(doc, aspect, target, rule, revision);

  const source = { columns: doc.grid.columns, rows: doc.grid.rows };
  const windowCellCount = windowColumns(doc.grid, target.columns, rule);
  const viewport = windowViewport(
    source,
    target.columns,
    target.rows,
    settings.windowX,
    settings.windowY,
    windowCellCount,
  );
  const windowLayout = layoutFromCells(
    sourceCells(doc.grid, {
      x: viewport.x,
      y: viewport.y,
      width: viewport.width,
      height: viewport.height,
    }),
    target.columns,
    rule,
    "window",
    source,
    {
      x: viewport.x,
      y: viewport.y,
      width: viewport.width,
      height: viewport.height,
      maxX: viewport.maxX,
      maxY: viewport.maxY,
    },
    revision,
  );

  return { fit: fitLayout, window: windowLayout, fitKey };
}

/** Everything the fit layout depends on; panning deliberately excluded. */
function fitSignature(
  doc: StudioDocument,
  target: SampleSize,
  rule: StudioDocument["terminal"]["widthRule"],
): string {
  const s = doc.settings;
  const c = doc.crop;
  return [
    target.columns,
    target.rows,
    rule,
    doc.revision,
    c.x,
    c.y,
    c.width,
    c.height,
    s.charset,
    s.custom,
    s.contrast,
    s.gamma,
    s.invert ? 1 : 0,
    s.background,
  ].join("|");
}

function buildFit(
  doc: StudioDocument,
  aspect: number,
  target: SampleSize,
  rule: StudioDocument["terminal"]["widthRule"],
  revision: number,
) {
  const fitResult = fitGridFor(doc, aspect, target, rule);
  const fitGrid = fitResult.grid;
  const fitRows = gridRows(fitGrid);

  // Center the whole-image version in the terminal: blank rows above and below
  // when the image is shorter, and keep only the top when it is taller.
  const fitBody: SourceCell[][] = [];
  const spare = Math.max(0, target.rows - fitRows.length);
  const top = Math.floor(spare / 2);
  const bottom = spare - top;
  for (let i = 0; i < top; i++) fitBody.push([]);
  fitBody.push(...fitRows.slice(0, target.rows));
  for (let i = 0; i < bottom; i++) fitBody.push([]);

  // Center horizontally using the measured width of the fitted image.
  const fitWidth = Math.min(target.columns, fitResult.width);
  const fitOffset = Math.max(0, Math.floor((target.columns - fitWidth) / 2));
  return layoutFromCells(
    fitBody,
    target.columns,
    rule,
    "fit",
    { columns: fitGrid.columns, rows: fitGrid.rows },
    {
      x: 0,
      y: 0,
      width: fitResult.width,
      height: fitBody.length,
      maxX: 0,
      maxY: 0,
    },
    revision,
    fitOffset,
  );
}

/** Re-exported so the UI can describe a layout without importing layout.ts. */
export { measure };
