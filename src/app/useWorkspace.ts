import { reactive, ref, provide, watch } from "vue";
import { createDocument } from "../shared/defaults";
import { studioKey } from "../shared/context";
import { generate } from "../features/mapping";
import { buildTerminal } from "../features/terminal/lib/build";
export function useWorkspace() {
  const doc = reactive(createDocument());
  const busy = ref(false),
    notice = ref("所有处理均在你的浏览器中完成");
  let timer: ReturnType<typeof setTimeout>;
  function build() {
    try {
      doc.grid = generate(doc);
      // The terminal layouts are always rebuilt from the same revision as the
      // grid, so target sampling, layout, simulator, and downloads stay in
      // step with one another. The fit half is reused when only the window
      // origin moved, which keeps panning responsive.
      const previous = doc.terminalLayouts
        ? { layouts: doc.terminalLayouts, key: doc.terminalLayouts.fitKey }
        : null;
      doc.terminalLayouts = buildTerminal(doc, previous);
    } catch (e) {
      notice.value = e instanceof Error ? e.message : "生成失败";
    }
  }
  function invalidate() {
    doc.revision++;
    busy.value = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        build();
      } finally {
        busy.value = false;
      }
    }, 60);
  }
  watch(
    () => doc.settings.background,
    () => invalidate(),
  );
  watch(
    () => [
      doc.terminal.target,
      doc.terminal.columns,
      doc.terminal.rows,
      doc.terminal.color,
      doc.terminal.widthRule,
    ],
    () => invalidate(),
  );
  // Panning changes only the window layout; a full rebuild keeps both layouts
  // and the file in sync and is cheap relative to debounce.
  watch(
    () => [doc.terminal.mode, doc.terminal.windowX, doc.terminal.windowY],
    () => invalidate(),
  );
  provide(studioKey, { doc, busy, notice, invalidate });
  return { doc, busy, notice };
}
