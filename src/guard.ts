/**
 * guard.ts
 * @module
 */

import type {
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
} from "./types.ts";

/** A parser is a function that takes an unknown and returns T or null */
export type Parser<T = unknown> = (
  val: unknown,
  has: typeof hasProperty,
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
): t is Record<K, G> {
  if (!(k in t)) return false;

  return guard ? guard(t[k as keyof typeof t]) : true;
}

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
export const createTypeGuard = <T>(parse: Parser<T>) => {
  const callback = (value: unknown): value is T => {
    return parse(value, hasProperty) !== null;
  };

  /**
   * Throws a TypeError if the type guard fails. Optionally you may define an
   * error message to be included.
   * @param {unknown} value
   * @param {string?} errorMsg Optional
   * @returns
   */
  callback.strict = (value: unknown, errorMsg?: string): value is T => {
    if (parse(value, hasProperty) === null) {
      throw TypeError(
        errorMsg ?? `Type guard failed. Parser ${parse.name} returned null.`,
      );
    }

    return true;
  };

  return callback;
};

/**
 * Returns true if input satisfies type boolean.
 * @param {unknown} t
 * @return {boolean}
 */
export const isBoolean = createTypeGuard((t) =>
  typeof t === "boolean" ? t : null
);

/**
 * Returns true if input satisfies type string.
 * @param {unknown} t
 * @return {boolean}
 */
export const isString = createTypeGuard((t) =>
  typeof t === "string" ? t : null
);

/**
 * Returns true if input satisfies type number.
 * @param {unknown} t
 * @return {boolean}
 */
export const isNumber = createTypeGuard((t) =>
  typeof t === "number" ? t : null
);

/**
 * Returns true if input satisfies type binary.
 * @param {unknown} t
 * @return {boolean}
 */
export const isBinary = createTypeGuard((t) => t === 1 || t === 0 ? t : null);

/**
 * Returns true if input satisfies type numeric.
 * @param {unknown} t
 * @return {boolean}
 */
export const isNumeric = createTypeGuard((t) => {
  if (isNumber(t)) return t as number;

  const _t = parseInt(t as string) || parseFloat(t as string);

  return !isNaN(_t) && isNumber(_t) ? t as number : null;
});

/**
 * Returns true if input satisfies type Function.
 * @param {unknown} t
 * @return {boolean}
 */
export const isFunction = createTypeGuard((t) =>
  typeof t === "function" ? t : null
);

/**
 * Returns true if input satisfies type undefined.
 * @param {unknown} t
 * @return {boolean}
 */
export const isUndefined = createTypeGuard((t) =>
  typeof t === "undefined" ? t : null
);

/**
 * Returns true if input is a JSON-able primitive date type
 * @param {unknown} t
 * @return {boolean}
 */
export const isJsonPrimitive = createTypeGuard<JsonPrimitive>((t) =>
  isBoolean(t) || isString(t) || isNumber(t) || isNull(t)
);

/**
 * Returns true if input satisfies type object. _BEWARE_ object
 * can apply to many different types, including arrays. This
 * is not as type safe as you might think.
 * @param {unknown} t
 * @return {boolean}
 */
export const isObject = createTypeGuard((t) =>
  t && typeof t === "object" && !Array.isArray(t) ? t : null
);

/**
 * Returns true if input satisfies type object. _BEWARE_ object
 * can apply to many different types, including arrays. This
 * is not as type safe as you might think.
 * @param {unknown} t
 * @return {boolean}
 */
export const isJsonObject = createTypeGuard<JsonObject>((t) => {
  if (t && typeof t === "object" && !Array.isArray(t)) {
    for (const v of Object.values(t)) {
      if (!isJsonValue(v)) return null;
    }

    return t as JsonObject;
  }

  return null;
});

/**
 * Returns true if input satisfies type array.
 * @param {unknown} t
 * @return {boolean}
 */
export const isArray = createTypeGuard((t) => Array.isArray(t) ? t : null);

/**
 * Returns true if input satisfies type array.
 * @param {unknown} t
 * @return {boolean}
 */
export const isJsonArray = createTypeGuard<JsonArray>((t) =>
  Array.isArray(t) ? t : null
);

export const isJsonValue = createTypeGuard<JsonValue>((t) => {
  if (isJsonPrimitive(t) || isJsonArray(t) || isJsonObject(t)) {
    return t;
  }

  return null;
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
const isNil = (t: unknown): t is null | undefined =>
  isNull(t) || isUndefined(t);

isNil.strict = (t: unknown): t is null | undefined => {
  if (!isNil(t)) {
    throw TypeError("Type guard failed. Input is not null or undefined.");
  }

  return true;
};

/**
 * Returns true if input is undefined, null, empty string, object with length
 * of 0 or object without enumerable keys.
 * @param {unknown} t
 * @return {boolean}
 */
const isEmpty = (
  t: unknown,
): t is null | undefined | "" | [] | Record<string, never> => {
  if (
    t === null ||
    isUndefined(t) ||
    (typeof t === "string" && t === "") ||
    (Array.isArray(t) && (t as unknown[]).length === 0) ||
    (t && typeof t === "object" && Object.keys(t).length === 0)
  ) {
    return true;
  }

  return false;
};

isEmpty.strict = (
  t: unknown,
): t is null | undefined | "" | [] | Record<string, never> => {
  if (!isEmpty(t)) {
    throw TypeError("Type guard failed. Input is not empty.");
  }

  return true;
};

// deno-lint-ignore no-explicit-any
export const isIterator = <C = any>(t: unknown): t is Iterator<C> =>
  typeof t === "object" &&
  !isNil(t) &&
  Symbol.iterator in t &&
  isFunction(t[Symbol.iterator]);

export { isEmpty, isNil, isNull };
