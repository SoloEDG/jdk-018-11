import { glyphList } from "../../../shared/safeGlyph";

export const charsets = [
  { id: "standard", name: "经典 ASCII", value: " .:-=+*#%@" },
  { id: "blocks", name: "块状字符", value: " ░▒▓█" },
  { id: "binary", name: "二进制", value: " 01" },
  {
    id: "detail",
    name: "精细阶梯",
    value: " .`^,:;Il!i~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  },
];

/**
 * Glyphs used for tone mapping.
 *
 * Custom input goes through the shared sanitizer first, so a pasted ESC or
 * other control byte becomes visible notation instead of reaching either the
 * HTML preview or the exported terminal file.
 */
export function glyphs(id: string, custom: string): string[] {
  if (id === "custom") {
    const chars = glyphList(custom);
    return chars.length ? chars : [" "];
  }
  const value = charsets.find((c) => c.id === id)?.value ?? charsets[0]!.value;
  const chars = [...new Set(Array.from(value))];
  return chars.length ? chars : [" "];
}
