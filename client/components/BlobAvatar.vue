<script setup lang="ts">
const props = defineProps<{
  name: string;
  avatar: number;
  size?: number;
}>();

const palette = [
  "#FF6B5B",
  "#3ECFCF",
  "#FFD166",
  "#8B7CFF",
  "#FF8FAB",
  "#7BD389",
  "#6CB6FF",
  "#FFB347",
];

const color = computed(() => palette[props.avatar % palette.length]);
const variant = computed(() => props.avatar % 8);
</script>

<template>
  <svg
    :width="size || 64"
    :height="size || 64"
    viewBox="0 0 64 64"
    aria-hidden="true"
  >
    <ellipse
      cx="32"
      :cy="variant % 2 === 0 ? 34 : 33"
      :rx="variant > 3 ? 24 : 21"
      :ry="variant > 5 ? 22 : 24"
      :fill="color"
    />
    <circle
      v-if="variant === 2 || variant === 6"
      cx="32"
      cy="14"
      r="4"
      :fill="color"
    />
    <circle cx="24" :cy="variant === 1 ? 28 : 30" r="3.2" fill="#3D2B27" />
    <circle cx="40" :cy="variant === 1 ? 28 : 30" r="3.2" fill="#3D2B27" />
    <circle cx="25.2" :cy="variant === 1 ? 27 : 29" r="1" fill="#FFF8EE" />
    <circle cx="41.2" :cy="variant === 1 ? 27 : 29" r="1" fill="#FFF8EE" />
    <path
      v-if="variant % 3 !== 1"
      d="M24 41 Q32 48 40 41"
      fill="none"
      stroke="#3D2B27"
      stroke-width="2.6"
      stroke-linecap="round"
    />
    <ellipse
      v-else
      cx="32"
      cy="42"
      rx="5"
      ry="4"
      fill="#3D2B27"
    />
    <circle
      v-if="variant === 4 || variant === 7"
      cx="18"
      cy="38"
      r="3.5"
      fill="#FF8A80"
      opacity="0.7"
    />
    <circle
      v-if="variant === 4 || variant === 7"
      cx="46"
      cy="38"
      r="3.5"
      fill="#FF8A80"
      opacity="0.7"
    />
  </svg>
</template>
