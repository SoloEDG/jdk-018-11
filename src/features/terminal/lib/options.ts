import { computed } from "vue";
import type {
  TerminalColor,
  TerminalMode,
  TerminalWidthRule,
} from "../../../shared/document";

export const colorOptions: { id: TerminalColor; label: string; note: string }[] =
  [
    { id: "truecolor", label: "24 位真彩色", note: "每格独立 RGB" },
    { id: "ansi256", label: "256 色", note: "xterm 调色板" },
    { id: "ansi16", label: "16 色", note: "经典终端色" },
    { id: "mono", label: "无颜色", note: "纯文本" },
  ];

export const modeOptions: { id: TerminalMode; label: string; note: string }[] = [
  { id: "fit", label: "整图重采样", note: "缩放到目标宽度，保留全图" },
  { id: "window", label: "窗口平移", note: "原网格 1:1 取景，可移动查看细节" },
];

export const widthRuleOptions: {
  id: TerminalWidthRule;
  label: string;
}[] = [
  { id: "auto", label: "自动（东亚双宽）" },
  { id: "narrow", label: "窄字符（全角算一格）" },
  { id: "wide", label: "宽字符（全角算两格）" },
];

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function useTerminalLabels() {
  return {
    colorOptions,
    modeOptions,
    widthRuleOptions,
    percent,
    bytes,
    colorLabel: (c: TerminalColor) =>
      colorOptions.find((o) => o.id === c)?.label ?? c,
    modeLabel: (m: TerminalMode) =>
      modeOptions.find((o) => o.id === m)?.label ?? m,
  };
}
