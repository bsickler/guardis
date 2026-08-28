import type { TypeGuard } from "../types.ts";

/** Maps `Set<unknown>`/`unknown[]` to `Set<U>`/`U[]` -- used by
 * `ExactSizeGuard` since TypeScript has no direct way to say "apply U to
 * this container type". */
type ApplyElement<C, U> = C extends Set<unknown> ? Set<U> : C extends unknown[] ? U[] : never;

/** Result of `.ofSize()`/`.ofLength()`/`.range()` on `SetTypeGuard`/
 * `ArrayTypeGuard`: the size is already fixed, so `.of()` here is terminal
 * -- it returns a plain guard with no further chain methods. isMap's
 * `.of()` takes two guards instead of one, so it keeps its own
 * `MapExactSizeGuard` rather than fitting this shape. */
export interface ExactSizeGuard<C extends Set<unknown> | Array<unknown>> extends TypeGuard<C> {
  of<U>(guard: TypeGuard<U>): TypeGuard<ApplyElement<C, U>>;
}

/** Chainable size-validation methods for a Map guard whose key/value types are already fixed via `.of()`. */
export interface MapSizeGuard<K, V> extends TypeGuard<Map<K, V>> {
  /** Checks the Map has exactly this many entries */
  ofSize(size: number): MapSizeGuard<K, V>;
  /** Checks the Map has at least this many entries */
  min(size: number): MapSizeGuard<K, V>;
  /** Checks the Map has at most this many entries */
  max(size: number): MapSizeGuard<K, V>;
  /** Checks the Map's entry count is between min and max (inclusive) */
  range(min: number, max: number): MapSizeGuard<K, V>;
}

/** Result of `.ofSize()`/`.range()` on `MapTypeGuard`: the entry count is
 * already fixed, so `.of()` here is terminal -- it returns a plain guard
 * with no further chain methods. */
export interface MapExactSizeGuard extends TypeGuard<Map<unknown, unknown>> {
  of<K, V>(keyGuard: TypeGuard<K>, valueGuard: TypeGuard<V>): TypeGuard<Map<K, V>>;
}

/** A Map type guard factory with chainable size-validation methods. `.of()`
 * returns a `MapSizeGuard<K, V>` -- typed for key/value but with no further
 * `.of()` chaining. */
export interface MapTypeGuard extends TypeGuard<Map<unknown, unknown>> {
  /** Returns a typed Map guard that validates key and value types */
  of<K, V>(keyGuard: TypeGuard<K>, valueGuard: TypeGuard<V>): MapSizeGuard<K, V>;
  /** Checks the Map has exactly this many entries */
  ofSize(size: number): MapExactSizeGuard;
  /** Checks the Map has at least this many entries. Can still chain `.max()` to form a range. */
  min(
    size: number,
  ): TypeGuard<Map<unknown, unknown>> & Omit<MapTypeGuard, "min" | "ofSize" | "range">;
  /** Checks the Map has at most this many entries. Can still chain `.min()` to form a range. */
  max(
    size: number,
  ): TypeGuard<Map<unknown, unknown>> & Omit<MapTypeGuard, "max" | "ofSize" | "range">;
  /** Checks the Map's entry count is between min and max (inclusive) */
  range(min: number, max: number): MapExactSizeGuard;
}

/** Chainable size-validation methods for a Set guard whose element type is already fixed via `.of()`. */
export interface SetSizeGuard<T> extends TypeGuard<Set<T>> {
  /** Checks the Set has exactly this many elements */
  ofSize(size: number): SetSizeGuard<T>;
  /** Checks the Set has at least this many elements */
  min(size: number): SetSizeGuard<T>;
  /** Checks the Set has at most this many elements */
  max(size: number): SetSizeGuard<T>;
  /** Checks the Set's element count is between min and max (inclusive) */
  range(min: number, max: number): SetSizeGuard<T>;
}

/** A Set type guard factory with chainable size-validation methods. `.of()`
 * returns a `SetSizeGuard<T>` -- typed for its element but with no further
 * `.of()` chaining. */
export interface SetTypeGuard extends TypeGuard<Set<unknown>> {
  /** Returns a typed Set guard that validates element types */
  of<T>(guard: TypeGuard<T>): SetSizeGuard<T>;
  /** Checks the Set has exactly this many elements */
  ofSize(size: number): ExactSizeGuard<Set<unknown>>;
  /** Checks the Set has at least this many elements. Can still chain `.max()` to form a range. */
  min(size: number): TypeGuard<Set<unknown>> & Omit<SetTypeGuard, "min" | "ofSize" | "range">;
  /** Checks the Set has at most this many elements. Can still chain `.min()` to form a range. */
  max(size: number): TypeGuard<Set<unknown>> & Omit<SetTypeGuard, "max" | "ofSize" | "range">;
  /** Checks the Set's element count is between min and max (inclusive) */
  range(min: number, max: number): ExactSizeGuard<Set<unknown>>;
}

/** Chainable length-validation methods for an array guard whose element type is already fixed via `.of()`. */
export interface ArraySizeGuard<T> extends TypeGuard<T[]> {
  /** Checks array has exactly this length */
  ofLength(length: number): ArraySizeGuard<T>;
  /** Checks array length >= min */
  min(length: number): ArraySizeGuard<T>;
  /** Checks array length <= max */
  max(length: number): ArraySizeGuard<T>;
  /** Checks array length is between min and max (inclusive) */
  range(min: number, max: number): ArraySizeGuard<T>;
}

/** An array type guard with chainable length validation methods. `.of()`
 * returns an `ArraySizeGuard<T>` -- typed for its element but with no
 * further `.of()` chaining, since re-`.of()`-ing would discard the first
 * element-type constraint instead of composing with it. */
export interface ArrayTypeGuard extends TypeGuard<unknown[]> {
  /** Returns a typed array guard that validates element types */
  of<U>(guard: TypeGuard<U>): ArraySizeGuard<U>;
  /** Checks array has exactly this length */
  ofLength(length: number): ExactSizeGuard<unknown[]>;
  /** Checks array length >= min. Can still chain `.max()` to form a range. */
  min(length: number): TypeGuard<unknown[]> & Omit<ArrayTypeGuard, "min" | "ofLength" | "range">;
  /** Checks array length <= max. Can still chain `.min()` to form a range. */
  max(length: number): TypeGuard<unknown[]> & Omit<ArrayTypeGuard, "max" | "ofLength" | "range">;
  /** Checks array length is between min and max (inclusive) */
  range(min: number, max: number): ExactSizeGuard<unknown[]>;
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
