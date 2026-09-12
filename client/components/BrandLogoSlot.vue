<script setup lang="ts">
const props = defineProps<{
  size: "hero" | "header";
}>();

const el = useBrandLogoSlot(props.size);
</script>

<template>
  <div
    ref="el"
    aria-hidden="true"
    :class="size === 'hero' ? 'mb-6 w-[min(88vw,20rem)]' : 'h-14 md:h-16'"
    :style="{ aspectRatio: '960 / 437' }"
  />
</template>
