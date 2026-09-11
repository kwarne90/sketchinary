<script setup lang="ts">
import { decodeAvatar, type Emote, type Guess, type Player } from "#shared";
import GlitterFall from "./GlitterFall.vue";

defineProps<{
  player: Player;
  youId: string;
  sketcherId: string | null;
  hostId: string;
  size: number;
  bubble?: Guess;
  emote?: Emote;
  reacting?: boolean;
  corner?: boolean;
  absorbing?: boolean;
  glitter?: boolean;
  float?: boolean;
  labelSide?: "left" | "right" | "below";
}>();

const emit = defineEmits<{
  select: [];
  hoverOn: [];
  hoverOff: [];
}>();
</script>

<template>
  <button
    type="button"
    class="avatar-hit relative inline-flex w-max flex-col items-center border-0 bg-transparent p-0 pointer-events-auto cursor-pointer"
    :title="player.id === youId ? 'Change your look' : 'Poke'"
    @click="emit('select')"
    @mouseenter="emit('hoverOn')"
    @mouseleave="emit('hoverOff')"
  >
    <div
      class="avatar-shell relative"
      :class="{
        'opacity-50': !player.connected,
        'is-reacting': reacting,
        'is-correct-react': reacting && bubble?.correct,
        'is-absorb': absorbing,
      }"
    >
      <div
        v-if="bubble"
        class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 w-max max-w-[128px] -translate-x-1/2"
      >
        <div
          class="speech-bubble px-3 py-1.5 text-center text-sm font-medium"
          :class="bubble.correct ? 'is-correct' : 'is-guess'"
        >
          {{ bubble.correct ? "Got it!" : bubble.text }}
        </div>
      </div>
      <div
        class="avatar-bob"
        :class="{ 'is-sketcher': player.id === sketcherId }"
      >
        <BlobAvatar :name="player.name" :avatar="player.avatar" :size="size" />
        <svg
          v-if="player.id === hostId"
          class="host-crown"
          width="28"
          height="18"
          viewBox="0 0 28 18"
          aria-hidden="true"
        >
          <path
            d="M3.5 14 L5.5 5.5 L10.5 10.5 L14 3.2 L17.5 10.5 L22.5 5.5 L24.5 14 Z"
            fill="#FFD166"
            stroke="#3D2B27"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <rect x="3.2" y="13" width="21.6" height="3.4" rx="1.2" fill="#FFD166" stroke="#3D2B27" stroke-width="1.4" />
          <circle cx="5.5" cy="5.4" r="1.7" fill="#FF6B5B" stroke="#3D2B27" stroke-width="1.1" />
          <circle cx="14" cy="3.2" r="1.7" fill="#3ECFCF" stroke="#3D2B27" stroke-width="1.1" />
          <circle cx="22.5" cy="5.4" r="1.7" fill="#8B7CFF" stroke="#3D2B27" stroke-width="1.1" />
        </svg>
      </div>
      <GlitterFall v-show="glitter" />
      <SketcherTool
        :utensil="decodeAvatar(player.avatar).utensil"
        placed
        animate
      />
      <EmoteBurst
        v-if="emote"
        :key="`${player.id}-${emote.at}`"
        :emote="emote"
      />
    </div>
    <div
      class="min-w-[3.4rem] max-w-[6.75rem] rounded-2xl bg-paper px-2.5 pb-1.5 pt-1.5 shadow-bubble"
      :class="[
        player.id === sketcherId ? 'is-turn-pill' : '',
        !labelSide || labelSide === 'below'
          ? 'relative mt-1.5'
          : labelSide === 'left'
            ? 'absolute right-full top-1/2 mr-2 -translate-y-1/2'
            : 'absolute left-full top-1/2 ml-2 -translate-y-1/2',
      ]"
    >
      <p
        class="truncate text-left text-[13px] font-semibold leading-none"
        :class="player.id === sketcherId ? 'text-coral' : 'text-ink'"
      >
        {{ player.name }}
      </p>
      <p
        v-if="player.id === youId"
        class="mt-0.5 text-left text-[10px] font-medium leading-none text-ink/45"
      >
        you
      </p>
      <span
        v-if="player.score"
        class="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FFD166] px-1 text-[10px] font-semibold leading-none text-ink"
      >
        {{ player.score }}
      </span>
    </div>
  </button>
</template>
