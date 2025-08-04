import { isUndefined } from "./guard.ts";

/**
 * Utility to verify if a property exists in an object. Checks that
 * k is a key in t. If a guard method is provided, it will also check
 * that the value at k passes the guard.
 * @param {object} t The object to check for property k.
 * @param {string|number|Symbol} k The key for property k.
 * @param {Function|undefined} guard The optional type guard to validate t[k].
 * @returns {boolean}
 */
export function hasProperty<K extends PropertyKey, G = unknown>(
  t: object,
  k: K,
  guard?: (v: unknown) => v is G,
): t is { [K2 in K]: G } {
  if (!(k in t)) return false;

  return guard ? guard(t[k as keyof typeof t]) : true;
}

/**
 * Checks if an object has an optional property that passes a type guard.
 *
 * This function verifies if a property is either:
 * - Undefined (which is valid for optional properties)
 * - Present and passes the specified type guard

 * @param t - The object to check
 * @param k - The property key to look for
 * @param guard - Optional function that checks if the value is of type G
 * @returns Type predicate indicating if the object has the optional property of type G
 */
export function hasOptionalProperty<K extends PropertyKey, G = unknown>(
  t: object,
  k: K,
  guard?: (v: unknown) => v is G,
): t is { [K2 in K]+?: G } {
  if (isUndefined(t[k as keyof typeof t])) return true;

  return hasProperty(t, k, guard);
}

/**
 * Utility to verify if a value is included in a tuple.
 * @param {array} t The tuple to check for the presence of index i.
 * @param {unknown} i The index to check.
 * @param {Function} guard The type guard to validate t[i].
 * @returns {boolean}
 */
// deno-lint-ignore no-explicit-any
export function tupleHas<T extends readonly any[], I extends number, G = unknown>(
  t: T,
  i: I,
  guard: (v: unknown) => v is G,
  // @ts-expect-error While TS doesn't understand this, we are
  // explicitly validating that t[i] is of type G and returning a new type
  // that replaces the type at index I with G, effectively narrowing the type.
): t is { [K in keyof T]: K extends `${I}` ? G : T[K] } {
  return (i in t) && guard(t[i]);
}

/**
 * Determines whether the specified value `i` is included in the array `t`.
 * Useful for checking if a value is part of a union type represented by a tuple.
 * @typeParam T - A readonly array of unknown elements.
 * @param t - The array to search within.
 * @param v - The value to search for in the array.
 * @returns `true` if `i` is found in `t`, otherwise `false`.
 */
export function includes<T extends readonly unknown[]>(t: T, v: unknown): v is T[number] {
  return t.includes(v);
}
