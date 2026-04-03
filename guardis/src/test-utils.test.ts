import { assert } from "@std/assert";
import { type Equals, assertType } from "./test-utils.ts";

Deno.test("Equals", async (t) => {
  await t.step("identical types are true", async (t) => {
    await t.step("primitive types", () => {
      assertType<Equals<string, string>>();
      assertType<Equals<number, number>>();
      assertType<Equals<boolean, boolean>>();
      assertType<Equals<null, null>>();
      assertType<Equals<undefined, undefined>>();
      assertType<Equals<void, void>>();
      assertType<Equals<never, never>>();
      assertType<Equals<unknown, unknown>>();
    });

    await t.step("literal types", () => {
      assertType<Equals<"hello", "hello">>();
      assertType<Equals<42, 42>>();
      assertType<Equals<true, true>>();
    });

    await t.step("object types", () => {
      assertType<Equals<{ a: string }, { a: string }>>();
      assertType<Equals<{ a: string; b: number }, { a: string; b: number }>>();
      assertType<Equals<{ readonly x: string }, { readonly x: string }>>();
      assertType<Equals<{ x?: string }, { x?: string }>>();
    });

    await t.step("array and tuple types", () => {
      assertType<Equals<[], []>>();
      assertType<Equals<[string, number], [string, number]>>();
      assertType<Equals<string[], string[]>>();
    });

    await t.step("union and intersection types", () => {
      assertType<Equals<string | number, string | number>>();
      assertType<Equals<string & { __brand: "x" }, string & { __brand: "x" }>>();
    });

    await t.step("function types", () => {
      assertType<Equals<() => void, () => void>>();
      assertType<Equals<(x: string) => number, (x: string) => number>>();
    });
  });

  await t.step("different types produce false", async (t) => {
    await t.step("primitive mismatches", () => {
      const _a: Equals<string, number> = false;
      const _b: Equals<string, boolean> = false;
      assert(_a === false);
      assert(_b === false);
    });

    await t.step("union vs base type", () => {
      const _a: Equals<string, string | number> = false;
      assert(_a === false);
    });

    await t.step("object type mismatches", () => {
      const _a: Equals<{ a: string }, { a: number }> = false;
      const _b: Equals<{ a: string }, { a: string; b: number }> = false;
      assert(_a === false);
      assert(_b === false);
    });

    await t.step("modifier mismatches", () => {
      const _a: Equals<readonly string[], string[]> = false;
      const _b: Equals<{ readonly x: string }, { x: string }> = false;
      const _c: Equals<{ x?: string }, { x: string }> = false;
      assert(_a === false);
      assert(_b === false);
      assert(_c === false);
    });

    await t.step("tuple length mismatches", () => {
      const _a: Equals<[string], [string, number]> = false;
      assert(_a === false);
    });

    await t.step("special type mismatches", () => {
      const _a: Equals<string, never> = false;
      const _b: Equals<unknown, string> = false;
      // deno-lint-ignore no-explicit-any
      const _c: Equals<any, string> = false;
      assert(_a === false);
      assert(_b === false);
      assert(_c === false);
    });

    await t.step("literal vs widened type", () => {
      const _a: Equals<42, number> = false;
      const _b: Equals<"hello", string> = false;
      assert(_a === false);
      assert(_b === false);
    });
  });

  await t.step("supertype/subtype relationships produce false", () => {
    const _a: Equals<string, string | number> = false;
    const _b: Equals<{ a: string }, Record<string, string>> = false;
    const _c: Equals<"hello", string> = false;
    const _d: Equals<never, string> = false;
    assert(_a === false);
    assert(_b === false);
    assert(_c === false);
    assert(_d === false);
  });
});

Deno.test("assertType - returns void for true", () => {
  const result = assertType<true>();
  assert(result === undefined);
});
