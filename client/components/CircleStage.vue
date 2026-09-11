<script setup lang="ts">
import {
  DRAW_COLORS,
  ROTATION_LABELS,
  ROTATION_MODES,
  ROUND_SECONDS_OPTIONS,
  STROKE_WIDTHS,
  TOTAL_ROUNDS_OPTIONS,
  WORD_SET_LABELS,
  WORD_SETS,
  type ClientSnapshot,
  type Emote,
  type GameSettings,
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
  updateSettings: [payload: Partial<GameSettings>];
  strokeStart: [stroke: import("#shared").Stroke];
  strokeAdd: [id: string, points: import("#shared").Point[]];
  undo: [];
  clear: [];
  guess: [text: string];
  setAvatar: [avatar: number];
  poke: [toId: string];
}>();

const huddleEl = ref<HTMLElement | null>(null);
const boardEl = ref<HTMLElement | null>(null);
const board = ref(320);
const isMobile = ref(false);
const color = ref<(typeof DRAW_COLORS)[number]>(DRAW_COLORS[0]);
const width = ref<(typeof STROKE_WIDTHS)[number]>(8);
const mode = ref<"draw" | "erase">("draw");
const guess = ref("");
const remaining = ref(0);
const now = ref(Date.now());
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
const ceremony = computed(
  () =>
    props.state.phase === "reveal" &&
    props.state.revealReason === "guess" &&
    !!props.state.guesserId &&
    !!props.state.sketcherId,
);

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
  now.value = Date.now();
  if (!props.state.endsAt) {
    remaining.value = 0;
    return;
  }
  remaining.value = Math.max(0, Math.ceil((props.state.endsAt - now.value) / 1000));
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function roundsLabel(total: number) {
  return total === 0 ? "∞" : String(total);
}

function settingsSummary(settings: GameSettings) {
  const set = WORD_SET_LABELS[settings.wordSet] ?? WORD_SET_LABELS.basic;
  return `${settings.roundSeconds / 60}m · ${roundsLabel(settings.totalRounds)} · ${set}`;
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
      class="pointer-events-none z-30 grid grid-cols-[1fr_auto_1fr] items-start gap-2 px-3 pb-1 pt-[max(10px,env(safe-area-inset-top))] md:absolute md:left-4 md:right-4 md:top-3 md:px-0 md:pt-0"
    >
      <div class="pointer-events-auto justify-self-start">
        <BrandLogoSlot size="header" />
      </div>
      <div class="pointer-events-auto mt-1.5 flex items-center gap-2">
        <p class="rounded-full bg-paper px-4 py-2 text-sm font-semibold shadow-bubble">
          {{ state.code }}
        </p>
        <ShareButton :url="shareUrl" />
      </div>
      <div class="pointer-events-auto relative flex flex-col items-end justify-self-end">
        <button
          v-if="isHost && state.phase !== 'lobby'"
          type="button"
          class="rounded-full bg-paper px-4 py-2 text-sm font-semibold shadow-bubble whitespace-nowrap"
          @click="settingsOpen = !settingsOpen"
        >
          {{ settingsSummary(state.settings) }}
        </button>
        <p
          v-else-if="!(state.phase === 'lobby' && isHost)"
          class="whitespace-nowrap rounded-full bg-paper px-4 py-2 text-sm font-semibold shadow-bubble"
        >
          {{ settingsSummary(state.settings) }}
        </p>
        <div
          v-if="isHost && (state.phase === 'lobby' || settingsOpen)"
          class="w-[min(92vw,18.5rem)] rounded-[1.35rem] bg-paper p-1.5 shadow-bubble"
          :class="state.phase === 'lobby' ? '' : 'absolute right-0 top-full z-40 mt-1'"
        >
          <div class="flex items-center gap-2 px-1.5 py-1">
            <span class="w-12 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-ink/40">Time</span>
            <div class="flex min-w-0 flex-1 flex-wrap justify-end gap-1">
              <button
                v-for="seconds in ROUND_SECONDS_OPTIONS"
                :key="seconds"
                class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="state.settings.roundSeconds === seconds ? 'bg-coral text-white' : 'text-ink hover:bg-ink/5'"
                @click="emit('updateSettings', { roundSeconds: seconds })"
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
                class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="state.settings.totalRounds === rounds ? 'bg-coral text-white' : 'text-ink hover:bg-ink/5'"
                @click="emit('updateSettings', { totalRounds: rounds })"
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
                class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="state.settings.wordSet === set ? 'bg-coral text-white' : 'text-ink hover:bg-ink/5'"
                :title="set === 'movies' ? 'Movies & shows' : undefined"
                @click="emit('updateSettings', { wordSet: set })"
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
                class="shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="state.settings.rotation === mode ? 'bg-coral text-white' : 'text-ink hover:bg-ink/5'"
                @click="emit('updateSettings', { rotation: mode })"
              >
                {{ ROTATION_LABELS[mode] }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <div ref="huddleEl" v-if="isMobile" class="relative z-10 h-[132px] shrink-0" />

    <div
      class="relative flex min-h-0 flex-1 items-center justify-center px-2 md:absolute md:inset-0 md:px-0"
    >
      <div
        ref="boardEl"
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
            v-if="state.phase === 'reveal' && !ceremony"
            class="absolute inset-0 flex flex-col items-center justify-center bg-paper/80 p-6 text-center"
          >
            <p class="text-sm font-semibold uppercase tracking-widest text-coral">
              Time's up
            </p>
            <p class="mt-2 text-3xl font-semibold">{{ state.word }}</p>
          </div>

          <template v-else-if="ceremony">
            <div class="absolute inset-0 bg-paper/40" />
            <div
              class="pointer-events-none absolute inset-x-0 top-[62%] z-[1] px-6 text-center"
            >
              <p class="text-sm font-semibold uppercase tracking-widest text-coral">
                Guessed!
              </p>
              <p class="mt-1 text-3xl font-semibold">{{ state.word }}</p>
            </div>
          </template>
        </div>

        <div
          v-if="state.phase === 'drawing' && remaining"
          class="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-white"
        >
          {{ formatTime(remaining) }}
          <span class="ml-2 text-white/60">{{ state.roundIndex }}/{{ roundsLabel(state.settings.totalRounds) }}</span>
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

    <AvatarOrbit
      :players="state.players"
      :guesses="allGuesses"
      :emotes="liveEmotes"
      :sketcher-id="state.sketcherId"
      :guesser-id="state.guesserId"
      :reveal-reason="state.revealReason"
      :phase="state.phase"
      :round-index="state.roundIndex"
      :host-id="state.hostId"
      :you-id="state.you"
      :mode="isMobile ? 'huddle' : 'wander'"
      :board="board"
      :board-el="boardEl"
      :huddle-el="huddleEl"
      @edit="pickerOpen = true"
      @poke="emit('poke', $event)"
    />

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
