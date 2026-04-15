/**
 * primitives.ts - Type guard declarations for primitive and built-in types.
 * @module
 */

import { createTypeGuard, isExactly, isNull, isUndefined } from "../guard.ts";
import type {
  ArrayTypeGuard,
  CanBeEmpty,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  MapTypeGuard,
  NumberTypeGuard,
  SetTypeGuard,
  Simplify,
  StringTypeGuard,
  TupleOfLength,
  TypeGuard,
} from "../types.ts";
import { hasContext, hasName } from "../introspect.ts";
import { unionOf } from "../utilities.ts";
import type { HelpersWithContext } from "../types.ts";

/**
 * Wraps a string TypeGuard with chainable length validation methods.
 * Each method delegates to .extend() and wraps the result for further chaining.
 */
function withStringMethods(guard: TypeGuard<string>): TypeGuard<string> & StringTypeGuard {
  return Object.assign(guard, {
    ofLength: (n: number) => guard.extend(`length == ${n}`, (v) => v.length === n ? v : null),
    range: (min: number, max: number) =>
      guard.extend(`length ${min}..${max}`, (v) => v.length >= min && v.length <= max ? v : null),
    min: (n: number) =>
      withStringMethods(guard.extend(`length >= ${n}`, (v) => v.length >= n ? v : null)),
    max: (n: number) =>
      withStringMethods(guard.extend(`length <= ${n}`, (v) => v.length <= n ? v : null)),
  }) as TypeGuard<string> & StringTypeGuard;
}

/**
 * Wraps a TypeGuard<number> with chainable comparison methods (gt, gte, lt, lte, eq).
 * Each method delegates to .extend() and wraps the result for further chaining.
 */
function withComparisons(guard: TypeGuard<number>): TypeGuard<number> & NumberTypeGuard {
  const numeric = guard as TypeGuard<number> & NumberTypeGuard;
  numeric.gt = (n) => withComparisons(guard.extend(`> ${n}`, (v) => v > n ? v : null));
  numeric.gte = (n) => withComparisons(guard.extend(`>= ${n}`, (v) => v >= n ? v : null));
  numeric.lt = (n) => withComparisons(guard.extend(`< ${n}`, (v) => v < n ? v : null));
  numeric.lte = (n) => withComparisons(guard.extend(`<= ${n}`, (v) => v <= n ? v : null));
  numeric.eq = (n) => guard.extend(`== ${n}`, (v) => v === n ? v : null);
  Object.defineProperty(numeric, "finite", {
    get: () => withComparisons(guard.extend("finite", (v) => Number.isFinite(v) ? v : null)),
    enumerable: true,
    configurable: true,
  });
  return numeric;
}

/**
 * Wraps a TypeGuard<T[]> with chainable length validation methods.
 * Each method delegates to .extend() and wraps the result for further chaining.
 */
function withArrayMethods<T>(guard: TypeGuard<T[]>): ArrayTypeGuard<T> {
  const arr = guard as ArrayTypeGuard<T>;
  arr.ofLength = (n) =>
    withArrayMethods(guard.extend(`length == ${n}`, (v) => v.length === n ? v : null));
  arr.min = (n) =>
    withArrayMethods(guard.extend(`length >= ${n}`, (v) => v.length >= n ? v : null));
  arr.max = (n) =>
    withArrayMethods(guard.extend(`length <= ${n}`, (v) => v.length <= n ? v : null));
  arr.range = (min, max) =>
    withArrayMethods(
      guard.extend(`length ${min}..${max}`, (v) => v.length >= min && v.length <= max ? v : null),
    );
  return arr;
}

/**
 * Returns true if input satisfies type boolean.
 * @param {unknown} t
 * @return {boolean}
 */
export const isBoolean: TypeGuard<boolean> = createTypeGuard(
  "boolean",
  (t): boolean | null => typeof t === "boolean" ? t : null,
);

/**
 * Returns true if input satisfies type string.
 * @param {unknown} t
 * @return {boolean}
 */
export const isString: TypeGuard<string> & Simplify<StringTypeGuard> = withStringMethods(
  createTypeGuard(
    "string",
    (t): string | null => typeof t === "string" ? t : null,
  ),
);

/**
 * Returns true if input satisfies type number. Returns false if `NaN` is passed.
 *
 * While `NaN` is technically a number in JavaScript, it is not a valid value for many applications
 * and will fail if used with common numeric operations.
 *
 * @param {unknown} t
 * @return {boolean}
 */
export const isNumber: TypeGuard<number> & NumberTypeGuard = withComparisons(createTypeGuard(
  "number",
  (t): number | null => typeof t === "number" && !Number.isNaN(t) ? t : null,
));

/**
 * Returns true if input is an integer. Rejects NaN, Infinity, and non-integer numbers.
 *
 * @param {unknown} t
 * @return {boolean}
 */
export const isInt: TypeGuard<number> & NumberTypeGuard = withComparisons(createTypeGuard(
  "integer",
  (t): number | null => typeof t === "number" && Number.isInteger(t) ? t : null,
));

/**
 * Returns true if input satisfies type symbol.
 * @param {unknown} t
 * @return {boolean}
 */
export const isSymbol: TypeGuard<symbol> = createTypeGuard(
  "symbol",
  (t): symbol | null => typeof t === "symbol" ? t : null,
);

/**
 * Returns true if input satisfies type binary.
 * @param {unknown} t
 * @return {boolean}
 */
export const isBinary: TypeGuard<0 | 1> = createTypeGuard(
  "binary",
  (t): 0 | 1 | null => t === 1 || t === 0 ? t : null,
);

/**
 * Returns true if input satisfies type numeric.
 * @param {unknown} t
 * @return {boolean}
 */
const NUMERIC_RE = /^-?\d*\.?\d+$/;

export const isNumeric: TypeGuard<number> & NumberTypeGuard = withComparisons(createTypeGuard(
  "numeric",
  (t): number | null => {
    if (isNumber(t)) return t as number;

    if (!NUMERIC_RE.test(t as string)) return null;

    const _t = parseInt(t as string) || parseFloat(t as string);

    return (!isNaN(_t) && isNumber(_t)) ? t as number : null;
  },
));

/**
 * Returns true if input satisfies type Function.
 * @param {unknown} t
 * @return {boolean}
 */
export const isFunction: TypeGuard<(...args: unknown[]) => unknown> = createTypeGuard(
  "function",
  (t): ((...args: unknown[]) => unknown) | null =>
    typeof t === "function" ? (t as (...args: unknown[]) => unknown) : null,
);

/**
 * Returns true if input is a JSON-able primitive date type
 * @param {unknown} t
 * @return {boolean}
 */
export const isJsonPrimitive: TypeGuard<JsonPrimitive> = unionOf(
  isBoolean,
  isString,
  isNumber,
  isNull,
);

/**
 * Returns true if input satisfies type object. _BEWARE_ object
 * can apply to many different types, including arrays. This
 * is not as type safe as you might think.
 * @param {unknown} t
 * @return {boolean}
 */
export const isObject: TypeGuard<object> = createTypeGuard(
  "object",
  (t): object | null => t && typeof t === "object" && !Array.isArray(t) ? t : null,
);

/** Returns true if input satisfies type PropertyKey.
 * @param {unknown} t
 * @return {boolean}
 */
export const isPropertyKey: TypeGuard<PropertyKey> = unionOf(
  isString as TypeGuard<string>,
  isNumber,
  isSymbol,
);

/**
 * Returns true if input satisfies type object. _BEWARE_ object
 * can apply to many different types, including arrays. This
 * is not as type safe as you might think.
 * @param {unknown} t
 * @return {boolean}
 */
export const isJsonObject: TypeGuard<JsonObject> = createTypeGuard(
  "JsonObject",
  (t): JsonObject | null => {
    if (
      t && typeof t === "object" &&
      Object.getPrototypeOf(t) === Object.prototype
    ) {
      for (const v of Object.values(t)) {
        if (!isJsonValue(v)) return null;
      }

      return t as JsonObject;
    }

    return null;
  },
);

/** Precursor to full isArray guard */
const _isArray = createTypeGuard("array", (t): unknown[] | null => Array.isArray(t) ? t : null);

/**
 * Returns true if input satisfies type array.
 * @param {unknown} t
 * @return {boolean}
 */
export const isArray: ArrayTypeGuard = withArrayMethods(Object.assign(
  _isArray,
  {
    of: <T>(guard: TypeGuard<T>): ArrayTypeGuard<T> => {
      const guardName = hasName(guard) ? guard._.name : undefined;

      let name = "array";

      if (guardName) {
        name = guardName?.includes(" | ") ? `(${guardName})[]` : `${guardName}[]`;
      }

      return withArrayMethods(createTypeGuard(
        name,
        (v, helpers) => {
          if (!isArray(v)) return null;

          const ctx = (helpers as HelpersWithContext)._ctx;

          // If we have a context, use index-aware validation
          if (ctx && hasContext(guard)) {
            for (let i = 0; i < v.length; i++) {
              ctx.pushPath(i);
              try {
                const result = guard._.context(v[i], ctx);
                if (result.issues) return null; // issues already added to parent ctx
              } finally {
                ctx.popPath();
              }
            }
            return v as T[];
          }

          // Otherwise, use simple boolean check
          return v.every((item) => guard(item)) ? v as T[] : null;
        },
      ));
    },
  },
));

/**
 * Returns true if input satisfies type array.
 * @param {unknown} t
 * @return {boolean}
 */
export const isJsonArray: TypeGuard<JsonValue[] | readonly JsonValue[]> = createTypeGuard(
  "JsonArray",
  (t): JsonArray | null => Array.isArray(t) ? t : null,
);

/**
 * Checks if a given value is a valid JSON value.
 *
 * This type guard leverages helper functions to determine if the provided value is a valid JSON
 * primitive, JSON array, or JSON object. If the value satisfies any of these conditions, it is
 * considered a valid JSON value.
 *
 * @param t - The value to be checked.
 * @returns The value itself if it is a valid JSON value; otherwise, returns null.
 *
 * @remarks
 * - For primitive types, arrays, and objects, the guard confirms conformance with the JSON value standards.
 *
 * @example
 * const value: unknown = getValue();
 * const jsonValue = isJsonValue(value);
 * if (jsonValue !== null) {
 *   // Work with the confirmed JSON value.
 * }
 */
export const isJsonValue: TypeGuard<JsonValue> = unionOf(
  isJsonPrimitive,
  isJsonArray,
  isJsonObject,
);

/**
 * A type guard function that checks if a value is a Date object.
 *
 * @param t - The value to check
 * @returns The original Date object if the value is a Date, otherwise null
 *
 * @example
 * ```typescript
 * const maybeDate: unknown = new Date();
 *
 * if (isDate(maybeDate)) {
 *   // maybeDate is now typed as Date
 *   console.log(maybeDate.toISOString());
 * }
 * ```
 */
export const isDate: TypeGuard<Date> = createTypeGuard("Date", (t) => t instanceof Date ? t : null);

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
export const isMap: MapTypeGuard = Object.assign(_isMap, {
  of: <K, V>(keyGuard: TypeGuard<K>, valueGuard: TypeGuard<V>): MapTypeGuard<K, V> => {
    const keyName = hasName(keyGuard) ? keyGuard._.name : undefined;
    const valueName = hasName(valueGuard) ? valueGuard._.name : undefined;

    let name = "Map";
    if (keyName && valueName) {
      const k = keyName.includes(" | ") ? `(${keyName})` : keyName;
      const v = valueName.includes(" | ") ? `(${valueName})` : valueName;
      name = `Map<${k}, ${v}>`;
    }

    return Object.assign(
      createTypeGuard(
        name,
        (val, helpers) => {
          if (!(val instanceof Map)) return null;

          const ctx = (helpers as HelpersWithContext)._ctx;

          // Context-aware validation with path tracking
          if (ctx && (hasContext(keyGuard) || hasContext(valueGuard))) {
            let idx = 0;
            for (const [key, value] of val) {
              ctx.pushPath(`key[${idx}]`);
              try {
                if (hasContext(keyGuard)) {
                  const result = keyGuard._.context(key, ctx);
                  if (result.issues) return null;
                } else if (!(keyGuard as TypeGuard<K>)(key)) {
                  return null;
                }
              } finally {
                ctx.popPath();
              }

              ctx.pushPath(`value[${idx}]`);
              try {
                if (hasContext(valueGuard)) {
                  const result = valueGuard._.context(value, ctx);
                  if (result.issues) return null;
                } else if (!(valueGuard as TypeGuard<V>)(value)) {
                  return null;
                }
              } finally {
                ctx.popPath();
              }
              idx++;
            }
            return val as Map<K, V>;
          }

          // Boolean mode
          for (const [key, value] of val) {
            if (!keyGuard(key) || !valueGuard(value)) return null;
          }
          return val as Map<K, V>;
        },
      ),
      {
        of: isMap.of,
      },
    ) as MapTypeGuard<K, V>;
  },
}) as MapTypeGuard;

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
export const isSet: SetTypeGuard = Object.assign(_isSet, {
  of: <T>(guard: TypeGuard<T>): SetTypeGuard<T> => {
    const guardName = hasName(guard) ? guard._.name : undefined;

    let name = "Set";
    if (guardName) {
      name = guardName.includes(" | ") ? `Set<(${guardName})>` : `Set<${guardName}>`;
    }

    return Object.assign(
      createTypeGuard(
        name,
        (val, helpers) => {
          if (!(val instanceof Set)) return null;

          const ctx = (helpers as HelpersWithContext)._ctx;

          if (ctx && hasContext(guard)) {
            let idx = 0;
            for (const item of val) {
              ctx.pushPath(idx);
              try {
                const result = guard._.context(item, ctx);
                if (result.issues) return null;
              } finally {
                ctx.popPath();
              }
              idx++;
            }
            return val as Set<T>;
          }

          for (const item of val) {
            if (!guard(item)) return null;
          }
          return val as Set<T>;
        },
      ),
      {
        of: isSet.of,
      },
    ) as SetTypeGuard<T>;
  },
}) as SetTypeGuard;

/**
 * Returns true if input satisfies type null or undefined.
 * @param {unknown} t
 * @return {boolean}
 */
const isNil: TypeGuard<null | undefined> = isNull.or(isUndefined);

const isEmptyRecord: TypeGuard<Record<string, never>> = createTypeGuard<Record<string, never>>(
  "{}",
  (t): Record<string, never> | null => {
    if (
      t && typeof t === "object" && Object.getPrototypeOf(t) === Object.prototype &&
      Object.keys(t).length === 0
    ) {
      return t as Record<string, never>;
    }
    return null;
  },
);

const isEmptyArray: TypeGuard<[]> = createTypeGuard<[]>(
  "[]",
  (t): [] | null => Array.isArray(t) && (t as unknown[]).length === 0 ? t as [] : null,
);

const isEmptyString: TypeGuard<""> = createTypeGuard<"">(
  '""',
  (t): "" | null =>
    typeof t === "string" ? t === "" ? t : t?.trim?.() === "" ? t as "" : null : null,
);

/**
 * Returns true if input is undefined, null, empty string, object with length
 * of 0 or object without enumerable keys.
 *
 * Strings are trimmed when evaluated.
 * @param {unknown} t
 * @return {boolean}
 */
const isEmpty: TypeGuard<null | undefined | "" | [] | Record<string, never>> = isNull
  .or(isUndefined)
  .or(isEmptyString)
  .or(isEmptyArray)
  .or(isEmptyRecord);

/**
 * Returns true if the value is iterable (has Symbol.iterator). Does not
 * check the type contained within the iterable.
 * @param t
 * @returns
 */
const isIterable: TypeGuard<Iterable<unknown>> = createTypeGuard<Iterable<unknown>>(
  "Iterable",
  (t) => {
    if (
      typeof t === "object" &&
      !isNil(t) &&
      Symbol.iterator in t &&
      isFunction(t[Symbol.iterator])
    ) {
      return t as Iterable<unknown>;
    }
    return null;
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

/**
 * Creates a type guard from a TypeScript enum object.
 * Validates that a value is a member of the enum.
 *
 * Handles both string and numeric enums. TypeScript compiles numeric enums
 * with reverse mappings — for `enum Dir { Up = 0, Down = 1 }`, the compiled
 * object is `{ Up: 0, Down: 1, 0: "Up", 1: "Down" }`. The stringified-number
 * keys (`"0"`, `"1"`) are the reverse mappings and must be filtered out so
 * that only the real enum values (`0`, `1`) are treated as valid members.
 * String enums (`enum Color { Red = "red" }`) produce no reverse mappings,
 * so the filter is a no-op for them.
 *
 * Note: TypeScript does not support exact type-level equality checks for enum
 * types. The inferred `_TYPE` is the enum's value union (e.g. `Color.Red |
 * Color.Green | Color.Blue`) rather than the branded `Color` type itself.
 * Both are mutually assignable — `const c: Color = x` compiles after narrowing
 * — but they are not identical under strict type-equality checks like
 * `Equals<A, B>`. This is a known TypeScript limitation, not a Guardis bug.
 * See: https://github.com/microsoft/TypeScript/issues/49497
 */
export function isEnum<const T extends Record<string, string | number>>(
  enumObj: T,
): TypeGuard<T[keyof T]> {
  // Keep only entries whose key is not a stringified number (filters reverse mappings).
  const values = Object.entries(enumObj)
    .filter(([key]) => isNaN(Number(key)))
    .map(([, value]) => value);
  const memberSet = new Set(values);
  const name = `enum(${values.join(" | ")})`;

  return createTypeGuard(
    name,
    (t) => memberSet.has(t as T[keyof T]) ? t as T[keyof T] : null,
  );
}

export { isEmpty, isIterable, isNil, isTuple };
