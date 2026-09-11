<script setup lang="ts">
import { Check, Link2 } from "@lucide/vue";

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
    class="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-paper text-ink shadow-bubble hover:-translate-y-0.5"
    :aria-label="copied ? 'Copied' : 'Copy link'"
    :title="copied ? 'Copied' : 'Copy link'"
    @click="copy"
  >
    <Check v-if="copied" :size="18" :stroke-width="2.4" class="text-coral" />
    <Link2 v-else :size="18" :stroke-width="2.4" />
  </button>
</template>
