<script setup lang="ts">
const model = defineModel<string>({ required: true });
const emit = defineEmits<{
  submit: [];
}>();
</script>

<template>
  <form
    class="flex w-full gap-2 md:w-[min(92vw,520px)]"
    @submit.prevent="emit('submit')"
  >
    <input
      v-model="model"
      maxlength="48"
      placeholder="Type your guess..."
      class="min-w-0 flex-1 rounded-full border-4 border-ink/10 bg-paper px-5 py-3.5 text-lg font-medium shadow-chunk outline-none placeholder:text-ink/30 focus:border-coral md:px-6 md:py-4 md:text-xl"
    />
    <button
      type="submit"
      class="rounded-full bg-coral px-5 py-3 font-semibold text-white shadow-chunk"
    >
      Send
    </button>
  </form>
</template>
