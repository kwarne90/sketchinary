<script setup lang="ts">
import {
  ROTATION_LABELS,
  ROTATION_MODES,
  ROUND_SECONDS_OPTIONS,
  TOTAL_ROUNDS_OPTIONS,
  WORD_SET_LABELS,
  WORD_SETS,
  type GameSettings,
} from "#shared";

defineProps<{
  settings: GameSettings;
}>();

const emit = defineEmits<{
  update: [payload: Partial<GameSettings>];
}>();
</script>

<template>
  <div class="space-y-1">
    <div class="flex items-center gap-2 px-1.5 py-1">
      <span class="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink/40">Time</span>
      <div class="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
        <button
          v-for="seconds in ROUND_SECONDS_OPTIONS"
          :key="seconds"
          type="button"
          class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="settings.roundSeconds === seconds ? 'bg-coral text-white' : 'text-ink hover:bg-ink/5'"
          @click="emit('update', { roundSeconds: seconds })"
        >
          {{ seconds / 60 }}m
        </button>
      </div>
    </div>
    <div class="flex items-center gap-2 px-1.5 py-1">
      <span class="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink/40">Rounds</span>
      <div class="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
        <button
          v-for="rounds in TOTAL_ROUNDS_OPTIONS"
          :key="rounds"
          type="button"
          class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="settings.totalRounds === rounds ? 'bg-coral text-white' : 'text-ink hover:bg-ink/5'"
          @click="emit('update', { totalRounds: rounds })"
        >
          {{ rounds === 0 ? "∞" : rounds }}
        </button>
      </div>
    </div>
    <div class="flex items-start gap-2 px-1.5 py-1">
      <span class="mt-1.5 w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink/40">Words</span>
      <div class="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
        <button
          v-for="set in WORD_SETS"
          :key="set"
          type="button"
          class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="settings.wordSet === set ? 'bg-coral text-white' : 'text-ink hover:bg-ink/5'"
          :title="set === 'movies' ? 'Movies & shows' : undefined"
          @click="emit('update', { wordSet: set })"
        >
          {{ WORD_SET_LABELS[set] }}
        </button>
      </div>
    </div>
    <div class="flex items-center gap-2 px-1.5 py-1">
      <span class="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink/40">Next</span>
      <div class="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
        <button
          v-for="mode in ROTATION_MODES"
          :key="mode"
          type="button"
          class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
          :class="settings.rotation === mode ? 'bg-coral text-white' : 'text-ink hover:bg-ink/5'"
          @click="emit('update', { rotation: mode })"
        >
          {{ ROTATION_LABELS[mode] }}
        </button>
      </div>
    </div>
  </div>
</template>
