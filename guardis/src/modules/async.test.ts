import { assert, assertFalse, assertThrows } from "@std/assert";
import { isAsyncFunction, isPromise, isPromiseLike, isThenable } from "./async.ts";

// Standard test values for consistency across all type guard tests
const TEST_VALUES = {
  // Async-specific values
  asyncFunction: async () => {},
  // deno-lint-ignore require-await
  asyncFunctionWithArgs: async (a: number, b: string) => a + b,
  promise: Promise.resolve(42),
  thenable: {
    then: (resolve: (value: string) => void) => resolve("test"),
  },
  thenableWithCatch: {
    then: (resolve: (value: string) => void) => resolve("test"),
    catch: (reject: (reason: Error) => void) => reject(new Error("test")),
  },

  // Common primitive values
  string: "test",
  emptyString: "",
  number: 42,
  zero: 0,
  boolean: true,
  booleanFalse: false,
  nullValue: null,
  undefinedValue: undefined,

  // Complex values
  object: { a: 1, b: "test" },
  objectWithThen: { then: "not a function" },
  array: [1, 2, 3],
  function: () => {},
  regularFunction: function () {},
} as const;

Deno.test("isAsyncFunction", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isAsyncFunction(TEST_VALUES.asyncFunction));
    assert(isAsyncFunction(TEST_VALUES.asyncFunctionWithArgs));
    // deno-lint-ignore require-await
    assert(isAsyncFunction(async () => Promise.resolve()));

    // Invalid inputs
    assertFalse(isAsyncFunction(TEST_VALUES.function));
    assertFalse(isAsyncFunction(TEST_VALUES.regularFunction));
    assertFalse(isAsyncFunction(TEST_VALUES.promise));
    assertFalse(isAsyncFunction(TEST_VALUES.string));
    assertFalse(isAsyncFunction(TEST_VALUES.number));
    assertFalse(isAsyncFunction(TEST_VALUES.boolean));
    assertFalse(isAsyncFunction(TEST_VALUES.nullValue));
    assertFalse(isAsyncFunction(TEST_VALUES.undefinedValue));
    assertFalse(isAsyncFunction(TEST_VALUES.object));
    assertFalse(isAsyncFunction(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isAsyncFunction.strict(TEST_VALUES.asyncFunction);
    isAsyncFunction.strict(async () => {});

    // Invalid inputs throw
    assertThrows(() => isAsyncFunction.strict(TEST_VALUES.function));
    assertThrows(() => isAsyncFunction.strict(TEST_VALUES.promise));
    assertThrows(() => isAsyncFunction.strict(TEST_VALUES.string));
    assertThrows(() => isAsyncFunction.strict(TEST_VALUES.nullValue));
    assertThrows(() => isAsyncFunction.strict(TEST_VALUES.undefinedValue));
  });

  await t.step("assert mode", () => {
    const assertIsAsyncFunction: typeof isAsyncFunction.assert = isAsyncFunction.assert;

    // Valid inputs don't throw
    assertIsAsyncFunction(TEST_VALUES.asyncFunction);
    assertIsAsyncFunction(async () => {});

    // Invalid inputs throw
    assertThrows(() => assertIsAsyncFunction(TEST_VALUES.function));
    assertThrows(() => assertIsAsyncFunction(TEST_VALUES.promise));
    assertThrows(() => assertIsAsyncFunction(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isAsyncFunction.optional(TEST_VALUES.asyncFunction));
    assert(isAsyncFunction.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isAsyncFunction.optional(TEST_VALUES.function));
    assertFalse(isAsyncFunction.optional(TEST_VALUES.promise));
    assertFalse(isAsyncFunction.optional(TEST_VALUES.nullValue));
  });
});

Deno.test("isPromise", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isPromise(TEST_VALUES.promise));
    assert(isPromise(Promise.resolve("test")));
    assert(isPromise(Promise.reject(new Error("test")).catch(() => {})));
    assert(isPromise(new Promise((resolve) => resolve(42))));

    // Invalid inputs
    assertFalse(isPromise(TEST_VALUES.asyncFunction));
    assertFalse(isPromise(TEST_VALUES.thenable));
    assertFalse(isPromise(TEST_VALUES.thenableWithCatch));
    assertFalse(isPromise(TEST_VALUES.string));
    assertFalse(isPromise(TEST_VALUES.number));
    assertFalse(isPromise(TEST_VALUES.boolean));
    assertFalse(isPromise(TEST_VALUES.nullValue));
    assertFalse(isPromise(TEST_VALUES.undefinedValue));
    assertFalse(isPromise(TEST_VALUES.object));
    assertFalse(isPromise(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isPromise.strict(TEST_VALUES.promise);
    isPromise.strict(Promise.resolve("test"));

    // Invalid inputs throw
    assertThrows(() => isPromise.strict(TEST_VALUES.asyncFunction));
    assertThrows(() => isPromise.strict(TEST_VALUES.thenable));
    assertThrows(() => isPromise.strict(TEST_VALUES.string));
    assertThrows(() => isPromise.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsPromise: typeof isPromise.assert = isPromise.assert;

    // Valid inputs don't throw
    assertIsPromise(TEST_VALUES.promise);
    assertIsPromise(Promise.resolve("test"));

    // Invalid inputs throw
    assertThrows(() => assertIsPromise(TEST_VALUES.asyncFunction));
    assertThrows(() => assertIsPromise(TEST_VALUES.thenable));
    assertThrows(() => assertIsPromise(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isPromise.optional(TEST_VALUES.promise));
    assert(isPromise.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isPromise.optional(TEST_VALUES.asyncFunction));
    assertFalse(isPromise.optional(TEST_VALUES.thenable));
    assertFalse(isPromise.optional(TEST_VALUES.nullValue));
  });
});

Deno.test("isPromiseLike", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isPromiseLike(TEST_VALUES.promise));
    assert(isPromiseLike(TEST_VALUES.thenable));
    assert(isPromiseLike(TEST_VALUES.thenableWithCatch));
    assert(isPromiseLike(Promise.resolve("test")));
    assert(isPromiseLike({ then: () => {} }));

    // Invalid inputs
    assertFalse(isPromiseLike(TEST_VALUES.asyncFunction));
    assertFalse(isPromiseLike(TEST_VALUES.objectWithThen));
    assertFalse(isPromiseLike(TEST_VALUES.string));
    assertFalse(isPromiseLike(TEST_VALUES.number));
    assertFalse(isPromiseLike(TEST_VALUES.boolean));
    assertFalse(isPromiseLike(TEST_VALUES.nullValue));
    assertFalse(isPromiseLike(TEST_VALUES.undefinedValue));
    assertFalse(isPromiseLike(TEST_VALUES.object));
    assertFalse(isPromiseLike(TEST_VALUES.array));
    assertFalse(isPromiseLike(TEST_VALUES.function));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isPromiseLike.strict(TEST_VALUES.promise);
    isPromiseLike.strict(TEST_VALUES.thenable);
    isPromiseLike.strict(TEST_VALUES.thenableWithCatch);

    // Invalid inputs throw
    assertThrows(() => isPromiseLike.strict(TEST_VALUES.asyncFunction));
    assertThrows(() => isPromiseLike.strict(TEST_VALUES.objectWithThen));
    assertThrows(() => isPromiseLike.strict(TEST_VALUES.string));
    assertThrows(() => isPromiseLike.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsPromiseLike: typeof isPromiseLike.assert = isPromiseLike.assert;

    // Valid inputs don't throw
    assertIsPromiseLike(TEST_VALUES.promise);
    assertIsPromiseLike(TEST_VALUES.thenable);

    // Invalid inputs throw
    assertThrows(() => assertIsPromiseLike(TEST_VALUES.asyncFunction));
    assertThrows(() => assertIsPromiseLike(TEST_VALUES.objectWithThen));
    assertThrows(() => assertIsPromiseLike(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isPromiseLike.optional(TEST_VALUES.promise));
    assert(isPromiseLike.optional(TEST_VALUES.thenable));
    assert(isPromiseLike.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isPromiseLike.optional(TEST_VALUES.asyncFunction));
    assertFalse(isPromiseLike.optional(TEST_VALUES.objectWithThen));
    assertFalse(isPromiseLike.optional(TEST_VALUES.nullValue));
  });
});

Deno.test("isThenable", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs (should behave exactly like isPromiseLike)
    assert(isThenable(TEST_VALUES.promise));
    assert(isThenable(TEST_VALUES.thenable));
    assert(isThenable(TEST_VALUES.thenableWithCatch));
    assert(isThenable(Promise.resolve("test")));
    assert(isThenable({ then: () => {} }));

    // Invalid inputs
    assertFalse(isThenable(TEST_VALUES.asyncFunction));
    assertFalse(isThenable(TEST_VALUES.objectWithThen));
    assertFalse(isThenable(TEST_VALUES.string));
    assertFalse(isThenable(TEST_VALUES.number));
    assertFalse(isThenable(TEST_VALUES.boolean));
    assertFalse(isThenable(TEST_VALUES.nullValue));
    assertFalse(isThenable(TEST_VALUES.undefinedValue));
    assertFalse(isThenable(TEST_VALUES.object));
    assertFalse(isThenable(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isThenable.strict(TEST_VALUES.promise);
    isThenable.strict(TEST_VALUES.thenable);

    // Invalid inputs throw
    assertThrows(() => isThenable.strict(TEST_VALUES.asyncFunction));
    assertThrows(() => isThenable.strict(TEST_VALUES.objectWithThen));
    assertThrows(() => isThenable.strict(TEST_VALUES.string));
    assertThrows(() => isThenable.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsThenable: typeof isThenable.assert = isThenable.assert;

    // Valid inputs don't throw
    assertIsThenable(TEST_VALUES.promise);
    assertIsThenable(TEST_VALUES.thenable);

    // Invalid inputs throw
    assertThrows(() => assertIsThenable(TEST_VALUES.asyncFunction));
    assertThrows(() => assertIsThenable(TEST_VALUES.objectWithThen));
    assertThrows(() => assertIsThenable(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isThenable.optional(TEST_VALUES.promise));
    assert(isThenable.optional(TEST_VALUES.thenable));
    assert(isThenable.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isThenable.optional(TEST_VALUES.asyncFunction));
    assertFalse(isThenable.optional(TEST_VALUES.objectWithThen));
    assertFalse(isThenable.optional(TEST_VALUES.nullValue));
  });
});
