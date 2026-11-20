export interface Crop {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface Asset {
  name: string;
  url: string;
  width: number;
  height: number;
  image: HTMLImageElement;
}
export interface Settings {
  columns: number;
  charset: string;
  custom: string;
  contrast: number;
  gamma: number;
  invert: boolean;
  color: boolean;
  background: string;
}
export type TerminalColor = "truecolor" | "ansi256" | "ansi16" | "mono";
export type TerminalWidthRule = "auto" | "narrow" | "wide";
export type TerminalMode = "fit" | "window";
export interface TerminalSettings {
  target: string;
  columns: number;
  rows: number;
  color: TerminalColor;
  widthRule: TerminalWidthRule;
  mode: TerminalMode;
  windowX: number;
  windowY: number;
}
export interface Cell {
  glyph: string;
  color: string;
}
export interface Grid {
  columns: number;
  rows: number;
  cells: Cell[];
  revision: number;
}
export interface TerminalGlyph {
  /** Text as written into the file, already control-escaped. */
  text: string;
  color: string;
  /** Zero-based column where the glyph starts. */
  start: number;
  /** Display columns the glyph advances. */
  span: number;
}
export interface TerminalWindow {
  x: number;
  y: number;
  width: number;
  height: number;
  maxX: number;
  maxY: number;
}
export interface TerminalLayout {
  columns: number;
  rows: number;
  widthRule: TerminalWidthRule;
  mode: TerminalMode;
  /** One string per row, each exactly `columns` display columns wide. */
  rowsText: string[];
  glyphRows: TerminalGlyph[][];
  source: { columns: number; rows: number };
  window: TerminalWindow;
  /** Glyphs dropped because they would straddle the target's last column. */
  clipped: number;
  maxRowWidth: number;
  revision: number;
}
export interface TerminalLayouts {
  fit: TerminalLayout;
  window: TerminalLayout;
  /** Signature of the fit inputs; panning reuses the fit layout when equal. */
  fitKey: string;
}
export interface StudioDocument {
  asset: Asset | null;
  crop: Crop;
  settings: Settings;
  grid: Grid | null;
  terminal: TerminalSettings;
  terminalLayouts: TerminalLayouts | null;
  revision: number;
}
