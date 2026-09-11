import type { ClientSnapshot, GameSettings, Guess, Stroke } from "#shared";

const SESSION_KEY = "sketchinary.session";

export interface Session {
  playerId: string;
  name: string;
}

export function loadSession(): Session | null {
  if (!import.meta.client) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed.playerId || !parsed.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(name: string): Session {
  const existing = loadSession();
  const session: Session = {
    playerId: existing?.playerId || crypto.randomUUID(),
    name: name.trim().slice(0, 16),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function useGame() {
  const { $socket } = useNuxtApp();
  const state = useState<ClientSnapshot | null>("game-state", () => null);
  const error = useState<string | null>("game-error", () => null);
  const liveGuesses = useState<Guess[]>("live-guesses", () => []);

  function ensureConnected() {
    if ($socket.connected) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const fail = (err: Error) => {
        clearTimeout(timer);
        $socket.off("connect", onConnect);
        reject(err);
      };
      const onConnect = () => {
        clearTimeout(timer);
        $socket.off("connect_error", onError);
        resolve();
      };
      const onError = (err: Error) => fail(err);
      const timer = setTimeout(
        () => fail(new Error("Could not connect to the game server")),
        8000,
      );
      $socket.once("connect", onConnect);
      $socket.once("connect_error", onError);
      $socket.connect();
    });
  }

  function bind() {
    $socket.off("state");
    $socket.off("guess");
    $socket.off("stroke");
    $socket.off("errorMessage");
    $socket.off("connect");
    $socket.on("connect", () => {
      const session = loadSession();
      const current = state.value;
      if (session && current?.code) {
        $socket.emit("join", {
          code: current.code,
          playerId: session.playerId,
          name: session.name,
        });
      }
    });
    $socket.on("state", (snapshot: ClientSnapshot) => {
      const prev = state.value;
      if (prev && snapshot.roundIndex !== prev.roundIndex) {
        liveGuesses.value = [];
      }
      state.value = snapshot;
      error.value = null;
      liveGuesses.value = snapshot.guesses.slice(-12);
    });
    $socket.on("guess", (guess: Guess) => {
      liveGuesses.value = [...liveGuesses.value, guess].slice(-20);
    });
    $socket.on(
      "stroke",
      (
        payload:
          | { type: "start"; stroke: Stroke }
          | { type: "add"; id: string; points: Stroke["points"] }
          | { type: "undo" }
          | { type: "clear" },
      ) => {
        const current = state.value;
        if (!current) return;
        if (payload.type === "start") {
          state.value = {
            ...current,
            strokes: [...current.strokes, payload.stroke],
          };
        } else if (payload.type === "add") {
          state.value = {
            ...current,
            strokes: current.strokes.map((stroke) =>
              stroke.id === payload.id
                ? { ...stroke, points: [...stroke.points, ...payload.points] }
                : stroke,
            ),
          };
        } else if (payload.type === "undo") {
          state.value = { ...current, strokes: current.strokes.slice(0, -1) };
        } else if (payload.type === "clear") {
          state.value = { ...current, strokes: [] };
        }
      },
    );
    $socket.on("errorMessage", (message: string) => {
      error.value = message;
    });
  }

  async function create(name: string): Promise<string> {
    const session = saveSession(name);
    bind();
    await ensureConnected();
    return new Promise((resolve, reject) => {
      $socket.emit(
        "create",
        { playerId: session.playerId, name: session.name },
        (result: { code?: string; error?: string }) => {
          if (result?.error || !result.code) {
            error.value = result?.error || "Could not create game";
            reject(new Error(error.value));
            return;
          }
          resolve(result.code);
        },
      );
    });
  }

  async function join(code: string, name: string): Promise<void> {
    const session = saveSession(name);
    bind();
    liveGuesses.value = [];
    await ensureConnected();
    return new Promise((resolve, reject) => {
      $socket.emit(
        "join",
        { code, playerId: session.playerId, name: session.name },
        (result: { error?: string }) => {
          if (result?.error) {
            error.value = result.error;
            reject(new Error(result.error));
            return;
          }
          resolve();
        },
      );
    });
  }

  function updateSettings(settings: Partial<GameSettings>) {
    $socket.emit("updateSettings", settings);
  }

  function start() {
    $socket.emit("start");
  }

  function playAgain() {
    $socket.emit("playAgain");
  }

  function strokeStart(stroke: Stroke) {
    const current = state.value;
    if (current && !current.strokes.some((s) => s.id === stroke.id)) {
      state.value = { ...current, strokes: [...current.strokes, stroke] };
    }
    $socket.emit("strokeStart", stroke);
  }

  function strokeAdd(id: string, points: Stroke["points"]) {
    const current = state.value;
    if (current) {
      state.value = {
        ...current,
        strokes: current.strokes.map((stroke) =>
          stroke.id === id
            ? { ...stroke, points: [...stroke.points, ...points] }
            : stroke,
        ),
      };
    }
    $socket.emit("strokeAdd", { id, points });
  }

  function undo() {
    $socket.emit("undo");
  }

  function clear() {
    $socket.emit("clear");
  }

  function guess(text: string) {
    $socket.emit("guess", { text });
  }

  if (import.meta.client) {
    bind();
    const session = loadSession();
    if ($socket.connected && session && state.value?.code) {
      $socket.emit("join", {
        code: state.value.code,
        playerId: session.playerId,
        name: session.name,
      });
    }
  }

  return {
    state,
    error,
    liveGuesses,
    create,
    join,
    updateSettings,
    start,
    playAgain,
    strokeStart,
    strokeAdd,
    undo,
    clear,
    guess,
    bind,
    ensureConnected,
  };
}
