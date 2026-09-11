<script setup lang="ts">
import {
  pointsForGuess,
  tokenSize,
  type Emote,
  type Guess,
  type Player,
  type RevealReason,
} from "#shared";

const props = defineProps<{
  players: Player[];
  guesses: Guess[];
  emotes: Emote[];
  sketcherId: string | null;
  guesserId: string | null;
  revealReason: RevealReason;
  phase: string;
  roundIndex: number;
  hostId: string;
  youId: string;
  mode: "wander" | "huddle";
  board: number;
  boardEl: HTMLElement | null;
  huddleEl: HTMLElement | null;
}>();

const emit = defineEmits<{
  edit: [];
  poke: [toId: string];
}>();

const FADE = 480;
const ARRIVE = 780;
const SETTLE = 640;
const HOLD = 720;
const FLY = 520;
const GAP = 180;
const SWAP = 1200;

const root = ref<HTMLElement | null>(null);
const poses = reactive<Record<string, { x: number; y: number }>>({});
const labelSides = reactive<Record<string, "left" | "right" | "below">>({});
const pulseUntil = reactive<Record<string, number>>({});
const now = ref(Date.now());
const hoveredId = ref<string | null>(null);
const guesserGot = ref(0);
const drawerGot = ref(0);
const guesserPulse = ref(false);
const drawerPulse = ref(false);
const elapsed = ref(0);
const swapT = ref(0);
const playing = ref(false);
const playGuesser = ref<string | null>(null);
const playDrawer = ref<string | null>(null);
const scoreShow = reactive<Record<string, number>>({});

let raf = 0;
let clock = 0;
let lastNow = 0;
let ceremonyT0 = 0;
let ceremonyKey = "";
let capturedGuesser: { x: number; y: number } | null = null;
let drawerSwapFrom: { x: number; y: number } | null = null;
let pinnedBubble: Guess | null = null;
const fired = new Set<number>();
let seenGuess = new Set<string>();
let seenEmote = new Set<string>();
const freezeAt = new Map<string, number>();
const drift = new Map<string, number>();
const blends = new Map<string, { from: { x: number; y: number }; t0: number; dur: number }>();
const prevRole = new Map<string, string>();

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

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function lerp(a: { x: number; y: number }, b: { x: number; y: number }, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

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

const ceremony = computed(
  () =>
    props.phase === "reveal" &&
    props.revealReason === "guess" &&
    !!props.guesserId &&
    !!props.sketcherId,
);

const awards = computed(() =>
  pointsForGuess(props.players.filter((p) => p.connected).length),
);

const orbCount = computed(() => awards.value.guesser + awards.value.sketcher);

const visualSketcherId = computed(() => {
  if (playing.value) {
    return swapT.value >= 1 ? playGuesser.value : playDrawer.value;
  }
  return props.sketcherId;
});

const glittering = computed(
  () => playing.value && elapsed.value >= ARRIVE && swapT.value < 0.15,
);

function shownPlayer(player: Player) {
  const shown = scoreShow[player.id];
  if (shown == null) return player;
  return { ...player, score: shown };
}

function baseSize() {
  return props.mode === "huddle" ? 52 : 58;
}

function pulse(target: "guesser" | "drawer") {
  const id = target === "guesser" ? playGuesser.value : playDrawer.value;
  if (target === "guesser") {
    guesserPulse.value = false;
    requestAnimationFrame(() => {
      guesserGot.value = Math.min(awards.value.guesser, guesserGot.value + 1);
      if (id != null && scoreShow[id] != null) scoreShow[id] += 1;
      guesserPulse.value = true;
    });
  } else {
    drawerPulse.value = false;
    requestAnimationFrame(() => {
      drawerGot.value = Math.min(awards.value.sketcher, drawerGot.value + 1);
      if (id != null && scoreShow[id] != null) scoreShow[id] += 1;
      drawerPulse.value = true;
    });
  }
}

function beginPlay(ts: number) {
  const guesser = props.guesserId;
  const drawer = props.sketcherId;
  if (!guesser || !drawer) return;
  playing.value = true;
  playGuesser.value = guesser;
  playDrawer.value = drawer;
  ceremonyT0 = ts;
  fired.clear();
  guesserGot.value = 0;
  drawerGot.value = 0;
  guesserPulse.value = false;
  drawerPulse.value = false;
  capturedGuesser = poses[guesser] ?? null;
  drawerSwapFrom = null;
  const pts = awards.value;
  for (const player of props.players) {
    if (player.id === guesser) scoreShow[player.id] = player.score - pts.guesser;
    else if (player.id === drawer) scoreShow[player.id] = player.score - pts.sketcher;
    else delete scoreShow[player.id];
  }
  pinnedBubble =
    [...props.guesses].reverse().find((g) => g.playerId === guesser && g.correct) ??
    null;
}

function endPlay(players: Player[]) {
  playing.value = false;
  playGuesser.value = null;
  playDrawer.value = null;
  capturedGuesser = null;
  drawerSwapFrom = null;
  pinnedBubble = null;
  guesserPulse.value = false;
  drawerPulse.value = false;
  for (const key of Object.keys(scoreShow)) delete scoreShow[key];
  for (const player of players) {
    const kind =
      props.sketcherId &&
      player.id === props.sketcherId &&
      (props.phase === "drawing" || props.phase === "reveal")
        ? "pin"
        : "rim";
    prevRole.set(player.id, kind);
    blends.delete(player.id);
  }
}

function bubbleFor(id: string) {
  if (playing.value && playGuesser.value === id && pinnedBubble) return pinnedBubble;
  return bubbles.value.get(id);
}

function relBox(el: HTMLElement, origin: DOMRect) {
  const box = el.getBoundingClientRect();
  return {
    x: box.left - origin.left,
    y: box.top - origin.top,
    w: box.width,
    h: box.height,
  };
}

function wanderPoint(
  id: string,
  index: number,
  n: number,
  w: number,
  h: number,
) {
  const hw = props.board / 2 + 74;
  const hh = props.board / 2 + 74;
  const seed = seedFrom(id);
  const t = index / Math.max(1, n) + playerClock(id) / 36;
  const p = roundedRectPoint(t, hw, hh, 48);
  const wobble = Math.sin(playerClock(id) * 1.15 + seed * 8) * 4;
  return {
    x: w / 2 + p.x + p.nx * wobble,
    y: h / 2 + p.y + p.ny * wobble,
  };
}

function huddlePoint(
  id: string,
  index: number,
  n: number,
  huddle: { x: number; y: number; w: number; h: number },
) {
  const gap = Math.min(62, Math.max(40, (huddle.w - 24) / Math.max(1, n)));
  const start = huddle.x + huddle.w / 2 - ((n - 1) * gap) / 2;
  const seed = seedFrom(id);
  return {
    x: start + index * gap + Math.sin(clock * 0.45 + seed * 6) * 1.6,
    y: huddle.y + huddle.h * 0.5 + Math.cos(clock * 0.38 + seed * 5) * 1.4,
  };
}

const orbs = computed(() => {
  if (!playing.value) return [];
  const n = orbCount.value;
  const xs = n === 2 ? [0.37, 0.63] : [0.27, 0.5, 0.73];
  const targets: Array<"guesser" | "drawer"> =
    n === 2 ? ["guesser", "drawer"] : ["guesser", "guesser", "drawer"];
  return xs.map((x, i) => ({
    id: i,
    nx: x,
    ny: 0.1 + (i === 1 && n === 3 ? -0.012 : 0.008),
    target: targets[i],
    flyAt: ARRIVE + SETTLE + HOLD + i * (FLY + GAP),
  }));
});

const orbStyles = ref<Record<number, { transform: string; opacity: number }>>({});

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

  const overlay = el.getBoundingClientRect();
  const w = overlay.width;
  const h = overlay.height;
  const square = props.boardEl ? relBox(props.boardEl, overlay) : null;
  const huddle = props.huddleEl ? relBox(props.huddleEl, overlay) : null;
  const pin = square
    ? { x: square.x + square.w - 6, y: square.y + 22 }
    : { x: w * 0.72, y: h * 0.22 };
  const float = square
    ? { x: square.x + square.w / 2, y: square.y + square.h * 0.36 }
    : { x: w / 2, y: h * 0.4 };

  const incoming = ceremony.value;
  const key = incoming
    ? `${props.roundIndex}:${props.guesserId}:${props.sketcherId}`
    : ceremonyKey;
  if (incoming && key && key !== ceremonyKey) {
    ceremonyKey = key;
    beginPlay(ts);
  }

  const lastFly =
    ARRIVE + SETTLE + HOLD + (orbCount.value - 1) * (FLY + GAP) + FLY;
  const animEnd = lastFly + 200 + SWAP;
  const t = playing.value && ceremonyT0 ? ts - ceremonyT0 : 0;
  elapsed.value = t;
  swapT.value = playing.value ? clamp01((t - (lastFly + 200)) / SWAP) : 0;

  if (playing.value) {
    for (const orb of orbs.value) {
      if (fired.has(orb.id)) continue;
      if (t >= orb.flyAt + FLY) {
        fired.add(orb.id);
        pulse(orb.target);
      }
    }
  }

  const players = props.players;
  const ids = new Set(players.map((p) => p.id));
  for (const id of Object.keys(poses)) {
    if (!ids.has(id)) {
      delete poses[id];
      delete labelSides[id];
    }
  }

  const drawerId = playing.value ? playDrawer.value : props.sketcherId;
  const guesserId = playing.value ? playGuesser.value : props.guesserId;
  const swap = swapT.value;
  const live = playing.value;

  function role(id: string): "pin" | "float" | "rim" {
    if (live && guesserId && drawerId) {
      if (id === guesserId) return "float";
      if (id === drawerId) return swap > 0 ? "rim" : "pin";
    } else if (
      props.sketcherId &&
      (props.phase === "drawing" || props.phase === "reveal")
    ) {
      if (id === props.sketcherId) return "pin";
    }
    return "rim";
  }

  const rosterN = players.length || 1;
  const rosterIndex = new Map(players.map((p, i) => [p.id, i]));

  function rimTarget(id: string) {
    const i = rosterIndex.get(id) ?? 0;
    if (props.mode === "huddle" && huddle) {
      return huddlePoint(id, i, rosterN, huddle);
    }
    return wanderPoint(id, i, rosterN, w, h);
  }

  for (const player of players) {
    const id = player.id;
    const kind = role(id);
    const prev = prevRole.get(id);
    let target: { x: number; y: number };
    if (kind === "float") {
      if (t < ARRIVE) {
        const from = capturedGuesser || rimTarget(id);
        target = lerp(from, float, easeOut(t / ARRIVE));
      } else if (swap <= 0) target = float;
      else target = lerp(float, pin, easeInOut(swap));
    } else if (kind === "pin") {
      target = pin;
    } else if (live && id === drawerId) {
      if (swap <= 0) target = pin;
      else {
        if (!drawerSwapFrom) drawerSwapFrom = poses[id] ? { ...poses[id] } : pin;
        target = lerp(drawerSwapFrom, rimTarget(id), easeInOut(swap));
      }
    } else {
      target = rimTarget(id);
    }

    if (!live && prev && prev !== kind && poses[id]) {
      blends.set(id, { from: { ...poses[id] }, t0: ts, dur: 720 });
    }
    prevRole.set(id, kind);

    const blend = blends.get(id);
    if (blend) {
      const u = clamp01((ts - blend.t0) / blend.dur);
      target = lerp(blend.from, target, easeInOut(u));
      if (u >= 1) blends.delete(id);
    }
    poses[id] = target;
    if (props.mode === "huddle") {
      labelSides[id] = "below";
    } else {
      const mid = square ? square.x + square.w / 2 : w / 2;
      labelSides[id] = target.x < mid ? "left" : "right";
    }
  }

  if (live && square) {
    const next: Record<number, { transform: string; opacity: number }> = {};
    for (const orb of orbs.value) {
      const rest = {
        x: square.x + square.w * orb.nx,
        y: square.y + square.h * orb.ny,
      };
      const dest =
        orb.target === "guesser"
          ? poses[guesserId || ""] || float
          : poses[drawerId || ""] || pin;
      let pos = rest;
      let opacity = 0;
      if (t < FADE) opacity = easeOut(t / FADE);
      else if (t < orb.flyAt) opacity = 1;
      else if (t < orb.flyAt + FLY) {
        opacity = 1;
        pos = lerp(rest, dest, easeInOut((t - orb.flyAt) / FLY));
      } else {
        opacity = 0;
        pos = dest;
      }
      next[orb.id] = {
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0) translate(-50%, -50%)`,
        opacity,
      };
    }
    orbStyles.value = next;
  } else if (Object.keys(orbStyles.value).length) {
    orbStyles.value = {};
  }

  if (live && t >= animEnd) {
    const handedOff =
      props.phase === "drawing" && props.sketcherId === playGuesser.value;
    const finished = props.phase === "ended" || props.phase === "lobby";
    if (handedOff || finished) endPlay(players);
  }

  raf = requestAnimationFrame(step);
}

onMounted(() => {
  raf = requestAnimationFrame(step);
});
onUnmounted(() => cancelAnimationFrame(raf));
</script>

<template>
  <div ref="root" class="pointer-events-none absolute inset-0 z-20 overflow-visible">
    <svg
      v-for="orb in orbs"
      :key="`star-${orb.id}`"
      class="score-star"
      :style="orbStyles[orb.id]"
      viewBox="0 0 32 32"
      width="28"
      height="28"
      aria-hidden="true"
    >
      <g class="score-star-face">
        <path
          d="M16 2.6 L19.7 11.9 L29.6 12.3 L21.8 18.8 L24.4 28.6 L16 23.4 L7.6 28.6 L10.2 18.8 L2.4 12.3 L12.3 11.9 Z"
          fill="#FFD166"
          stroke="#3D2B27"
          stroke-width="1.7"
          stroke-linejoin="round"
        />
      </g>
    </svg>
    <div
      v-for="player in players"
      :key="player.id"
      class="absolute left-0 top-0 w-max will-change-transform"
      :style="{
        transform: `translate3d(${poses[player.id]?.x ?? 0}px, ${poses[player.id]?.y ?? 0}px, 0) translate(-50%, -50%)`,
        zIndex:
          reacting(player.id) ||
          player.id === visualSketcherId ||
          player.id === hostId ||
          player.id === youId ||
          player.id === hoveredId
            ? 6
            : 1,
      }"
    >
      <PlayerToken
        :player="shownPlayer(player)"
        :you-id="youId"
        :sketcher-id="visualSketcherId"
        :host-id="hostId"
        :size="tokenSize(baseSize(), shownPlayer(player).score)"
        :bubble="bubbleFor(player.id)"
        :emote="stamps.get(player.id)"
        :reacting="reacting(player.id)"
        :absorbing="player.id === playGuesser ? guesserPulse : player.id === playDrawer ? drawerPulse : false"
        :glitter="glittering && (player.id === playGuesser || player.id === playDrawer)"
        :label-side="labelSides[player.id] || 'below'"
        @select="onAvatarClick(player.id)"
        @hover-on="hoverOn(player.id)"
        @hover-off="hoverOff(player.id)"
      />
    </div>
  </div>
</template>
