<script setup lang="ts">
import { SlidersHorizontal, X } from "@lucide/vue";
import {
  DRAW_COLORS,
  STROKE_WIDTHS,
  WORD_SET_LABELS,
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
const showDesktopSettings = computed(
  () => isHost.value && !isMobile.value && (props.state.phase === "lobby" || settingsOpen.value),
);
const showMobileSettings = computed(
  () => isHost.value && isMobile.value && settingsOpen.value,
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
  if (event.key === "Escape" && settingsOpen.value) {
    settingsOpen.value = false;
    return;
  }
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
          v-if="isHost && isMobile"
          type="button"
          class="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-paper text-ink shadow-bubble"
          aria-label="Game settings"
          title="Game settings"
          @click="settingsOpen = true"
        >
          <SlidersHorizontal :size="18" :stroke-width="2.4" />
        </button>
        <button
          v-else-if="isHost && state.phase !== 'lobby'"
          type="button"
          class="rounded-full bg-paper px-4 py-2 text-sm font-semibold shadow-bubble whitespace-nowrap"
          @click="settingsOpen = !settingsOpen"
        >
          {{ settingsSummary(state.settings) }}
        </button>
        <p
          v-else-if="!(isHost && (state.phase === 'lobby' || isMobile))"
          class="max-w-[7.5rem] truncate whitespace-nowrap rounded-full bg-paper px-3 py-2 text-sm font-semibold shadow-bubble md:max-w-none md:px-4"
        >
          {{ settingsSummary(state.settings) }}
        </p>
        <div
          v-if="showDesktopSettings"
          class="w-[min(92vw,18.5rem)] rounded-[1.35rem] bg-paper p-1.5 shadow-bubble"
          :class="state.phase === 'lobby' ? '' : 'absolute right-0 top-full z-40 mt-1'"
        >
          <GameSettingsForm
            :settings="state.settings"
            @update="emit('updateSettings', $event)"
          />
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
    <div
      v-if="showMobileSettings"
      class="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(5.5rem,calc(env(safe-area-inset-top)+3.5rem))]"
      @click.self="settingsOpen = false"
    >
      <div class="relative w-full max-w-sm max-h-[calc(100svh-7.5rem)] overflow-y-auto rounded-[2rem] bg-paper p-5 pt-6 shadow-chunk">
        <button
          type="button"
          class="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-ink"
          aria-label="Close"
          @click="settingsOpen = false"
        >
          <X :size="18" :stroke-width="2.4" />
        </button>
        <p class="mb-3 pr-12 text-sm font-semibold uppercase tracking-[0.18em] text-coral">
          Game
        </p>
        <GameSettingsForm
          :settings="state.settings"
          @update="emit('updateSettings', $event)"
        />
      </div>
    </div>
  </div>
</template>
