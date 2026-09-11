<script setup lang="ts">
import {
  AVATAR_HATS,
  AVATAR_PALETTE,
  AVATAR_UTENSILS,
  decodeAvatar,
  encodeAvatar,
  type AvatarHat,
  type AvatarLook,
  type AvatarUtensil,
} from "#shared";

const props = defineProps<{
  name: string;
  avatar: number;
}>();

const emit = defineEmits<{
  update: [avatar: number];
  close: [];
}>();

const look = reactive<AvatarLook>(decodeAvatar(props.avatar));
const draftName = ref(props.name);
const nameError = ref("");

watch(
  () => props.avatar,
  (value) => Object.assign(look, decodeAvatar(value)),
);
watch(
  () => props.name,
  (value) => {
    draftName.value = value;
    nameError.value = "";
  },
);

function commit() {
  emit("update", encodeAvatar(look));
}

function setColor(index: number) {
  look.color = index;
  commit();
}

function setHat(hat: AvatarHat) {
  look.hat = hat;
  commit();
}

function setUtensil(utensil: AvatarUtensil) {
  look.utensil = utensil;
  commit();
}

function toggle<K extends "wink" | "glasses" | "blush" | "openMouth">(key: K) {
  look[key] = !look[key];
  commit();
}

const { setName } = useGame();

async function commitName() {
  const next = draftName.value.trim().slice(0, 16);
  if (!next) {
    draftName.value = props.name;
    nameError.value = "";
    return;
  }
  if (next === props.name) return;
  nameError.value = "";
  try {
    await setName(next);
  } catch (err) {
    nameError.value = err instanceof Error ? err.message : "Could not change name";
    draftName.value = props.name;
  }
}

async function close() {
  await commitName();
  if (nameError.value) return;
  emit("close");
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") close();
}

onMounted(() => window.addEventListener("keydown", onKey));
onUnmounted(() => window.removeEventListener("keydown", onKey));

const hatLabel: Record<AvatarHat, string> = {
  none: "None",
  beanie: "Hat",
  headphones: "Cans",
  bow: "Bow",
};

const utensilLabel: Record<AvatarUtensil, string> = {
  pencil: "Pencil",
  wand: "Wand",
  fry: "Fry",
  pen: "Pen",
  quill: "Quill",
  crayon: "Crayon",
  marker: "Marker",
  brush: "Brush",
};
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
    @click.self="close"
  >
    <div
      class="w-full max-w-sm rounded-[2rem] bg-paper p-5 shadow-chunk"
      style="max-height: min(90vh, 640px); overflow-y: auto"
    >
      <p class="text-center text-sm font-semibold uppercase tracking-[0.18em] text-coral">
        Your look
      </p>
      <div class="relative mx-auto my-3 w-[88px]">
        <BlobAvatar :name="draftName || name" :avatar="encodeAvatar(look)" :size="88" />
        <SketcherTool :utensil="look.utensil" placed />
      </div>

      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Name</p>
      <input
        v-model="draftName"
        maxlength="16"
        autocomplete="nickname"
        class="mb-4 w-full rounded-full border-4 border-ink/10 bg-cream px-4 py-2.5 text-center text-lg font-medium outline-none placeholder:text-ink/30 focus:border-coral"
        @blur="commitName"
        @keydown.enter.prevent="commitName"
      />
      <p v-if="nameError" class="-mt-3 mb-3 text-center text-sm text-coral">{{ nameError }}</p>

      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Color</p>
      <div class="mb-4 flex flex-wrap justify-center gap-2">
        <button
          v-for="(swatch, index) in AVATAR_PALETTE"
          :key="swatch"
          type="button"
          class="h-8 w-8 rounded-full border-[3px]"
          :class="look.color === index ? 'border-ink' : 'border-transparent'"
          :style="{ background: swatch }"
          @click="setColor(index)"
        />
      </div>

      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Hat</p>
      <div class="mb-4 flex flex-wrap gap-1">
        <button
          v-for="hat in AVATAR_HATS"
          :key="hat"
          type="button"
          class="rounded-full px-3 py-1.5 text-sm font-semibold"
          :class="look.hat === hat ? 'bg-coral text-white' : 'bg-ink/5 text-ink'"
          @click="setHat(hat)"
        >
          {{ hatLabel[hat] }}
        </button>
      </div>

      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Tool</p>
      <div class="mb-4 flex flex-wrap gap-1">
        <button
          v-for="tool in AVATAR_UTENSILS"
          :key="tool"
          type="button"
          class="flex items-center gap-1 rounded-full py-1 pl-1 pr-3 text-sm font-semibold"
          :class="look.utensil === tool ? 'bg-coral text-white' : 'bg-ink/5 text-ink'"
          @click="setUtensil(tool)"
        >
          <SketcherTool :utensil="tool" :size="20" />
          {{ utensilLabel[tool] }}
        </button>
      </div>

      <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Face</p>
      <div class="mb-5 flex flex-wrap gap-1">
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-sm font-semibold"
          :class="look.wink ? 'bg-coral text-white' : 'bg-ink/5 text-ink'"
          @click="toggle('wink')"
        >
          Wink
        </button>
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-sm font-semibold"
          :class="look.glasses ? 'bg-coral text-white' : 'bg-ink/5 text-ink'"
          @click="toggle('glasses')"
        >
          Glasses
        </button>
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-sm font-semibold"
          :class="look.blush ? 'bg-coral text-white' : 'bg-ink/5 text-ink'"
          @click="toggle('blush')"
        >
          Blush
        </button>
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-sm font-semibold"
          :class="look.openMouth ? 'bg-coral text-white' : 'bg-ink/5 text-ink'"
          @click="toggle('openMouth')"
        >
          Grin
        </button>
      </div>

      <button
        type="button"
        class="w-full rounded-full bg-coral py-3 text-lg font-semibold text-white shadow-chunk"
        @click="close"
      >
        Done
      </button>
    </div>
  </div>
</template>
