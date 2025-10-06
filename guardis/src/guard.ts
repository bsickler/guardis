/**
 * guard.ts
 * @module
 */
import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type {
  canBeEmpty,
  isExtensible,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  TupleOfLength,
} from "./types.ts";
import { hasOptionalProperty, hasProperty, includes, tupleHas } from "./utilities.ts";

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

type ExtendedParser<T1, T2 extends T1 = T1> = (
  val: T1,
  helper: {
    has: typeof hasProperty;
    hasOptional: typeof hasOptionalProperty;
    tupleHas: typeof tupleHas;
    includes: typeof includes;
  },
) => T2 | null;

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
const createAssertTypeGuard = <T>(
  guard: StrictTypeGuard<T>,
): (value: unknown, errorMsg?: string) => asserts value is T => {
  return guard;
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
 * @template T1 The type being guarded
 */
export interface TypeGuard<T1> extends StandardSchemaV1<T1> {
  /**
   * A type guard function that checks if the value is of type T.
   * @param value The value to check
   * @returns true if the value is of type T, otherwise false
   */
  (value: unknown): value is T1;
  /**
   * A type guard function that checks if the value is of type T or T2.
   * This is useful for creating unions of types.
   * @param guard A type guard for T2
   * @returns A new type guard that checks if the value is of type T or T2
   */
  or: <T2>(guard: TypeGuard<T2>) => TypeGuard<T1 | T2>;
  /**
   * A strict type guard that throws an error if the value is not of type T.
   * @param value The value to check
   * @param errorMsg Optional error message to include in the thrown error
   * @returns true if the value is of type T, otherwise throws an error
   */
  strict: StrictTypeGuard<T1>;
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
  assert: (value: unknown, errorMsg?: string) => asserts value is T1;
  /**
   * Validates the value against the schema. If the value is of type T1,
   * it returns a success result with the value, otherwise it returns a failure result with issues.
   *
   * Included as a shortcut to the `validate` method of the StandardSchemaV1 interface.
   * @param value The value to validate
   * @returns
   */
  validate: (value: unknown) => StandardSchemaV1.Result<T1>;

  /**
   * Extends the current type guard with an additional parser, building upon
   * the existing type guard. The new type guard will first check if the value
   * passes the original type guard, and if it does, it will then apply the
   * additional parser.
   * @param {Function} parse An additional parser to further validate the type.
   * @returns {Function} A new type guard that combines the original and additional parsers.
   */
  extend: isExtensible<T1> extends false ? never
    : <T2 extends T1>(parse: ExtendedParser<T1, T2>) => TypeGuard<T2>;
  optional: {
    /**
     * A type guard that checks if the value is either undefined or of type T.
     * @param value The value to check
     * @returns true if the value is of type T or undefined, otherwise false
     */
    (value: unknown): value is T1 | undefined;
    /**
     * A strict type guard that throws an error if the value is defined but not of type T.
     * @param value The value to check
     * @param errorMsg Optional error message to include in the thrown error
     * @returns true if the value is of type T, otherwise throws an error
     */
    strict: (value: unknown, errorMsg?: string) => value is T1 | undefined;
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
    assert: (value: unknown, errorMsg?: string) => asserts value is T1 | undefined;
  };
  notEmpty: canBeEmpty<T1> extends false ? never : {
    /**
     * A type guard that checks if the value is not empty and of type T.
     * An empty value is defined as null, undefined, an empty string, an empty array,
     * or an empty object.
     * @param value The value to check
     * @returns true if the value is of type T and not empty, otherwise false
     */
    (value: unknown): value is T1;
    /**
     * A strict type guard that throws an error if the value is not of type T
     * or if the value is empty (null, undefined, empty string, empty array, or empty object).
     * @param value The value to check
     * @param errorMsg Optional error message to include in the thrown error
     * @returns true if the value is of type T, otherwise throws an error
     */
    strict: StrictTypeGuard<T1>;
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
    assert: (value: unknown, errorMsg?: string) => asserts value is T1;
    /**
     * Validates the value against the schema, ensuring it is not empty. If the value is of
     * type T1 and not empty, it returns a success result with the value, otherwise it
     * returns a failure result with issues.
     *
     * Included as a shortcut to the `validate` method of the StandardSchemaV1 interface.
     * @param value The value to validate
     * @returns
     */
    validate: (value: unknown) => StandardSchemaV1.Result<T1>;
  };
}

/** An internal type guard that includes the parser function. */
type _TypeGuard<T> = TypeGuard<T> & { _: { parser: Parser<T> } };

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
export const createTypeGuard = <T1>(parse: Parser<T1>): TypeGuard<T1> => {
  const helpers = {
    has: hasProperty,
    hasOptional: hasOptionalProperty,
    includes,
    tupleHas,
  };

  const callback = (value: unknown): value is T1 => parse(value, helpers) !== null;
  callback._ = { parser: parse };

  /**
   * Creates a new type guard by extending the current one with an additional parser.
   * The new type guard will first check if the value passes the original type guard,
   * and if it does, it will then apply the additional parser.
   * @param {Function} parseTwo An additional parser to further validate the type.
   * @returns {Function} A new type guard that combines the original and additional parsers.
   */
  const extend = <T2 extends T1>(parseTwo: ExtendedParser<T1, T2>): TypeGuard<T2> =>
    createTypeGuard<T2>((v, h) => !callback(v) ? null : parseTwo(v, h));
  callback.extend = extend as isExtensible<T1> extends false ? never : typeof extend;

  /**
   * Returns false if the value fails the "empty" type guard
   * or if it fails the parser.
   * @param {unknown} value
   * @returns
   */
  const notEmpty = (value: unknown): value is T1 => !isEmpty(value) && callback(value);

  notEmpty.strict = createStrictTypeGuard(notEmpty);
  notEmpty.assert = createAssertTypeGuard(notEmpty.strict);
  notEmpty.validate = (value: unknown) =>
    notEmpty(value) ? { value } : { issues: [{ message: `Invalid type` }] };
  callback.notEmpty = notEmpty as canBeEmpty<T1> extends false ? never : typeof notEmpty;

  /**
   * Returns true if the value is undefined or passes the parser.
   * @param {unknown} value
   * @returns
   */
  const optional = (value: unknown): value is T1 | undefined =>
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

  /**
   * Creates a new type guard that checks if the value is of type T1 or T2.
   * This is useful for creating unions of types.
   * @param {Function} guard A type guard for T2
   * @returns {Function} A new type guard that checks if the value is of type T1 or T2
   */
  callback.or = <T2>(guard: TypeGuard<T2>): TypeGuard<T1 | T2> => {
    return createTypeGuard<T1 | T2>((v: unknown) => {
      const r1 = callback._.parser(v, helpers);

      return r1 !== null ? r1 : (guard as unknown as _TypeGuard<T2>)._.parser(v, helpers);
    });
  };

  // StandardSchemaV1 compatibility
  callback.validate = (value: unknown) =>
    callback(value) ? { value } : { issues: [{ message: `Invalid type` }] };

  callback["~standard"] = {
    version: 1,
    vendor: "guardis",
    validate: callback.validate,
  } as const;

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
export const isJsonArray: TypeGuard<JsonValue[] | readonly JsonValue[]> = createTypeGuard((
  t,
): JsonArray | null => Array.isArray(t) ? t : null);

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
export const isDate: TypeGuard<Date> = createTypeGuard((t) => t instanceof Date ? t : null);

/**
 * Returns true if input satisfies type null.
 * @param {unknown} t
 * @return {boolean}
 */
const isNull: TypeGuard<null> = createTypeGuard<null>((t: unknown) =>
  (t === null ? true : null) as null
);

/**
 * Returns true if input satisfies type null or undefined.
 * @param {unknown} t
 * @return {boolean}
 */
const isNil: TypeGuard<null | undefined> = isNull.or(isUndefined);

const isEmptyRecord: TypeGuard<Record<string, never>> = createTypeGuard<Record<string, never>>(
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

const isEmptyArray: TypeGuard<[]> = createTypeGuard<[]>((t): [] | null => {
  if (Array.isArray(t) && (t as unknown[]).length === 0) {
    return t as [];
  }
  return null;
});

const isEmptyString: TypeGuard<""> = createTypeGuard<"">((t): "" | null => {
  return t === "" ? t : null;
});

/**
 * Returns true if input is undefined, null, empty string, object with length
 * of 0 or object without enumerable keys.
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
const isIterable: TypeGuard<Iterable<unknown>> = createTypeGuard<Iterable<unknown>>((t) => {
  if (
    typeof t === "object" &&
    !isNil(t) &&
    Symbol.iterator in t &&
    isFunction(t[Symbol.iterator])
  ) {
    return t as Iterable<unknown>;
  }
  return null;
});

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
  return createTypeGuard<TupleOfLength<N> | T2>((v: unknown) =>
    isTuple(v, length) ? v : (guard as _TypeGuard<T2>)._.parser(v, {
      has: hasProperty,
      hasOptional: hasOptionalProperty,
      includes,
      tupleHas,
    })
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

export { isEmpty, isIterable, isNil, isNull, isTuple };
