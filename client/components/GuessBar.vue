<script setup lang="ts">
const model = defineModel<string>({ required: true });
const emit = defineEmits<{
  submit: [];
}>();

const COOLDOWN_MS = 2000;
const cooldownUntil = ref(0);
const now = ref(Date.now());

const remaining = computed(() => Math.max(0, cooldownUntil.value - now.value));
const cooling = computed(() => remaining.value > 0);
const cooldownLabel = computed(() => {
  const ms = remaining.value;
  if (ms <= 0) return "";
  const n = ms > 1000 ? 2 : ms > 250 ? 1 : 0;
  return `:${String(n).padStart(2, "0")}`;
});

function submit() {
  if (cooling.value) return;
  if (!model.value.trim()) return;
  emit("submit");
  cooldownUntil.value = Date.now() + COOLDOWN_MS;
}

let tick: number | undefined;
onMounted(() => {
  tick = window.setInterval(() => {
    now.value = Date.now();
  }, 80);
});
onUnmounted(() => {
  if (tick) clearInterval(tick);
});
</script>

<template>
  <form
    class="flex w-full gap-2 md:w-[min(92vw,520px)]"
    @submit.prevent="submit"
  >
    <input
      v-model="model"
      maxlength="48"
      placeholder="Type your guess..."
      class="min-w-0 flex-1 rounded-full border-4 border-ink/10 bg-paper px-5 py-3.5 text-lg font-medium shadow-chunk outline-none placeholder:text-ink/30 focus:border-coral md:px-6 md:py-4 md:text-xl"
    />
    <button
      type="submit"
      class="relative min-w-[4.75rem] rounded-full bg-coral px-5 py-3 font-semibold text-white shadow-chunk disabled:cursor-not-allowed"
      :disabled="cooling"
    >
      <span :class="cooling ? 'opacity-0' : ''">Send</span>
      <span
        v-if="cooling"
        class="absolute inset-0 flex items-center justify-center tabular-nums"
      >
        {{ cooldownLabel }}
      </span>
    </button>
  </form>
</template>
