import type { TypeGuard } from "../types.ts";

/** A Map type guard factory. The base guard accepts any Map; `.of()` returns
 * a plain TypeGuard<Map<K, V>> with no further `.of()` chaining. */
export interface MapTypeGuard extends TypeGuard<Map<unknown, unknown>> {
  /** Returns a typed Map guard that validates key and value types */
  of<K, V>(keyGuard: TypeGuard<K>, valueGuard: TypeGuard<V>): TypeGuard<Map<K, V>>;
}

/** A Set type guard factory. The base guard accepts any Set; `.of()` returns
 * a plain TypeGuard<Set<T>> with no further `.of()` chaining. */
export interface SetTypeGuard extends TypeGuard<Set<unknown>> {
  /** Returns a typed Set guard that validates element types */
  of<T>(guard: TypeGuard<T>): TypeGuard<Set<T>>;
}

/** Construct a tuple of unknowns, up to size 10. */
export type TupleOfLength<N extends number> = N extends 0 ? []
  : N extends 1 ? [unknown]
  : N extends 2 ? [unknown, unknown]
  : N extends 3 ? [unknown, unknown, unknown]
  : N extends 4 ? [unknown, unknown, unknown, unknown]
  : N extends 5 ? [unknown, unknown, unknown, unknown, unknown]
  : N extends 6 ? [unknown, unknown, unknown, unknown, unknown, unknown]
  : N extends 7 ? [unknown, unknown, unknown, unknown, unknown, unknown, unknown]
  : N extends 8 ? [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]
  : N extends 9 ? [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]
  : unknown[];
