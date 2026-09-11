<script setup lang="ts">
const COLORS = ["#FFD166", "#FF6B5B", "#3ECFCF", "#8B7CFF", "#FF8FAB", "#FFB347"];

const bits = [
  { x: 18, delay: -0.12, dur: 1.15, drift: 14, spin: 200, kind: "star", color: 0, size: 11 },
  { x: 42, delay: -0.38, dur: 1.28, drift: -10, spin: -160, kind: "rect", color: 1, size: 7 },
  { x: 64, delay: -0.71, dur: 1.1, drift: 8, spin: 240, kind: "dot", color: 2, size: 6 },
  { x: 28, delay: -0.95, dur: 1.22, drift: -16, spin: -210, kind: "star", color: 3, size: 9 },
  { x: 76, delay: -0.24, dur: 1.32, drift: -6, spin: 180, kind: "rect", color: 4, size: 6 },
  { x: 10, delay: -0.58, dur: 1.18, drift: 12, spin: -190, kind: "dot", color: 5, size: 5 },
  { x: 54, delay: -0.86, dur: 1.08, drift: 18, spin: 230, kind: "star", color: 1, size: 10 },
  { x: 36, delay: -0.19, dur: 1.26, drift: -8, spin: -150, kind: "rect", color: 0, size: 8 },
  { x: 70, delay: -0.47, dur: 1.14, drift: 10, spin: 170, kind: "dot", color: 3, size: 5 },
  { x: 22, delay: -0.79, dur: 1.2, drift: -14, spin: -220, kind: "star", color: 2, size: 8 },
  { x: 48, delay: -1.02, dur: 1.34, drift: 6, spin: 140, kind: "rect", color: 5, size: 6 },
  { x: 82, delay: -0.33, dur: 1.16, drift: -12, spin: -200, kind: "star", color: 4, size: 9 },
  { x: 14, delay: -0.64, dur: 1.24, drift: 16, spin: 210, kind: "dot", color: 0, size: 5 },
  { x: 60, delay: -0.91, dur: 1.12, drift: -18, spin: -170, kind: "rect", color: 2, size: 7 },
] as const;
</script>

<template>
  <div class="glitter-fall" aria-hidden="true">
    <span
      v-for="(bit, i) in bits"
      :key="i"
      class="glitter-bit"
      :class="`is-${bit.kind}`"
      :style="{
        left: `${bit.x}%`,
        width: `${bit.size}px`,
        height: `${bit.size}px`,
        color: COLORS[bit.color],
        animationDuration: `${bit.dur}s`,
        animationDelay: `${bit.delay}s`,
        '--drift': `${bit.drift}px`,
        '--spin': `${bit.spin}deg`,
      }"
    />
  </div>
</template>
