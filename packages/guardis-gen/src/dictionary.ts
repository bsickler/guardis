/**
 * dictionary.ts - Wraps a pool of realistic sample values (names, cities,
 * TLDs, ...) behind a uniform `.pick()` so generators can draw from curated
 * data instead of synthesizing it. Dictionaries can nest child dictionaries
 * via `withChildren` for grouped/namespaced lookups (e.g. `people.first`).
 */

import { pick } from "./utilities/rng.ts";

// deno-lint-ignore ban-types
type Simplify<T> = { [K in keyof T]: T[K] } & {};

export class Dictionary<T1> {
  constructor(pick: () => T1) {
    this.pick = pick;
  }

  /** Draws one value from the dictionary. */
  public pick: () => T1;

  /** Builds a dictionary that picks uniformly at random from `data`. */
  public static of<T1>(data: readonly T1[]): Dictionary<T1> {
    if (!Array.isArray(data)) throw new Error("Invalid dictionary data. Requires an array");

    return new Dictionary(() => pick(data));
  }

  /** Builds a dictionary from a custom picker function. */
  public static from<T1>(picker: () => T1): Dictionary<T1> {
    return new Dictionary(picker);
  }

  /** Attaches named child dictionaries onto `dict`, so `dict.child.pick()` works alongside `dict.pick()`. */
  public static withChildren<
    D extends Dictionary<unknown>,
    C extends Record<string, Dictionary<unknown>>,
  >(
    dict: D,
    children: C,
  ): Simplify<{ pick: D["pick"] } & { [K in keyof typeof children]: typeof children[K] }> {
    if ('pick' in children) {
      throw new Error('The "pick" property is reserved in Dictionaries but present in the record of children provided to withChildren()');
    }

    const ret = Object.assign(dict, children);

    return ret;
  }
}
