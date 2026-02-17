import { isUndefined } from "./guard.ts";
import { hasContext } from "./introspect.ts";
import type { Context, GuardedType, TypeGuard } from "./types.ts";

/**
 * Utility to verify if a property exists in an object. Checks that
 * k is a key in t. If a guard method is provided, it will also check
 * that the value at k passes the guard.
 * @param {object} t The object to check for property k.
 * @param {string|number|Symbol} k The key for property k.
 * @param {Function|undefined} guard The optional type guard to validate t[k].
 * @param {Context|undefined} ctx Optional validation context for path tracking.
 *        Note: ctx is expected to already include the key in its path when passed.
 * @param {string|undefined} errorMessage Optional custom error message to use instead of default.
 * @returns {boolean}
 */
export function hasProperty<K extends PropertyKey, G = unknown>(
  t: object,
  k: K,
  guard?: (v: unknown) => v is G,
  ctx?: Context,
  errorMessage?: string,
): t is { [K2 in K]: G } {
  if (!(k in t)) {
    if (ctx) ctx.addIssue(errorMessage ?? `Missing required property: ${String(k)}`);

    return false;
  }

  if (!guard) return true;

  const value = t[k as keyof typeof t];

  // If custom errorMessage provided, use simple boolean check and add custom message on failure
  if (errorMessage) {
    if (!guard(value)) {
      if (ctx) {
        ctx.addIssue(errorMessage);
        return true; // Continue validation to collect all errors
      }
      return false;
    }
    return true;
  }

  // If context is provided, use context-aware validation if available on the guard
  if (ctx && hasContext(guard)) {
    guard._.context(value, ctx); // Run validation, errors accumulate in ctx
    return true; // Always continue to collect all errors
  }

  return guard(value);
}

/**
 * Checks if an object does not have a specific property.
 *
 * This function determines whether the given property key `k` does not exist
 * in the object `t`. It uses TypeScript's type guard feature to refine the type
 * of the object, ensuring that the property `k` is absent or explicitly `undefined`.
 *
 * @template K - The type of the property key to check.
 * @param t - The object to check for the absence of the property.
 * @param k - The property key to verify.
 * @param ctx - Optional validation context for path tracking.
 * @param errorMessage - Optional custom error message to use instead of default.
 * @returns A boolean indicating whether the property `k` does not exist in the object `t`.
 */
export function doesNotHaveProperty<K extends PropertyKey>(
  t: object,
  k: K,
  ctx?: Context,
  errorMessage?: string,
): t is { [K2 in K]: never } {
  if (k in t) {
    if (ctx) ctx.addIssue(errorMessage ?? `Unexpected property: ${String(k)}`);
    return false;
  }
  return true;
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
 * @param ctx - Optional validation context for path tracking
 * @param errorMessage - Optional custom error message to use instead of default
 * @returns Type predicate indicating if the object has the optional property of type G
 */
export function hasOptionalProperty<K extends PropertyKey, G = unknown>(
  t: object,
  k: K,
  guard?: (v: unknown) => v is G,
  ctx?: Context,
  errorMessage?: string,
): t is { [K2 in K]+?: G } {
  if (isUndefined(t[k as keyof typeof t])) return true;

  return hasProperty(t, k, guard, ctx, errorMessage);
}

/**
 * Utility to verify if a value is included in a tuple.
 * @param {array} t The tuple to check for the presence of index i.
 * @param {unknown} i The index to check.
 * @param {Function} guard The type guard to validate t[i].
 * @returns {boolean}
 */
export function tupleHas<T extends readonly unknown[], I extends number, G = unknown>(
  t: T,
  i: I,
  guard: (v: unknown) => v is G,
): t is T & { [K in I]: G } {
  return (i in t) && guard(t[i]);
}

/**
 * Determines whether the specified value `i` is included in the array `t`.
 * Useful for checking if a value is part of a union type represented by a tuple.
 * @typeParam T - A readonly array of unknown elements.
 * @param t - The array to search within.
 * @param v - The value to search for in the array.
 * @returns `true` if `v` is found in `t`, otherwise `false`.
 */
export function includes<T extends readonly unknown[]>(t: T, v: unknown): v is T[number] {
  return t.includes(v);
}

/**
 * Determines if a given property key exists as a key in the specified object.
 *
 * @template T - The type of the object to check against.
 * @param k - The property key to check.
 * @param t - The object to check the property key against.
 * @returns A boolean indicating whether the property key exists in the object.
 */
export function keyOf<T extends object>(
  k: unknown,
  t: T,
  ctx?: Context,
  errorMessage?: string,
): k is keyof T {
  if (typeof k !== "string" && typeof k !== "number" && typeof k !== "symbol") {
    if (ctx) ctx.addIssue(errorMessage ?? `Invalid key type: ${typeof k}`);
    return false;
  }

  if (!(k in t)) {
    if (ctx) ctx.addIssue(errorMessage ?? `Key "${String(k)}" not found in object`);
    return false;
  }

  return true;
}

/**
 * Formats an error message based on the provided value and optional metadata.
 *
 * @param value - The value that caused the error.
 * @param name - An optional name of the expected type or condition.
 * @returns A formatted error message string indicating the expected type (if provided) and the received value.
 */
export function formatErrorMessage(value: unknown, name?: string): string {
  if (name) {
    return `Expected ${name}. Received: ${JSON.stringify(value)}`;
  }

  return `Invalid value. Received: ${JSON.stringify(value)}`;
}

/**
 * Creates a union type guard from a list of type guards.
 *
 * @typeParam G - A tuple of `TypeGuard<unknown>` types.
 * @param guards - The type guards to combine into a union.
 * @returns A type guard that accepts any value accepted by at least one of the provided guards.
 */
export const unionOf = <G extends readonly TypeGuard<unknown>[]>(
  ...guards: G
): TypeGuard<GuardedType<G[number]>> => {
  let store = guards[0];

  for (let i = 1; i < guards.length; i++) {
    store = store.or(guards[i]);
  }

  return store as TypeGuard<GuardedType<G[number]>>;
};
