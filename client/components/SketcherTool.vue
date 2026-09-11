<script setup lang="ts">
import type { AvatarUtensil } from "#shared";

defineProps<{
  utensil: AvatarUtensil;
  placed?: boolean;
  animate?: boolean;
  dim?: boolean;
  size?: number;
}>();
</script>

<template>
  <svg
    :class="{ 'sketcher-tool': placed, 'is-scribbling': placed && animate, 'is-idle': placed && dim }"
    :width="size || 22"
    :height="size || 22"
    viewBox="0 0 22 22"
    aria-hidden="true"
  >
    <g transform="rotate(-38 11 11)">
      <template v-if="utensil === 'pencil'">
        <rect x="9" y="3" width="4" height="12" rx="1" fill="#FFD166" stroke="#3D2B27" stroke-width="1.4" />
        <path d="M9 15 L11 20 L13 15 Z" fill="#E8C4A8" stroke="#3D2B27" stroke-width="1.4" stroke-linejoin="round" />
        <rect x="9" y="2" width="4" height="3.2" rx="0.8" fill="#FF6B5B" stroke="#3D2B27" stroke-width="1.4" />
        <path d="M11 19.4 L11 20.6" stroke="#3D2B27" stroke-width="1.3" stroke-linecap="round" />
      </template>

      <template v-else-if="utensil === 'wand'">
        <rect x="10" y="6" width="2.2" height="13" rx="1" fill="#8B7CFF" stroke="#3D2B27" stroke-width="1.3" />
        <path
          d="M11 2.2 L12.1 6.2 L16.4 6.4 L13.1 8.9 L14.2 13 L11 10.6 L7.8 13 L8.9 8.9 L5.6 6.4 L10 6.2 Z"
          fill="#FFD166"
          stroke="#3D2B27"
          stroke-width="1.3"
          stroke-linejoin="round"
        />
      </template>

      <template v-else-if="utensil === 'fry'">
        <rect x="8.6" y="3" width="4.8" height="16" rx="2" fill="#FFB347" stroke="#3D2B27" stroke-width="1.4" />
        <rect x="8.6" y="3" width="4.8" height="4" rx="2" fill="#FF6B5B" stroke="#3D2B27" stroke-width="1.4" />
        <path d="M10 8 V16.5 M12 8.5 V16" stroke="#E89B2D" stroke-width="0.8" stroke-linecap="round" />
      </template>

      <template v-else-if="utensil === 'pen'">
        <rect x="9.2" y="2.4" width="3.6" height="13" rx="1" fill="#6CB6FF" stroke="#3D2B27" stroke-width="1.4" />
        <rect x="9.2" y="2.4" width="3.6" height="3" rx="0.8" fill="#3D2B27" />
        <path d="M9.2 15.2 L11 20.2 L12.8 15.2 Z" fill="#C9D7E8" stroke="#3D2B27" stroke-width="1.3" stroke-linejoin="round" />
        <path d="M11 19.4 L11 20.6" stroke="#3D2B27" stroke-width="1.2" stroke-linecap="round" />
      </template>

      <template v-else-if="utensil === 'quill'">
        <path
          d="M11 20 L10.4 12 C8.2 8 9 3.4 14.4 2.4 C12.2 5.2 12.8 9.4 12 12 L11 20 Z"
          fill="#FFF8EE"
          stroke="#3D2B27"
          stroke-width="1.3"
          stroke-linejoin="round"
        />
        <path d="M11.2 6 C12.4 7.6 12.6 10 12.2 12.4" fill="none" stroke="#3D2B27" stroke-width="0.9" />
        <path d="M11 19.2 L11 20.6" stroke="#3D2B27" stroke-width="1.2" stroke-linecap="round" />
      </template>

      <template v-else-if="utensil === 'crayon'">
        <rect x="8.8" y="5" width="4.4" height="11" rx="1" fill="#FF8FAB" stroke="#3D2B27" stroke-width="1.4" />
        <path d="M8.8 5 L11 2.2 L13.2 5 Z" fill="#FF8FAB" stroke="#3D2B27" stroke-width="1.3" stroke-linejoin="round" />
        <rect x="8.8" y="14.6" width="4.4" height="3.4" rx="0.8" fill="#FFF8EE" stroke="#3D2B27" stroke-width="1.3" />
        <path d="M11 17.8 L11 20.2" stroke="#3D2B27" stroke-width="1.2" stroke-linecap="round" />
      </template>

      <template v-else-if="utensil === 'marker'">
        <rect x="8.6" y="5.4" width="4.8" height="11.2" rx="1.4" fill="#3ECFCF" stroke="#3D2B27" stroke-width="1.4" />
        <rect x="9.2" y="2.2" width="3.6" height="4.4" rx="1" fill="#2AA8A8" stroke="#3D2B27" stroke-width="1.3" />
        <rect x="9.4" y="16.2" width="3.2" height="3.4" rx="0.7" fill="#2B211E" stroke="#3D2B27" stroke-width="1.2" />
      </template>

      <template v-else>
        <rect x="9.4" y="7.4" width="3.2" height="9" rx="1.4" fill="#8B7CFF" stroke="#3D2B27" stroke-width="1.3" />
        <path
          d="M7.4 7.6 C7.4 4.2 14.6 4.2 14.6 7.6 C12.8 7.6 12.2 10.2 11 11.4 C9.8 10.2 9.2 7.6 7.4 7.6 Z"
          fill="#7BD389"
          stroke="#3D2B27"
          stroke-width="1.3"
          stroke-linejoin="round"
        />
        <path d="M11 16.2 L11 20.4" stroke="#3D2B27" stroke-width="1.2" stroke-linecap="round" />
      </template>
    </g>
  </svg>
</template>
