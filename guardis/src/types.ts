import type { StandardSchemaV1 } from "../specs/standard-schema-spec.v1.ts";
import type {
  includes,
  tupleHas,
} from "./utilities.ts";

/**
 * Context for tracking validation paths and collecting issues during validation.
 * Only present during `validate()` calls, not during regular type guard checks.
 */
export interface Context {
  /** The current path being validated (array of property keys and indices) */
  readonly path: ReadonlyArray<PropertyKey>;
  /** The collected validation issues */
  readonly issues: StandardSchemaV1.Issue[];
  /** Creates a new context with the segment added to the path */
  pushPath(segment: PropertyKey): Context;
  /** Adds an issue at the current path */
  addIssue(message: string): void;
}

type Helpers = {
  /** Check for required property with optional custom error message */
  has: <K extends PropertyKey, G = unknown>(
    t: object,
    k: K,
    guard?: (v: unknown) => v is G,
    errorMessage?: string,
  ) => t is { [K2 in K]: G };
  /** Check that a property does not exist with optional custom error message */
  hasNot: <K extends PropertyKey>(
    t: object,
    k: K,
    errorMessage?: string,
  ) => t is { [K2 in K]: never };
  /** Check for optional property with optional custom error message */
  hasOptional: <K extends PropertyKey, G = unknown>(
    t: object,
    k: K,
    guard?: (v: unknown) => v is G,
    errorMessage?: string,
  ) => t is { [K2 in K]+?: G };
  tupleHas: typeof tupleHas;
  includes: typeof includes;
  /** Check if a key exists in an object with optional custom error message */
  keyOf: <T extends object>(k: unknown, t: T, errorMessage?: string) => k is keyof T;
  /** Returns null and adds custom error message to context if during validation */
  fail: (message: string) => null;
};

/** Helpers extended with internal context access for validation */
export type HelpersWithContext = Helpers & { _ctx?: Context };

/** A parser is a function that takes an unknown and returns T or null */
export type Parser<T = unknown> = (val: unknown, helper: Helpers) => T | null;

export type ExtendedParser<T1, T2 extends T1 = T1> = (val: T1, helper: Helpers) => T2 | null;

export type Predicate<T> = (val: unknown) => val is T;

/** Extracts a union of guarded types from a tuple of predicates */
type PredicateUnion<Guards extends Predicate<unknown>[]> = {
  [K in keyof Guards]: Guards[K] extends Predicate<infer U> ? U : never;
}[number];

export type StrictTypeGuard<T> = (value: unknown, errorMsg?: string) => value is T;

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
   * A utility to gain access to the type being guarded. Can be used
   * to infer the type in other parts of the code.
   *
   * @example
   * ```typescript
   * type GuardedType = typeof isString._TYPE; // string
   * ```
   */
  _TYPE: T1;

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
  or: <Guards extends Predicate<unknown>[]>(...guards: Guards) => TypeGuard<T1 | PredicateUnion<Guards>>;
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
  extend: IsExtensible<T1> extends false ? never
    : T1 extends Record<string, unknown>
      ? {
          <S extends TypeGuardShape>(shape: S): TypeGuard<T1 & InferShape<S>>;
          <S extends TypeGuardShape>(name: string, shape: S): TypeGuard<T1 & InferShape<S>>;
          <T2 extends T1>(parse: ExtendedParser<T1, T2>): TypeGuard<T2>;
          <T2 extends T1>(name: string, parse: ExtendedParser<T1, T2>): TypeGuard<T2>;
        }
      : {
          <T2 extends T1>(parse: ExtendedParser<T1, T2>): TypeGuard<T2>;
          <T2 extends T1>(name: string, parse: ExtendedParser<T1, T2>): TypeGuard<T2>;
        };
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
    /**
     * Validates the value against the schema, accepting undefined as valid.
     * @param value The value to validate
     * @returns A success result with the value (including undefined), or a failure result with issues.
     */
    validate: (value: unknown) => StandardSchemaV1.Result<T1 | undefined>;
    /**
     * A type guard function that checks if the value is of type T1 | undefined | T2.
     * This is useful for creating unions of types.
     * @param guard A type guard for T2
     * @returns A new type guard that checks if the value is of type T1 | undefined | T2
     */
    or: <Guards extends Predicate<unknown>[]>(...guards: Guards) => TypeGuard<T1 | undefined | PredicateUnion<Guards>>;
    /**
     * A type guard that checks if the value is not empty and of type T | undefined.
     * An empty value is defined as null, an empty string, an empty array,
     * or an empty object.
     * @param value The value to check
     * @returns true if the value is of type T and not empty, otherwise false
     *
     * @note This method is equivalent to calling `isString.notEmpty.optional`
     * on a type guard named `isString`.
     */
    notEmpty: CanBeEmpty<T1> extends false ? never : TypeGuard<T1 | undefined>["notEmpty"];
  };
  notEmpty: CanBeEmpty<T1> extends false ? never : {
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
    /**
     * A type guard function that checks if the value is of type T1 or T2.
     * This is useful for creating unions of types.
     * @param guard A type guard for T2
     * @returns A new type guard that checks if the value is of type T1 or T2
     */
    or: <Guards extends Predicate<unknown>[]>(...guards: Guards) => TypeGuard<T1 | PredicateUnion<Guards>>;
    /**
     * A type guard that checks if the value is not empty and of type T | undefined.
     * An empty value is defined as null, an empty string, an empty array,
     * or an empty object.
     * @param value The value to check
     * @returns true if the value is of type T and not empty, otherwise false
     *
     * @note This method is equivalent to calling `isString.optional.notEmpty`
     * on a type guard named `isString`.
     */
    optional: TypeGuard<T1 | undefined>["optional"];
  };
}

/** Helper type to extract the guarded type from a TypeGuard */
export type GuardedType<G> = G extends TypeGuard<infer T> ? T : never;

/** A named parser entry with an explicit name for error messages. */
export type NamedParser = { parse: Parser; name: string };

/** A single entry in a ParserRecords config: a parser function, a named parser, or a shape. */
export type ParserEntry = Parser | NamedParser | TypeGuardShape;

/** A record describing various types and their parsers or shapes. This can be used to generate
 * a customized Is dictionary. */
export type ParserRecords = Record<string, ParserEntry>;

/** Infers the guarded type from a ParserEntry (parser function, named parser, or shape). */
export type InferEntry<P> = P extends Parser<infer T> ? T
  : P extends NamedParser ? (P["parse"] extends Parser<infer T> ? T : never)
  : P extends TypeGuardShape ? InferShape<P>
  : never;

/** Any valid primitive json value. */
export type JsonPrimitive = string | number | boolean | null;

/** An array of JSON-able values. */
export type JsonArray = JsonValue[] | readonly JsonValue[];

/** An object containing only JSON-able values. */
export type JsonObject =
  & { [Key in string]: JsonValue }
  & { [Key in string]?: JsonValue | undefined };

/** The complete set of JSON-able data types. */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/** Construct a tuple of unknowns, up to size 10. */
export type TupleOfLength<N extends number> = N extends 0 ? []
  : N extends 1 ? [unknown]
  : N extends 2 ? [unknown, unknown]
  : N extends 3 ? [unknown, unknown, unknown]
  : N extends 4 ? [unknown, unknown, unknown, unknown]
  : N extends 5 ? [unknown, unknown, unknown, unknown, unknown]
  : N extends 6 ? [unknown, unknown, unknown, unknown, unknown, unknown]
  : N extends 7 ? [unknown, unknown, unknown, unknown, unknown, unknown, unknown]
  : N extends 8 ? [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]
  : N extends 9 ? [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]
  : unknown[];

/** Replace the type at position X in tuple T with type R */
export type ReplaceTupleIndex<T extends readonly unknown[], X extends number, R> = {
  readonly [K in keyof T]: K extends `${X}` ? R : T[K];
};

/** Utility type to determine if a type can be "empty" */
export type CanBeEmpty<T> = T extends
  | null
  | undefined
  | string
  | unknown[]
  | readonly unknown[]
  | Record<PropertyKey, unknown> ? true
  : false;

/** Utility type to determine if a type is extensible */
export type IsExtensible<T> = T extends null | undefined ? false : true;

/** A guard predicate function — broad enough for TypeGuard, .optional, .notEmpty, and custom guards */
// deno-lint-ignore no-explicit-any
export type TypeGuardPredicate = ((value: unknown) => boolean) & { validate?: (value: unknown) => any };

/** A shape object mapping property names to guard predicates or nested shapes */
export type TypeGuardShape = { [key: string]: TypeGuardPredicate | TypeGuardShape };

/** Cosmetic type flattener for IDE tooltips */
// deno-lint-ignore ban-types
export type Simplify<T> = { [K in keyof T]: T[K] } & {};

/** Recursively infers the TypeScript type from a TypeGuardShape */
export type InferShape<S extends TypeGuardShape> = Simplify<{
  [K in keyof S]: S[K] extends (value: unknown) => value is infer T ? T
    : S[K] extends TypeGuardShape ? InferShape<S[K]>
    : never;
}>;
