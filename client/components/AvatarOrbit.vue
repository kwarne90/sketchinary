<script setup lang="ts">
import { decodeAvatar, type Emote, type Guess, type Player } from "#shared";

const props = defineProps<{
  players: Player[];
  guesses: Guess[];
  emotes: Emote[];
  sketcherId: string | null;
  hostId: string;
  youId: string;
  mode: "wander" | "huddle";
  board: number;
}>();

const emit = defineEmits<{
  edit: [];
  poke: [toId: string];
}>();

const root = ref<HTMLElement | null>(null);
const poses = reactive<Record<string, { x: number; y: number }>>({});
const pulseUntil = reactive<Record<string, number>>({});
const now = ref(Date.now());
const hoveredId = ref<string | null>(null);

let raf = 0;
let clock = 0;
let lastNow = 0;
let seenGuess = new Set<string>();
let seenEmote = new Set<string>();
const freezeAt = new Map<string, number>();
const drift = new Map<string, number>();

function seedFrom(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 33 + id.charCodeAt(i)) >>> 0;
  return (h % 1000) / 1000;
}

function roundedRectPoint(t: number, hw: number, hh: number, r: number) {
  const sx = Math.max(1, 2 * (hw - r));
  const sy = Math.max(1, 2 * (hh - r));
  const corner = (Math.PI / 2) * r;
  const peri = 2 * sx + 2 * sy + 4 * corner;
  let d = (((t % 1) + 1) % 1) * peri;

  if (d <= sx) return { x: -hw + r + d, y: -hh, nx: 0, ny: -1 };
  d -= sx;
  if (d <= corner) {
    const a = -Math.PI / 2 + d / r;
    return {
      x: hw - r + Math.cos(a) * r,
      y: -hh + r + Math.sin(a) * r,
      nx: Math.cos(a),
      ny: Math.sin(a),
    };
  }
  d -= corner;
  if (d <= sy) return { x: hw, y: -hh + r + d, nx: 1, ny: 0 };
  d -= sy;
  if (d <= corner) {
    const a = d / r;
    return {
      x: hw - r + Math.cos(a) * r,
      y: hh - r + Math.sin(a) * r,
      nx: Math.cos(a),
      ny: Math.sin(a),
    };
  }
  d -= corner;
  if (d <= sx) return { x: hw - r - d, y: hh, nx: 0, ny: 1 };
  d -= sx;
  if (d <= corner) {
    const a = Math.PI / 2 + d / r;
    return {
      x: -hw + r + Math.cos(a) * r,
      y: hh - r + Math.sin(a) * r,
      nx: Math.cos(a),
      ny: Math.sin(a),
    };
  }
  d -= corner;
  if (d <= sy) return { x: -hw, y: hh - r - d, nx: -1, ny: 0 };
  d -= sy;
  const a = Math.PI + d / r;
  return {
    x: -hw + r + Math.cos(a) * r,
    y: -hh + r + Math.sin(a) * r,
    nx: Math.cos(a),
    ny: Math.sin(a),
  };
}

const bubbles = computed(() => {
  const latest = new Map<string, Guess>();
  for (const guess of props.guesses) {
    if (now.value - guess.at < 4200) latest.set(guess.playerId, guess);
  }
  return latest;
});

watch(
  () => props.guesses,
  (list) => {
    for (const guess of list) {
      const key = `${guess.playerId}-${guess.at}`;
      if (seenGuess.has(key)) continue;
      seenGuess.add(key);
      pulseUntil[guess.playerId] = Date.now() + 900;
    }
  },
  { deep: true },
);

watch(
  () => props.emotes,
  (list) => {
    for (const emote of list) {
      const key = `${emote.toId}-${emote.at}`;
      if (seenEmote.has(key)) continue;
      seenEmote.add(key);
      pulseUntil[emote.toId] = Date.now() + 700;
    }
  },
  { deep: true },
);

function playerClock(id: string) {
  if (hoveredId.value === id && freezeAt.has(id)) return freezeAt.get(id)!;
  return clock - (drift.get(id) || 0);
}

function hoverOn(id: string) {
  if (hoveredId.value && hoveredId.value !== id) hoverOff(hoveredId.value);
  hoveredId.value = id;
  if (props.mode !== "wander") return;
  if (!freezeAt.has(id)) freezeAt.set(id, clock - (drift.get(id) || 0));
}

function hoverOff(id: string) {
  if (hoveredId.value === id) hoveredId.value = null;
  const frozen = freezeAt.get(id);
  if (frozen == null) return;
  drift.set(id, clock - frozen);
  freezeAt.delete(id);
}

function onAvatarClick(id: string) {
  if (id === props.youId) emit("edit");
  else emit("poke", id);
}

function step(ts: number) {
  const el = root.value;
  if (!el) {
    raf = requestAnimationFrame(step);
    return;
  }
  clock = ts / 1000;
  if (ts - lastNow > 180) {
    now.value = Date.now();
    lastNow = ts;
  }
  const w = el.clientWidth;
  const h = el.clientHeight;
  const players = props.players;
  const ids = new Set(players.map((p) => p.id));
  for (const id of Object.keys(poses)) {
    if (!ids.has(id)) delete poses[id];
  }

  const n = players.length || 1;

  if (props.mode === "wander") {
    const hw = props.board / 2 + 74;
    const hh = props.board / 2 + 74;
    const radius = 48;
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const seed = seedFrom(player.id);
      const t = i / n + playerClock(player.id) / 36;
      const p = roundedRectPoint(t, hw, hh, radius);
      const wobble = Math.sin(playerClock(player.id) * 1.15 + seed * 8) * 4;
      poses[player.id] = {
        x: w / 2 + p.x + p.nx * wobble,
        y: h / 2 + p.y + p.ny * wobble,
      };
    }
  } else {
    const gap = Math.min(62, Math.max(40, (w - 24) / n));
    const start = w / 2 - ((n - 1) * gap) / 2;
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const seed = seedFrom(player.id);
      poses[player.id] = {
        x: start + i * gap + Math.sin(clock * 0.45 + seed * 6) * 1.6,
        y: h * 0.5 + Math.cos(clock * 0.38 + seed * 5) * 1.4,
      };
    }
  }

  raf = requestAnimationFrame(step);
}

onMounted(() => {
  raf = requestAnimationFrame(step);
});
onUnmounted(() => cancelAnimationFrame(raf));

function reacting(id: string) {
  return (pulseUntil[id] || 0) > now.value;
}

const stamps = computed(() => {
  const latest = new Map<string, Emote>();
  for (const emote of props.emotes) {
    if (now.value - emote.at < 2200) latest.set(emote.toId, emote);
  }
  return latest;
});

function stampOf(id: string) {
  return stamps.value.get(id);
}
</script>

<template>
  <div ref="root" class="pointer-events-none absolute inset-0 overflow-visible">
    <div
      v-for="player in players"
      :key="player.id"
      class="absolute left-0 top-0 will-change-transform"
      :style="{
        transform: `translate3d(${poses[player.id]?.x ?? 0}px, ${poses[player.id]?.y ?? 0}px, 0) translate(-50%, -50%)`,
        zIndex: reacting(player.id) || player.id === sketcherId || player.id === hostId || player.id === youId || player.id === hoveredId ? 6 : 1,
      }"
    >
      <component
        :is="'button'"
        type="button"
        class="avatar-hit flex flex-col items-center border-0 bg-transparent p-0 pointer-events-auto cursor-pointer"
        :title="player.id === youId ? 'Change your look' : 'Poke'"
        @click="onAvatarClick(player.id)"
        @mouseenter="hoverOn(player.id)"
        @mouseleave="hoverOff(player.id)"
      >
        <div
          v-if="bubbles.get(player.id)"
          :key="`${player.id}-${bubbles.get(player.id)?.at}`"
          class="speech-bubble mb-1 max-w-[150px] px-3 py-1.5 text-center text-sm font-medium"
          :class="bubbles.get(player.id)?.correct ? 'is-correct' : 'is-guess'"
        >
          {{
            bubbles.get(player.id)?.correct
              ? "Got it!"
              : bubbles.get(player.id)?.text
          }}
        </div>
        <div
          class="avatar-shell relative"
          :class="{
            'opacity-50': !player.connected,
            'is-reacting': reacting(player.id),
            'is-correct-react': reacting(player.id) && bubbles.get(player.id)?.correct,
          }"
        >
          <BlobAvatar
            :name="player.name"
            :avatar="player.avatar"
            :size="mode === 'huddle' ? 52 : 58"
          />
          <svg
            v-if="player.id === hostId"
            class="host-crown"
            width="28"
            height="18"
            viewBox="0 0 28 18"
            aria-hidden="true"
          >
            <path
              d="M3.5 14 L5.5 5.5 L10.5 10.5 L14 3.2 L17.5 10.5 L22.5 5.5 L24.5 14 Z"
              fill="#FFD166"
              stroke="#3D2B27"
              stroke-width="1.5"
              stroke-linejoin="round"
            />
            <rect x="3.2" y="13" width="21.6" height="3.4" rx="1.2" fill="#FFD166" stroke="#3D2B27" stroke-width="1.4" />
            <circle cx="5.5" cy="5.4" r="1.7" fill="#FF6B5B" stroke="#3D2B27" stroke-width="1.1" />
            <circle cx="14" cy="3.2" r="1.7" fill="#3ECFCF" stroke="#3D2B27" stroke-width="1.1" />
            <circle cx="22.5" cy="5.4" r="1.7" fill="#8B7CFF" stroke="#3D2B27" stroke-width="1.1" />
          </svg>
          <SketcherTool
            :utensil="decodeAvatar(player.avatar).utensil"
            placed
            :animate="player.id === sketcherId"
            :dim="!!sketcherId && player.id !== sketcherId"
          />
          <EmoteBurst
            v-if="stampOf(player.id)"
            :key="`${player.id}-${stampOf(player.id)?.at}`"
            :emote="stampOf(player.id)"
          />
        </div>
        <p
          class="mt-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
          :class="
            player.id === sketcherId
              ? 'is-turn-pill bg-coral'
              : player.id === youId
                ? 'bg-teal text-ink'
                : 'bg-ink/80'
          "
        >
          <span v-if="player.id === youId" class="mr-0.5 font-semibold">you</span>
          {{ player.name }}
          <span
            v-if="player.score"
            :class="player.id === sketcherId ? 'text-white/80' : player.id === youId ? 'text-ink/70' : 'text-teal'"
          >
            {{ player.score }}
          </span>
        </p>
      </component>
    </div>
  </div>
</template>
