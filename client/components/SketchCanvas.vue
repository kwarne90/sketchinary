<script setup lang="ts">
import type { Point, Stroke } from "#shared";

const props = defineProps<{
  strokes: Stroke[];
  interactive: boolean;
  color: string;
  width: number;
  mode: "draw" | "erase";
}>();

const emit = defineEmits<{
  start: [stroke: Stroke];
  add: [id: string, points: Point[]];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const drawing = ref(false);
const strokeId = ref("");
let pending: Point[] = [];
let lastEmit = 0;

function pointFromEvent(event: PointerEvent): Point {
  const canvas = canvasRef.value!;
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  };
}

function redraw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const cssWidth = canvas.clientWidth;
  const cssHeight = canvas.clientHeight;
  if (canvas.width !== Math.round(cssWidth * dpr) || canvas.height !== Math.round(cssHeight * dpr)) {
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of props.strokes) {
    if (stroke.points.length < 1) continue;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.globalCompositeOperation =
      stroke.mode === "erase" ? "destination-out" : "source-over";
    const first = stroke.points[0];
    ctx.moveTo(first.x * cssWidth, first.y * cssHeight);
    for (let i = 1; i < stroke.points.length; i++) {
      const point = stroke.points[i];
      ctx.lineTo(point.x * cssWidth, point.y * cssHeight);
    }
    if (stroke.points.length === 1) {
      ctx.lineTo(first.x * cssWidth + 0.1, first.y * cssHeight);
    }
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
}

function flush() {
  if (!strokeId.value || pending.length === 0) return;
  emit("add", strokeId.value, pending);
  pending = [];
  lastEmit = performance.now();
}

function onPointerDown(event: PointerEvent) {
  if (!props.interactive) return;
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.setPointerCapture(event.pointerId);
  drawing.value = true;
  const id = newId();
  strokeId.value = id;
  const point = pointFromEvent(event);
  pending = [];
  emit("start", {
    id,
    color: props.color,
    width: props.width,
    mode: props.mode,
    points: [point],
  });
}

function onPointerMove(event: PointerEvent) {
  if (!drawing.value || !props.interactive) return;
  pending.push(pointFromEvent(event));
  if (performance.now() - lastEmit > 40) flush();
}

function onPointerUp() {
  if (!drawing.value) return;
  drawing.value = false;
  flush();
  strokeId.value = "";
}

let resizeObserver: ResizeObserver | undefined;

watch(
  () => props.strokes,
  () => redraw(),
  { deep: true },
);

onMounted(() => {
  redraw();
  window.addEventListener("resize", redraw);
  if (canvasRef.value?.parentElement) {
    resizeObserver = new ResizeObserver(() => redraw());
    resizeObserver.observe(canvasRef.value.parentElement);
  }
});
onUnmounted(() => {
  window.removeEventListener("resize", redraw);
  resizeObserver?.disconnect();
});
</script>

<template>
  <canvas
    ref="canvasRef"
    class="h-full w-full touch-none"
    :class="interactive ? 'cursor-crosshair' : 'pointer-events-none'"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  />
</template>
