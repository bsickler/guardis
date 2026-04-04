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
  InferShape,
  IsExtensible,
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  NamedParser,
  Parser,
  ParserEntry,
  Predicate,
  StrictTypeGuard,
  TupleOfLength,
  TypeGuard,
  TypeGuardShape,
} from "./types.ts";
import { createContext, createStrictContext } from "./context.ts";
import { type GuardMeta, type GuardWithContext, hasContext, hasName } from "./introspect.ts";
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
    tupleHas: (t, i, guard) => tupleHas(t, i, guard, ctx?.pushPath(i)),
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
 * Checks if a value is a TypeGuardShape object (plain object, not a function).
 * Uses raw checks instead of isObject/isFunction to avoid temporal dead zone
 * issues — this function is called during createTypeGuard's implementation,
 * which runs before isObject and isFunction are initialized.
 */
function isTypeGuardShape(value: unknown): value is TypeGuardShape {
  return typeof value === "object" && value !== null && !Array.isArray(value) &&
    typeof value !== "function";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Adds issues from a guard result to the context if not already tracked. */
function propagateIssues(
  issues: ReadonlyArray<StandardSchemaV1.Issue>,
  key: string,
  ctx: Context,
): void {
  for (const issue of issues) {
    const alreadyTracked = ctx.issues.some((i) =>
      i.message === issue.message &&
      JSON.stringify(i.path) === JSON.stringify(issue.path)
    );
    if (!alreadyTracked) {
      ctx.issues.push({ message: issue.message, path: issue.path ?? [key] });
    }
  }
}

/**
 * Validates a single shape field against its guard.
 * When ctx is provided, issues are pushed to the shared context.
 * When ctx is absent, issues are collected into localIssues.
 */
function validateField(
  obj: Record<string, unknown>,
  key: string,
  guard: TypeGuardShape[string],
  ctx: Context | undefined,
  localIssues: StandardSchemaV1.Issue[],
  result: Record<string, unknown>,
): void {
  const childCtx = ctx?.pushPath(key);

  // Nested shape — recurse
  if (isTypeGuardShape(guard)) {
    const r = validateShape(obj[key], guard, childCtx);

    if ("value" in r) {
      result[key] = r.value;
    } else if (!childCtx) {
      localIssues.push(...r.issues);
    }

    return;
  }

  if (typeof guard !== "function") return;

  // Context-aware guard (TypeGuard with _.context)
  if (hasContext(guard as Predicate<unknown>)) {
    const guardCtx = childCtx ?? createContext([key]);

    const r = (guard as unknown as GuardWithContext<unknown>)._.context(obj[key], guardCtx);
    if ("value" in r) {
      result[key] = r.value;
    } else if (childCtx) {
      propagateIssues(r.issues, key, ctx!);
    } else {
      localIssues.push(...r.issues);
    }

    return;
  }

  // Plain boolean guard
  if (guard(obj[key])) {
    result[key] = obj[key];
    return;
  }

  const message = `Validation failed for property "${String(key)}"`;
  if (childCtx) {
    childCtx.addIssue(message);
  } else {
    localIssues.push({ message, path: [key] });
  }
}

/**
 * Recursively validates a value against a TypeGuardShape.
 * When ctx is provided, issues are pushed to the shared context for path tracking.
 * When ctx is absent, issues are collected locally and returned.
 */
function validateShape(
  value: unknown,
  shape: TypeGuardShape,
  ctx?: Context,
): StandardSchemaV1.Result<Record<string, unknown>> {
  if (!isRecord(value)) {
    const message = "Expected an object";

    if (!ctx) return { issues: [{ message }] };

    ctx.addIssue(message);
    return { issues: ctx.issues };
  }

  const result: Record<string, unknown> = {};
  const localIssues: StandardSchemaV1.Issue[] = [];

  for (const key of Object.keys(shape)) {
    validateField(value, key, shape[key], ctx, localIssues, result);
  }

  const issues = ctx ? ctx.issues : localIssues;

  return issues.length > 0 ? { issues } : { value: result };
}

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
  <T1>(guard: Predicate<T1>) => (...others: TypeGuard<unknown>[]): TypeGuard<unknown> => {
    if (others.length === 0) return guard as TypeGuard<unknown>;

    const allGuards: Predicate<unknown>[] = [guard, ...others];

    // Build a union name from all named guards
    const names: string[] = [];
    for (const g of allGuards) {
      if (hasName(g)) names.push(g._.name!);
    }
    const name = names.length === allGuards.length ? names.join(" | ") : undefined;

    const parser = (v: unknown) => {
      for (const g of allGuards) {
        if (g(v)) return v === null ? true : v;
      }
      return null;
    };

    return name ? createTypeGuard(name, parser) : createTypeGuard(parser);
  };

/**
 * Creates an optional variant of a type guard that accepts undefined.
 * The returned guard is context-aware for path tracking in shapes.
 *
 * @template T - The type checked by the base type guard.
 *
 * @param guard - The base type guard predicate to wrap.
 * @param parser - The parser function from the base type guard.
 * @param context - The context-aware validation function from the base type guard.
 * @returns A new type guard that checks if a value is of type `T | undefined`.
 *
 * @example
 * ```typescript
 * const optionalString = createOptionalTypeGuard(isString, stringParser, stringContext);
 *
 * console.log(optionalString("hello")); // true
 * console.log(optionalString(undefined)); // true
 * console.log(optionalString(42)); // false
 * ```
 */
const createOptionalTypeGuard = <T>(
  guard: Predicate<T>,
  parser: Parser<T>,
  context: (value: unknown, ctx?: Context) => StandardSchemaV1.Result<T>,
) => {
  const optional = (value: unknown): value is T | undefined => isUndefined(value) || guard(value);

  const name = hasName(guard) ? `${guard._.name} | undefined` : undefined;
  const optionalParser: Parser<T | undefined> = (v, h) => isUndefined(v) ? v : parser(v, h);
  const optionalContext = (value: unknown, ctx?: Context) =>
    isUndefined(value) ? { value } : context(value, ctx ?? createContext());

  optional._ = { name, parser: optionalParser, context: optionalContext };
  optional.strict = createStrictTypeGuard(optionalParser, name);
  optional.assert = optional.strict;
  optional.validate = (value: unknown) => optionalContext(value, createContext());
  optional.or = createOrTypeGuard(optional);

  return optional;
};

/**
 * Creates a notEmpty variant of a type guard that rejects empty values
 * (null, undefined, empty string, empty array, empty object).
 */
const createNotEmptyTypeGuard = <T>(guard: Predicate<T>) => {
  const notEmpty = (value: unknown): value is T => !isEmpty(value) && guard(value);
  const name = hasName(guard) ? `non-empty ${guard._.name}` : undefined;
  const notEmptyParser: Parser<T> = (value: unknown) =>
    notEmpty(value) && guard(value) ? value : null;

  const context = (value: unknown, ctx?: Context): StandardSchemaV1.Result<T> => {
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

  notEmpty.optional = createOptionalTypeGuard(notEmpty, notEmptyParser, context);

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
/**
 * Creates a type guard from a shape object.
 *
 * The shape maps property names to guard predicates or nested shapes.
 * The resulting type guard validates that an object matches the shape.
 *
 * @param shape A shape object mapping keys to guards or nested shapes.
 * @returns A type guard function with utility methods.
 *
 * @example
 * ```typescript
 * const isUser = createTypeGuard({ name: isString, age: isNumber });
 * ```
 */
export function createTypeGuard<S extends TypeGuardShape>(shape: S): TypeGuard<InferShape<S>>;
/**
 * Creates a type guard from a shape object with a custom type name.
 *
 * @param name The type name to use for error messages.
 * @param shape A shape object mapping keys to guards or nested shapes.
 * @returns A type guard function with utility methods.
 */
export function createTypeGuard<S extends TypeGuardShape>(
  name: string,
  shape: S,
): TypeGuard<InferShape<S>>;
export function createTypeGuard<T1>(
  ...args: [Parser<T1> | TypeGuardShape] | [string, Parser<T1> | TypeGuardShape]
): TypeGuard<T1> {
  const parserOrShape = args.length === 1 ? args[0] : args[1];
  const name = args.length === 2 ? args[0] as string : undefined;

  // Convert shape to parser, then continue with normal guard creation
  const parser: Parser<T1> = isTypeGuardShape(parserOrShape)
    ? (val, helpers) => {
      const ctx = (helpers as HelpersWithContext)._ctx;
      const result = validateShape(val, parserOrShape, ctx);
      return "value" in result ? result.value as T1 : null;
    }
    : parserOrShape as Parser<T1>;

  /**
   * Internal validation method that accepts a context for path tracking.
   * This is used by nested validations to propagate paths.
   */
  const context = (
    value: unknown,
    ctx?: Context,
  ): StandardSchemaV1.Result<T1> => {
    const issuesBefore = ctx?.issues.length;
    const helpers = createHelpers(ctx);
    const result = parser(value, helpers);

    // If parser returned null and no child issues were added, add this guard's error
    if (result === null && ctx && ctx.issues.length === issuesBefore) {
      ctx.addIssue(formatErrorMessage(value, name));
    }

    // Check if THIS guard added any issues (not sibling issues from shared context)
    const hasNewIssues = ctx !== undefined && ctx.issues.length > issuesBefore!;

    if (result !== null && !hasNewIssues) {
      // Special case: isNull parser returns `true` when value is null
      return { value: result === true && value === null ? value as T1 : result };
    }

    // Return accumulated issues if this guard contributed any
    if (hasNewIssues) {
      return { issues: ctx!.issues };
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
  function extend<S extends TypeGuardShape>(shape: S): TypeGuard<T1 & InferShape<S>>;
  function extend<S extends TypeGuardShape>(name: string, shape: S): TypeGuard<T1 & InferShape<S>>;
  function extend<T2 extends T1>(parser: ExtendedParser<T1, T2>): TypeGuard<T2>;
  function extend<T2 extends T1>(name: string, parser: ExtendedParser<T1, T2>): TypeGuard<T2>;
  function extend<T2 extends T1>(
    ...args:
      | [ExtendedParser<T1, T2> | TypeGuardShape]
      | [string, ExtendedParser<T1, T2> | TypeGuardShape]
  ): TypeGuard<T2> {
    const parserOrShape = args.length === 1 ? args[0] : args[1];
    const extendName = args.length === 2 ? args[0] : undefined;

    // Build a combined parser that first checks the base guard, then the extension
    let combinedParser: Parser<T2>;

    if (isTypeGuardShape(parserOrShape)) {
      const shapeGuard = createTypeGuard(parserOrShape);
      combinedParser = (v) => callback(v) && shapeGuard(v) ? v as T2 : null;
    } else {
      combinedParser = (v, h) => callback(v) ? parserOrShape(v, h) : null;
    }

    if (extendName) {
      return createTypeGuard<T2>(extendName, combinedParser);
    }

    return createTypeGuard<T2>(combinedParser);
  }
  callback.extend = extend as IsExtensible<T1> extends false ? never : typeof extend;

  /**
   * Returns false if the value fails the "empty" type guard
   * or if it fails the parser.
   * @param {unknown} value
   * @returns
   */
  callback.notEmpty = createNotEmptyTypeGuard(callback);

  type OptionalTypeGuard = ReturnType<typeof createOptionalTypeGuard<T1>> & {
    notEmpty: typeof callback.notEmpty.optional;
  };

  const optional = createOptionalTypeGuard(callback, parser, context) as OptionalTypeGuard;
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

function isParser(entry: ParserEntry): entry is Parser {
  return typeof entry === "function";
}

function isNamedParser(entry: ParserEntry): entry is NamedParser {
  return typeof entry === "object" && "parse" in entry && typeof entry.parse === "function";
}

/**
 * Converts a ParserEntry (parser function, named parser object, or shape) into a TypeGuard.
 * Shared by `batch` and `extend` to avoid duplicating entry detection logic.
 */
export function entryToGuard(entry: ParserEntry): TypeGuard<unknown> {
  if (isParser(entry)) return createTypeGuard(entry);
  if (isNamedParser(entry)) return createTypeGuard(entry.name, entry.parse);
  return createTypeGuard(entry);
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
      const guardName = hasName(guard) ? guard._.name : undefined;

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
