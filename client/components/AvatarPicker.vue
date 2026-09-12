<script setup lang="ts">
import { X } from "@lucide/vue";
import {
  AVATAR_EXPRESSIONS,
  AVATAR_EYES,
  AVATAR_HATS,
  AVATAR_PALETTE,
  AVATAR_UTENSILS,
  decodeAvatar,
  encodeAvatar,
  type AvatarExpression,
  type AvatarEyes,
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

function setEyes(eyes: AvatarEyes) {
  look.eyes = eyes;
  commit();
}

function setExpression(expression: AvatarExpression) {
  look.expression = expression;
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

const hatLabel: Record<Exclude<AvatarHat, "cap">, string> = {
  none: "None",
  beanie: "Beanie",
  headphones: "Cans",
  bow: "Bow",
  flower: "Flower",
};
const accessoryOptions = AVATAR_HATS.filter((hat): hat is Exclude<AvatarHat, "cap"> => hat !== "cap");

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
const eyeLabel: Record<AvatarEyes, string> = {
  none: "None",
  glasses: "Glasses",
  shades: "Shades",
  goggles: "Goggles",
};
const expressionLabel: Record<AvatarExpression, string> = {
  happy: "Happy",
  nervous: "Nervous",
  dizzy: "Dizzy",
  surprised: "Surprised",
  confused: "Confused",
  smug: "Smug",
};

function chipOn(on: boolean) {
  return on ? "bg-coral text-white" : "bg-ink/5 text-ink hover:bg-ink/10";
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-start justify-center bg-ink/40 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-[max(5.5rem,calc(env(safe-area-inset-top)+3.5rem))] sm:items-center sm:py-8"
    @click.self="close"
  >
    <div
      class="relative w-full max-w-sm max-h-[calc(100svh-7.5rem)] overflow-y-auto rounded-[2rem] bg-paper p-5 pt-6 shadow-chunk sm:max-h-[min(90vh,52rem)] sm:max-w-lg md:max-h-none md:max-w-3xl md:overflow-visible md:p-7"
    >
      <button
        type="button"
        class="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-cream text-ink md:right-5 md:top-5"
        aria-label="Close"
        @click="close"
      >
        <X :size="18" :stroke-width="2.4" />
      </button>
      <div class="md:grid md:grid-cols-[16rem_1fr] md:items-stretch md:gap-x-8">
        <div class="flex flex-col items-center rounded-[1.6rem] bg-cream px-4 py-5 md:justify-center">
          <p class="text-sm font-semibold uppercase tracking-[0.18em] text-coral">
            Your look
          </p>
          <div class="relative my-5 w-[120px]">
            <BlobAvatar :name="draftName || name" :avatar="encodeAvatar(look)" :size="120" />
            <SketcherTool :utensil="look.utensil" :size="28" placed animate />
          </div>

          <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Name</p>
          <input
            v-model="draftName"
            maxlength="16"
            autocomplete="nickname"
            class="w-full rounded-full border-4 border-ink/10 bg-paper px-4 py-2.5 text-center text-lg font-medium outline-none placeholder:text-ink/30 focus:border-coral"
            @blur="commitName"
            @keydown.enter.prevent="commitName"
          />
          <p v-if="nameError" class="mt-2 text-center text-sm text-coral">{{ nameError }}</p>
        </div>

        <div class="mt-5 space-y-3.5 md:mt-0 md:flex md:flex-col md:justify-center">
          <div class="flex items-start gap-3">
            <p class="mt-2 w-[4.75rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-ink/50">Color</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="(swatch, index) in AVATAR_PALETTE"
                :key="swatch"
                type="button"
                class="h-8 w-8 rounded-full border-[3px] transition"
                :class="look.color === index ? 'border-ink' : 'border-transparent hover:border-ink/20'"
                :style="{ background: swatch }"
                @click="setColor(index)"
              />
            </div>
          </div>

          <div class="flex items-start gap-3">
            <p class="mt-2 w-[4.75rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-ink/50">Accessory</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="hat in accessoryOptions"
                :key="hat"
                type="button"
                class="rounded-full px-3 py-1.5 text-sm font-semibold transition"
                :class="chipOn(look.hat === hat)"
                @click="setHat(hat)"
              >
                {{ hatLabel[hat] }}
              </button>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <p class="mt-2 w-[4.75rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-ink/50">Eyes</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="eyes in AVATAR_EYES"
                :key="eyes"
                type="button"
                class="rounded-full px-3 py-1.5 text-sm font-semibold transition"
                :class="chipOn(look.eyes === eyes)"
                @click="setEyes(eyes)"
              >
                {{ eyeLabel[eyes] }}
              </button>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <p class="mt-2 w-[4.75rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-ink/50">Expression</p>
            <div class="grid grid-cols-3 gap-1.5">
              <button
                v-for="expression in AVATAR_EXPRESSIONS"
                :key="expression"
                type="button"
                class="rounded-full px-3 py-1.5 text-sm font-semibold transition"
                :class="chipOn(look.expression === expression)"
                @click="setExpression(expression)"
              >
                {{ expressionLabel[expression] }}
              </button>
            </div>
          </div>

          <div class="flex items-start gap-3">
            <p class="mt-2 w-[4.75rem] shrink-0 text-xs font-semibold uppercase tracking-wide text-ink/50">Tool</p>
            <div class="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              <button
                v-for="tool in AVATAR_UTENSILS"
                :key="tool"
                type="button"
                class="flex items-center justify-center gap-1 rounded-full py-1.5 pl-1 pr-2 text-sm font-semibold transition"
                :class="chipOn(look.utensil === tool)"
                @click="setUtensil(tool)"
              >
                <SketcherTool :utensil="tool" :size="20" />
                {{ utensilLabel[tool] }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="mt-6 w-full rounded-full bg-coral py-3 text-lg font-semibold text-white shadow-chunk transition hover:-translate-y-0.5"
        @click="close"
      >
        Done
      </button>
    </div>
  </div>
</template>
