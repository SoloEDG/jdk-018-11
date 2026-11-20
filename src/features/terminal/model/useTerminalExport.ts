import { useTerminal } from "../model/useTerminal";
import { download, exportName } from "../../export/lib/download";

export function useTerminalExport() {
  const t = useTerminal();

  function fileStem() {
    return t.doc.asset?.name ?? "art";
  }

  function saveTerminal() {
    const encoded = t.encoded.value;
    if (!encoded) return;
    download(
      new Blob([encoded.text], { type: "text/plain;charset=utf-8" }),
      exportName(fileStem(), "ansi.txt"),
    );
    const ok = t.check.value?.ok;
    t.notice.value = ok
      ? `${t.doc.terminal.mode === "fit" ? "整图" : "窗口"}版本已导出，与确认网格一致`
      : "已导出，但模拟终端仍标记了问题";
  }

  async function copyTerminal() {
    const encoded = t.encoded.value;
    if (!encoded) return;
    try {
      await navigator.clipboard.writeText(encoded.text);
      t.notice.value = "终端文本已复制（含颜色序列）";
    } catch {
      t.notice.value = "无法访问剪贴板，请使用下载";
    }
  }

  function saveScript() {
    const encoded = t.encoded.value;
    if (!encoded) return;
    const script = `#!/bin/sh\n# GLYPH terminal art — ${t.layout.value?.columns}×${t.layout.value?.rows}\ncat <<'GLYPH_ART'\n${encoded.text}GLYPH_ART\n`;
    download(
      new Blob([script], { type: "text/x-shellscript;charset=utf-8" }),
      exportName(fileStem(), "sh"),
    );
    t.notice.value = "终端脚本已导出";
  }

  return { ...t, saveTerminal, copyTerminal, saveScript };
}
