<script setup lang="ts">
import {
  DRAW_COLORS,
  ROUND_SECONDS_OPTIONS,
  STROKE_WIDTHS,
  TOTAL_ROUNDS_OPTIONS,
  type ClientSnapshot,
  type Emote,
  type Guess,
} from "#shared";

const props = defineProps<{
  state: ClientSnapshot;
  liveGuesses: Guess[];
  liveEmotes: Emote[];
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
  setAvatar: [avatar: number];
  poke: [toId: string];
}>();

const board = ref(320);
const isMobile = ref(false);
const color = ref<(typeof DRAW_COLORS)[number]>(DRAW_COLORS[0]);
const width = ref<(typeof STROKE_WIDTHS)[number]>(8);
const mode = ref<"draw" | "erase">("draw");
const guess = ref("");
const remaining = ref(0);
const settingsOpen = ref(false);
const pickerOpen = ref(false);

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
const me = computed(() =>
  props.state.players.find((p) => p.id === props.state.you),
);
const allGuesses = computed(() => [...props.state.guesses, ...props.liveGuesses]);

function measure() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  isMobile.value = w < 768;
  if (isMobile.value) {
    board.value = Math.round(Math.min(w - 20, h * 0.5, 420));
  } else {
    board.value = Math.round(Math.min(w, h) * 0.58);
  }
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

function onKey(event: KeyboardEvent) {
  if (!(event.metaKey || event.ctrlKey)) return;
  if (event.key.toLowerCase() !== "z" || event.shiftKey) return;
  const target = event.target as HTMLElement | null;
  if (target?.closest("input, textarea, select, [contenteditable]")) return;
  if (!isSketcher.value) return;
  event.preventDefault();
  emit("undo");
}

let interval: number | undefined;
onMounted(() => {
  measure();
  tick();
  window.addEventListener("resize", measure);
  window.addEventListener("keydown", onKey);
  interval = window.setInterval(tick, 200);
});
onUnmounted(() => {
  window.removeEventListener("resize", measure);
  window.removeEventListener("keydown", onKey);
  if (interval) clearInterval(interval);
});
watch(() => props.state.endsAt, tick);
</script>

<template>
  <div class="relative flex h-full flex-col md:block">
    <header
      class="pointer-events-auto z-30 flex items-center justify-between gap-2 px-3 pb-1 pt-[max(10px,env(safe-area-inset-top))] md:absolute md:left-4 md:right-4 md:top-4 md:px-0 md:pt-0"
    >
      <div class="flex items-center gap-2">
        <p class="rounded-full bg-paper px-3 py-1 text-sm font-semibold shadow-bubble">
          {{ state.code }}
        </p>
        <ShareButton :url="shareUrl" />
      </div>
      <div class="relative flex flex-col items-end gap-1">
        <button
          v-if="isHost && state.phase !== 'lobby'"
          type="button"
          class="rounded-full bg-paper px-3 py-1 text-xs font-semibold shadow-bubble sm:text-sm"
          @click="settingsOpen = !settingsOpen"
        >
          {{ state.settings.roundSeconds / 60 }}m · {{ state.settings.totalRounds }} rounds
        </button>
        <p
          v-else-if="!(state.phase === 'lobby' && isHost)"
          class="rounded-full bg-paper px-3 py-1 text-xs font-semibold shadow-bubble sm:text-sm"
        >
          {{ state.settings.roundSeconds / 60 }}m · {{ state.settings.totalRounds }} rounds
        </p>
        <div
          v-if="isHost && (state.phase === 'lobby' || settingsOpen)"
          class="flex flex-col items-end gap-1"
        >
          <div class="flex gap-1 rounded-full bg-paper p-1 shadow-bubble">
            <button
              v-for="seconds in ROUND_SECONDS_OPTIONS"
              :key="seconds"
              class="rounded-full px-2 py-1 text-xs font-semibold sm:px-3 sm:text-sm"
              :class="state.settings.roundSeconds === seconds ? 'bg-coral text-white' : 'text-ink'"
              @click="emit('updateSettings', { roundSeconds: seconds })"
            >
              {{ seconds / 60 }}m
            </button>
          </div>
          <div class="flex gap-1 rounded-full bg-paper p-1 shadow-bubble">
            <button
              v-for="rounds in TOTAL_ROUNDS_OPTIONS"
              :key="rounds"
              class="rounded-full px-2 py-1 text-xs font-semibold sm:px-3 sm:text-sm"
              :class="state.settings.totalRounds === rounds ? 'bg-coral text-white' : 'text-ink'"
              @click="emit('updateSettings', { totalRounds: rounds })"
            >
              {{ rounds }} rds
            </button>
          </div>
        </div>
      </div>
    </header>

    <div v-if="isMobile" class="relative z-10 h-[132px] shrink-0">
      <AvatarOrbit
        mode="huddle"
        :players="state.players"
        :guesses="allGuesses"
        :emotes="liveEmotes"
        :sketcher-id="state.sketcherId"
        :host-id="state.hostId"
        :you-id="state.you"
        :board="board"
        @edit="pickerOpen = true"
        @poke="emit('poke', $event)"
      />
    </div>

    <div
      class="relative flex min-h-0 flex-1 items-center justify-center px-2 md:absolute md:inset-0 md:px-0"
    >
      <AvatarOrbit
        v-if="!isMobile"
        mode="wander"
        :players="state.players"
        :guesses="allGuesses"
        :emotes="liveEmotes"
        :sketcher-id="state.sketcherId"
        :host-id="state.hostId"
        :you-id="state.you"
        :board="board"
        @edit="pickerOpen = true"
        @poke="emit('poke', $event)"
      />

      <div
        class="relative"
        :style="{ width: `${board}px`, height: `${board}px` }"
      >
        <div class="absolute inset-0 overflow-hidden rounded-[2rem] bg-paper shadow-chunk md:rounded-[2.6rem]">
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
              {{ connectedCount }} player{{ connectedCount === 1 ? "" : "s" }} here
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
      </div>
    </div>

    <div
      class="z-20 shrink-0 px-3 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] md:absolute md:bottom-7 md:left-1/2 md:w-auto md:-translate-x-1/2 md:px-0 md:pt-0"
    >
      <ToolDock
        v-if="isSketcher"
        v-model:color="color"
        v-model:width="width"
        v-model:mode="mode"
        @undo="emit('undo')"
        @clear="emit('clear')"
      />
      <GuessBar
        v-else-if="state.phase === 'drawing'"
        v-model="guess"
        @submit="submitGuess"
      />
    </div>
    <AvatarPicker
      v-if="pickerOpen && me"
      :name="me.name"
      :avatar="me.avatar"
      @update="emit('setAvatar', $event)"
      @close="pickerOpen = false"
    />
  </div>
</template>
