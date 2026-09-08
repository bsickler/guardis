/**
 * random.ts - Low-level random-value helpers: raw building blocks shared by
 * the built-in format generators (randomHex/randomWord/randomDigits), plus
 * the structural per-kind generators interpret.ts dispatches to
 * (randomString/randomNumber/randomDate, and randomLength for array/map/set).
 * Built on ./rng.ts's seedable primitives, so all of it is reproducible
 * under `seed()`. Not a registration point itself, no side effects.
 * @module
 */
import type { DateConstraints, LengthConstraints, NumberConstraints } from "../spec.ts";
import { next, randomInt } from "./rng.ts";

export function randomHex(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += randomInt(0, 15).toString(16);
  }
  return out;
}

const LOWERCASE_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

/** `length` characters, each drawn uniformly from `alphabet`. */
function randomFromAlphabet(length: number, alphabet: string): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[randomInt(0, alphabet.length - 1)];
  }
  return out;
}

export function randomWord(length = 6): string {
  return randomFromAlphabet(length, LOWERCASE_ALPHABET);
}

export function randomDigits(count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) out += randomInt(0, 9);
  return out;
}

/**
 * Resolves min/max length bounds, honoring `ofLength` as an exact-length
 * shorthand. Whichever side is missing is derived from the side that was
 * given -- not from a hardcoded default that can sit on the wrong side of
 * it -- so a max-only or min-only constraint can never collide with itself.
 * Throws only when both sides were given and are genuinely inverted (`max <
 * min`): no value can satisfy both, so generating one anyway would silently
 * produce a value that fails its own guard. `label` names the constraint in
 * the error (e.g. "string length", "array length").
 */
function lengthBounds(
  constraints: LengthConstraints | undefined,
  defaultMin: number,
  defaultMax: (min: number) => number,
  label = "length",
): { min: number; max: number } {
  if (constraints?.ofLength !== undefined) {
    const ofLength = constraints.ofLength;
    const conflictsMin = constraints.min !== undefined && ofLength < constraints.min;
    const conflictsMax = constraints.max !== undefined && ofLength > constraints.max;
    if (conflictsMin || conflictsMax) {
      const bound = conflictsMin ? `min (${constraints.min})` : `max (${constraints.max})`;
      throw new RangeError(
        `unsatisfiable ${label} constraint: ofLength (${ofLength}) conflicts with ${bound} -- ` +
          `no value can satisfy both. Check the .ofLength()/.min()/.max() calls (or generate() ` +
          `options) that produced this combination.`,
      );
    }
    return { min: ofLength, max: ofLength };
  }
  const hasMin = constraints?.min !== undefined;
  const hasMax = constraints?.max !== undefined;
  const spread = defaultMax(defaultMin) - defaultMin;

  let min: number;
  let max: number;
  if (hasMin) {
    min = constraints!.min!;
    max = hasMax ? constraints!.max! : defaultMax(min);
  } else if (hasMax) {
    max = constraints!.max!;
    // Lengths can't go negative -- clamp, then fall back to the given max
    // itself if that clamp overshot it (only possible for a negative max).
    min = Math.max(0, max - spread);
    if (min > max) min = max;
  } else {
    min = defaultMin;
    max = defaultMax(min);
  }

  if (hasMin && hasMax && max < min) {
    throw new RangeError(
      `unsatisfiable ${label} constraint: min (${min}) is greater than max (${max}) -- no ` +
        `value can satisfy both. Check the .min()/.max()/.range() calls (or generate() ` +
        `options) that produced this combination.`,
    );
  }
  return { min, max };
}

/** `lengthBounds` plus picking a random length within them -- shared by every kind that generates a variable number of things (string, array, map, set). */
export function randomLength(
  constraints: LengthConstraints | undefined,
  defaultMin: number,
  defaultMax: (min: number) => number,
  label?: string,
): number {
  const { min, max } = lengthBounds(constraints, defaultMin, defaultMax, label);
  return randomInt(min, max);
}

export function randomString(constraints?: LengthConstraints): string {
  const length = randomLength(constraints, 3, (min) => Math.max(min, min + 5), "string length");
  return randomFromAlphabet(length, LOWERCASE_ALPHABET);
}

const NUMBER_SPREAD = 100;

/**
 * A missing bound is derived from the given one (min-only: max = min +
 * spread; max-only: min = max - spread), not from a hardcoded default on
 * the opposite side. Throws only when both bounds were given and are
 * genuinely inverted -- same reasoning as `lengthBounds`.
 */
export function randomNumber(constraints?: NumberConstraints): number {
  const hasMin = constraints?.min !== undefined;
  const hasMax = constraints?.max !== undefined;

  let min: number;
  let max: number;
  if (hasMin) {
    min = constraints!.min!;
    max = hasMax ? constraints!.max! : min + NUMBER_SPREAD;
  } else if (hasMax) {
    max = constraints!.max!;
    min = max - NUMBER_SPREAD;
  } else {
    min = 0;
    max = NUMBER_SPREAD;
  }

  if (hasMin && hasMax && max < min) {
    throw new RangeError(
      `unsatisfiable number constraint: min (${min}) is greater than max (${max}) -- no value ` +
        `can satisfy both. Check the .gt()/.gte()/.lt()/.lte() calls (or generate() options) ` +
        `that produced this combination.`,
    );
  }
  const value = min + next() * (max - min);
  return constraints?.int ? Math.round(value) : value;
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * A missing bound is derived from the given one (gte-only: lte = gte +
 * 1yr; lte-only: gte = lte - 1yr), not from a hardcoded default on the
 * opposite side -- so `.gte(<a future date>)` doesn't collide with "now".
 * Throws only when both bounds were given and `gte` is genuinely after
 * `lte` -- same reasoning as `lengthBounds`/`randomNumber`.
 */
export function randomDate(constraints?: DateConstraints): Date {
  const hasGte = constraints?.gte !== undefined;
  const hasLte = constraints?.lte !== undefined;

  let gte: Date;
  let lte: Date;
  if (hasLte) {
    lte = constraints!.lte!;
    gte = hasGte ? constraints!.gte! : new Date(lte.getTime() - ONE_YEAR_MS);
  } else if (hasGte) {
    gte = constraints!.gte!;
    lte = new Date(gte.getTime() + ONE_YEAR_MS);
  } else {
    lte = new Date();
    gte = new Date(lte.getTime() - ONE_YEAR_MS);
  }

  if (hasGte && hasLte && gte.getTime() > lte.getTime()) {
    throw new RangeError(
      `unsatisfiable date constraint: gte (${gte.toISOString()}) is after lte (${lte.toISOString()}) ` +
        `-- no date can satisfy both. Check the .gt()/.gte()/.lt()/.lte() calls (or generate() ` +
        `options) that produced this combination.`,
    );
  }
  return new Date(gte.getTime() + next() * (lte.getTime() - gte.getTime()));
}
