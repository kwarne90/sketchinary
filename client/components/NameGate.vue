<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title?: string;
    button: string;
    pending?: boolean;
  }>(),
  { title: "Pick your name" },
);

const emit = defineEmits<{
  submit: [name: string];
}>();

const name = ref("");
const fading = ref(false);

watch(
  () => props.pending,
  (next, prev) => {
    if (prev && !next) fading.value = false;
  },
);

function submit() {
  const next = name.value.trim();
  if (!next || fading.value) return;
  fading.value = true;
  emit("submit", next);
}
</script>

<template>
  <form
    class="flex h-full min-h-full flex-col items-center justify-center px-6"
    @submit.prevent="submit"
  >
    <BrandLogoSlot size="hero" />
    <div class="gate-copy w-full max-w-md" :class="{ 'is-out': fading }">
      <h1 class="mb-8 text-center text-4xl font-semibold sm:text-5xl">
        {{ title }}
      </h1>
      <input
        v-model="name"
        maxlength="16"
        autocomplete="nickname"
        placeholder="Your name"
        :disabled="pending || fading"
        class="mb-5 w-full rounded-3xl border-4 border-ink/10 bg-paper px-6 py-5 text-center text-2xl font-medium shadow-chunk outline-none placeholder:text-ink/30 focus:border-coral"
      />
      <div class="flex justify-center">
        <button
          type="submit"
          :disabled="pending || fading || !name.trim()"
          class="rounded-full bg-coral px-10 py-4 text-xl font-semibold text-white shadow-chunk transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {{ button }}
        </button>
      </div>
    </div>
  </form>
</template>
