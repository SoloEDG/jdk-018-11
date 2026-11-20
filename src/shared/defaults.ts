import type { StudioDocument } from "./document";
import { defaultProfile } from "../features/terminal/lib/profiles";
export function createDocument(): StudioDocument {
  return {
    asset: null,
    crop: { x: 0, y: 0, width: 1, height: 1 },
    settings: {
      columns: 100,
      charset: "standard",
      custom: " .:-=+*#%@",
      contrast: 1,
      gamma: 1,
      invert: false,
      color: true,
      background: "#101216",
    },
    grid: null,
    terminal: {
      target: defaultProfile.id,
      columns: defaultProfile.columns,
      rows: defaultProfile.rows,
      color: defaultProfile.color,
      widthRule: defaultProfile.widthRule,
      mode: "fit",
      windowX: 0,
      windowY: 0,
    },
    terminalLayouts: null,
    revision: 0,
  };
}
