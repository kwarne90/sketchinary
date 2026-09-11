<script setup lang="ts">
import logoSrc from "~/assets/images/logo.png";

const { box, moving } = useBrandLogo();
</script>

<template>
  <img
    v-if="box"
    :src="logoSrc"
    alt="Sketchinary"
    draggable="false"
    class="brand-float select-none"
    :class="{ 'is-moving': moving }"
    :style="{
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      height: `${box.height}px`,
      transform: `translateZ(0) scale(${box.scale ?? 1}) rotate(${box.rotate ?? 0}deg)`,
    }"
  />
</template>
