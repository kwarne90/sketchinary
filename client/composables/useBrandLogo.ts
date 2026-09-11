export type BrandLogoKind = "hero" | "header";

export interface BrandLogoBox {
  left: number;
  top: number;
  width: number;
  height: number;
  scale?: number;
  rotate?: number;
}

const FLIGHT_MS = 980;

let owner: BrandLogoKind | null = null;
let flight = 0;
let raf = 0;

export function useBrandLogo() {
  const box = useState<BrandLogoBox | null>("brand-logo-box", () => null);
  const moving = useState("brand-logo-moving", () => false);

  return { box, moving };
}

function center(box: BrandLogoBox) {
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function cubic(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  return {
    x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
    y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y,
  };
}

function easeFlight(t: number) {
  const smooth = t * t * (3 - 2 * t);
  const land = 1 - (1 - t) ** 3;
  return smooth * 0.28 + land * 0.72;
}

function easeSize(t: number) {
  const u = Math.max(0, (t - 0.22) / 0.78);
  return 1 - (1 - u) ** 3;
}

function arcControls(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const goingUp = dy < -8;
  const ceiling = 10;
  if (goingUp) {
    const lift = Math.min(170, Math.max(78, Math.abs(dy) * 0.62 + 64));
    return {
      c1: {
        x: start.x + dx * 0.1,
        y: Math.max(ceiling, Math.min(start.y, end.y) - lift),
      },
      c2: {
        x: lerp(end.x, start.x, 0.28),
        y: Math.max(ceiling, end.y - lift * 0.22),
      },
    };
  }
  const peek = Math.min(96, Math.max(40, Math.abs(dy) * 0.28 + 32));
  return {
    c1: { x: start.x + dx * 0.22, y: Math.max(ceiling, start.y - peek) },
    c2: { x: lerp(end.x, start.x, 0.18), y: end.y - peek * 0.2 },
  };
}

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function restBox(next: BrandLogoBox): BrandLogoBox {
  return {
    left: next.left,
    top: next.top,
    width: next.width,
    height: next.height,
    scale: 1,
    rotate: 0,
  };
}

export function useBrandLogoSlot(kind: BrandLogoKind) {
  const el = ref<HTMLElement | null>(null);
  const { box, moving } = useBrandLogo();
  let observer: ResizeObserver | null = null;
  let ignoreSnap = false;

  function read(): BrandLogoBox | null {
    const node = el.value;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function flyTo(next: BrandLogoBox) {
    const from = box.value;
    if (!from || reducedMotion()) {
      box.value = restBox(next);
      moving.value = false;
      return;
    }
    const id = ++flight;
    moving.value = true;
    const origin = { ...from };
    const p0 = center(origin);
    const p3 = center(next);
    const { c1, c2 } = arcControls(p0, p3);
    const spin = p3.x < p0.x ? 1 : -1;
    const t0 = performance.now();
    cancelAnimationFrame(raf);

    const tick = (now: number) => {
      if (id !== flight) return;
      const u = Math.min(1, (now - t0) / FLIGHT_MS);
      const t = easeFlight(u);
      const pos = cubic(p0, c1, c2, p3, t);
      const sizeT = easeSize(u);
      const width = lerp(origin.width, next.width, sizeT);
      const height = lerp(origin.height, next.height, sizeT);
      const lift = Math.sin(Math.PI * u);
      box.value = {
        left: pos.x - width / 2,
        top: pos.y - height / 2,
        width,
        height,
        scale: 1 + 0.1 * lift * (1 - u * 0.45),
        rotate: spin * 6.5 * lift * (1 - 0.35 * u),
      };
      if (u < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      box.value = restBox(next);
      moving.value = false;
    };

    raf = requestAnimationFrame(tick);
  }

  function paint(motion: boolean) {
    if (owner !== kind) return;
    if (!motion && (moving.value || ignoreSnap)) return;
    const next = read();
    if (!next) return;
    if (motion) {
      flyTo(next);
      return;
    }
    box.value = restBox(next);
  }

  function onResize() {
    paint(false);
  }

  onMounted(() => {
    const from = owner;
    owner = kind;
    const move = from !== null && from !== kind;
    ignoreSnap = move;
    void nextTick().then(() => {
      if (!box.value) paint(false);
      requestAnimationFrame(() => {
        paint(move);
        ignoreSnap = false;
      });
    });
    window.addEventListener("resize", onResize);
    if (typeof ResizeObserver !== "undefined" && el.value) {
      observer = new ResizeObserver(() => paint(false));
      observer.observe(el.value);
    }
  });

  onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
    window.removeEventListener("resize", onResize);
  });

  return el;
}

export function afterGateDelay(startedAt: number, min = 420) {
  const wait = min - (Date.now() - startedAt);
  if (wait <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, wait));
}

export function whenTrue(ok: () => boolean, ms = 2500) {
  return new Promise<void>((resolve) => {
    if (ok()) {
      resolve();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      stop();
      window.clearTimeout(timer);
      resolve();
    };
    const stop = watchEffect(() => {
      if (ok()) finish();
    });
    const timer = window.setTimeout(finish, ms);
  });
}
