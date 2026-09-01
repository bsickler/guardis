/**
 * tuple.ts - Fixed-length tuple composition.
 *
 * Unlike isMap/isSet, core's `isTuple` is not a guard-composing factory --
 * it's a length-only predicate (`isTuple(value, length)`) with no notion of
 * per-position element guards, so there's no existing "tuple of guards"
 * guard in `@spudlabs/guardis` to build generation support on top of (the
 * way modules/collections.ts builds on isMap.of/isSet.of). This module
 * fills that gap the same way object.ts does for shapes: it ships its own
 * `tuple(...)` factory that builds the actual validating guard AND derives
 * a matching `TupleSpec` from the same guard arguments, in one call.
 * @module
 */
import { createTypeGuard, type TypeGuard } from "@spudlabs/guardis";
import { registerGen, specRef } from "./spec.ts";

/** Maps a tuple of TypeGuards to a tuple of the types they guard. */
type InferTuple<G extends readonly TypeGuard<unknown>[]> = {
  [K in keyof G]: G[K] extends TypeGuard<infer T> ? T : never;
};

/**
 * Builds a guard that validates a fixed-length array against one guard per
 * position, AND derives a `TupleSpec` from those same guards.
 *
 * @example
 * ```typescript
 * const isPair = gen.tuple(isString, isNumber);
 * isPair(["a", 1]);   // true
 * isPair.generate();  // ["kx...", 42] (a real [string, number])
 * ```
 */
export function tuple<const G extends readonly TypeGuard<unknown>[]>(
  ...guards: G
): TypeGuard<InferTuple<G>> {
  const guard = createTypeGuard<InferTuple<G>>((v): InferTuple<G> | null => {
    if (!Array.isArray(v) || v.length !== guards.length) return null;
    for (let i = 0; i < guards.length; i++) {
      if (!guards[i](v[i])) return null;
    }
    return v as InferTuple<G>;
  });

  registerGen(guard, {
    kind: "tuple",
    elements: guards.map((g) => specRef(g)),
  });

  return guard;
}
