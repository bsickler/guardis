/**
 * random.ts - Low-level random-value helpers: raw building blocks shared by
 * the built-in format generators (randomHex/randomWord/randomDigits), plus
 * the structural per-kind generators interpret.ts dispatches to
 * (randomString/randomNumber/randomDate and their shared lengthBounds
 * helper). Not a registration point itself, no side effects.
 * @module
 */
import type { DateConstraints, LengthConstraints, NumberConstraints } from "../spec.ts";

export function randomHex(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

export function randomWord(length = 6): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function randomDigits(count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) out += Math.floor(Math.random() * 10);
  return out;
}

/** Resolves min/max length bounds, honoring `ofLength` as an exact-length shorthand. */
export function lengthBounds(
  constraints: LengthConstraints | undefined,
  defaultMin: number,
  defaultMax: (min: number) => number,
): { min: number; max: number } {
  if (constraints?.ofLength !== undefined) {
    return { min: constraints.ofLength, max: constraints.ofLength };
  }
  const min = constraints?.min ?? defaultMin;
  return { min, max: constraints?.max ?? defaultMax(min) };
}

/** `lengthBounds` plus picking a random length within them -- shared by every kind that generates a variable number of things (string, array, map, set). */
export function randomLength(
  constraints: LengthConstraints | undefined,
  defaultMin: number,
  defaultMax: (min: number) => number,
): number {
  const { min, max } = lengthBounds(constraints, defaultMin, defaultMax);
  return min === max ? min : min + Math.floor(Math.random() * (max - min + 1));
}

export function randomString(constraints?: LengthConstraints): string {
  const length = randomLength(constraints, 3, (min) => Math.max(min, min + 5));
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function randomNumber(constraints?: NumberConstraints): number {
  const min = constraints?.min ?? 0;
  const max = constraints?.max ?? min + 100;
  const value = min + Math.random() * (max - min);
  return constraints?.int ? Math.round(value) : value;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function randomDate(constraints?: DateConstraints): Date {
  const lte = constraints?.lte ?? new Date();
  const gte = constraints?.gte ?? new Date(lte.getTime() - ONE_YEAR_MS);
  return new Date(gte.getTime() + Math.random() * (lte.getTime() - gte.getTime()));
}
