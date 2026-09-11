import type {
  ClientSnapshot,
  Emote,
  GameSettings,
  Guess,
  Phase,
  Player,
  RevealReason,
  Stroke,
} from "../../shared/types.ts";
import {
  DEFAULT_SETTINGS,
  EMOTE_KINDS,
  ROTATION_MODES,
  ROUND_SECONDS_OPTIONS,
  TOTAL_ROUNDS_OPTIONS,
  WORD_SETS,
  avatarFromName,
  clampAvatar,
  pointsForGuess,
} from "../../shared/types.ts";
import { pickWord } from "./words.ts";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REVEAL_MS = 2800;
const GUESS_REVEAL_MS = 6800;
const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;

export interface Room {
  code: string;
  hostId: string;
  settings: GameSettings;
  players: Player[];
  phase: Phase;
  roundIndex: number;
  sketcherId: string | null;
  word: string | null;
  endsAt: number | null;
  strokes: Stroke[];
  guesses: Guess[];
  usedWords: string[];
  revealReason: RevealReason;
  guesserId: string | null;
  winnerId: string | null;
  roundTimer: ReturnType<typeof setTimeout> | null;
  revealTimer: ReturnType<typeof setTimeout> | null;
  emptyTimer: ReturnType<typeof setTimeout> | null;
}

function randomCode(): string {
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export function normalizeGuess(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function clearTimers(room: Room) {
  if (room.roundTimer) {
    clearTimeout(room.roundTimer);
    room.roundTimer = null;
  }
  if (room.revealTimer) {
    clearTimeout(room.revealTimer);
    room.revealTimer = null;
  }
}

export class GameManager {
  rooms = new Map<string, Room>();
  socketToSeat = new Map<string, { code: string; playerId: string }>();
  onBroadcast: (code: string) => void = () => {};
  onGuess: (code: string, guess: Guess) => void = () => {};
  onEmote: (code: string, emote: Emote) => void = () => {};
  private lastPokeAt = new Map<string, number>();

  private uniqueCode(): string {
    for (let i = 0; i < 20; i++) {
      const code = randomCode();
      if (!this.rooms.has(code)) return code;
    }
    return randomCode() + randomCode();
  }

  createRoom(playerId: string, name: string, avatar?: number): Room {
    const trimmed = name.trim().slice(0, 16);
    const code = this.uniqueCode();
    const player: Player = {
      id: playerId,
      name: trimmed,
      avatar: Number.isFinite(avatar) ? clampAvatar(avatar as number) : avatarFromName(trimmed),
      score: 0,
      sketchCount: 0,
      connected: true,
    };
    const room: Room = {
      code,
      hostId: playerId,
      settings: { ...DEFAULT_SETTINGS },
      players: [player],
      phase: "lobby",
      roundIndex: 0,
      sketcherId: null,
      word: null,
      endsAt: null,
      strokes: [],
      guesses: [],
      usedWords: [],
      revealReason: null,
      guesserId: null,
      winnerId: null,
      roundTimer: null,
      revealTimer: null,
      emptyTimer: null,
    };
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  attachSocket(socketId: string, code: string, playerId: string) {
    this.socketToSeat.set(socketId, { code, playerId });
  }

  joinRoom(
    code: string,
    playerId: string,
    name: string,
    avatar?: number,
  ): { room: Room; error?: string } {
    const room = this.getRoom(code);
    if (!room) return { room: undefined as unknown as Room, error: "Game not found" };

    const trimmed = name.trim().slice(0, 16);
    if (!trimmed) return { room, error: "Pick a name" };

    const nextAvatar = Number.isFinite(avatar) ? clampAvatar(avatar as number) : undefined;
    const existing = room.players.find((p) => p.id === playerId);
    if (existing) {
      existing.connected = true;
      if (trimmed.toLowerCase() !== existing.name.toLowerCase()) {
        if (room.players.some((p) => p.id !== playerId && p.name.toLowerCase() === trimmed.toLowerCase())) {
          return { room, error: "That name is taken" };
        }
        existing.name = trimmed;
      }
      if (nextAvatar !== undefined) existing.avatar = nextAvatar;
      this.clearEmptyTimer(room);
      return { room };
    }

    if (room.players.some((p) => p.id !== playerId && p.name.toLowerCase() === trimmed.toLowerCase())) {
      return { room, error: "That name is taken" };
    }

    room.players.push({
      id: playerId,
      name: trimmed,
      avatar: nextAvatar ?? avatarFromName(trimmed),
      score: 0,
      sketchCount: 0,
      connected: true,
    });
    this.clearEmptyTimer(room);
    return { room };
  }

  disconnect(socketId: string) {
    const seat = this.socketToSeat.get(socketId);
    this.socketToSeat.delete(socketId);
    if (!seat) return;
    const room = this.getRoom(seat.code);
    if (!room) return;
    const stillConnected = [...this.socketToSeat.values()].some(
      (s) => s.code === room.code && s.playerId === seat.playerId,
    );
    if (stillConnected) {
      this.broadcast(room);
      return;
    }
    const player = room.players.find((p) => p.id === seat.playerId);
    if (player) player.connected = false;

    if (room.phase === "drawing" && room.sketcherId === seat.playerId) {
      this.beginReveal(room, "timeout");
    } else {
      this.ensureHost(room);
      this.broadcast(room);
    }

    if (!room.players.some((p) => p.connected)) {
      this.scheduleEmptyDelete(room);
    }
  }

  setAvatar(room: Room, playerId: string, avatar: number) {
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    player.avatar = clampAvatar(avatar);
    this.broadcast(room);
  }

  setName(room: Room, playerId: string, name: string): string | undefined {
    const trimmed = name.trim().slice(0, 16);
    if (!trimmed) return "Pick a name";
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    if (trimmed.toLowerCase() === player.name.toLowerCase()) {
      player.name = trimmed;
      this.broadcast(room);
      return;
    }
    if (room.players.some((p) => p.id !== playerId && p.name.toLowerCase() === trimmed.toLowerCase())) {
      return "That name is taken";
    }
    player.name = trimmed;
    this.broadcast(room);
  }

  poke(room: Room, fromId: string, toId: string) {
    if (!fromId || fromId === toId) return;
    const from = room.players.find((p) => p.id === fromId);
    const to = room.players.find((p) => p.id === toId);
    if (!from || !to) return;
    const now = Date.now();
    if ((this.lastPokeAt.get(fromId) || 0) > now - 650) return;
    this.lastPokeAt.set(fromId, now);
    const kind = EMOTE_KINDS[Math.floor(Math.random() * EMOTE_KINDS.length)];
    this.onEmote(room.code, { fromId, toId, kind, at: now });
  }

  updateSettings(
    room: Room,
    playerId: string,
    settings: Partial<GameSettings>,
  ): string | undefined {
    if (room.hostId !== playerId) return "Only the host can change settings";
    const prevSeconds = room.settings.roundSeconds;
    if (
      typeof settings.roundSeconds === "number" &&
      (ROUND_SECONDS_OPTIONS as readonly number[]).includes(settings.roundSeconds)
    ) {
      room.settings.roundSeconds = settings.roundSeconds;
    }
    if (
      typeof settings.totalRounds === "number" &&
      (TOTAL_ROUNDS_OPTIONS as readonly number[]).includes(settings.totalRounds)
    ) {
      room.settings.totalRounds = settings.totalRounds;
    }
    if (settings.wordSet && (WORD_SETS as readonly string[]).includes(settings.wordSet)) {
      room.settings.wordSet = settings.wordSet;
    }
    if (settings.rotation && (ROTATION_MODES as readonly string[]).includes(settings.rotation)) {
      room.settings.rotation = settings.rotation;
    }
    if (
      room.phase === "drawing" &&
      room.endsAt &&
      room.settings.roundSeconds !== prevSeconds
    ) {
      const startedAt = room.endsAt - prevSeconds * 1000;
      room.endsAt = startedAt + room.settings.roundSeconds * 1000;
      if (room.endsAt <= Date.now()) {
        this.beginReveal(room, "timeout");
        return;
      }
      this.armRoundTimer(room);
    }
    this.broadcast(room);
  }

  start(room: Room): string | undefined {
    if (room.phase !== "lobby") return "Game already started";
    const connected = room.players.filter((p) => p.connected);
    if (connected.length < 2) return "Need at least 2 players";
    this.beginRound(room, null);
  }

  playAgain(room: Room) {
    if (room.phase !== "ended") return;
    clearTimers(room);
    for (const player of room.players) {
      player.score = 0;
      player.sketchCount = 0;
    }
    room.phase = "lobby";
    room.roundIndex = 0;
    room.sketcherId = null;
    room.word = null;
    room.endsAt = null;
    room.strokes = [];
    room.guesses = [];
    room.usedWords = [];
    room.revealReason = null;
    room.guesserId = null;
    room.winnerId = null;
    this.broadcast(room);
  }

  startStroke(room: Room, playerId: string, stroke: Stroke): Stroke | string | undefined {
    if (room.phase !== "drawing" || room.sketcherId !== playerId) return "Not your turn to draw";
    if (room.strokes.some((s) => s.id === stroke.id)) return;
    const next: Stroke = {
      id: stroke.id,
      color: stroke.color,
      width: stroke.width,
      mode: stroke.mode === "erase" ? "erase" : "draw",
      points: stroke.points.slice(0, 8).map((p) => ({
        x: Math.min(1, Math.max(0, p.x)),
        y: Math.min(1, Math.max(0, p.y)),
      })),
    };
    room.strokes.push(next);
    return next;
  }

  addStrokePoints(
    room: Room,
    playerId: string,
    id: string,
    points: Stroke["points"],
  ): Stroke["points"] | string | undefined {
    if (room.phase !== "drawing" || room.sketcherId !== playerId) return "Not your turn to draw";
    const stroke = room.strokes.find((s) => s.id === id);
    if (!stroke) return;
    const mapped = points
      .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
      .map((p) => ({
        x: Math.min(1, Math.max(0, p.x)),
        y: Math.min(1, Math.max(0, p.y)),
      }));
    stroke.points.push(...mapped);
    if (stroke.points.length > 4000) stroke.points.splice(0, stroke.points.length - 4000);
    return mapped;
  }

  undo(room: Room, playerId: string): string | undefined {
    if (room.phase !== "drawing" || room.sketcherId !== playerId) return "Not your turn to draw";
    room.strokes.pop();
    this.broadcast(room);
  }

  clearCanvas(room: Room, playerId: string): string | undefined {
    if (room.phase !== "drawing" || room.sketcherId !== playerId) return "Not your turn to draw";
    room.strokes = [];
    this.broadcast(room);
  }

  guess(room: Room, playerId: string, text: string): string | undefined {
    if (room.phase !== "drawing") return "No drawing in progress";
    if (room.sketcherId === playerId) return "The sketcher cannot guess";
    const player = room.players.find((p) => p.id === playerId);
    if (!player || !player.connected) return "You are not in this game";
    const trimmed = text.trim().slice(0, 48);
    if (!trimmed) return;
    const correct =
      normalizeGuess(trimmed) === normalizeGuess(room.word ?? "") &&
      normalizeGuess(trimmed).length > 0;
    const guess: Guess = {
      playerId,
      text: trimmed,
      correct,
      at: Date.now(),
    };
    room.guesses.push(guess);
    if (room.guesses.length > 40) room.guesses.splice(0, room.guesses.length - 40);
    this.onGuess(room.code, guess);
    if (correct) {
      const pts = pointsForGuess(room.players.filter((p) => p.connected).length);
      player.score += pts.guesser;
      const sketcher = room.players.find((p) => p.id === room.sketcherId);
      if (sketcher) sketcher.score += pts.sketcher;
      this.beginReveal(room, "guess", playerId);
    }
  }

  snapshotFor(room: Room, playerId: string): ClientSnapshot {
    const showWord =
      room.sketcherId === playerId ||
      room.phase === "reveal" ||
      room.phase === "ended";
    return {
      code: room.code,
      hostId: room.hostId,
      settings: { ...DEFAULT_SETTINGS, ...room.settings },
      players: room.players.map((p) => ({ ...p })),
      phase: room.phase,
      roundIndex: room.roundIndex,
      sketcherId: room.sketcherId,
      word: showWord ? room.word : null,
      endsAt: room.endsAt,
      strokes: room.strokes.map((s) => ({ ...s, points: [...s.points] })),
      guesses: room.guesses.slice(-12),
      you: playerId,
      revealReason: room.revealReason,
      guesserId: room.guesserId,
      winnerId: room.winnerId,
      now: Date.now(),
    };
  }

  broadcast(room: Room) {
    this.onBroadcast(room.code);
  }

  private beginRound(room: Room, forcedSketcherId: string | null) {
    clearTimers(room);
    const connected = room.players.filter((p) => p.connected);
    if (connected.length < 2) {
      room.phase = "lobby";
      room.sketcherId = null;
      room.word = null;
      room.endsAt = null;
      room.strokes = [];
      this.broadcast(room);
      return;
    }

    const sketcher = this.pickSketcher(room, forcedSketcherId);
    if (!sketcher) return;
    sketcher.sketchCount += 1;
    room.roundIndex += 1;
    room.phase = "drawing";
    room.sketcherId = sketcher.id;
    room.word = pickWord(room.usedWords, room.settings.wordSet ?? "basic");
    room.usedWords.push(room.word);
    room.endsAt = Date.now() + room.settings.roundSeconds * 1000;
    room.strokes = [];
    room.guesses = [];
    room.revealReason = null;
    room.guesserId = null;
    room.winnerId = null;
    this.armRoundTimer(room);
    this.broadcast(room);
  }

  private armRoundTimer(room: Room) {
    if (room.roundTimer) {
      clearTimeout(room.roundTimer);
      room.roundTimer = null;
    }
    if (room.phase !== "drawing" || !room.endsAt) return;
    const remaining = room.endsAt - Date.now();
    if (remaining <= 0) {
      this.beginReveal(room, "timeout");
      return;
    }
    room.roundTimer = setTimeout(() => {
      if (this.rooms.get(room.code) === room && room.phase === "drawing") {
        this.beginReveal(room, "timeout");
      }
    }, remaining);
  }

  private beginReveal(
    room: Room,
    reason: Exclude<RevealReason, null>,
    nextSketcherId?: string,
  ) {
    if (room.phase !== "drawing") return;
    clearTimers(room);
    room.phase = "reveal";
    room.revealReason = reason;
    room.guesserId = reason === "guess" ? nextSketcherId ?? null : null;
    room.endsAt = null;
    this.broadcast(room);
    room.revealTimer = setTimeout(() => {
      if (this.rooms.get(room.code) !== room) return;
      if (room.settings.totalRounds > 0 && room.roundIndex >= room.settings.totalRounds) {
        this.endGame(room);
        return;
      }
      const forced =
        room.settings.rotation !== "random" && reason === "guess" && nextSketcherId
          ? nextSketcherId
          : null;
      this.beginRound(room, forced);
    }, reason === "guess" ? GUESS_REVEAL_MS : REVEAL_MS);
  }

  private endGame(room: Room) {
    clearTimers(room);
    room.phase = "ended";
    room.endsAt = null;
    const ranked = [...room.players].sort((a, b) => b.score - a.score);
    room.winnerId = ranked[0]?.id ?? null;
    this.broadcast(room);
  }

  private pickSketcher(room: Room, forcedId: string | null): Player | undefined {
    const connected = room.players.filter((p) => p.connected);
    if (connected.length === 0) return;
    if (forcedId) {
      const forced = connected.find((p) => p.id === forcedId);
      if (forced) return forced;
    }
    if (room.settings.rotation === "random") {
      const pool = connected.filter((p) => p.id !== room.sketcherId);
      const source = pool.length ? pool : connected;
      return source[Math.floor(Math.random() * source.length)];
    }
    const notYet = connected.filter(
      (p) => p.sketchCount === 0 && p.id !== room.sketcherId,
    );
    if (notYet.length) {
      return notYet[Math.floor(Math.random() * notYet.length)];
    }
    const pool = connected.filter((p) => p.id !== room.sketcherId);
    const source = pool.length ? pool : connected;
    return source[Math.floor(Math.random() * source.length)];
  }

  private ensureHost(room: Room) {
    const host = room.players.find((p) => p.id === room.hostId);
    if (host?.connected) return;
    const next = room.players.find((p) => p.connected);
    if (next) room.hostId = next.id;
  }

  private scheduleEmptyDelete(room: Room) {
    this.clearEmptyTimer(room);
    room.emptyTimer = setTimeout(() => {
      if (!room.players.some((p) => p.connected)) {
        clearTimers(room);
        this.rooms.delete(room.code);
      }
    }, EMPTY_ROOM_TTL_MS);
  }

  private clearEmptyTimer(room: Room) {
    if (room.emptyTimer) {
      clearTimeout(room.emptyTimer);
      room.emptyTimer = null;
    }
  }
}
