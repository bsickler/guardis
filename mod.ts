/**
 * Guardis is a utility to help build type guard libraries while
 * addressing one of the main potential sources of error in TypeScript's
 * "type guard" behavior.
 *
 * @module Guardis
 * @author MrPossumz
 */

export * from "./src/guard.ts";
export * from "./src/extend.ts";
export * from "./src/batch.ts";
export * from "./src/types.ts";

import type { TypeGuard } from "./src/guard.ts";
import * as g from "./src/guard.ts";
import type {
  JsonArray,
  JsonObject,
  JsonPrimitive,
  JsonValue,
  TupleOfLength,
} from "./src/types.ts";

/**
 * "Is" serves as the main libray object and contains
 * keys corresponding to most of JavaScript's basic
 * data types. The key values are callbacks that function as
 * type guards for their respective types.
 */
export const Is: {
  Boolean: TypeGuard<boolean>;
  String: TypeGuard<string>;
  Number: TypeGuard<number>;
  Binary: TypeGuard<0 | 1>;
  Numeric: TypeGuard<number>;
  Function: TypeGuard<(...args: unknown[]) => unknown>;
  Object: TypeGuard<object>;
  Undefined: TypeGuard<undefined>;
  Array: TypeGuard<Array<unknown>>;
  JsonPrimitive: TypeGuard<boolean | string | number | null>;
  JsonArray: TypeGuard<JsonArray>;
  JsonObject: TypeGuard<Record<string, JsonValue>>;
  JsonValue: TypeGuard<JsonPrimitive | JsonArray | JsonObject>;
  Date: TypeGuard<Date>;
  Null: {
    (value: unknown): value is null;
    strict: (value: unknown, errorMsg?: string) => value is null;
    assert: (value: unknown, errorMsg?: string) => asserts value is null;
    optional: {
      (value: unknown): value is null | undefined;
      strict: (value: unknown, errorMsg?: string) => value is null | undefined;
      assert: (value: unknown, errorMsg?: string) => asserts value is null | undefined;
    };
  };
  Nil: {
    (value: unknown): value is null | undefined;
    strict: (value: unknown, errorMsg?: string) => value is null | undefined;
    assert: (value: unknown, errorMsg?: string) => asserts value is null | undefined;
  };
  Empty: {
    (value: unknown): value is null | undefined | "" | [] | Record<string, never>;
    strict: (
      value: unknown,
      errorMsg?: string,
    ) => value is null | undefined | "" | [] | Record<string, never>;
    assert: (
      value: unknown,
      errorMsg?: string,
    ) => asserts value is null | undefined | "" | [] | Record<string, never>;
  };
  Iterable: {
    <T = unknown>(value: unknown): value is Iterable<T>;
    strict<T = unknown>(value: unknown, errorMsg?: string): value is Iterable<T>;
    assert<T = unknown>(value: unknown, errorMsg?: string): asserts value is Iterable<T>;
    optional: {
      <T = unknown>(value: unknown): value is Iterable<T> | undefined;
      strict<T = unknown>(value: unknown, errorMsg?: string): value is Iterable<T> | undefined;
      assert<T = unknown>(value: unknown, errorMsg?: string): asserts value is Iterable<T> | undefined;
    };
  };
  Tuple: {
    <N extends number>(value: unknown, length: N): value is TupleOfLength<N>;
    strict<N extends number>(value: unknown, length: N): value is TupleOfLength<N>;
    assert<N extends number>(value: unknown, length: N, errorMsg?: string): asserts value is TupleOfLength<N>;
    optional: {
      <N extends number>(value: unknown, length: N): value is TupleOfLength<N> | undefined;
      strict<N extends number>(value: unknown, length: N, errorMsg?: string): value is TupleOfLength<N> | undefined;
      assert<N extends number>(value: unknown, length: N, errorMsg?: string): asserts value is TupleOfLength<N> | undefined;
    };
  };
} = {
  Boolean: g.isBoolean,
  String: g.isString,
  Number: g.isNumber,
  Binary: g.isBinary,
  Numeric: g.isNumeric,
  Function: g.isFunction,
  Object: g.isObject,
  Undefined: g.isUndefined,
  Array: g.isArray,
  JsonPrimitive: g.isJsonPrimitive,
  JsonArray: g.isJsonArray,
  JsonObject: g.isJsonObject,
  JsonValue: g.isJsonValue,
  Null: g.isNull,
  Nil: g.isNil,
  Empty: g.isEmpty,
  Iterable: g.isIterable,
  Tuple: g.isTuple,
  Date: g.isDate,
} as const;
