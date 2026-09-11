<script setup lang="ts">
import {
  DRAW_COLORS,
  ROUND_SECONDS_OPTIONS,
  STROKE_WIDTHS,
  TOTAL_ROUNDS_OPTIONS,
  type ClientSnapshot,
  type Guess,
} from "#shared";

const props = defineProps<{
  state: ClientSnapshot;
  liveGuesses: Guess[];
  shareUrl: string;
}>();

const emit = defineEmits<{
  start: [];
  playAgain: [];
  updateSettings: [payload: { roundSeconds?: number; totalRounds?: number }];
  strokeStart: [stroke: import("#shared").Stroke];
  strokeAdd: [id: string, points: import("#shared").Point[]];
  undo: [];
  clear: [];
  guess: [text: string];
}>();

const circle = ref(320);
const color = ref<(typeof DRAW_COLORS)[number]>(DRAW_COLORS[0]);
const width = ref<(typeof STROKE_WIDTHS)[number]>(8);
const mode = ref<"draw" | "erase">("draw");
const guess = ref("");
const remaining = ref(0);

const isHost = computed(() => props.state.hostId === props.state.you);
const isSketcher = computed(
  () =>
    props.state.phase === "drawing" &&
    props.state.sketcherId === props.state.you,
);
const connectedCount = computed(
  () => props.state.players.filter((p) => p.connected).length,
);
const winner = computed(() =>
  props.state.players.find((p) => p.id === props.state.winnerId),
);
const ranked = computed(() =>
  [...props.state.players].sort((a, b) => b.score - a.score),
);
const sketcher = computed(() =>
  props.state.players.find((p) => p.id === props.state.sketcherId),
);

function measure() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  circle.value = Math.round(Math.min(w, h) * 0.65);
}

function tick() {
  if (!props.state.endsAt) {
    remaining.value = 0;
    return;
  }
  remaining.value = Math.max(0, Math.ceil((props.state.endsAt - Date.now()) / 1000));
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function submitGuess() {
  const text = guess.value.trim();
  if (!text) return;
  emit("guess", text);
  guess.value = "";
}

let interval: number | undefined;
onMounted(() => {
  measure();
  tick();
  window.addEventListener("resize", measure);
  interval = window.setInterval(tick, 200);
});
onUnmounted(() => {
  window.removeEventListener("resize", measure);
  if (interval) clearInterval(interval);
});
watch(() => props.state.endsAt, tick);
</script>

<template>
  <div class="relative h-full">
    <header class="pointer-events-auto absolute left-4 top-4 z-20 flex items-center gap-2">
      <p class="rounded-full bg-paper px-3 py-1 text-sm font-semibold shadow-bubble">
        {{ state.code }}
      </p>
      <ShareButton :url="shareUrl" />
    </header>

    <div
      v-if="state.phase === 'lobby' && isHost"
      class="absolute right-4 top-4 z-20 flex flex-col items-end gap-2"
    >
      <div class="flex gap-1 rounded-full bg-paper p-1 shadow-bubble">
        <button
          v-for="seconds in ROUND_SECONDS_OPTIONS"
          :key="seconds"
          class="rounded-full px-3 py-1 text-sm font-semibold"
          :class="
            state.settings.roundSeconds === seconds
              ? 'bg-coral text-white'
              : 'text-ink'
          "
          @click="emit('updateSettings', { roundSeconds: seconds })"
        >
          {{ seconds / 60 }}m
        </button>
      </div>
      <div class="flex gap-1 rounded-full bg-paper p-1 shadow-bubble">
        <button
          v-for="rounds in TOTAL_ROUNDS_OPTIONS"
          :key="rounds"
          class="rounded-full px-3 py-1 text-sm font-semibold"
          :class="
            state.settings.totalRounds === rounds
              ? 'bg-coral text-white'
              : 'text-ink'
          "
          @click="emit('updateSettings', { totalRounds: rounds })"
        >
          {{ rounds }} rds
        </button>
      </div>
    </div>

    <p
      v-else
      class="absolute right-4 top-4 z-20 rounded-full bg-paper px-3 py-1 text-sm font-semibold shadow-bubble"
    >
      {{ state.settings.roundSeconds / 60 }}m · {{ state.settings.totalRounds }} rounds
    </p>

    <div class="absolute inset-0 flex items-center justify-center">
      <AvatarOrbit
        :players="state.players"
        :radius="circle / 2"
        :guesses="[...state.guesses, ...liveGuesses]"
        :sketcher-id="state.sketcherId"
      />

      <div
        class="relative"
        :style="{ width: `${circle}px`, height: `${circle}px` }"
      >
        <div class="absolute inset-0 overflow-hidden rounded-full bg-paper shadow-chunk">
          <SketchCanvas
            v-if="state.phase === 'drawing' || state.phase === 'reveal'"
            :strokes="state.strokes"
            :interactive="isSketcher"
            :color="color"
            :width="width"
            :mode="mode"
            @start="emit('strokeStart', $event)"
            @add="(id, points) => emit('strokeAdd', id, points)"
          />

          <div
            v-if="state.phase === 'lobby'"
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center"
          >
            <p class="text-ink/60">
              {{ connectedCount }} player{{ connectedCount === 1 ? "" : "s" }} in the circle
            </p>
            <button
              class="rounded-full bg-coral px-10 py-4 text-3xl font-semibold text-white shadow-chunk hover:-translate-y-0.5 disabled:opacity-40"
              :disabled="connectedCount < 2"
              @click="emit('start')"
            >
              Start
            </button>
            <p v-if="connectedCount < 2" class="text-sm text-ink/50">
              Need at least 2 players
            </p>
          </div>

          <div
            v-if="state.phase === 'ended'"
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center"
          >
            <p class="text-sm font-semibold uppercase tracking-widest text-coral">
              Winner
            </p>
            <p class="text-3xl font-semibold">
              {{ winner?.name || "Nobody" }}
            </p>
            <ul class="max-h-40 space-y-1 overflow-auto text-sm">
              <li v-for="player in ranked" :key="player.id">
                {{ player.name }} · {{ player.score }}
              </li>
            </ul>
            <button
              class="rounded-full bg-coral px-8 py-3 text-lg font-semibold text-white shadow-chunk"
              @click="emit('playAgain')"
            >
              Play again
            </button>
          </div>

          <div
            v-if="state.phase === 'reveal'"
            class="absolute inset-0 flex flex-col items-center justify-center bg-paper/80 p-6 text-center"
          >
            <p class="text-sm font-semibold uppercase tracking-widest text-coral">
              {{ state.revealReason === "guess" ? "Guessed!" : "Time's up" }}
            </p>
            <p class="mt-2 text-3xl font-semibold">{{ state.word }}</p>
          </div>
        </div>

        <div
          v-if="state.phase === 'drawing' && remaining"
          class="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-white"
        >
          {{ formatTime(remaining) }}
          <span class="ml-2 text-white/60">{{ state.roundIndex }}/{{ state.settings.totalRounds }}</span>
        </div>

        <div
          v-if="isSketcher && state.word"
          class="pointer-events-none absolute left-1/2 top-12 z-10 -translate-x-1/2 rounded-2xl bg-coral px-4 py-2 text-lg font-semibold text-white shadow-bubble"
        >
          {{ state.word }}
        </div>

        <div
          v-if="state.phase === 'drawing' && !isSketcher"
          class="pointer-events-none absolute left-1/2 top-12 z-10 -translate-x-1/2 rounded-2xl bg-ink/80 px-4 py-2 text-sm font-medium text-white"
        >
          {{ sketcher?.name }} is sketching
        </div>

        <div
          v-if="isSketcher"
          class="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-paper p-1.5 shadow-bubble"
        >
          <button
            v-for="swatch in DRAW_COLORS"
            :key="swatch"
            class="h-7 w-7 rounded-full border-2"
            :class="color === swatch && mode === 'draw' ? 'border-ink' : 'border-transparent'"
            :style="{ background: swatch }"
            @click="((color = swatch), (mode = 'draw'))"
          />
          <button
            v-for="size in STROKE_WIDTHS"
            :key="size"
            class="flex h-7 w-7 items-center justify-center rounded-full"
            :class="width === size ? 'bg-cream' : ''"
            @click="width = size"
          >
            <span
              class="rounded-full bg-ink"
              :style="{ width: `${size}px`, height: `${size}px` }"
            />
          </button>
          <button
            class="rounded-full px-2 py-1 text-xs font-semibold"
            :class="mode === 'erase' ? 'bg-cream' : ''"
            @click="mode = mode === 'erase' ? 'draw' : 'erase'"
          >
            Erase
          </button>
          <button class="rounded-full px-2 py-1 text-xs font-semibold" @click="emit('undo')">
            Undo
          </button>
          <button class="rounded-full px-2 py-1 text-xs font-semibold" @click="emit('clear')">
            Clear
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="state.phase === 'drawing' && !isSketcher"
      class="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
    >
      <GuessBar v-model="guess" @submit="submitGuess" />
    </div>
  </div>
</template>
