import type { TypeGuard } from "../types.ts";

/** Chainable number comparison methods */
export interface NumberTypeGuard {
  /** Lower bound (exclusive). Can chain with lt/lte/eq. */
  gt(threshold: number): TypeGuard<number> & Omit<NumberTypeGuard, "gt" | "gte" | "eq">;
  /** Lower bound (inclusive). Can chain with lt/lte/eq. */
  gte(threshold: number): TypeGuard<number> & Omit<NumberTypeGuard, "gt" | "gte" | "eq">;
  /** Upper bound (exclusive). Can chain with gt/gte/eq. */
  lt(threshold: number): TypeGuard<number> & Omit<NumberTypeGuard, "lt" | "lte" | "eq">;
  /** Upper bound (inclusive). Can chain with gt/gte/eq. */
  lte(threshold: number): TypeGuard<number> & Omit<NumberTypeGuard, "lt" | "lte" | "eq">;
  /** Exact value (terminal). */
  eq(target: number): TypeGuard<number>;
  /** Rejects Infinity and -Infinity. Allows further comparisons. */
  finite: TypeGuard<number> & Omit<NumberTypeGuard, "finite">;
}

/** A string type guard with chainable length validation methods */
export interface StringTypeGuard {
  /** Checks string has exactly this length */
  ofLength(length: number): TypeGuard<string>;
  /** Checks string length >= min */
  min(length: number): TypeGuard<string> & Omit<StringTypeGuard, "min" | "ofLength" | "range">;
  /** Checks string length <= max */
  max(length: number): TypeGuard<string> & Omit<StringTypeGuard, "max" | "ofLength" | "range">;
  /** Checks string length is between min and max (inclusive) */
  range(min: number, max: number): TypeGuard<string>;
}

/** Chainable date comparison methods */
export interface DateTypeGuard {
  /** Lower bound (exclusive). Can chain with lt/lte. */
  gt(threshold: Date): TypeGuard<Date> & Omit<DateTypeGuard, "gt" | "gte">;
  /** Lower bound (inclusive). Can chain with lt/lte. */
  gte(threshold: Date): TypeGuard<Date> & Omit<DateTypeGuard, "gt" | "gte">;
  /** Upper bound (exclusive). Can chain with gt/gte. */
  lt(threshold: Date): TypeGuard<Date> & Omit<DateTypeGuard, "lt" | "lte">;
  /** Upper bound (inclusive). Can chain with gt/gte. */
  lte(threshold: Date): TypeGuard<Date> & Omit<DateTypeGuard, "lt" | "lte">;
}

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
