import type {
  TerminalColor,
  TerminalWidthRule,
} from "../../../shared/document";

export interface TerminalProfile {
  id: string;
  name: string;
  detail: string;
  columns: number;
  rows: number;
  color: TerminalColor;
  widthRule: TerminalWidthRule;
}

export const profiles: TerminalProfile[] = [
  {
    id: "vt100",
    name: "VT100 · 80×24",
    detail: "经典绿字终端 · 16 色 · 窄字符",
    columns: 80,
    rows: 24,
    color: "ansi16",
    widthRule: "narrow",
  },
  {
    id: "xterm",
    name: "xterm-256 · 132×43",
    detail: "256 色 · 东亚双宽",
    columns: 132,
    rows: 43,
    color: "ansi256",
    widthRule: "auto",
  },
  {
    id: "iterm",
    name: "iTerm2 · 190×50",
    detail: "真彩色 · 宽字符规则",
    columns: 190,
    rows: 50,
    color: "truecolor",
    widthRule: "wide",
  },
  {
    id: "mobile",
    name: "移动终端 · 42×22",
    detail: "24 位色 · 窄字符",
    columns: 42,
    rows: 22,
    color: "truecolor",
    widthRule: "narrow",
  },
  {
    id: "tty",
    name: "dumb TTY · 80×24",
    detail: "无颜色 · 纯文本兼容",
    columns: 80,
    rows: 24,
    color: "mono",
    widthRule: "narrow",
  },
];

export const defaultProfile = profiles[1]!;

export function profile(id: string): TerminalProfile {
  return profiles.find((p) => p.id === id) ?? defaultProfile;
}

export const colorNames: Record<TerminalColor, string> = {
  truecolor: "24 位真彩色",
  ansi256: "256 色",
  ansi16: "16 色",
  mono: "无颜色",
};

export const widthRuleNames: Record<TerminalWidthRule, string> = {
  auto: "自动（东亚双宽）",
  narrow: "窄字符（全角算一格）",
  wide: "宽字符（全角算两格）",
};
