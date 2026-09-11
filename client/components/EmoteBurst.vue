<script setup lang="ts">
import type { Emote } from "#shared";

const props = defineProps<{
  emote: Emote;
}>();

function seed() {
  let h = props.emote.at >>> 0;
  const key = `${props.emote.toId}${props.emote.kind}${props.emote.fromId}`;
  for (let i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) >>> 0;
  return h;
}

const pose = computed(() => {
  const h = seed();
  const angle = ((h % 360) * Math.PI) / 180;
  const dist = 26 + (h % 11);
  return {
    x: Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    tilt: (h % 21) - 10,
  };
});

const burst = computed(() => {
  const h = seed();
  const spikes = 11;
  const points: string[] = [];
  for (let i = 0; i < spikes * 2; i++) {
    const outer = 29 + ((h >> (i % 8)) & 3);
    const inner = 14 + ((h >> ((i + 3) % 8)) & 2);
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    points.push(`${(32 + Math.cos(a) * r).toFixed(1)},${(32 + Math.sin(a) * r).toFixed(1)}`);
  }
  return points.join(" ");
});

const fills: Record<string, string> = {
  poke: "#8B7CFF",
  tap: "#FF6B5B",
  boop: "#3ECFCF",
  wave: "#FFD166",
  nudge: "#FF8FAB",
  bonk: "#FFB347",
};
</script>

<template>
  <div
    class="emote-burst"
    :style="{
      transform: `translate(${pose.x}px, ${pose.y}px)`,
    }"
  >
    <div class="emote-burst-pop">
      <div :style="{ transform: `rotate(${pose.tilt}deg)` }">
        <svg viewBox="0 0 64 64" width="42" height="42" aria-hidden="true">
          <polygon
            :points="burst"
            :fill="fills[emote.kind] || '#8B7CFF'"
            stroke="#3D2B27"
            stroke-width="2.4"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ emote.kind }}!</span>
      </div>
    </div>
  </div>
</template>
