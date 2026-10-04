// Muscle map definitions. Pure data, shared by the UI and the server.
//
// Shapes are drawn on a 200 × 440 canvas for ONE side of the body (x < 100)
// and mirrored for the other side. Muscle ids look like "r.deltoid"
// (r = patient's right, l = patient's left, c = centre).
//
// Front view: the patient's RIGHT is on the viewer's LEFT.
// Back view:  the patient's LEFT is on the viewer's LEFT.
//
// Every muscle maps to a coarse BodyRegion, so the safety engine keeps
// working on regions no matter how detailed the selection is.

import type { BodyRegion } from "../types";

export type View = "front" | "back";
export type Side = "r" | "l" | "c";
export type Zone = "upper" | "middle" | "lower";

export interface MuscleShape {
  key: string; // i18n key: muscles.<key>
  d: string; // SVG path on the left half (x < 100) or centred
  centre?: boolean; // single, not mirrored
  region: BodyRegion | "side"; // "side" → right_side / left_side by side
  zone: Zone;
}

export const ZONES: Record<Zone, { x: number; y: number; w: number; h: number }> = {
  upper: { x: 20, y: 0, w: 160, h: 135 },
  middle: { x: 14, y: 100, w: 172, h: 170 },
  lower: { x: 40, y: 215, w: 120, h: 225 },
};

export const FRONT: MuscleShape[] = [
  { key: "head", centre: true, region: "head", zone: "upper", d: "M100 8a24 24 0 1 1 0 48a24 24 0 1 1 0-48z" },
  { key: "neck", centre: true, region: "neck", zone: "upper", d: "M90 56 H110 L112 72 H88 Z" },
  { key: "trapezius", region: "shoulders", zone: "upper", d: "M88 72 L66 77 L73 84 L92 78 Z" },
  { key: "deltoid", region: "shoulders", zone: "upper", d: "M65 78 Q48 80 44 98 L51 113 Q57 94 71 86 Z" },
  { key: "pectoralis", region: "chest", zone: "upper", d: "M74 86 L98 82 L98 118 Q82 125 67 115 Q62 99 74 86 Z" },
  { key: "biceps", region: "arms", zone: "middle", d: "M44 100 L51 115 L53 152 L41 154 Q37 126 44 100 Z" },
  { key: "forearm", region: "arms", zone: "middle", d: "M41 157 L53 155 L49 206 L39 208 Q35 182 41 157 Z" },
  { key: "hand", region: "hands", zone: "middle", d: "M39 211 L49 209 L52 236 Q46 247 37 239 Z" },
  { key: "upper_abs", centre: true, region: "upper_abdomen", zone: "middle", d: "M85 122 H115 V168 H85 Z" },
  { key: "lower_abs", centre: true, region: "lower_abdomen", zone: "middle", d: "M85 171 H115 V210 Q100 220 85 210 Z" },
  { key: "oblique", region: "side", zone: "middle", d: "M66 118 Q76 124 82 124 L82 208 Q73 205 68 198 Q63 160 66 118 Z" },
  { key: "groin", region: "hips", zone: "middle", d: "M68 201 Q75 209 83 212 L97 225 L74 231 Q66 217 68 201 Z" },
  { key: "quadriceps", region: "legs", zone: "lower", d: "M64 234 L97 228 L94 322 L72 326 Q62 280 64 234 Z" },
  { key: "knee", region: "knees", zone: "lower", d: "M72 329 L94 325 L94 348 L74 350 Z" },
  { key: "shin", region: "legs", zone: "lower", d: "M74 353 L94 351 L90 416 L78 416 Q72 384 74 353 Z" },
  { key: "foot", region: "feet", zone: "lower", d: "M78 419 L90 419 L95 436 L70 436 Q70 427 78 419 Z" },
];

export const BACK: MuscleShape[] = [
  { key: "head", centre: true, region: "head", zone: "upper", d: "M100 8a24 24 0 1 1 0 48a24 24 0 1 1 0-48z" },
  { key: "neck", centre: true, region: "neck", zone: "upper", d: "M90 56 H110 L111 70 H89 Z" },
  { key: "upper_back", centre: true, region: "upper_back", zone: "upper", d: "M89 72 H111 L136 80 L112 116 L100 128 L88 116 L64 80 Z" },
  { key: "deltoid", region: "shoulders", zone: "upper", d: "M63 81 Q47 83 44 99 L51 113 Q56 96 69 90 Z" },
  { key: "lats", region: "upper_back", zone: "middle", d: "M68 92 L86 118 L98 130 L98 176 L76 170 Q64 138 68 92 Z" },
  { key: "triceps", region: "arms", zone: "middle", d: "M44 101 L51 115 L53 152 L41 154 Q37 126 44 101 Z" },
  { key: "forearm", region: "arms", zone: "middle", d: "M41 157 L53 155 L49 206 L39 208 Q35 182 41 157 Z" },
  { key: "hand", region: "hands", zone: "middle", d: "M39 211 L49 209 L52 236 Q46 247 37 239 Z" },
  { key: "lower_back", centre: true, region: "back", zone: "middle", d: "M82 179 H118 V213 H82 Z" },
  { key: "glute", region: "hips", zone: "middle", d: "M66 216 L98 216 L98 250 Q80 258 66 246 Z" },
  { key: "hamstring", region: "legs", zone: "lower", d: "M64 253 Q80 261 97 255 L94 322 L72 326 Q62 290 64 253 Z" },
  { key: "knee", region: "knees", zone: "lower", d: "M72 329 L94 325 L94 348 L74 350 Z" },
  { key: "calf", region: "legs", zone: "lower", d: "M74 353 L94 351 Q97 380 90 404 L78 404 Q70 380 74 353 Z" },
  { key: "heel", region: "feet", zone: "lower", d: "M78 407 L90 407 L93 436 L71 436 Z" },
];

export const MUSCLE_KEYS = [...new Set([...FRONT, ...BACK].map((m) => m.key))];

/** Which side a shape drawn on the viewer's left belongs to, per view. */
export function sideOf(view: View, mirrored: boolean, centre?: boolean): Side {
  if (centre) return "c";
  const viewerLeftIsRight = view === "front";
  return viewerLeftIsRight !== mirrored ? "r" : "l";
}

export function regionFor(shape: MuscleShape, side: Side): BodyRegion {
  if (shape.region !== "side") return shape.region;
  return side === "l" ? "left_side" : "right_side";
}

/** Parses "r.deltoid" → region. Returns null for unknown ids (rejected by the API). */
export function regionOfMuscleId(id: string): BodyRegion | null {
  const m = /^([rlc])\.([a-z_]+)$/.exec(id);
  if (!m) return null;
  const [, side, key] = m;
  const shape = [...FRONT, ...BACK].find((s) => s.key === key && Boolean(s.centre) === (side === "c"));
  return shape ? regionFor(shape, side as Side) : null;
}

export const MIRROR = "matrix(-1 0 0 1 200 0)";
