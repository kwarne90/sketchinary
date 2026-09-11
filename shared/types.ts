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
