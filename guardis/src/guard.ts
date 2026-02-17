/**
 * guard.ts
 * @module
 */

import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type {
  CanBeEmpty,
  Context,
  ExtendedParser,
  HelpersWithContext,
  IsExtensible,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  Parser,
  Predicate,
  StrictTypeGuard,
  TupleOfLength,
  TypeGuard,
} from "./types.ts";
import { createContext, createStrictContext } from "./context.ts";
import { type GuardMeta, hasContext, hasMeta } from "./introspect.ts";
import {
  doesNotHaveProperty,
  formatErrorMessage,
  hasOptionalProperty,
  hasProperty,
  includes,
  keyOf,
  tupleHas,
  unionOf,
} from "./utilities.ts";


/**
 * Creates a helpers object for use in type guard parsers.
 * When ctx is provided, has/hasOptional pass context for path tracking.
 * When ctx is undefined, they use raw functions (for boolean type guard calls).
 */
function createHelpers(ctx?: Context): HelpersWithContext {
  return {
    has: (t, k, guard?, errorMessage?) =>
      hasProperty(t, k, guard, ctx?.pushPath(k), ctx ? errorMessage : undefined),
    hasNot: (t, k, errorMessage?) =>
      doesNotHaveProperty(t, k, ctx?.pushPath(k), ctx ? errorMessage : undefined),
    hasOptional: (t, k, guard?, errorMessage?) =>
      hasOptionalProperty(t, k, guard, ctx?.pushPath(k), ctx ? errorMessage : undefined),
    tupleHas,
    includes,
    keyOf: <T extends object>(k: unknown, t: T, errorMessage?: string) =>
      keyOf(k, t, ctx, ctx ? errorMessage : undefined),
    fail: (message) => {
      if (ctx) ctx.addIssue(message);
      return null;
    },
    _ctx: ctx,
  };
}

/** Default helpers for boolean type guard calls (no validation context) */
const defaultHelpers = createHelpers();

/**
 * Creates a type guard that strictly checks the type, throwing
 * a TypeError if it fails. Uses strict context for detailed error messages
 * with path information on nested validations.
 * @param parser The parser function to use for validation
 * @param name Optional name of the type guard for error messages
 * @returns A strict type guard that throws on failure
 */
const createStrictTypeGuard = <T>(
  parser: Parser<T>,
  name?: string,
): StrictTypeGuard<T> => {
  return (value: unknown, errorMsg?: string): value is T => {
    const ctx = createStrictContext();
    const helpers = createHelpers(ctx);
    const result = parser(value, helpers);

    if (result === null) {
      throw new TypeError(errorMsg ?? formatErrorMessage(value, name));
    }

    return true;
  };
};

/**
 * Creates a callback to construct a union type guard from two existing type guards.
 *
 * @template T1 - The type checked by the first type guard.
 * @template T2 - The type checked by the second type guard.
 *
 * @param guard - A type guard function that checks if a value is of type `T1`.
 * @returns A function that takes a second type guard `guardTwo` and returns a new
 * type guard that checks if a value is of type `T1 | T2`.
 *
 * @example
 * ```typescript
 * const isString = (value: unknown): value is string => typeof value === 'string';
 * const isNumber = (value: unknown): value is number => typeof value === 'number';
 *
 * const isStringOrNumber = createOrTypeGuard(isString)(isNumber);
 *
 * console.log(isStringOrNumber("hello")); // true
 * console.log(isStringOrNumber(42)); // true
 * console.log(isStringOrNumber(false)); // false
 * ```
 */
const createOrTypeGuard =
  <T1>(guard: Predicate<T1>) => <T2>(guardTwo: TypeGuard<T2>): TypeGuard<T1 | T2> => {
    // Create a union of the names of the two guards for better error messages, if available.
    const name = hasMeta(guard) && hasMeta(guardTwo)
      ? `${guard._.name} | ${guardTwo._.name}`
      : undefined;

    const parser = (v: unknown) => {
      if (guard(v) || guardTwo(v)) return v === null ? (true as T1 | T2) : v;

      return null;
    };

    return name ? createTypeGuard(name, parser) : createTypeGuard(parser);
  };

/**
 * Returns false if the value fails the "empty" type guard
 * or if it fails the parser.
 * @param {unknown} value
 * @returns
 */
const createNotEmptyTypeGuard = <T>(guard: Predicate<T>) => {
  const notEmpty = (value: unknown): value is T => !isEmpty(value) && guard(value);
  const name = hasMeta(guard) ? `non-empty ${guard._.name}` : undefined;
  const notEmptyParser: Parser<T> = (value: unknown) =>
    notEmpty(value) && guard(value) ? value : null;

  const context = (
    value: unknown,
    ctx?: Context,
  ): StandardSchemaV1.Result<T> => {
    if (notEmpty(value)) return { value };

    const message = formatErrorMessage(value, name);
    const path = ctx?.path.length ? [...ctx.path] : undefined;
    return { issues: [path ? { message, path } : { message }] };
  };

  notEmpty._ = {
    name,
    parser: notEmptyParser,
    context,
  };

  notEmpty.strict = createStrictTypeGuard(notEmptyParser, name);
  notEmpty.assert = notEmpty.strict;
  notEmpty.validate = (value: unknown) => context(value, createContext());

  notEmpty.optional = (value: unknown): value is T | undefined =>
    guard(value) ? notEmpty(value) : isUndefined(value);

  notEmpty.or = createOrTypeGuard(notEmpty);

  return notEmpty as CanBeEmpty<T> extends false ? never : typeof notEmpty;
};

/** Internal type guard with access to metadata */
type _TypeGuard<T> = TypeGuard<T> & GuardMeta<T>;

/**
 * Creates a type guard from a parser function.
 *
 * The parser should perform whatever checks are necessary to safely establish
 * that the input is of the specified type.
 *
 * Injects the `has` utility method as the second argument of any parser, as
 * a convenience to check if a property exists in an object.
 *
 * @param parser A function that returns the value if valid, or null if invalid.
 * @returns A type guard function with utility methods.
 *
 * @example
 * ```typescript
 * const parseString = (val: unknown): string | null => typeof val === 'string' ? val : null;
 * const isString = createTypeGuard(parseString);
 * ```
 */
export function createTypeGuard<T1>(parser: Parser<T1>): TypeGuard<T1>;
/**
 * Creates a type guard from a parser function with a custom type name.
 *
 * The name is used for error messages when the type guard fails.
 *
 * @param name The type name to use for error messages.
 * @param parser A function that returns the value if valid, or null if invalid.
 * @returns A type guard function with utility methods.
 *
 * @example
 * ```typescript
 * const isPositive = createTypeGuard("positive number", (val: unknown): number | null =>
 *   typeof val === 'number' && val > 0 ? val : null
 * );
 * ```
 */
export function createTypeGuard<T1>(name: string, parser: Parser<T1>): TypeGuard<T1>;
export function createTypeGuard<T1>(...args: [Parser<T1>] | [string, Parser<T1>]): TypeGuard<T1> {
  const parser = args.length === 1 ? args[0] : args[1];
  const name = args.length === 2 ? args[0] : undefined;

  /**
   * Internal validation method that accepts a context for path tracking.
   * This is used by nested validations to propagate paths.
   */
  const context = (
    value: unknown,
    ctx?: Context,
  ): StandardSchemaV1.Result<T1> => {
    const issuesBefore = ctx?.issues.length ?? 0;
    const helpers = createHelpers(ctx);
    const result = parser(value, helpers);

    // If parser returned null and no child issues were added, add this guard's error
    if (result === null && ctx?.issues.length === issuesBefore) {
      ctx.addIssue(formatErrorMessage(value, name));
    }

    // Return accumulated issues if any
    if (ctx && ctx.issues.length > 0) {
      return { issues: ctx.issues };
    }

    if (result !== null) {
      // Special case: isNull parser returns `true` when value is null
      return { value: result === true && value === null ? value as T1 : result };
    }

    return { issues: [{ message: formatErrorMessage(value, name) }] };
  };

  const callback = (value: unknown): value is T1 => parser(value, defaultHelpers) !== null;
  callback._ = { name, parser, context };

  /**
   * Creates a new type guard that checks if the value is of type T1 or T2.
   * This is useful for creating unions of types.
   * @param {Function} guard A type guard for T2
   * @returns {Function} A new type guard that checks if the value is of type T1 or T2
   */
  callback.or = createOrTypeGuard(callback);

  /**
   * Creates a new type guard by extending the current one with an additional parser.
   * The new type guard will first check if the value passes the original type guard,
   * and if it does, it will then apply the additional parser.
   * @param parser An additional parser to further validate the type.
   * @returns A new type guard that combines the original and additional parsers.
   */
  function extend<T2 extends T1>(parser: ExtendedParser<T1, T2>): TypeGuard<T2>;
  /**
   * Creates a new type guard by extending the current one with an additional parser.
   * The new type guard will first check if the value passes the original type guard,
   * and if it does, it will then apply the additional parser.
   * @param name The type name to use for error messages.
   * @param parser An additional parser to further validate the type.
   * @returns A new type guard that combines the original and additional parsers.
   */
  function extend<T2 extends T1>(name: string, parser: ExtendedParser<T1, T2>): TypeGuard<T2>;
  function extend<T2 extends T1>(
    ...args: [ExtendedParser<T1, T2>] | [string, ExtendedParser<T1, T2>]
  ): TypeGuard<T2> {
    const parseTwo = args.length === 1 ? args[0] : args[1];
    const extendName = args.length === 2 ? args[0] : undefined;
    return extendName
      ? createTypeGuard<T2>(extendName, (v, h) => !callback(v) ? null : parseTwo(v, h))
      : createTypeGuard<T2>((v, h) => !callback(v) ? null : parseTwo(v, h));
  }
  callback.extend = extend as IsExtensible<T1> extends false ? never : typeof extend;

  /**
   * Returns false if the value fails the "empty" type guard
   * or if it fails the parser.
   * @param {unknown} value
   * @returns
   */
  callback.notEmpty = createNotEmptyTypeGuard(callback);

  /**
   * Returns true if the value is undefined or passes the parser.
   * @param {unknown} value
   * @returns
   */
  const optional = (value: unknown): value is T1 | undefined =>
    isUndefined(value) || callback(value);

  optional.strict = createStrictTypeGuard(
    (v, h) => isUndefined(v) ? v : parser(v, h),
    name ? `${name} | undefined` : undefined,
  );
  optional.assert = optional.strict;
  optional.notEmpty = callback.notEmpty.optional;
  callback.optional = optional;

  /**
   * Throws a TypeError if the type guard fails. Optionally you may define an
   * error message to be included.
   * @param {unknown} value
   * @param {string?} errorMsg Optional
   * @returns
   */
  callback.strict = createStrictTypeGuard(parser, name);
  callback.assert = callback.strict;

  // StandardSchemaV1 compatibility - uses context-aware validation for path tracking
  callback.validate = (value: unknown) => context(value, createContext());

  callback["~standard"] = {
    version: 1,
    vendor: "guardis",
    validate: callback.validate,
  } as const;

  // Attach the type to the function for easy access
  return (<T1>(t: unknown): TypeGuard<T1> => t as TypeGuard<T1>)(callback);
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
export const isString: TypeGuard<string> = createTypeGuard(
  "string",
  (t): string | null => typeof t === "string" ? t : null,
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
export const isNumber: TypeGuard<number> = createTypeGuard(
  "number",
  (t): number | null => typeof t === "number" && !Number.isNaN(t) ? t : null,
);

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
export const isNumeric: TypeGuard<number> = createTypeGuard(
  "numeric",
  (t): number | null => {
    if (isNumber(t)) return t as number;

    if (!/^-?\d*\.?\d+$/.test(t as string)) return null;

    const _t = parseInt(t as string) || parseFloat(t as string);

    return (!isNaN(_t) && isNumber(_t)) ? t as number : null;
  },
);

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
 * Returns true if input satisfies type undefined.
 * @param {unknown} t
 * @return {boolean}
 */
export const isUndefined: TypeGuard<undefined> = createTypeGuard(
  "undefined",
  (t): undefined | null => t === undefined ? t : null,
);

/**
 * Returns true if input satisfies type null.
 * @param {unknown} t
 * @return {boolean}
 */
const isNull: TypeGuard<null> = createTypeGuard<null>(
  "null",
  (t: unknown) => (t === null ? true : null) as null,
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
export const isPropertyKey: TypeGuard<PropertyKey> = unionOf(isString, isNumber, isSymbol);

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
export const isArray: TypeGuard<unknown[]> & {
  /**
   * Returns true if input satisfies type array of T.
   * @param guard The type guard for the array elements
   * @returns {boolean}
   */
  of: <T>(guard: TypeGuard<T>) => TypeGuard<T[]>;
} = Object.assign(
  _isArray,
  {
    of: <T>(guard: TypeGuard<T>): TypeGuard<T[]> => {
      const guardName = hasMeta(guard) ? guard._.name : undefined;

      let name = "array";

      if (guardName) {
        name = guardName?.includes(" | ") ? `(${guardName})[]` : `${guardName}[]`;
      }

      return createTypeGuard(
        name,
        (v, helpers) => {
          if (!isArray(v)) return null;

          const ctx = (helpers as HelpersWithContext)._ctx;

          // If we have a context, use index-aware validation
          if (ctx && hasContext(guard)) {
            for (let i = 0; i < v.length; i++) {
              const childCtx = ctx.pushPath(i);
              const result = guard._.context(v[i], childCtx);
              if (result.issues) return null; // issues already added to parent ctx
            }
            return v as T[];
          }

          // Otherwise, use simple boolean check
          return v.every((item) => guard(item)) ? v as T[] : null;
        },
      );
    },
  },
);

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
  return createTypeGuard<TupleOfLength<N> | T2>((v: unknown) =>
    isTuple(v, length) ? v : (guard as _TypeGuard<T2>)._.parser(v, defaultHelpers)
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
