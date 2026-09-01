/**
 * rng.ts - Seedable PRNG core. sfc32 (128-bit state, passes standard
 * statistical test suites) seeded via cyrb128's string hash, so both
 * numeric and string seeds go through the same path. Every random decision
 * elsewhere in guardis-gen -- utilities/random.ts's helpers, interpret.ts's
 * structural dispatch, and the format generators in modules/strings.ts and
 * modules/http.ts -- is built on `next()` so that `seed()` makes all of it
 * reproducible.
 * @module
 */

function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a: number, b: number, c: number, d: number): () => number {
  return function (): number {
    a |= 0;
    b |= 0;
    c |= 0;
    d |= 0;
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

let state = sfc32(...cyrb128(String(Date.now())));

/** Reseeds the generator -- every subsequent `next()` (and everything built on it) becomes reproducible from this point on. Numeric and string seeds both go through the same hash. */
export function seed(value: number | string): void {
  state = sfc32(...cyrb128(String(value)));
}

/** Raw float in `[0, 1)`. The one primitive every other helper here builds on. */
export function next(): number {
  return state();
}

/** Integer in `[min, max]`, inclusive of both ends. */
export function randomInt(min: number, max: number): number {
  return min + Math.floor(next() * (max - min + 1));
}

/** Picks a uniformly random element from `items`. */
export function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

/** True with the given probability (default 0.5). */
export function randomBoolean(probability = 0.5): boolean {
  return next() < probability;
}
