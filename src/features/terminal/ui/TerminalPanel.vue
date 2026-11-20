<script setup lang="ts">
import { computed } from "vue";
import {
  Terminal,
  Download,
  Copy,
  FileCode2,
  ScanLine,
  Move,
  Undo2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-vue-next";
import { useTerminalExport } from "../model/useTerminalExport";
import { useTerminalLabels } from "../lib/options";
import { bytes } from "../lib/options";
import TerminalSim from "./TerminalSim.vue";
import type { TerminalColor } from "../../../shared/document";

const t = useTerminalExport();
const labels = useTerminalLabels();

const current = computed(() => t.layout.value);
const check = computed(() => t.check.value);
const file = computed(() => t.encoded.value);

function setColor(color: TerminalColor) {
  t.doc.terminal.color = color;
  t.invalidate();
}

function stepColumns(delta: number) {
  t.doc.terminal.columns = Math.max(
    8,
    Math.min(400, t.doc.terminal.columns + delta),
  );
  t.invalidate();
}

const prettyBytes = computed(() => (file.value ? bytes(file.value.bytes) : "—"));

/**
 * The active color's own error is trivially 0 for truecolor, so the summary
 * shows the most demanding limited palette (16 colors) as a reference point.
 * The full table in the versions tab covers every target.
 */
const referenceError = computed(
  () =>
    t.comparison.value.find((row) => row.color === "ansi16")?.error.mean ?? 0,
);

const versions = computed(() => {
  const layouts = t.layouts.value;
  const out = [
    { key: "fit" as const, mode: "fit" as const, label: "整图版", layout: layouts?.fit },
    {
      key: "window" as const,
      mode: "window" as const,
      label: "窗口版",
      layout: layouts?.window,
    },
  ];
  return out.map((v) => {
    const encoded = v.layout ? t.encodeFor(v.layout) : null;
    const meta = !v.layout
      ? "—"
      : v.key === "fit"
        ? `采样 ${v.layout.source.columns}×${v.layout.source.rows}`
        : `取景 x${v.layout.window.x} y${v.layout.window.y}`;
    return { ...v, meta, bytes: encoded?.bytes ?? 0 };
  });
});
</script>
<template>
  <section class="terminal-panel">
    <div class="section-title">
      <span>04 / TERMINAL PUBLISHER</span><Terminal :size="15" />
    </div>

    <div class="term-grid">
      <div class="term-controls">
        <label class="field term-field"
          >目标终端<select
            aria-label="目标终端"
            :value="t.doc.terminal.target"
            @change="t.applyProfile(($event.target as HTMLSelectElement).value)"
          >
            <option v-for="p in t.profiles" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select></label
        >
        <div class="term-note">{{ t.profile(t.doc.terminal.target).detail }}</div>

        <div class="term-dimensions">
          <span class="mono"
            >{{ t.doc.terminal.columns }} 列 × {{ t.doc.terminal.rows }} 行</span
          >
          <span class="term-dim-actions">
            <button
              class="icon-button"
              aria-label="减少列宽"
              @click="stepColumns(-4)"
            >
              − </button
            ><button
              class="icon-button"
              aria-label="增加列宽"
              @click="stepColumns(4)"
            >
              +
            </button>
          </span>
        </div>

        <div class="term-segment" role="group" aria-label="适配方式">
          <button
            v-for="m in labels.modeOptions"
            :key="m.id"
            :class="{ active: t.doc.terminal.mode === m.id }"
            :title="m.note"
            @click="t.setMode(m.id)"
          >
            {{ m.label }}
          </button>
        </div>
        <div class="term-note">
          {{
            t.doc.terminal.mode === "fit"
              ? "整图缩放到目标宽度，布局保存为「整图版」。"
              : "按原密度开窗取景，布局保存为「窗口版」，可平移看细节。"
          }}
        </div>

        <div v-if="t.doc.terminal.mode === 'window'" class="term-pan">
          <div class="term-pan-pad">
            <button
              aria-label="向左平移"
              :disabled="t.windowLimits.value.maxX === 0"
              @click="t.pan(-4, 0)"
            >
              ←</button
            ><button
              aria-label="向上平移"
              :disabled="t.windowLimits.value.maxY === 0"
              @click="t.pan(0, -2)"
            >
              ↑</button
            ><button
              aria-label="向下平移"
              :disabled="t.windowLimits.value.maxY === 0"
              @click="t.pan(0, 2)"
            >
              ↓</button
            ><button
              aria-label="向右平移"
              :disabled="t.windowLimits.value.maxX === 0"
              @click="t.pan(4, 0)"
            >
              →
            </button>
          </div>
          <button class="term-reset" @click="t.resetWindow">
            <Undo2 :size="12" /> 复位
          </button>
          <span class="mono muted"
            >x {{ t.doc.terminal.windowX }} / y {{ t.doc.terminal.windowY }}</span
          >
        </div>
        <div
          v-if="t.doc.terminal.mode === 'window' && t.windowLimits.value.maxX === 0 && t.windowLimits.value.maxY === 0"
          class="term-note"
        >
          原网格完全落在目标窗口内，无需平移。
        </div>

        <label class="field term-field"
          >色彩能力<select
            aria-label="色彩能力"
            :value="t.doc.terminal.color"
            @change="setColor(($event.target as HTMLSelectElement).value as TerminalColor)"
          >
            <option v-for="c in labels.colorOptions" :key="c.id" :value="c.id">
              {{ c.label }} · {{ c.note }}
            </option>
          </select></label
        >

        <label class="field term-field"
          >字符宽度规则<select
            aria-label="字符宽度规则"
            v-model="t.doc.terminal.widthRule"
            @change="t.invalidate()"
          >
            <option
              v-for="w in labels.widthRuleOptions"
              :key="w.id"
              :value="w.id"
            >
              {{ w.label }}
            </option>
          </select></label
        >

        <div class="term-facts">
          <div>
            <small>整图版 · 采样</small>
            <b class="mono"
              >{{ t.layouts.value?.fit.source.columns }} ×
              {{ t.layouts.value?.fit.source.rows }}</b
            >
          </div>
          <div>
            <small>窗口版 · 取景</small>
            <b class="mono"
              >{{ t.layouts.value?.window.window.width }} ×
              {{ t.layouts.value?.window.window.height }}</b
            >
          </div>
          <div>
            <small>输出体积</small>
            <b class="mono">{{ prettyBytes }}</b>
          </div>
          <div>
            <small>色差 ΔE（限色参考）</small>
            <b class="mono">{{ referenceError.toFixed(1) }}</b>
          </div>
        </div>

        <div class="term-actions">
          <button class="primary" :disabled="!file" @click="t.saveTerminal">
            <Download :size="15" /> 下载终端文件</button
          ><button class="secondary" :disabled="!file" @click="t.copyTerminal">
            <Copy :size="14" /> 复制</button
          ><button class="secondary" :disabled="!file" @click="t.saveScript">
            <FileCode2 :size="14" /> .sh
          </button>
        </div>
      </div>

      <div class="term-right">
        <div class="term-tabs">
          <button
            :class="{ active: t.tab.value === 'sim' }"
            @click="t.tab.value = 'sim'"
          >
            <ScanLine :size="13" /> 模拟终端</button
          ><button
            :class="{ active: t.tab.value === 'file' }"
            @click="t.tab.value = 'file'"
          >
            <FileCode2 :size="13" /> 文件内容</button
          ><button
            :class="{ active: t.tab.value === 'studio' }"
            @click="t.tab.value = 'studio'"
          >
            <Move :size="13" /> 版本比较
          </button>
        </div>

        <div v-if="t.tab.value === 'sim'" class="term-stage">
          <TerminalSim
            v-if="current"
            :layout="current"
            :color-mode="t.doc.terminal.color"
            :background="t.doc.settings.background"
          />
          <p v-else class="term-note">正在准备终端布局…</p>
          <div v-if="check" class="term-check" :class="{ ok: check.ok }">
            <CheckCircle2 v-if="check.ok" :size="14" />
            <AlertTriangle v-else :size="14" />
            <span v-if="check.ok"
              >无折行、无裁切，最宽 {{ check.maxWidth }} /
              {{ current?.columns }} 列，样式已复位</span
            >
            <span v-else>{{ check.notes.join("；") }}</span>
          </div>
        </div>

        <div v-else-if="t.tab.value === 'file'" class="term-file">
          <pre data-testid="terminal-file">{{ file?.visible ?? "" }}</pre>
          <div class="term-file-meta mono">
            {{ file?.sequences ?? 0 }} 个控制序列 · {{ prettyBytes }} ·
            去掉序列后 {{ file?.plain.split("\n").length ?? 0 }} 行
          </div>
        </div>

        <div v-else class="term-versions">
          <div class="term-compare-head">
            <span>两个布局版本独立保存，切换目标后同时重算</span>
            <small>整图版保留全图；窗口版按原网格密度取景。</small>
          </div>
          <div class="term-version-grid">
            <div
              v-for="v in versions"
              :key="v.key"
              class="term-version"
              :class="{ active: t.doc.terminal.mode === v.key }"
            >
              <div class="term-version-head">
                <b>{{ v.label }}</b>
                <span class="mono"
                  >{{ v.layout?.columns }}×{{ v.layout?.rows }} ·
                  {{ t.doc.terminal.color === "mono" ? "无色" : "有彩色" }}</span
                >
              </div>
              <TerminalSim
                v-if="v.layout"
                :layout="v.layout"
                :color-mode="t.doc.terminal.color"
                :background="t.doc.settings.background"
              />
              <p v-else class="term-note">尚未生成</p>
              <div class="term-version-foot">
                <span class="mono"
                  >{{ v.meta }} · {{ bytes(v.bytes) }}</span
                >
                <button
                  class="term-apply"
                  :disabled="t.doc.terminal.mode === v.key"
                  @click="t.setMode(v.mode)"
                >
                  {{ t.doc.terminal.mode === v.key ? "当前" : "使用此版" }}
                </button>
              </div>
            </div>
          </div>
          <div class="term-plain">
            <div class="term-note">
              当前版本在四种色彩能力下的色差与体积（同一布局，只换调色板）：
            </div>
            <table class="term-color-table">
              <thead>
                <tr>
                  <th>目标</th>
                  <th>色数</th>
                  <th>ΔE 均值</th>
                  <th>P95</th>
                  <th>体积</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in t.comparison.value"
                  :key="row.color"
                  :class="{ active: row.active }"
                >
                  <td>{{ labels.colorLabel(row.color) }}</td>
                  <td class="mono">{{ row.palette.toLocaleString() }}</td>
                  <td class="mono">{{ row.error.mean.toFixed(2) }}</td>
                  <td class="mono">{{ row.error.p95.toFixed(2) }}</td>
                  <td class="mono">{{ bytes(row.bytes) }}</td>
                  <td>
                    <button
                      class="term-apply"
                      :disabled="row.active"
                      @click="setColor(row.color)"
                    >
                      {{ row.active ? "当前" : "切换" }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="term-plain">
            <div class="term-note">
              当前版本去掉样式序列后的前几行（应与目标确认的网格逐字符一致）：
            </div>
            <pre>{{ check?.plainRows.slice(0, 4).join("\n") }}</pre>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
