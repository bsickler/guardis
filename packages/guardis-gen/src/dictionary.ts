/**
 * dictionary.ts - `Dictionary<T>` is the minimum contract `.generate()`/
 * `.defineGenerator()` need to draw a sample value from a named pool
 * instead of blind random generation: hand back one representative value
 * of type `T`. `defineDictionary()` builds the common case (a flat,
 * deduplicated pool); `dictionaryOf()` wraps a one-off expression; a
 * dictionary that's more than either implements `pick()` itself (see
 * `dictionaries/people/names.ts`, `dictionaries/location/countries.ts`).
 * @module
 */
import { pick } from "./utilities/rng.ts";

/** Anything that can draw one representative value of type `T`. The whole contract. */
export interface Dictionary<T> {
  pick(): T;
}

/**
 * Wraps a plain function as a `Dictionary<T>` -- for a dictionary that's just one expression (a
 * composition, a projection off another dictionary, a delegation), without writing out
 * `{ pick: () => ... }` by hand at every call site.
 */
export function dictionaryOf<T>(pick: () => T): Dictionary<T> {
  return { pick };
}

/** The shape `defineDictionary()` returns: a `Dictionary<T>` plus membership/size/iteration. */
export type DictionarySet<T> = Dictionary<T> & {
  readonly size: number;
  has(value: T): boolean;
  [Symbol.iterator](): IterableIterator<T>;
};

/**
 * Builds a `DictionarySet` -- a validated, deduplicated pool backed by a
 * native Set (duplicate entries in the source collapse for free), rejecting
 * an empty pool up front rather than letting `pick()` misbehave on one
 * later. The array form is cached once here, rather than re-spread out of
 * the Set on every `pick()` call, since a large, real-world dictionary
 * shouldn't get slower to draw from than a small one.
 */
export function defineDictionary<T>(pool: Iterable<T>): DictionarySet<T> {
  const values = pool instanceof Set ? pool : new Set(pool);
  if (values.size === 0) {
    throw new TypeError("Dictionary: pool must contain at least one value.");
  }
  const cached = [...values];

  return {
    pick: () => pick(cached),
    get size() {
      return values.size;
    },
    has: (value: T) => values.has(value),
    [Symbol.iterator]: () => values[Symbol.iterator](),
  };
}

/**
 * A `.defineGenerator()`-ready function that always draws from `dictionary`
 * -- any `Dictionary<T>`. Composable at any nesting depth, like any
 * function passed to `.defineGenerator()` -- a call-time
 * `.generate({ dictionary })` override still wins over this, handled
 * generically by `interpret.ts` before a CustomSpec is ever reached, so
 * this only needs to cover the "nothing overridden" default case.
 */
export function fromDictionary<T>(dictionary: Dictionary<T>): () => T {
  return () => dictionary.pick();
}
