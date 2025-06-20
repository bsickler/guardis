/**
 * guard.ts
 * @module
 */
import type { JsonArray, JsonObject, JsonPrimitive, JsonValue, TupleOfLength } from "./types.ts";

/** A parser is a function that takes an unknown and returns T or null */
export type Parser<T = unknown> = (
  val: unknown,
  helper: {
    has: typeof hasProperty;
    hasOptional: typeof hasOptionalProperty;
    tupleHas: typeof tupleHas;
    includes: typeof includes;
  },
) => T | null;

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

/**
 * Creates a type guard that strictly checks the type, throwing
 *  a TypeError if it fails.
 * @param parse
 * @returns
 */
const createStrictTypeGuard = <T>(parse: (v: unknown) => v is T): StrictTypeGuard<T> => {
  return (value: unknown, errorMsg?: string): value is T => {
    if (!parse(value)) {
      throw TypeError(errorMsg ?? `Type guard failed. Parser ${parse.name} returned null.`);
    }

    return true;
  };
};

type StrictTypeGuard<T> = (value: unknown, errorMsg?: string) => value is T;

/**
 * Creates an assertion type guard function from a strict type guard.
 *
 * An assertion type guard is a function that throws an error if the value
 * doesn't match the expected type, rather than returning a boolean.
 *
 * @template T - The type being guarded
 * @param guard - The strict type guard function to convert
 * @returns An assertion function that throws if the value is not of type T
 *
 * @example
 * ```typescript
 * const isString = (value: unknown): value is string => typeof value === 'string';
 * const assertIsString = createAssertTypeGuard(isString);
 *
 * // If value is not a string, this will throw an error
 * assertIsString(value, 'Expected a string');
 * // After this line, TypeScript knows that value is a string
 * ```
 */
const createAssertTypeGuard = <T>(guard: StrictTypeGuard<T>) => {
  return <P extends Parameters<StrictTypeGuard<T>> | never[]>(...args: P) => {
    if (args.length === 0) {
      return guard as (value: unknown, errorMsg?: string) => asserts value is T;
    }

    return guard(...args as Parameters<StrictTypeGuard<T>>);
  };
};

/**
 * Represents a type guard function with additional utility methods.
 *
 * A TypeGuard is a function that determines if a value is of type T, providing
 * type narrowing in TypeScript. This type extends the basic type guard with:
 * - strict mode validation
 * - assertion functions that throw errors for invalid values
 * - utilities for handling non-empty and optional values
 *
 * @template T The type being guarded
 */
export type TypeGuard<T> = {
  /**
   * A type guard function that checks if the value is of type T.
   * @param value The value to check
   * @returns true if the value is of type T, otherwise false
   */
  (value: unknown): value is T;
  /**
   * A strict type guard that throws an error if the value is not of type T.
   * @param value The value to check
   * @param errorMsg Optional error message to include in the thrown error
   * @returns true if the value is of type T, otherwise throws an error
   */
  strict: StrictTypeGuard<T>;
  /**
   * An assertion function that throws an error if the value is not of type T.
   * This is useful for ensuring that a value meets the type requirements at runtime.
   *
   * Unfortunately, TypeScript does not support the inference of assertion functions
   * so the function must be invoked by declaring an intermediate variable and specifying
   * the type.
   *
   * Example:
   * ```typescript
   * const value: unknown = someValue();
   *
   * const assertIsString: typeof isString.assert = isString.assert;
   * assertIsString(value, "Expected a string");
   * // After this line, TypeScript knows that value is a string
   * ```
   * @param value The value to check
   * @param errorMsg Optional error message to include in the thrown error
   * @returns Asserts that the value is of type T
   */
  assert: (value: unknown, errorMsg?: string) => asserts value is T;
  notEmpty: {
    /**
     * A type guard that checks if the value is not empty and of type T.
     * An empty value is defined as null, undefined, an empty string, an empty array,
     * or an empty object.
     * @param value The value to check
     * @returns true if the value is of type T and not empty, otherwise false
     */
    (value: unknown): value is T;
    /**
     * A strict type guard that throws an error if the value is not of type T
     * or if the value is empty (null, undefined, empty string, empty array, or empty object).
     * @param value The value to check
     * @param errorMsg Optional error message to include in the thrown error
     * @returns true if the value is of type T, otherwise throws an error
     */
    strict: StrictTypeGuard<T>;
    /**
     * An assertion function that throws an error if the value is not of type T or if it is
     * empty. An empty value is defined as null, undefined, an empty string,
     * an empty array, or an empty object. This is useful for ensuring that a value meets
     * the type requirements at runtime.
     *
     * Unfortunately, TypeScript does not support the inference of assertion functions
     * so the function must be invoked by declaring an intermediate variable and specifying
     * the type.
     *
     * Example:
     * ```typescript
     * const value: unknown = someValue();
     *
     * const assertIsNotEmptyString: typeof isString.notEmpty.assert = isString.notEmpty.assert;
     * assertIsNotEmptyString(value, "Expected a non-empty string");
     * // After this line, TypeScript knows that value is a string
     * ```
     * @param value The value to check
     * @param errorMsg Optional error message to include in the thrown error
     * @returns Asserts that the value is of type T
     */
    assert: (value: unknown, errorMsg?: string) => asserts value is T;
  };
  optional: {
    /**
     * A type guard that checks if the value is either undefined or of type T.
     * @param value The value to check
     * @returns true if the value is of type T or undefined, otherwise false
     */
    (value: unknown): value is T | undefined;
    /**
     * A strict type guard that throws an error if the value is defined but not of type T.
     * @param value The value to check
     * @param errorMsg Optional error message to include in the thrown error
     * @returns true if the value is of type T, otherwise throws an error
     */
    strict: (value: unknown, errorMsg?: string) => value is T | undefined;
    /**
     * An assertion function that throws an error if the value is defined but not of type T.
     * This is useful for ensuring that a value meets the type requirements at runtime.
     *
     * Unfortunately, TypeScript does not support the inference of assertion functions
     * so the function must be invoked by declaring an intermediate variable and specifying
     * the type.
     *
     * Example:
     * ```typescript
     * const value: unknown = someValue();
     *
     * const assertIsOptionalString: typeof isString.optional.assert = isString.optional.assert;
     * assertIsOptionalString(value, "Expected a string or undefined");
     * // After this line, TypeScript knows that value is a string
     * ```
     * @param value The value to check
     * @param errorMsg Optional error message to include in the thrown error
     * @returns Asserts that the value is of type T
     */
    assert: (value: unknown, errorMsg?: string) => asserts value is T | undefined;
  };
};

/**
 * The createTypeGuard function accepts a parser and returns a new function that
 * can be used to validate an input against a specified type. The parser
 * should perform whatever checks are necessary to safely establish that
 * the input is of the specified type.
 *
 * e.g.
 * ```
 * const parseString = (val: unknown): string | null => typeof val === 'string' ? val : null;
 * const isString = createTypeGuard(parseString);
 * ```
 *
 * Injects the `has` utility method as the second argument of any parser, as
 * a convenience to check if a property exists in an object.
 *
 * @param {Function} parse
 * @returns {Function}
 */
export const createTypeGuard = <T>(parse: Parser<T>): TypeGuard<T> => {
  const helpers = {
    has: hasProperty,
    hasOptional: hasOptionalProperty,
    includes,
    tupleHas,
  };

  const callback = (value: unknown): value is T => parse(value, helpers) !== null;

  /**
   * Returns false if the value fails the "empty" type guard
   * or if it fails the parser.
   * @param {unknown} value
   * @returns
   */
  const notEmpty = (value: unknown): value is T => !isEmpty(value) && callback(value);

  notEmpty.strict = createStrictTypeGuard(notEmpty);
  notEmpty.assert = createAssertTypeGuard(notEmpty.strict);
  callback.notEmpty = notEmpty;

  /**
   * Returns true if the value is undefined or passes the parser.
   * @param {unknown} value
   * @returns
   */
  const optional = (value: unknown): value is T | undefined =>
    isUndefined(value) || callback(value);

  optional.strict = createStrictTypeGuard(optional);
  optional.assert = createAssertTypeGuard(optional.strict);
  callback.optional = optional;

  /**
   * Throws a TypeError if the type guard fails. Optionally you may define an
   * error message to be included.
   * @param {unknown} value
   * @param {string?} errorMsg Optional
   * @returns
   */
  callback.strict = createStrictTypeGuard(callback);
  callback.assert = createAssertTypeGuard(callback.strict);

  return callback;
};

/**
 * Returns true if input satisfies type boolean.
 * @param {unknown} t
 * @return {boolean}
 */
export const isBoolean: TypeGuard<boolean> = createTypeGuard((t): boolean | null =>
  typeof t === "boolean" ? t : null
);

/**
 * Returns true if input satisfies type string.
 * @param {unknown} t
 * @return {boolean}
 */
export const isString: TypeGuard<string> = createTypeGuard((t): string | null =>
  typeof t === "string" ? t : null
);

/**
 * Returns true if input satisfies type number.
 * @param {unknown} t
 * @return {boolean}
 */
export const isNumber: TypeGuard<number> = createTypeGuard((t): number | null =>
  typeof t === "number" ? t : null
);

/**
 * Returns true if input satisfies type binary.
 * @param {unknown} t
 * @return {boolean}
 */
export const isBinary: TypeGuard<0 | 1> = createTypeGuard((t): 0 | 1 | null =>
  t === 1 || t === 0 ? t : null
);

/**
 * Returns true if input satisfies type numeric.
 * @param {unknown} t
 * @return {boolean}
 */
export const isNumeric: TypeGuard<number> = createTypeGuard((t): number | null => {
  if (isNumber(t)) return t as number;

  if (!/^-?\d*\.?\d+$/.test(t as string)) return null;

  const _t = parseInt(t as string) || parseFloat(t as string);

  return (!isNaN(_t) && isNumber(_t)) ? t as number : null;
});

/**
 * Returns true if input satisfies type Function.
 * @param {unknown} t
 * @return {boolean}
 */
export const isFunction: TypeGuard<(...args: unknown[]) => unknown> = createTypeGuard(
  (t): ((...args: unknown[]) => unknown) | null =>
    typeof t === "function" ? (t as (...args: unknown[]) => unknown) : null,
);

/**
 * Returns true if input satisfies type undefined.
 * @param {unknown} t
 * @return {boolean}
 */
export const isUndefined: TypeGuard<undefined> = createTypeGuard((t): undefined | null =>
  typeof t === "undefined" ? t : null
);

/**
 * Returns true if input is a JSON-able primitive date type
 * @param {unknown} t
 * @return {boolean}
 */
export const isJsonPrimitive: TypeGuard<JsonPrimitive> = createTypeGuard((
  t,
): JsonPrimitive | null => (isBoolean(t) || isString(t) || isNumber(t) || isNull(t)) || null);

/**
 * Returns true if input satisfies type object. _BEWARE_ object
 * can apply to many different types, including arrays. This
 * is not as type safe as you might think.
 * @param {unknown} t
 * @return {boolean}
 */
export const isObject: TypeGuard<object> = createTypeGuard((t): object | null =>
  t && typeof t === "object" && !Array.isArray(t) ? t : null
);

/**
 * Returns true if input satisfies type object. _BEWARE_ object
 * can apply to many different types, including arrays. This
 * is not as type safe as you might think.
 * @param {unknown} t
 * @return {boolean}
 */
export const isJsonObject: TypeGuard<JsonObject> = createTypeGuard(
  (t): JsonObject | null => {
    if (t && typeof t === "object" && !Array.isArray(t)) {
      for (const v of Object.values(t)) {
        if (!isJsonValue(v)) return null;
      }

      return t as JsonObject;
    }

    return null;
  },
);

/**
 * Returns true if input satisfies type array.
 * @param {unknown} t
 * @return {boolean}
 */
export const isArray: TypeGuard<unknown[]> = createTypeGuard((
  t,
): unknown[] | null => Array.isArray(t) ? t : null);

/**
 * Returns true if input satisfies type array.
 * @param {unknown} t
 * @return {boolean}
 */
export const isJsonArray: TypeGuard<JsonArray> = createTypeGuard((
  t,
): JsonArray | null => Array.isArray(t) ? t : null);

export const isJsonValue: TypeGuard<JsonValue> = createTypeGuard(
  (t): JsonValue | null => {
    if (isJsonPrimitive(t) || isJsonArray(t) || isJsonObject(t)) {
      return t ?? true;
    }

    return null;
  },
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
export const isDate = createTypeGuard((t): Date | null => {
  return t instanceof Date ? t : null;
});

/**
 * Returns true if input satisfies type null.
 * @param {unknown} t
 * @return {boolean}
 */
const isNull = (t: unknown): t is null => t === null;

isNull.strict = (t: unknown): t is null => {
  if (!isNull(t)) {
    throw TypeError("Type guard failed. Input is not null.");
  }

  return true;
};

/**
 * Returns true if input satisfies type null or undefined.
 * @param {unknown} t
 * @return {boolean}
 */
const isNil = (t: unknown): t is null | undefined => isNull(t) || isUndefined(t);

isNil.strict = (t: unknown, errorMsg?: string): t is null | undefined => {
  if (!isNil(t)) {
    throw TypeError(errorMsg ?? "Type guard failed. Value is not null or undefined.");
  }

  return true;
};

/**
 * Returns true if input is undefined, null, empty string, object with length
 * of 0 or object without enumerable keys.
 * @param {unknown} t
 * @return {boolean}
 */
const isEmpty = (t: unknown): t is null | undefined | "" | [] | Record<string, never> => {
  if (
    t === null || isUndefined(t) || (t === "") ||
    (Array.isArray(t) && (t as unknown[]).length === 0) ||
    (t && typeof t === "object" && Object.keys(t).length === 0)
  ) {
    return true;
  }

  return false;
};

isEmpty.strict = (
  t: unknown,
  errorMsg?: string,
): t is null | undefined | "" | [] | Record<string, never> => {
  if (!isEmpty(t)) {
    throw TypeError(errorMsg ?? "Type guard failed. Value is not empty.");
  }
  return true;
};

/**
 * Returns true if the date type is an iterator. Does not
 * check the type contained within the iterator.
 * @param t
 * @returns
 */
// deno-lint-ignore no-explicit-any
const isIterator = <C = any>(t: unknown): t is Iterator<C> =>
  typeof t === "object" && !isNil(t) && Symbol.iterator in t && isFunction(t[Symbol.iterator]);

// deno-lint-ignore no-explicit-any
isIterator.strict = <C = any>(t: unknown, errorMsg?: string): t is Iterator<C> => {
  if (!isIterator(t)) {
    throw TypeError(errorMsg ?? "Type guard failed. Value is not an interator.");
  }

  return true;
};

const isTuple = <N extends number>(t: unknown, length: N): t is TupleOfLength<N> => {
  return Array.isArray(t) && t.length === length;
};

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

export { isEmpty, isIterator, isNil, isNull, isTuple };
