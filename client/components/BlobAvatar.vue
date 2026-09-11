<script setup lang="ts">
import { AVATAR_PALETTE, decodeAvatar } from "#shared";
import glassesSrc from "~/assets/images/glasses.svg?url";
import gogglesSrc from "~/assets/images/goggles.svg?url";
import shadesSrc from "~/assets/images/shades.svg?url";

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
    overflow="visible"
    aria-hidden="true"
  >
    <circle cx="32" cy="34" r="22" :fill="color" stroke="#3D2B27" stroke-width="2.2" />

    <g v-if="look.hat === 'beanie'" transform="translate(1 -4) rotate(18 40 20)">
      <path
        d="M18 27 C18 5 56 5 56 27 Z"
        fill="#FF6B5B"
        stroke="#3D2B27"
        stroke-width="1.7"
        stroke-linejoin="round"
      />
      <rect x="17.2" y="22.4" width="39.6" height="7.6" rx="2.6" fill="#FFF8EE" stroke="#3D2B27" stroke-width="1.6" />
      <path d="M22 26.2 H52" stroke="#3D2B27" stroke-width="1.1" stroke-linecap="round" opacity="0.28" />
      <circle cx="37" cy="9.2" r="4.1" fill="#FFD166" stroke="#3D2B27" stroke-width="1.5" />
    </g>
    <g v-else-if="look.hat === 'bow'" transform="rotate(20 44 15)">
      <path
        d="M43.2 14.2 L29.6 9.2 L31.2 19.4 L43.2 17.8 Z"
        fill="#FF8FAB"
        stroke="#3D2B27"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path
        d="M44.8 14.2 L58.4 9.2 L56.8 19.4 L44.8 17.8 Z"
        fill="#FF8FAB"
        stroke="#3D2B27"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <rect x="41.2" y="12.8" width="5.8" height="7" rx="1.6" fill="#FF6B5B" stroke="#3D2B27" stroke-width="1.5" />
    </g>
    <g v-else-if="look.hat === 'flower'" transform="translate(12 -1)">
      <circle cx="32" cy="8.6" r="3.3" fill="#FF8FAB" stroke="#3D2B27" stroke-width="1.35" />
      <circle cx="37.2" cy="12.2" r="3.3" fill="#FF8FAB" stroke="#3D2B27" stroke-width="1.35" />
      <circle cx="35.2" cy="17.6" r="3.3" fill="#FF8FAB" stroke="#3D2B27" stroke-width="1.35" />
      <circle cx="28.8" cy="17.6" r="3.3" fill="#FF8FAB" stroke="#3D2B27" stroke-width="1.35" />
      <circle cx="26.8" cy="12.2" r="3.3" fill="#FF8FAB" stroke="#3D2B27" stroke-width="1.35" />
      <circle cx="32" cy="13.2" r="2.8" fill="#FFD166" stroke="#3D2B27" stroke-width="1.4" />
    </g>

    <g v-if="look.expression === 'happy'">
      <circle cx="24.5" cy="32" r="3.4" fill="#3D2B27" />
      <circle cx="39.5" cy="32" r="3.4" fill="#3D2B27" />
      <circle cx="25.5" cy="31" r="1.1" fill="#FFF8EE" />
      <circle cx="40.5" cy="31" r="1.1" fill="#FFF8EE" />
      <path d="M25 41 Q32 47 40 41" fill="none" stroke="#3D2B27" stroke-width="2.3" stroke-linecap="round" />
    </g>
    <g v-else-if="look.expression === 'nervous'">
      <ellipse cx="24.5" cy="32.2" rx="4.4" ry="4.8" fill="#FFF8EE" stroke="#3D2B27" stroke-width="1.7" />
      <ellipse cx="39.5" cy="32.2" rx="4.4" ry="4.8" fill="#FFF8EE" stroke="#3D2B27" stroke-width="1.7" />
      <circle cx="23" cy="32.8" r="2.1" fill="#3D2B27" />
      <circle cx="38" cy="32.8" r="2.1" fill="#3D2B27" />
      <circle cx="23.6" cy="31.8" r="0.7" fill="#FFF8EE" />
      <circle cx="38.6" cy="31.8" r="0.7" fill="#FFF8EE" />
      <circle cx="18" cy="38.4" r="3.1" fill="#FF8A80" opacity="0.85" />
      <circle cx="46" cy="38.4" r="3.1" fill="#FF8A80" opacity="0.85" />
      <path d="M26 43.4 Q32 40.6 38 43.4" fill="none" stroke="#3D2B27" stroke-width="2.2" stroke-linecap="round" />
      <path d="M48.4 24 C48.4 24 52.4 29.6 48.4 32.2 C44.6 29.6 48.4 24 48.4 24" fill="#6CB6FF" stroke="#3D2B27" stroke-width="1.4" stroke-linejoin="round" />
    </g>
    <g v-else-if="look.expression === 'dizzy'">
      <path d="M21.2 28.2 L27.8 35.6 M27.8 28.2 L21.2 35.6" stroke="#3D2B27" stroke-width="2.3" stroke-linecap="round" />
      <path d="M36.2 28.2 L42.8 35.6 M42.8 28.2 L36.2 35.6" stroke="#3D2B27" stroke-width="2.3" stroke-linecap="round" />
      <path d="M24 42.4 Q27.5 39.4 31 42.4 Q34.5 45.4 38 42.4 Q41 40.2 43 42.2" fill="none" stroke="#3D2B27" stroke-width="2.2" stroke-linecap="round" />
    </g>
    <g v-else-if="look.expression === 'surprised'">
      <circle cx="24.5" cy="31.6" r="5.3" fill="#FFF8EE" stroke="#3D2B27" stroke-width="1.7" />
      <circle cx="39.5" cy="31.6" r="5.3" fill="#FFF8EE" stroke="#3D2B27" stroke-width="1.7" />
      <circle cx="24.5" cy="32.1" r="2.5" fill="#3D2B27" />
      <circle cx="39.5" cy="32.1" r="2.5" fill="#3D2B27" />
      <circle cx="25.4" cy="31" r="0.85" fill="#FFF8EE" />
      <circle cx="40.4" cy="31" r="0.85" fill="#FFF8EE" />
      <ellipse cx="32" cy="44.6" rx="4.1" ry="4.5" fill="#3D2B27" />
    </g>
    <g v-else-if="look.expression === 'confused'">
      <path d="M18.8 24.8 Q24.2 21.8 29.4 25.8" fill="none" stroke="#3D2B27" stroke-width="1.8" stroke-linecap="round" />
      <path d="M36.5 27.2 H45.2" fill="none" stroke="#3D2B27" stroke-width="1.8" stroke-linecap="round" />
      <circle cx="24.5" cy="32.4" r="3.5" fill="#3D2B27" />
      <path d="M35.2 32.4 H44.4" stroke="#3D2B27" stroke-width="2.4" stroke-linecap="round" />
      <circle cx="25.4" cy="31.4" r="1" fill="#FFF8EE" />
      <path d="M25 43 Q28.4 39.6 31.6 43 Q34.8 46.4 39.2 41.8" fill="none" stroke="#3D2B27" stroke-width="2.2" stroke-linecap="round" />
    </g>
    <g v-else>
      <circle cx="24.5" cy="32.6" r="3.3" fill="#3D2B27" />
      <circle cx="39.5" cy="32.6" r="3.3" fill="#3D2B27" />
      <path d="M20.4 29.6 H28.6" stroke="#3D2B27" stroke-width="2.3" stroke-linecap="round" />
      <path d="M35.4 29.6 H43.6" stroke="#3D2B27" stroke-width="2.3" stroke-linecap="round" />
      <path d="M36.2 24.6 Q40.4 22.6 45.2 25.4" fill="none" stroke="#3D2B27" stroke-width="1.7" stroke-linecap="round" />
      <path d="M27.2 41.4 Q34.4 47 41.6 39.2" fill="none" stroke="#3D2B27" stroke-width="2.3" stroke-linecap="round" />
    </g>

    <image
      v-if="look.eyes === 'glasses'"
      :href="glassesSrc"
      x="8"
      y="7.5"
      width="48"
      height="48"
      preserveAspectRatio="xMidYMid meet"
    />
    <image
      v-else-if="look.eyes === 'shades'"
      :href="shadesSrc"
      x="9"
      y="8.5"
      width="46"
      height="46"
      preserveAspectRatio="xMidYMid meet"
    />
    <image
      v-else-if="look.eyes === 'goggles'"
      :href="gogglesSrc"
      x="9"
      y="9"
      width="46"
      height="46"
      preserveAspectRatio="xMidYMid meet"
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
