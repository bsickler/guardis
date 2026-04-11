/**
 * guard.ts
 * @module
 */

import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type {
  ArrayTypeGuard,
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
  NumberTypeGuard,
  Parser,
  ParserEntry,
  Predicate,
  StrictTypeGuard,
  TupleOfLength,
  TypeGuard,
  TypeGuardShape,
  VerifiedShape,
} from "./types.ts";
import { createContext, createStrictContext } from "./context.ts";
import { hasContext, hasName } from "./introspect.ts";
import {
  doesNotHaveProperty,
  exact,
  formatErrorMessage,
  hasOptionalProperty,
  hasProperty,
  includes,
  keyOf,
  safeStringify,
  tupleHas,
  unionOf,
} from "./utilities.ts";

/**
 * Creates a helpers object for use in type guard parsers.
 * When ctx is provided, has/hasOptional/tupleHas push a path segment before calling
 * the utility and pop after (with try/finally, since strict mode throws on addIssue
 * and inner guards may propagate that throw). When ctx is undefined, they pass the
 * utility a raw undefined context for boolean-only validation.
 */
function createHelpers(ctx?: Context): HelpersWithContext {
  const has = <K extends PropertyKey, G = unknown>(
    t: object,
    k: K,
    guard?: (v: unknown) => v is G,
    errorMessage?: string,
  ): t is { [K2 in K]: G } => {
    if (!ctx) return hasProperty(t, k, guard, undefined, undefined);
    ctx.pushPath(k);
    try {
      return hasProperty(t, k, guard, ctx, errorMessage);
    } finally {
      ctx.popPath();
    }
  };

  const hasNot = <K extends PropertyKey>(
    t: object,
    k: K,
    errorMessage?: string,
  ): t is { [K2 in K]: never } => {
    if (!ctx) return doesNotHaveProperty(t, k, undefined, undefined);
    ctx.pushPath(k);
    try {
      return doesNotHaveProperty(t, k, ctx, errorMessage);
    } finally {
      ctx.popPath();
    }
  };

  const hasOptional = <K extends PropertyKey, G = unknown>(
    t: object,
    k: K,
    guard?: (v: unknown) => v is G,
    errorMessage?: string,
  ): t is { [K2 in K]+?: G } => {
    if (!ctx) return hasOptionalProperty(t, k, guard, undefined, undefined);
    ctx.pushPath(k);
    try {
      return hasOptionalProperty(t, k, guard, ctx, errorMessage);
    } finally {
      ctx.popPath();
    }
  };

  const tupleHasHelper = <T extends readonly unknown[], I extends number, G = unknown>(
    t: T,
    i: I,
    guard: (v: unknown) => v is G,
  ): t is T & { [K in I]: G } => {
    if (!ctx) return tupleHas(t, i, guard, undefined);
    ctx.pushPath(i);
    try {
      return tupleHas(t, i, guard, ctx);
    } finally {
      ctx.popPath();
    }
  };

  return {
    has,
    hasNot,
    hasOptional,
    tupleHas: tupleHasHelper,
    includes,
    keyOf: <T extends object>(k: unknown, t: T, errorMessage?: string) =>
      keyOf(k, t, ctx, ctx ? errorMessage : undefined),
    exact,
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
 * Returns cached helpers for a Context, creating them on first access.
 * Since the Context is a mutable cursor (one instance per validation call),
 * a single helpers object works for all guards in the call tree.
 */
function getHelpers(ctx: Context): HelpersWithContext {
  const c = ctx as Context & { _helpers?: HelpersWithContext };
  if (!c._helpers) c._helpers = createHelpers(ctx);
  return c._helpers;
}

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

/**
 * Pre-compiled field descriptor. Built once at createTypeGuard time to avoid
 * per-call type dispatch and guard allocation in validateField.
 */
type FieldDescriptor =
  | { kind: "typeGuard"; key: string; guard: TypeGuard<unknown> }
  | { kind: "nested"; key: string; fields: FieldDescriptor[] }
  | { kind: "typePredicate"; key: string; guard: (value: unknown) => boolean };

/**
 * Compiles a TypeGuardShape into a pre-resolved array of field descriptors.
 * Classifies each field's guard type once and caches isExactly() guards for constants.
 */
function compileShape(shape: TypeGuardShape): FieldDescriptor[] {
  const descriptors: FieldDescriptor[] = [];

  for (const key of Object.keys(shape)) {
    const guard = shape[key];

    // Primitive constant — cache as a typeGuard wrapping isExactly
    if (guard === null || (typeof guard !== "object" && typeof guard !== "function")) {
      descriptors.push({ kind: "typeGuard", key, guard: isExactly(guard) });
      continue;
    }

    // Nested shape — recursively compile
    if (isTypeGuardShape(guard)) {
      descriptors.push({ kind: "nested", key, fields: compileShape(guard) });
      continue;
    }

    if (typeof guard !== "function") continue;

    // TypeGuard (with _.context for path tracking)
    if (hasContext(guard as Predicate<unknown>)) {
      descriptors.push({
        kind: "typeGuard",
        key,
        guard: guard as unknown as TypeGuard<unknown>,
      });
      continue;
    }

    // Plain type predicate function
    descriptors.push({ kind: "typePredicate", key, guard: guard as (value: unknown) => boolean });
  }

  return descriptors;
}

/**
 * Validates a single pre-compiled field descriptor against an object value.
 */
function validateCompiledField(
  obj: Record<string, unknown>,
  desc: FieldDescriptor,
  ctx: Context | undefined,
  localIssues: StandardSchemaV1.Issue[],
  result: Record<string, unknown>,
): void {
  const key = desc.key;

  if (ctx) ctx.pushPath(key);

  try {
    switch (desc.kind) {
      case "nested": {
        const r = validateCompiledShape(obj[key], desc.fields, ctx);
        if ("value" in r) {
          result[key] = r.value;
        } else if (!ctx) {
          localIssues.push(...r.issues);
        }
        break;
      }

      case "typeGuard": {
        if (ctx) {
          const r = desc.guard._.context(obj[key], ctx);
          if ("value" in r) result[key] = r.value;

          // Issues are already in ctx.issues — guards write directly via addIssue.
        } else {
          // No ctx — call without context arg to hit the bypass path (defaultHelpers,
          // no createContext/createHelpers allocation). Prepend the field key to paths.
          const r = desc.guard._.context(obj[key]);
          if ("value" in r) {
            result[key] = r.value;
          } else {
            for (const issue of r.issues) {
              localIssues.push({
                message: issue.message,
                path: issue.path ? [key, ...issue.path] : [key],
              });
            }
          }
        }
        break;
      }

      case "typePredicate": {
        if (desc.guard(obj[key])) {
          result[key] = obj[key];
        } else {
          const message = `Validation failed for property "${String(key)}"`;
          if (ctx) {
            ctx.addIssue(message);
          } else {
            localIssues.push({ message, path: [key] });
          }
        }
        break;
      }
    }
  } finally {
    if (ctx) ctx.popPath();
  }
}

/**
 * Fast path for shape validation when no context is provided.
 * Returns true/false without allocating result, issues, or Context objects.
 * Used by boolean guard calls (the common case) via compileShapeParser.
 */
function validateCompiledShapeBoolean(
  value: unknown,
  fields: FieldDescriptor[],
): boolean {
  if (!isRecord(value)) return false;

  for (let i = 0; i < fields.length; i++) {
    const desc = fields[i];
    const key = desc.key;

    switch (desc.kind) {
      case "nested": {
        if (!validateCompiledShapeBoolean(value[key], desc.fields)) return false;
        break;
      }
      case "typeGuard": {
        // Call the raw boolean callback directly — no context, no helpers, no issues.
        if (!desc.guard(value[key])) return false;
        break;
      }
      case "typePredicate": {
        if (!desc.guard(value[key])) return false;
        break;
      }
    }
  }
  return true;
}

/**
 * Slow path for shape validation when a context is provided.
 * Tracks issues and path information for .validate() calls.
 */
function validateCompiledShape(
  value: unknown,
  fields: FieldDescriptor[],
  ctx?: Context,
): StandardSchemaV1.Result<Record<string, unknown>> {
  if (!isRecord(value)) {
    const message = "Expected an object";

    if (!ctx) return { issues: [{ message }] };

    ctx.addIssue(message);
    return { issues: ctx.issues };
  }

  const result: Record<string, unknown> = {};

  if (ctx) {
    for (let i = 0; i < fields.length; i++) {
      validateCompiledField(value, fields[i], ctx, null!, result);
    }
    return ctx.issues.length > 0 ? { issues: ctx.issues } : { value: result };
  }

  const localIssues: StandardSchemaV1.Issue[] = [];
  for (let i = 0; i < fields.length; i++) {
    validateCompiledField(value, fields[i], undefined, localIssues, result);
  }
  return localIssues.length > 0 ? { issues: localIssues } : { value: result };
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
    const helpers = getHelpers(ctx);
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
  <T1>(guard: Predicate<T1>) => <T2 extends Predicate<unknown>[]>(...others: T2) => {
    type R = T1 | (T2[number] extends Predicate<infer U> ? U : never);

    if (others.length === 0) return guard as TypeGuard<R>;

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

    return (name ? createTypeGuard(name, parser) : createTypeGuard(parser)) as TypeGuard<R>;
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

  optional._ = {
    name,
    parser: optionalParser,
    context: optionalContext,
    optional: true as const,
  };

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
  const notEmptyParser = (value: unknown) => notEmpty(value) && guard(value) ? value : null;

  const context = (value: unknown, ctx?: Context): StandardSchemaV1.Result<T> => {
    if (notEmpty(value)) return { value };

    const message = formatErrorMessage(value, name);
    if (ctx) {
      ctx.addIssue(message);
      return { issues: ctx.issues };
    }

    return { issues: [{ message }] };
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

/** Pre-compiles a shape into a parser that uses cached field descriptors. */
function compileShapeParser<T1>(shape: TypeGuardShape): Parser<T1> {
  const fields = compileShape(shape);

  return (val: unknown, helpers: HelpersWithContext) => {
    const ctx = helpers._ctx;
    // Fast path: no context means no issue tracking needed — skip all allocations
    // (result object, localIssues array, per-field Context instances, helpers objects).
    if (ctx === undefined) {
      return validateCompiledShapeBoolean(val, fields) ? (val as T1) : null;
    }
    // Slow path: caller wants issue tracking via .validate() or nested validation.
    const result = validateCompiledShape(val, fields, ctx);
    return "value" in result ? result.value as T1 : null;
  };
}

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
export function createTypeGuard<const S extends TypeGuardShape>(shape: S): TypeGuard<InferShape<S>>;
/**
 * Creates a type guard from a shape object with a custom type name.
 *
 * @param name The type name to use for error messages.
 * @param shape A shape object mapping keys to guards or nested shapes.
 * @returns A type guard function with utility methods.
 */
export function createTypeGuard<const S extends TypeGuardShape>(
  name: string,
  shape: S,
): TypeGuard<InferShape<S>>;
/**
 * Creates a type guard from a shape object, verified against an explicit type parameter.
 *
 * The shape must match the structure of T1 — TypeScript will error if fields are
 * missing, extra, or have wrong guard types. The returned guard is typed as
 * `TypeGuard<T1>`, preserving your existing type as the source of truth.
 *
 * @param shape A shape object whose fields are verified against T1.
 * @returns A type guard function typed as TypeGuard<T1>.
 *
 * @example
 * ```typescript
 * type User = { id: number; name: string };
 * const isUser = createTypeGuard<User>({ id: isNumber, name: isString });
 * ```
 */
export function createTypeGuard<T1 extends Record<string, unknown>>(
  shape: VerifiedShape<T1>,
): TypeGuard<T1>;
/**
 * Creates a type guard from a shape object with a custom name, verified against
 * an explicit type parameter.
 *
 * @param name The type name to use for error messages.
 * @param shape A shape object whose fields are verified against T1.
 * @returns A type guard function typed as TypeGuard<T1>.
 */
export function createTypeGuard<T1 extends Record<string, unknown>>(
  name: string,
  shape: VerifiedShape<T1>,
): TypeGuard<T1>;
export function createTypeGuard<T1>(
  ...args: [Parser<T1> | TypeGuardShape] | [string, Parser<T1> | TypeGuardShape]
): TypeGuard<T1> {
  const parserOrShape = args.length === 1 ? args[0] : args[1];
  const name = args.length === 2 ? args[0] as string : undefined;

  // Convert shape to parser, then continue with normal guard creation
  const parser: Parser<T1> = isTypeGuardShape(parserOrShape)
    ? compileShapeParser(parserOrShape)
    : parserOrShape;

  /**
   * Internal validation method that accepts a context for path tracking.
   * This is used by nested validations to propagate paths.
   *
   * Fast path: when no caller context is provided, reuse the module-level
   * defaultHelpers constant instead of allocating a fresh HelpersWithContext
   * (which would create 8 closures per call).
   */
  const context = (value: unknown, ctx?: Context): StandardSchemaV1.Result<T1> => {
    // Bypass path: no caller context, no issue tracking needed. Reuse defaultHelpers.
    if (ctx === undefined) {
      const result = parser(value, defaultHelpers);
      if (result !== null) {
        // Special case: isNull parser returns `true` when value is null
        return { value: result === true && value === null ? value as T1 : result };
      }
      return { issues: [{ message: formatErrorMessage(value, name) }] };
    }

    const issuesBefore = ctx.issues.length;
    const helpers = getHelpers(ctx);
    const result = parser(value, helpers);

    // If parser returned null and no child issues were added, add this guard's error
    if (result === null && ctx.issues.length === issuesBefore) {
      ctx.addIssue(formatErrorMessage(value, name));
    }

    // Check if THIS guard added any issues (not sibling issues from shared context)
    const hasNewIssues = ctx.issues.length > issuesBefore;

    if (result !== null && !hasNewIssues) {
      // Special case: isNull parser returns `true` when value is null
      return { value: result === true && value === null ? value as T1 : result };
    }

    // Return accumulated issues if this guard contributed any
    if (hasNewIssues) {
      return { issues: ctx.issues };
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
    types: {} as StandardSchemaV1.Types<T1>,
  };

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
 * Wraps a TypeGuard<number> with chainable comparison methods (gt, gte, lt, lte, eq).
 * Each method delegates to .extend() and wraps the result for further chaining.
 */
function withComparisons(guard: TypeGuard<number>): NumberTypeGuard {
  const numeric = guard as NumberTypeGuard;
  numeric.gt = (n) => withComparisons(guard.extend(`> ${n}`, (v) => v > n ? v : null));
  numeric.gte = (n) => withComparisons(guard.extend(`>= ${n}`, (v) => v >= n ? v : null));
  numeric.lt = (n) => withComparisons(guard.extend(`< ${n}`, (v) => v < n ? v : null));
  numeric.lte = (n) => withComparisons(guard.extend(`<= ${n}`, (v) => v <= n ? v : null));
  numeric.eq = (n) => withComparisons(guard.extend(`== ${n}`, (v) => v === n ? v : null));
  return numeric;
}

/**
 * Returns true if input satisfies type number. Returns false if `NaN` is passed.
 *
 * While `NaN` is technically a number in JavaScript, it is not a valid value for many applications
 * and will fail if used with common numeric operations.
 *
 * @param {unknown} t
 * @return {boolean}
 */
export const isNumber: NumberTypeGuard = withComparisons(createTypeGuard(
  "number",
  (t): number | null => typeof t === "number" && !Number.isNaN(t) ? t : null,
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
 * Returns a guard that checks if a value strictly equals the given constant.
 * Narrows the TypeScript type to the exact literal type of the argument.
 *
 * @example
 * isExactly('admin')('admin') // true — narrows to 'admin'
 * isExactly(42)(43)           // false
 * isExactly(null)(null)       // true — narrows to null
 */
export function isExactly<const T>(expected: T): TypeGuard<T> {
  switch (expected) {
    case null:
      return isNull as TypeGuard<T>;

    case undefined:
      return isUndefined as TypeGuard<T>;

    default:
      return createTypeGuard(
        safeStringify(expected),
        (t): T | null => exact(expected, t) ? expected : null,
      );
  }
}

/**
 * Returns true if input satisfies type numeric.
 * @param {unknown} t
 * @return {boolean}
 */
const NUMERIC_RE = /^-?\d*\.?\d+$/;

export const isNumeric: NumberTypeGuard = withComparisons(createTypeGuard(
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
    isTuple(v, length) ? v : guard._.parser(v, defaultHelpers)
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
 * Handles both string and numeric enums (filters reverse mappings for numeric enums).
 */
export function isEnum<T extends Record<string, string | number>>(
  enumObj: T,
): TypeGuard<T[keyof T]> {
  // Filter out numeric enum reverse mappings.
  // For numeric enums, Object.keys includes both "Name" and "0" (the reverse mapping).
  // We keep only entries where the key is not a stringified number.
  const values = Object.entries(enumObj)
    .filter(([key]) => isNaN(Number(key)))
    .map(([, value]) => value);
  const memberSet = new Set<string | number>(values);
  const name = `enum(${values.join(" | ")})`;

  return createTypeGuard(
    name,
    (t): T[keyof T] | null => memberSet.has(t as string | number) ? t as T[keyof T] : null,
  );
}

export { isEmpty, isIterable, isNil, isNull, isTuple };
