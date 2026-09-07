/**
 * Type guards for compound/container types (Map, Set, Array, Tuple).
 * @module
 */

import { createTypeGuard } from "../guard.ts";
import { isUndefined } from "./primitives.ts";
import type { HelpersWithContext, TypeGuard } from "../types.ts";
import type {
  ArrayTypeGuard,
  MapSizeGuard,
  MapTypeGuard,
  SetTypeGuard,
  TupleOfLength,
} from "./collections.types.ts";
import { guardNameOrParens, validateElement } from "../utilities.ts";

export type {
  ArraySizeGuard,
  ArrayTypeGuard,
  MapSizeGuard,
  MapTypeGuard,
  SetSizeGuard,
  SetTypeGuard,
  TupleOfLength,
} from "./collections.types.ts";

/** The min/max/range methods every size-chain-method result carries. The
 * exact-value shorthand (isArray's `ofLength`, isMap/isSet's `ofSize`) is
 * attached under a caller-chosen key instead, since it differs by kind. */
type SizeChainable<T> = TypeGuard<T> & {
  min(n: number): TypeGuard<T>;
  max(n: number): TypeGuard<T>;
  range(min: number, max: number): TypeGuard<T>;
};

/** `SizeChainable<T>` plus the exact-value shorthand under its own
 * caller-chosen key (isArray's `ofLength`, isMap/isSet's `ofSize`). */
type WithExact<T, ExactName extends string> =
  & SizeChainable<T>
  & {
    [K in ExactName]: (n: number) => TypeGuard<T>;
  };

/** Wraps `guard` with chainable min/max/range/[exactName] validation methods
 * over `sizeOf(value)` -- the shared implementation behind isMap/isSet/
 * isArray's size/length methods. `exactName` must be a string literal
 * (e.g. `"ofSize"` as const) for it to appear as its own key in the return
 * type rather than widening to `string`.
 *
 * `reattach`, if given, runs on every guard this produces (`guard` itself
 * included) to re-layer guard-specific extras that would otherwise be lost
 * when `.extend()` builds a fresh guard object at each chain step -- e.g.
 * isMap's `.of()`. Pass the same `reattach` function again if its own
 * result should keep re-attaching too; omit it once `.of()` is meant to be
 * terminal. */
function withSizeMethods<T, ExactName extends string>(
  guard: TypeGuard<T>,
  options: { sizeOf: (value: T) => number; exactName: ExactName; label: string },
  reattach?: (guard: WithExact<T, ExactName>) => void,
): WithExact<T, ExactName> {
  const { sizeOf, exactName, label } = options;
  const g = guard as WithExact<T, ExactName>;
  const wrap = (child: TypeGuard<T>): WithExact<T, ExactName> =>
    withSizeMethods(child, options, reattach);

  // A mapped type keyed by a generic type parameter can be read but not
  // written without a cast -- TS can't confirm `exactName`'s runtime value
  // matches the key `ExactName` was instantiated with here.
  (g as Record<ExactName, (n: number) => TypeGuard<T>>)[exactName] = (n) =>
    wrap(guard.extend(`${label} == ${n}`, (v) => sizeOf(v) === n ? v : null));
  g.min = (n) => wrap(guard.extend(`${label} >= ${n}`, (v) => sizeOf(v) >= n ? v : null));
  g.max = (n) => wrap(guard.extend(`${label} <= ${n}`, (v) => sizeOf(v) <= n ? v : null));
  g.range = (min, max) =>
    wrap(
      guard.extend(
        `${label} ${min}..${max}`,
        (v) => sizeOf(v) >= min && sizeOf(v) <= max ? v : null,
      ),
    );

  reattach?.(g);
  return g;
}

/** Attaches `.of()` to `guard` for a single-element container (array, Set) --
 * shared by isSet/isArray. Validates against `guard` itself, not a bare
 * "is this container" check, so a size constraint chained before `.of()`
 * still applies after it. */
function attachElementOf<C extends Iterable<unknown>>(
  guard: SizeChainable<C>,
  sizeOptions: { sizeOf: (value: C) => number; exactName: string; label: string },
  nameFor: (elementName: string | undefined) => string,
): void {
  const typed = guard as unknown as { of: <T>(elementGuard: TypeGuard<T>) => SizeChainable<C> };
  typed.of = <T>(elementGuard: TypeGuard<T>) => {
    const name = nameFor(guardNameOrParens(elementGuard));

    const child = createTypeGuard(name, (val, helpers): C | null => {
      if (!guard(val)) return null;
      const ctx = (helpers as HelpersWithContext)._ctx;
      let idx = 0;
      for (const item of val) {
        if (!validateElement(elementGuard, item, ctx, idx)) return null;
        idx++;
      }
      return val;
    });

    return withSizeMethods(child, sizeOptions);
  };
}

/** Precursor to full isMap guard */
const _isMap = createTypeGuard(
  "Map",
  (t): Map<unknown, unknown> | null => t instanceof Map ? t : null,
);

const mapSizeOptions = {
  sizeOf: (v: Map<unknown, unknown>) => v.size,
  exactName: "ofSize",
  label: "size",
} as const;

/** Attaches `.of()` to `guard`. Validates against `guard` itself, not a bare
 * "is a Map" check, so a size constraint chained before `.of()` (via
 * `.min()`/`.max()`/`.ofSize()`/`.range()`) still applies after it. */
function attachMapOf(guard: SizeChainable<Map<unknown, unknown>>): void {
  const typed = guard as unknown as {
    of: <K, V>(keyGuard: TypeGuard<K>, valueGuard: TypeGuard<V>) => MapSizeGuard<K, V>;
  };
  typed.of = <K, V>(keyGuard: TypeGuard<K>, valueGuard: TypeGuard<V>) => {
    const k = guardNameOrParens(keyGuard);
    const v = guardNameOrParens(valueGuard);
    const name = k && v ? `Map<${k}, ${v}>` : "Map";

    const child = createTypeGuard(name, (val, helpers): Map<unknown, unknown> | null => {
      if (!guard(val)) return null;
      const ctx = (helpers as HelpersWithContext)._ctx;
      let idx = 0;
      for (const [key, value] of val) {
        if (!validateElement(keyGuard, key, ctx, `key[${idx}]`)) return null;
        if (!validateElement(valueGuard, value, ctx, `value[${idx}]`)) return null;
        idx++;
      }
      return val;
    });

    return withSizeMethods(child, mapSizeOptions) as MapSizeGuard<K, V>;
  };
}

/**
 * Type guard that checks if a value is a Map instance, with optional key/value
 * type checking via `.of(keyGuard, valueGuard)` and chainable size validation
 * via `.min()`/`.max()`/`.ofSize()`/`.range()`.
 *
 * @example
 * ```typescript
 * isMap(new Map())                       // true
 * isMap({})                              // false
 *
 * const isStringToNumber = isMap.of(isString, isNumber);
 * isStringToNumber(new Map([["a", 1]]))  // true
 * isStringToNumber(new Map([[1, 1]]))    // false (key is not string)
 *
 * const isSmallMap = isMap.max(3);
 * isSmallMap(new Map([["a", 1]]))        // true
 * ```
 */
export const isMap = withSizeMethods(_isMap, mapSizeOptions, attachMapOf) as MapTypeGuard;

/** Precursor to full isSet guard */
const _isSet = createTypeGuard(
  "Set",
  (t): Set<unknown> | null => t instanceof Set ? t : null,
);

const setSizeOptions = {
  sizeOf: (v: Set<unknown>) => v.size,
  exactName: "ofSize",
  label: "size",
} as const;

/** Attaches `.of()` to `guard` -- shared with isArray's equivalent via
 * `attachElementOf`. */
function attachSetOf(guard: SizeChainable<Set<unknown>>): void {
  attachElementOf(guard, setSizeOptions, (name) => name ? `Set<${name}>` : "Set");
}

/**
 * Type guard that checks if a value is a Set instance, with optional element
 * type checking via `.of(guard)` and chainable size validation via
 * `.min()`/`.max()`/`.ofSize()`/`.range()`.
 *
 * @example
 * ```typescript
 * isSet(new Set())                    // true
 * isSet([1, 2, 3])                    // false
 *
 * const isStringSet = isSet.of(isString);
 * isStringSet(new Set(["a", "b"]))    // true
 * isStringSet(new Set([1, 2]))        // false
 *
 * const isSmallSet = isSet.max(3);
 * isSmallSet(new Set(["a"]))          // true
 * ```
 */
export const isSet = withSizeMethods(_isSet, setSizeOptions, attachSetOf) as SetTypeGuard;

/** Precursor to full isArray guard */
const _isArray = createTypeGuard("array", (t): unknown[] | null => Array.isArray(t) ? t : null);

const arraySizeOptions = {
  sizeOf: (v: unknown[]) => v.length,
  exactName: "ofLength",
  label: "length",
} as const;

/** Attaches `.of()` to `guard` -- shared with isSet's equivalent via
 * `attachElementOf`. */
function attachArrayOf(guard: SizeChainable<unknown[]>): void {
  attachElementOf(guard, arraySizeOptions, (name) => name ? `${name}[]` : "array");
}

/**
 * Type guard that checks if a value is an array, with optional element type
 * checking via `.of(guard)` and chainable length validation via
 * `.min()`/`.max()`/`.ofLength()`/`.range()`.
 *
 * @example
 * ```typescript
 * isArray([1, 2, 3])                  // true
 * isArray("not an array")             // false
 *
 * const isStringArray = isArray.of(isString);
 * isStringArray(["a", "b"])           // true
 * isStringArray([1, 2])               // false
 *
 * const isSmallArray = isArray.max(3);
 * isSmallArray([1, 2])                // true
 * ```
 */
export const isArray = withSizeMethods(_isArray, arraySizeOptions, attachArrayOf) as ArrayTypeGuard;

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
