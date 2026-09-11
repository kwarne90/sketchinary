<script setup lang="ts">
const model = defineModel<string>({ required: true });
const emit = defineEmits<{
  submit: [];
}>();
</script>

<template>
  <form
    class="flex w-[min(92%,520px)] gap-2"
    @submit.prevent="emit('submit')"
  >
    <input
      v-model="model"
      maxlength="48"
      placeholder="Type your guess..."
      class="min-w-0 flex-1 rounded-full border-4 border-ink/10 bg-paper px-6 py-4 text-xl font-medium shadow-chunk outline-none placeholder:text-ink/30 focus:border-coral"
    />
    <button
      type="submit"
      class="rounded-full bg-coral px-5 py-3 font-semibold text-white shadow-chunk"
    >
      Send
    </button>
  </form>
</template>
