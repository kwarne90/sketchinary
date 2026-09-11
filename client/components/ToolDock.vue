<script setup lang="ts">
import { Eraser, Trash, Undo2 } from "@lucide/vue";
import { DRAW_COLORS, STROKE_WIDTHS } from "#shared";

const color = defineModel<(typeof DRAW_COLORS)[number]>("color", {
  required: true,
});
const width = defineModel<(typeof STROKE_WIDTHS)[number]>("width", {
  required: true,
});
const mode = defineModel<"draw" | "erase">("mode", {
  required: true,
});

defineEmits<{
  undo: [];
  clear: [];
}>();
</script>

<template>
  <div
    class="flex w-full items-center justify-center gap-1 rounded-full border-4 border-ink/10 bg-paper px-2 py-2 shadow-chunk md:w-[min(92vw,560px)] md:gap-1.5 md:px-4 md:py-2.5"
  >
    <button
      v-for="swatch in DRAW_COLORS"
      :key="swatch"
      class="h-8 w-8 rounded-full md:h-9 md:w-9"
      :style="{
        background: swatch,
        boxShadow:
          color === swatch && mode === 'draw'
            ? `0 0 0 2px #fff8ee, 0 0 0 4px ${swatch}`
            : '0 0 0 2px #fff8ee, 0 0 0 4px transparent',
      }"
      :aria-label="`Color ${swatch}`"
      @click="((color = swatch), (mode = 'draw'))"
    />
    <button
      v-for="size in STROKE_WIDTHS"
      :key="size"
      class="flex h-9 w-9 items-center justify-center rounded-full md:h-10 md:w-10"
      :class="width === size ? 'bg-cream' : ''"
      :aria-label="`Width ${size}`"
      @click="width = size"
    >
      <span
        class="rounded-full bg-ink"
        :style="{ width: `${size}px`, height: `${size}px` }"
      />
    </button>
    <button
      class="ml-0.5 flex h-9 w-9 items-center justify-center rounded-full md:h-10 md:w-10"
      :class="mode === 'erase' ? 'bg-cream text-coral' : 'text-ink'"
      aria-label="Erase"
      title="Erase"
      @click="mode = mode === 'erase' ? 'draw' : 'erase'"
    >
      <Eraser :size="18" :stroke-width="2.4" />
    </button>
    <button
      class="flex h-9 w-9 items-center justify-center rounded-full text-ink md:h-10 md:w-10"
      aria-label="Undo"
      title="Undo"
      @click="$emit('undo')"
    >
      <Undo2 :size="18" :stroke-width="2.4" />
    </button>
    <button
      class="flex h-9 w-9 items-center justify-center rounded-full text-ink md:h-10 md:w-10"
      aria-label="Clear"
      title="Clear"
      @click="$emit('clear')"
    >
      <Trash :size="18" :stroke-width="2.4" />
    </button>
  </div>
</template>
