<script setup lang="ts">
import { AVATAR_PALETTE, decodeAvatar } from "#shared";

const props = defineProps<{
  name: string;
  avatar: number;
  size?: number;
}>();

const look = computed(() => decodeAvatar(props.avatar));
const color = computed(() => AVATAR_PALETTE[look.value.color % AVATAR_PALETTE.length]);
</script>

<template>
  <svg
    :width="size || 64"
    :height="size || 64"
    viewBox="0 0 64 64"
    class="avatar-face"
    aria-hidden="true"
  >
    <circle cx="32" cy="34" r="22" :fill="color" stroke="#3D2B27" stroke-width="2.2" />

    <path
      v-if="look.hat === 'beanie'"
      d="M16 28 C18 16 46 16 48 28"
      :fill="color"
      stroke="#3D2B27"
      stroke-width="1.4"
      stroke-linejoin="round"
    />
    <path
      v-if="look.hat === 'bow'"
      d="M26 16 L32 22 L38 16 L32 20 Z"
      fill="#FFF8EE"
    />

    <g v-if="!look.wink">
      <circle cx="24.5" cy="32" r="3.4" fill="#3D2B27" />
      <circle cx="39.5" cy="32" r="3.4" fill="#3D2B27" />
      <circle cx="25.5" cy="31" r="1.1" fill="#FFF8EE" />
      <circle cx="40.5" cy="31" r="1.1" fill="#FFF8EE" />
    </g>
    <g v-else>
      <circle cx="24.5" cy="32" r="3.4" fill="#3D2B27" />
      <circle cx="25.5" cy="31" r="1.1" fill="#FFF8EE" />
      <path d="M35 32 H44" stroke="#3D2B27" stroke-width="2.4" stroke-linecap="round" />
    </g>

    <g v-if="look.glasses" fill="none" stroke="#3D2B27" stroke-width="2">
      <circle cx="24.5" cy="32" r="6.2" />
      <circle cx="39.5" cy="32" r="6.2" />
      <path d="M30.6 32 H33.4" />
    </g>

    <circle v-if="look.blush" cx="18" cy="38" r="3.2" fill="#FF8A80" opacity="0.85" />
    <circle v-if="look.blush" cx="46" cy="38" r="3.2" fill="#FF8A80" opacity="0.85" />

    <path
      v-if="look.openMouth"
      d="M27 42 Q32 48 37 42"
      fill="#3D2B27"
    />
    <path
      v-else
      d="M25 41 Q32 47 40 41"
      fill="none"
      stroke="#3D2B27"
      stroke-width="2.3"
      stroke-linecap="round"
    />

    <g v-if="look.hat === 'headphones'">
      <path
        d="M10 31 C11 12 53 12 54 31"
        fill="none"
        stroke="#3D2B27"
        stroke-width="3.2"
        stroke-linecap="round"
      />
      <rect x="3.5" y="27" width="9" height="15" rx="4.5" fill="#3D2B27" />
      <rect x="51.5" y="27" width="9" height="15" rx="4.5" fill="#3D2B27" />
      <rect x="5.2" y="30" width="5.6" height="9" rx="2.8" fill="#6A524C" />
      <rect x="53.2" y="30" width="5.6" height="9" rx="2.8" fill="#6A524C" />
    </g>
  </svg>
</template>
