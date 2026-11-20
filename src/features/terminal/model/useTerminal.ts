import { computed, ref } from "vue";
import { useStudio } from "../../../shared/useStudio";
import { encodeTerminal } from "../lib/encode";
import { colorError, paletteSize } from "../lib/metrics";
import { profile, profiles } from "../lib/profiles";
import { verify } from "../lib/simulate";
import { windowViewport, windowColumns } from "../lib/layout";
import type {
  TerminalColor,
  TerminalLayout,
  TerminalMode,
} from "../../../shared/document";

export function useTerminal() {
  const { doc, busy, notice, invalidate } = useStudio();
  const tab = ref<"studio" | "file" | "sim">("sim");
  const mode = computed<TerminalMode>({
    get: () => doc.terminal.mode,
    set: (value) => {
      doc.terminal.mode = value;
    },
  });

  const layouts = computed(() => doc.terminalLayouts);

  function applyProfile(id: string) {
    const p = profile(id);
    doc.terminal.target = p.id;
    doc.terminal.columns = p.columns;
    doc.terminal.rows = p.rows;
    doc.terminal.color = p.color;
    doc.terminal.widthRule = p.widthRule;
    doc.terminal.windowX = 0;
    doc.terminal.windowY = 0;
  }

  function setMode(next: TerminalMode) {
    doc.terminal.mode = next;
    invalidate();
  }

  function encodeFor(layout: TerminalLayout) {
    return encodeTerminal(layout, doc.terminal.color);
  }

  const layout = computed(() =>
    layouts.value ? layouts.value[doc.terminal.mode] : null,
  );

  const encoded = computed(() => {
    if (!layout.value) return null;
    return encodeTerminal(layout.value, doc.terminal.color);
  });

  const check = computed(() => {
    if (!layout.value || !encoded.value) return null;
    return verify(encoded.value.text, layout.value, doc.terminal.color);
  });

  const stats = computed(() => {
    if (!layout.value) return null;
    return colorError(layout.value, doc.terminal.color);
  });

  const comparison = computed(() => {
    const layoutFor = layout.value;
    return (["truecolor", "ansi256", "ansi16", "mono"] as TerminalColor[]).map(
      (color) => {
        const error = layoutFor
          ? colorError(layoutFor, color)
          : { mean: 0, p95: 0, max: 0, samples: 0 };
        const bytes = layoutFor ? encodeTerminal(layoutFor, color).bytes : 0;
        return {
          color,
          active: color === doc.terminal.color,
          palette: paletteSize(color),
          error,
          bytes,
        };
      },
    );
  });

  const windowLimits = computed(() => {
    if (!doc.grid) return { maxX: 0, maxY: 0 };
    const windowCellCount = windowColumns(
      doc.grid,
      Math.max(1, Math.floor(doc.terminal.columns)),
      doc.terminal.widthRule,
    );
    return windowViewport(
      { columns: doc.grid.columns, rows: doc.grid.rows },
      doc.terminal.columns,
      doc.terminal.rows,
      doc.terminal.windowX,
      doc.terminal.windowY,
      windowCellCount,
    );
  });

  function pan(dx: number, dy: number) {
    if (!doc.grid) return;
    const limits = windowLimits.value;
    doc.terminal.windowX = Math.max(
      0,
      Math.min(limits.maxX, doc.terminal.windowX + dx),
    );
    doc.terminal.windowY = Math.max(
      0,
      Math.min(limits.maxY, doc.terminal.windowY + dy),
    );
    invalidate();
  }

  function resetWindow() {
    doc.terminal.windowX = 0;
    doc.terminal.windowY = 0;
    invalidate();
  }

  return {
    doc,
    busy,
    notice,
    tab,
    mode,
    layouts,
    layout,
    encoded,
    check,
    stats,
    comparison,
    profiles,
    profile,
    windowLimits,
    applyProfile,
    setMode,
    encodeFor,
    pan,
    resetWindow,
    invalidate,
  };
}
