export type Phase = "lobby" | "drawing" | "reveal" | "ended";

export type RevealReason = "guess" | "timeout" | null;

export interface Player {
  id: string;
  name: string;
  avatar: number;
  score: number;
  sketchCount: number;
  connected: boolean;
}

export const AVATAR_PALETTE = [
  "#FF6B5B",
  "#3ECFCF",
  "#FFD166",
  "#8B7CFF",
  "#FF8FAB",
  "#7BD389",
  "#6CB6FF",
  "#FFB347",
] as const;

export const AVATAR_HATS = [
  "none",
  "beanie",
  "headphones",
  "bow",
  "cap",
  "flower",
] as const;
export type AvatarHat = (typeof AVATAR_HATS)[number];

export const AVATAR_UTENSILS = [
  "pencil",
  "wand",
  "fry",
  "pen",
  "quill",
  "crayon",
  "marker",
  "brush",
] as const;
export type AvatarUtensil = (typeof AVATAR_UTENSILS)[number];

export const AVATAR_EYES = ["none", "glasses", "shades", "goggles"] as const;
export type AvatarEyes = (typeof AVATAR_EYES)[number];

export const AVATAR_EXPRESSIONS = [
  "happy",
  "nervous",
  "dizzy",
  "surprised",
  "confused",
  "smug",
] as const;
export type AvatarExpression = (typeof AVATAR_EXPRESSIONS)[number];

export interface AvatarLook {
  color: number;
  hat: AvatarHat;
  eyes: AvatarEyes;
  expression: AvatarExpression;
  utensil: AvatarUtensil;
}

const AVATAR_MASK = 0x7fff;

export function decodeAvatar(value: number): AvatarLook {
  const n = clampAvatar(value);
  const hatIndex = ((n >> 3) & 3) | ((n >> 10) & 4);
  const expression = AVATAR_EXPRESSIONS[(n >> 5) & 7] ?? AVATAR_EXPRESSIONS[0];
  const eyes = AVATAR_EYES[(n >> 13) & 3] ?? AVATAR_EYES[0];
  return {
    color: n & 7,
    hat: AVATAR_HATS[hatIndex] === "cap" ? "none" : AVATAR_HATS[hatIndex] ?? AVATAR_HATS[0],
    eyes,
    expression,
    utensil: AVATAR_UTENSILS[(n >> 9) & 7],
  };
}

export function encodeAvatar(look: AvatarLook): number {
  const hat = Math.max(0, AVATAR_HATS.indexOf(look.hat));
  const utensil = Math.max(0, AVATAR_UTENSILS.indexOf(look.utensil));
  const expression = Math.max(0, AVATAR_EXPRESSIONS.indexOf(look.expression));
  const eyes = Math.max(0, AVATAR_EYES.indexOf(look.eyes));
  return clampAvatar(
    (look.color & 7) |
      ((hat & 3) << 3) |
      ((expression & 7) << 5) |
      ((utensil & 7) << 9) |
      ((hat & 4) << 10) |
      ((eyes & 3) << 13),
  );
}

export function clampAvatar(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(AVATAR_MASK, Math.floor(value)));
}

export function avatarFromName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  return hash & AVATAR_MASK;
}

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  id: string;
  color: string;
  width: number;
  mode: "draw" | "erase";
  points: Point[];
}

export const WORD_SETS = [
  "basic",
  "disney",
  "hard",
  "movies",
  "animals",
  "combined",
] as const;
export type WordSet = (typeof WORD_SETS)[number];

export const WORD_SET_LABELS: Record<WordSet, string> = {
  basic: "Basic",
  disney: "Disney",
  hard: "Hard",
  movies: "Movies",
  animals: "Animals",
  combined: "Combined",
};

export const ROTATION_MODES = ["winner", "random"] as const;
export type RotationMode = (typeof ROTATION_MODES)[number];

export const ROTATION_LABELS: Record<RotationMode, string> = {
  winner: "Winner",
  random: "Random",
};

export interface GameSettings {
  roundSeconds: number;
  totalRounds: number;
  wordSet: WordSet;
  rotation: RotationMode;
}

export interface Guess {
  playerId: string;
  text: string;
  correct: boolean;
  at: number;
}

export const EMOTE_KINDS = ["poke", "tap", "boop", "wave", "nudge", "bonk"] as const;
export type EmoteKind = (typeof EMOTE_KINDS)[number];

export interface Emote {
  fromId: string;
  toId: string;
  kind: EmoteKind;
  at: number;
}

export interface ClientSnapshot {
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
  you: string;
  revealReason: RevealReason;
  guesserId: string | null;
  winnerId: string | null;
  now: number;
}

export const ROUND_SECONDS_OPTIONS = [60, 120, 180, 240] as const;
export const TOTAL_ROUNDS_OPTIONS = [5, 10, 15, 0] as const;
export const DEFAULT_SETTINGS: GameSettings = {
  roundSeconds: 120,
  totalRounds: 10,
  wordSet: "basic",
  rotation: "winner",
};

export const DRAW_COLORS = [
  "#2B211E",
  "#FF6B5B",
  "#3ECFCF",
  "#6C8CFF",
  "#7BD389",
  "#FFD166",
] as const;

export const STROKE_WIDTHS = [4, 8, 14] as const;

export function pointsForGuess(playerCount: number) {
  return playerCount <= 2
    ? { guesser: 1, sketcher: 1 }
    : { guesser: 2, sketcher: 1 };
}

export function tokenSize(base: number, score: number) {
  const pts = Math.max(0, Math.min(20, score));
  return Math.round(base + pts * 2.25);
}
