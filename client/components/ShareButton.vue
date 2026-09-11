<script setup lang="ts">
const props = defineProps<{
  url: string;
}>();

const copied = ref(false);

async function copy() {
  try {
    await navigator.clipboard.writeText(props.url);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    copied.value = false;
  }
}
</script>

<template>
  <button
    type="button"
    class="rounded-full bg-paper px-4 py-2 text-sm font-semibold shadow-bubble hover:-translate-y-0.5"
    @click="copy"
  >
    {{ copied ? "Copied!" : "Copy link" }}
  </button>
</template>
