<script setup lang="ts">
import { computed } from "vue";
import type { TerminalLayout } from "../../../shared/document";
import { quantizedColor } from "../lib/color";
import { colorNames } from "../lib/profiles";
import type { TerminalColor } from "../../../shared/document";

const props = defineProps<{
  layout: TerminalLayout;
  colorMode: TerminalColor;
  background: string;
}>();

interface ColoredCell {
  text: string;
  color: string;
  /** Head of a double-width glyph: the cell itself spans two columns. */
  wide: boolean;
  /** Second column of a double-width glyph; draws nothing of its own. */
  tail: boolean;
}

const rows = computed<ColoredCell[][]>(() =>
  props.layout.glyphRows.map((row) => {
    const cells: ColoredCell[] = Array.from(
      { length: props.layout.columns },
      () => ({ text: " ", color: "", wide: false, tail: false }),
    );
    for (const glyph of row) {
      const color = quantizedColor(glyph.color, props.colorMode);
      cells[glyph.start] = {
        text: glyph.text,
        color,
        wide: glyph.span === 2,
        tail: false,
      };
      if (glyph.span === 2) {
        cells[glyph.start + 1] = {
          text: "",
          color,
          wide: false,
          tail: true,
        };
      }
    }
    return cells;
  }),
);

const rowHeight = 15;
const charWidth = 8;

const screenHeight = computed(
  () => Math.max(props.layout.rows, 6) * rowHeight + 8,
);
</script>
<template>
  <div class="term-sim" :style="{ background }">
    <div class="term-sim-head">
      <span class="term-dots"><i /><i /><i /></span>
      <span class="term-title"
        >{{ layout.columns }}×{{ layout.rows }} · {{ colorNames[colorMode] }}</span
      >
      <span class="term-margin">右边界 {{ layout.columns }} 列</span>
    </div>
    <div class="term-sim-scroll">
      <div
        class="term-screen"
        :style="{
          width: layout.columns * charWidth + 'px',
          minHeight: screenHeight + 'px',
          '--tw': charWidth + 'px',
          '--th': rowHeight + 'px',
        }"
      >
        <div class="term-margin-line" :aria-hidden="true" />
        <div
          v-for="(row, y) in rows"
          :key="y"
          class="term-row"
          :data-row="y"
        >
          <span
            v-for="(cell, x) in row"
            :key="x"
            :class="{ head: cell.wide, tail: cell.tail }"
            :style="{
              color: cell.color || undefined,
              width: cell.tail ? '0px' : (cell.wide ? charWidth * 2 : charWidth) + 'px',
            }"
            >{{ cell.text }}</span
          >
        </div>
        <div
          v-if="layout.rows < 1"
          class="term-empty"
          :style="{ width: layout.columns * charWidth + 'px' }"
          >目标宽度下没有可显示的字符</div
        >
      </div>
    </div>
  </div>
</template>
