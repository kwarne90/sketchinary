import type { ClientSnapshot, Emote, GameSettings, Guess, Stroke } from "#shared";

const SESSION_KEY = "sketchinary.session";

export interface Session {
  playerId: string;
  name: string;
  avatar?: number;
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
    playerId: existing?.playerId || newId(),
    name: name.trim().slice(0, 16),
    avatar: existing?.avatar,
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function saveAvatar(avatar: number) {
  const existing = loadSession();
  if (!existing) return;
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ ...existing, avatar }),
  );
}

export function useGame() {
  const { $socket } = useNuxtApp();
  const state = useState<ClientSnapshot | null>("game-state", () => null);
  const error = useState<string | null>("game-error", () => null);
  const liveGuesses = useState<Guess[]>("live-guesses", () => []);
  const liveEmotes = useState<Emote[]>("live-emotes", () => []);

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
    $socket.off("emote");
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
          avatar: session.avatar,
        });
      }
    });
    $socket.on("state", (snapshot: ClientSnapshot) => {
      const prev = state.value;
      if (prev && snapshot.roundIndex !== prev.roundIndex) {
        liveGuesses.value = [];
      }
      if (
        prev &&
        snapshot.phase === "drawing" &&
        prev.phase !== "drawing" &&
        snapshot.you === snapshot.hostId
      ) {
        trackUmami("round_started", {
          players: snapshot.players.filter((player) => player.connected).length,
        });
      }
      state.value = snapshot;
      error.value = null;
      liveGuesses.value = snapshot.guesses.slice(-12);
      const me = snapshot.players.find((p) => p.id === snapshot.you);
      if (me) saveAvatar(me.avatar);
    });
    $socket.on("guess", (guess: Guess) => {
      liveGuesses.value = [...liveGuesses.value, guess].slice(-20);
    });
    $socket.on("emote", (emote: Emote) => {
      liveEmotes.value = [...liveEmotes.value, emote].slice(-12);
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
        { playerId: session.playerId, name: session.name, avatar: session.avatar },
        (result: { code?: string; error?: string }) => {
          if (result?.error || !result.code) {
            error.value = result?.error || "Could not create game";
            reject(new Error(error.value));
            return;
          }
          trackUmami("game_created");
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
        { code, playerId: session.playerId, name: session.name, avatar: session.avatar },
        (result: { error?: string }) => {
          if (result?.error) {
            error.value = result.error;
            reject(new Error(result.error));
            return;
          }
          trackUmami("player_joined");
          resolve();
        },
      );
    });
  }

  function updateSettings(settings: Partial<GameSettings>) {
    $socket.emit("updateSettings", settings);
  }

  function setAvatar(avatar: number) {
    saveAvatar(avatar);
    const current = state.value;
    if (current) {
      state.value = {
        ...current,
        players: current.players.map((player) =>
          player.id === current.you ? { ...player, avatar } : player,
        ),
      };
    }
    $socket.emit("setAvatar", { avatar });
  }

  function setName(name: string): Promise<void> {
    const trimmed = name.trim().slice(0, 16);
    if (!trimmed) return Promise.resolve();
    const snapshot = state.value;
    const previous = snapshot?.players.find((p) => p.id === snapshot.you)?.name;
    if (previous === trimmed) return Promise.resolve();
    saveSession(trimmed);
    if (snapshot) {
      state.value = {
        ...snapshot,
        players: snapshot.players.map((player) =>
          player.id === snapshot.you ? { ...player, name: trimmed } : player,
        ),
      };
    }
    return new Promise((resolve, reject) => {
      $socket.emit(
        "setName",
        { name: trimmed },
        (result?: { error?: string }) => {
          if (result?.error) {
            if (previous) saveSession(previous);
            const latest = state.value;
            if (latest && previous) {
              state.value = {
                ...latest,
                players: latest.players.map((player) =>
                  player.id === latest.you ? { ...player, name: previous } : player,
                ),
              };
            }
            reject(new Error(result.error));
            return;
          }
          resolve();
        },
      );
    });
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
    const current = state.value;
    if (current?.strokes.length) {
      state.value = { ...current, strokes: current.strokes.slice(0, -1) };
    }
    $socket.emit("undo");
  }

  function clear() {
    $socket.emit("clear");
  }

  function guess(text: string) {
    $socket.emit("guess", { text });
  }

  function poke(toId: string) {
    $socket.emit("poke", { toId });
  }

  if (import.meta.client) {
    bind();
    const session = loadSession();
    if ($socket.connected && session && state.value?.code) {
      $socket.emit("join", {
        code: state.value.code,
        playerId: session.playerId,
        name: session.name,
        avatar: session.avatar,
      });
    }
  }

  return {
    state,
    error,
    liveGuesses,
    liveEmotes,
    create,
    join,
    updateSettings,
    setAvatar,
    setName,
    start,
    playAgain,
    strokeStart,
    strokeAdd,
    undo,
    clear,
    guess,
    poke,
    bind,
    ensureConnected,
  };
}
