<script setup lang="ts">
import type { Guess, Player } from "#shared";

const props = defineProps<{
  players: Player[];
  radius: number;
  guesses: Guess[];
  sketcherId: string | null;
}>();

const now = ref(Date.now());
const angle = ref(0);
let timer: number | undefined;
let raf = 0;

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now();
  }, 250);
  const tick = (t: number) => {
    angle.value = (t / 1000) * 0.35;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
});
onUnmounted(() => {
  if (timer) clearInterval(timer);
  cancelAnimationFrame(raf);
});

const bubbles = computed(() => {
  const latest = new Map<string, Guess>();
  for (const guess of props.guesses) {
    if (now.value - guess.at < 4200) latest.set(guess.playerId, guess);
  }
  return latest;
});

function styleFor(index: number, total: number) {
  const start = total ? (index / total) * Math.PI * 2 : 0;
  const theta = start + angle.value;
  const r = props.radius + 58;
  return {
    transform: `translate(-50%, -50%) translate(${Math.cos(theta) * r}px, ${Math.sin(theta) * r}px)`,
  };
}
</script>

<template>
  <div class="pointer-events-none absolute inset-0">
    <div
      v-for="(player, index) in players"
      :key="player.id"
      class="absolute left-1/2 top-1/2"
      :style="styleFor(index, players.length)"
    >
      <div class="flex flex-col items-center">
        <div
          v-if="bubbles.get(player.id)"
          class="mb-1 max-w-[140px] rounded-2xl px-3 py-1.5 text-center text-sm font-medium shadow-bubble"
          :class="
            bubbles.get(player.id)?.correct
              ? 'bg-teal text-ink'
              : 'bg-paper text-ink'
          "
        >
          {{
            bubbles.get(player.id)?.correct
              ? "Got it!"
              : bubbles.get(player.id)?.text
          }}
        </div>
        <div
          class="rounded-full bg-paper p-1"
          :class="
            player.id === sketcherId
              ? 'ring-4 ring-coral'
              : player.connected
                ? ''
                : 'opacity-50'
          "
        >
          <BlobAvatar :name="player.name" :avatar="player.avatar" :size="58" />
        </div>
        <p class="mt-1 rounded-full bg-ink/80 px-2 py-0.5 text-xs font-medium text-white">
          {{ player.name }}
          <span v-if="player.score" class="text-teal"> {{ player.score }}</span>
        </p>
      </div>
    </div>
  </div>
</template>
