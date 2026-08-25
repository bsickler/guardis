/**
 * Type guards for compound/container types (Map, Set, Tuple) built on top of
 * guardis' primitives.
 * @module
 */

import { createTypeGuard } from "../guard.ts";
import { isUndefined } from "./primitives.ts";
import type { HelpersWithContext, TypeGuard } from "../types.ts";
import type { MapTypeGuard, SetTypeGuard, TupleOfLength } from "./collections.types.ts";
import { guardNameOrParens, validateElement } from "../utilities.ts";

export type { MapTypeGuard, SetTypeGuard, TupleOfLength } from "./collections.types.ts";

/** Precursor to full isMap guard */
const _isMap = createTypeGuard(
  "Map",
  (t): Map<unknown, unknown> | null => t instanceof Map ? t : null,
);

/**
 * Type guard that checks if a value is a Map instance, with optional key/value
 * type checking via `.of(keyGuard, valueGuard)`.
 *
 * @example
 * ```typescript
 * isMap(new Map())                       // true
 * isMap({})                              // false
 *
 * const isStringToNumber = isMap.of(isString, isNumber);
 * isStringToNumber(new Map([["a", 1]]))  // true
 * isStringToNumber(new Map([[1, 1]]))    // false (key is not string)
 * ```
 */
export const isMap: MapTypeGuard = Object.assign(
  _isMap,
  {
    of: <K, V>(keyGuard: TypeGuard<K>, valueGuard: TypeGuard<V>): TypeGuard<Map<K, V>> => {
      const k = guardNameOrParens(keyGuard);
      const v = guardNameOrParens(valueGuard);
      const name = k && v ? `Map<${k}, ${v}>` : "Map";

      return createTypeGuard(name, (val, helpers) => {
        if (!_isMap(val)) return null;
        const ctx = (helpers as HelpersWithContext)._ctx;
        let idx = 0;
        for (const [key, value] of val) {
          if (!validateElement(keyGuard, key, ctx, `key[${idx}]`)) return null;
          if (!validateElement(valueGuard, value, ctx, `value[${idx}]`)) return null;
          idx++;
        }
        return val as Map<K, V>;
      });
    },
  },
) as MapTypeGuard;

/** Precursor to full isSet guard */
const _isSet = createTypeGuard(
  "Set",
  (t): Set<unknown> | null => t instanceof Set ? t : null,
);

/**
 * Type guard that checks if a value is a Set instance, with optional element
 * type checking via `.of(guard)`.
 *
 * @example
 * ```typescript
 * isSet(new Set())                    // true
 * isSet([1, 2, 3])                    // false
 *
 * const isStringSet = isSet.of(isString);
 * isStringSet(new Set(["a", "b"]))    // true
 * isStringSet(new Set([1, 2]))        // false
 * ```
 */
export const isSet: SetTypeGuard = Object.assign(
  _isSet,
  {
    of: <T>(guard: TypeGuard<T>): TypeGuard<Set<T>> => {
      const g = guardNameOrParens(guard);
      const name = g ? `Set<${g}>` : "Set";

      return createTypeGuard(name, (val, helpers) => {
        if (!_isSet(val)) return null;
        const ctx = (helpers as HelpersWithContext)._ctx;
        let idx = 0;
        for (const item of val) {
          if (!validateElement(guard, item, ctx, idx)) return null;
          idx++;
        }
        return val as Set<T>;
      });
    },
  },
);

/**
 * Type guard that checks if a value is a tuple (array) of a specific length.
 *
 * A tuple is an array with a fixed number of elements. This function validates
 * that the input is an array and has exactly the specified length.
 *
 * @typeParam N - The expected length of the tuple
 * @param t - The value to check
 * @param length - The expected length of the tuple
 * @returns Type predicate indicating if the value is a tuple of length N
 *
 * @example
 * ```typescript
 * const value: unknown = [1, 2, 3];
 *
 * if (isTuple(value, 3)) {
 *   // value is now typed as [unknown, unknown, unknown]
 *   console.log(value.length); // 3
 * }
 *
 * // Check for empty tuple
 * if (isTuple([], 0)) {
 *   console.log("Empty tuple");
 * }
 * ```
 */
const isTuple = <N extends number>(t: unknown, length: N): t is TupleOfLength<N> => {
  return Array.isArray(t) && t.length === length;
};

/**
 * Strict version of isTuple that throws a TypeError if the value is not a tuple of the specified length.
 * @typeParam N - The expected length of the tuple
 * @param t - The value to check
 * @param length - The expected length of the tuple
 * @param errorMsg - Optional custom error message
 * @returns true if the value is a tuple of the specified length
 * @throws {TypeError} If the value is not a tuple of the specified length
 */
isTuple.strict = <N extends number>(
  t: unknown,
  length: N,
  errorMsg?: string,
): t is TupleOfLength<N> => {
  if (!isTuple(t, length)) {
    throw TypeError(errorMsg ?? `Type guard failed. Value is not a tuple of length ${length}.`);
  }

  return true;
};

/**
 * Assertion function that throws an error if the value is not a tuple of the specified length.
 * TypeScript will narrow the type to TupleOfLength<N> after this assertion.
 * @typeParam N - The expected length of the tuple
 * @param t - The value to check
 * @param length - The expected length of the tuple
 * @param errorMsg - Optional custom error message
 * @throws {TypeError} If the value is not a tuple of the specified length
 */
isTuple.assert = isTuple.strict as <N extends number>(
  t: unknown,
  length: N,
  errorMsg?: string,
) => asserts t is TupleOfLength<N>;

/**
 * Creates a union type guard that checks if a value is a tuple of specified length OR matches another type.
 * @param length - The expected length of the tuple
 * @param guard - The type guard to combine with isTuple
 * @returns A new type guard for TupleOfLength<N> | T2
 */
isTuple.or = <N extends number, T2>(
  length: N,
  guard: TypeGuard<T2>,
): TypeGuard<TupleOfLength<N> | T2> => {
  return createTypeGuard<TupleOfLength<N> | T2>((v: unknown, h) =>
    isTuple(v, length) ? v : guard._.parser(v, h)
  );
};

// Define the optional methods for isTuple
const isTupleOptional = <N extends number>(
  t: unknown,
  length: N,
): t is TupleOfLength<N> | undefined => isUndefined(t) || isTuple(t, length);

isTupleOptional.strict = <N extends number>(
  t: unknown,
  length: N,
  errorMsg?: string,
): t is TupleOfLength<N> | undefined => {
  if (!isTupleOptional(t, length)) {
    throw TypeError(
      errorMsg ?? `Type guard failed. Value is not a tuple of length ${length} or undefined.`,
    );
  }
  return true;
};

isTupleOptional.assert = isTupleOptional.strict;

/**
 * Optional variant of isTuple that accepts undefined or a tuple of the specified length.
 * @typeParam N - The expected length of the tuple
 * @param t - The value to check
 * @param length - The expected length of the tuple
 * @returns true if the value is undefined or a tuple of the specified length, otherwise false
 */
isTuple.optional = isTupleOptional;

export { isTuple };
