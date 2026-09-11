<script setup lang="ts">
const route = useRoute();
const code = computed(() => String(route.params.code || "").toUpperCase());
const { state, error, liveGuesses, liveEmotes, join, start, playAgain, updateSettings, setAvatar, poke, strokeStart, strokeAdd, undo, clear, guess } =
  useGame();

const needsName = ref(!loadSession()?.name);
const pending = ref(false);
const shareUrl = computed(() =>
  import.meta.client ? window.location.href : "",
);

async function enter(name: string) {
  pending.value = true;
  try {
    await join(code.value, name);
    needsName.value = false;
  } finally {
    pending.value = false;
  }
}

onMounted(async () => {
  const session = loadSession();
  if (session?.name) {
    try {
      await join(code.value, session.name);
    } catch {
      needsName.value = error.value !== "Game not found";
    }
  }
});
</script>

<template>
  <div class="h-full">
    <NameGate
      v-if="needsName"
      button="Join game"
      :pending="pending"
      @submit="enter"
    />
    <div
      v-else-if="error && !state"
      class="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <p class="text-2xl font-semibold">{{ error }}</p>
      <NuxtLink to="/" class="rounded-full bg-coral px-6 py-3 font-semibold text-white shadow-chunk">
        Back home
      </NuxtLink>
    </div>
    <CircleStage
      v-else-if="state"
      :state="state"
      :live-guesses="liveGuesses"
      :live-emotes="liveEmotes"
      :share-url="shareUrl"
      @start="start"
      @play-again="playAgain"
      @update-settings="updateSettings"
      @set-avatar="setAvatar"
      @poke="poke"
      @stroke-start="strokeStart"
      @stroke-add="(id, points) => strokeAdd(id, points)"
      @undo="undo"
      @clear="clear"
      @guess="guess"
    />
    <div v-else class="flex h-full items-center justify-center text-ink/50">
      Hopping in...
    </div>
  </div>
</template>
