<script setup lang="ts">
const { create, error } = useGame();
const pending = ref(false);

async function onCreate(name: string) {
  pending.value = true;
  try {
    const code = await create(name);
    await navigateTo(`/g/${code}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Could not create game";
    pending.value = false;
  }
}
</script>

<template>
  <div class="h-full">
    <NameGate button="Create game" :pending="pending" @submit="onCreate" />
    <p v-if="error" class="fixed bottom-6 left-0 right-0 text-center text-coral">
      {{ error }}
    </p>
  </div>
</template>
