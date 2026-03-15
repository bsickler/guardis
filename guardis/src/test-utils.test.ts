import { assert } from "@std/assert";
import { type Equals, assertType } from "./test-utils.ts";

// === Compile-time tests ===
// These tests pass if the file type-checks. Incorrect assertions would cause compile errors.

Deno.test("Equals - identical types are true", () => {
  assertType<Equals<string, string>>();
  assertType<Equals<number, number>>();
  assertType<Equals<boolean, boolean>>();
  assertType<Equals<null, null>>();
  assertType<Equals<undefined, undefined>>();
  assertType<Equals<void, void>>();
  assertType<Equals<never, never>>();
  assertType<Equals<unknown, unknown>>();
  assertType<Equals<"hello", "hello">>();
  assertType<Equals<42, 42>>();
  assertType<Equals<true, true>>();
});

Deno.test("Equals - object types", () => {
  assertType<Equals<{ a: string }, { a: string }>>();
  assertType<Equals<{ a: string; b: number }, { a: string; b: number }>>();
  assertType<Equals<{ readonly x: string }, { readonly x: string }>>();
  assertType<Equals<{ x?: string }, { x?: string }>>();
  assertType<Equals<[], []>>();
  assertType<Equals<[string, number], [string, number]>>();
  assertType<Equals<string[], string[]>>();
});

Deno.test("Equals - union and intersection types", () => {
  assertType<Equals<string | number, string | number>>();
  assertType<Equals<string & { __brand: "x" }, string & { __brand: "x" }>>();
});

Deno.test("Equals - function types", () => {
  assertType<Equals<() => void, () => void>>();
  assertType<Equals<(x: string) => number, (x: string) => number>>();
});

// === Runtime verification that Equals produces correct boolean types ===
// These use the type system to assign Equals results to typed variables.

Deno.test("Equals - different types produce false", () => {
  // Each of these would cause a compile error if passed to assertType<>(),
  // confirming they are `false`. We verify at runtime by checking the
  // type-level result via conditional assignment.
  const _a: Equals<string, number> = false;
  const _b: Equals<string, boolean> = false;
  const _c: Equals<string, string | number> = false;
  const _d: Equals<{ a: string }, { a: number }> = false;
  const _e: Equals<{ a: string }, { a: string; b: number }> = false;
  const _f: Equals<readonly string[], string[]> = false;
  const _g: Equals<{ readonly x: string }, { x: string }> = false;
  const _h: Equals<{ x?: string }, { x: string }> = false;
  const _i: Equals<[string], [string, number]> = false;
  const _j: Equals<string, never> = false;
  const _k: Equals<unknown, string> = false;
  // deno-lint-ignore no-explicit-any
  const _l: Equals<any, string> = false;
  const _m: Equals<42, number> = false;
  const _n: Equals<"hello", string> = false;

  // Runtime sanity — all false values are indeed false
  assert(_a === false);
  assert(_b === false);
  assert(_c === false);
  assert(_d === false);
  assert(_e === false);
  assert(_f === false);
  assert(_g === false);
  assert(_h === false);
  assert(_i === false);
  assert(_j === false);
  assert(_k === false);
  assert(_l === false);
  assert(_m === false);
  assert(_n === false);
});

Deno.test("Equals - supertype/subtype relationships produce false", () => {
  // These are structurally compatible but NOT equal
  const _a: Equals<string, string | number> = false;
  const _b: Equals<{ a: string }, Record<string, string>> = false;
  const _c: Equals<"hello", string> = false;
  const _d: Equals<never, string> = false;

  assert(_a === false);
  assert(_b === false);
  assert(_c === false);
  assert(_d === false);
});

Deno.test("assertType - returns void for true", () => {
  const result = assertType<true>();
  assert(result === undefined);
});
