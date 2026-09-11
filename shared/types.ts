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

export const AVATAR_HATS = ["none", "beanie", "headphones", "bow"] as const;
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

export interface AvatarLook {
  color: number;
  hat: AvatarHat;
  wink: boolean;
  glasses: boolean;
  blush: boolean;
  openMouth: boolean;
  utensil: AvatarUtensil;
}

const AVATAR_MASK = 0xfff;

export function decodeAvatar(value: number): AvatarLook {
  const n = clampAvatar(value);
  return {
    color: n & 7,
    hat: AVATAR_HATS[(n >> 3) & 3],
    wink: Boolean(n & 32),
    glasses: Boolean(n & 64),
    blush: Boolean(n & 128),
    openMouth: Boolean(n & 256),
    utensil: AVATAR_UTENSILS[(n >> 9) & 7],
  };
}

export function encodeAvatar(look: AvatarLook): number {
  const hat = Math.max(0, AVATAR_HATS.indexOf(look.hat));
  const utensil = Math.max(0, AVATAR_UTENSILS.indexOf(look.utensil));
  return clampAvatar(
    (look.color & 7) |
      ((hat & 3) << 3) |
      (look.wink ? 32 : 0) |
      (look.glasses ? 64 : 0) |
      (look.blush ? 128 : 0) |
      (look.openMouth ? 256 : 0) |
      ((utensil & 7) << 9),
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

export interface GameSettings {
  roundSeconds: number;
  totalRounds: number;
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
  winnerId: string | null;
  now: number;
}

export const ROUND_SECONDS_OPTIONS = [60, 120, 180, 240] as const;
export const TOTAL_ROUNDS_OPTIONS = [5, 10, 15] as const;
export const DEFAULT_SETTINGS: GameSettings = {
  roundSeconds: 120,
  totalRounds: 10,
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
