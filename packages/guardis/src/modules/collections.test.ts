import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { isMap, isSet, isTuple } from "./collections.ts";
import { isBoolean, isNumber, isString } from "./primitives.ts";

// Standard test values, mirroring primitives.test.ts's TEST_VALUES for the
// specific fixtures these tests need.
const TEST_VALUES = {
  string: "test",
  object: { a: 1, b: "test" },
  array: [1, 2, 3],
  nullValue: null,
  undefinedValue: undefined,
} as const;

Deno.test("isTuple", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isTuple([], 0));
    assert(isTuple([1], 1));
    assert(isTuple([1, 2], 2));
    assert(isTuple([1, 2, 3], 3));
    assert(isTuple(TEST_VALUES.array, 3)); // [1, 2, 3] has length 3

    // Invalid inputs
    assertFalse(isTuple([1, 2], 3)); // Wrong length
    assertFalse(isTuple([1, 2, 3], 2)); // Wrong length
    assertFalse(isTuple(TEST_VALUES.object, 0)); // Not an array
    assertFalse(isTuple(TEST_VALUES.string, 4)); // Not an array
    assertFalse(isTuple(TEST_VALUES.nullValue, 0));
    assertFalse(isTuple(TEST_VALUES.undefinedValue, 0));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isTuple.strict([], 0);
    isTuple.strict([1, 2], 2);
    isTuple.strict(TEST_VALUES.array, 3);

    // Invalid inputs throw
    assertThrows(() => isTuple.strict([1, 2], 3));
    assertThrows(() => isTuple.strict(TEST_VALUES.object, 0));
    assertThrows(() => isTuple.strict(TEST_VALUES.nullValue, 0));
  });

  await t.step("assert mode", () => {
    const assertIsTuple: typeof isTuple.assert = isTuple.assert;

    // Valid inputs don't throw
    assertIsTuple([], 0);
    assertIsTuple([1, 2], 2);
    assertIsTuple(TEST_VALUES.array, 3);

    // Invalid inputs throw
    assertThrows(() => assertIsTuple([1, 2], 3));
    assertThrows(() => assertIsTuple(TEST_VALUES.object, 0));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isTuple.optional([], 0));
    assert(isTuple.optional([1, 2], 2));
    assert(isTuple.optional(TEST_VALUES.undefinedValue, 5));

    // Invalid inputs
    assertFalse(isTuple.optional([1, 2], 3));
    assertFalse(isTuple.optional(TEST_VALUES.object, 0));
    assertFalse(isTuple.optional(TEST_VALUES.nullValue, 0));
  });
});

Deno.test("isMap", async (t) => {
  await t.step("accepts Map instances", () => {
    assert(isMap(new Map()));
    assert(isMap(new Map([["a", 1]])));
    assert(isMap(new Map<number, string>([[1, "a"]])));
  });

  await t.step("rejects non-Map values", () => {
    assertFalse(isMap({}));
    assertFalse(isMap([]));
    assertFalse(isMap(new Set()));
    assertFalse(isMap("map"));
    assertFalse(isMap(null));
    assertFalse(isMap(undefined));
  });

  await t.step(".of() validates key and value types", () => {
    const isStrToNum = isMap.of(isString, isNumber);
    assert(isStrToNum(new Map([["a", 1], ["b", 2]])));
    assertFalse(isStrToNum(new Map<unknown, unknown>([[1, 1]]))); // bad key
    assertFalse(isStrToNum(new Map<unknown, unknown>([["a", "b"]]))); // bad value
    assert(isStrToNum(new Map())); // empty matches
  });

  await t.step(".of() produces descriptive name", () => {
    const isStrToNum = isMap.of(isString, isNumber);
    assertEquals(isStrToNum._.name, "Map<string, number>");
  });

  await t.step("validate() with .of reports path for bad entries", () => {
    const isStrToNum = isMap.of(isString, isNumber);
    const result = isStrToNum.validate(new Map<unknown, unknown>([["a", 1], ["b", "nope"]]));
    assert("issues" in result);
    assert(result.issues!.length > 0);
  });

  await t.step("supports the full guard API", () => {
    isMap.strict(new Map());
    assertThrows(() => isMap.strict({}));
    assert(isMap.optional(undefined));
    assertFalse(isMap.optional({}));
  });

  await t.step(".of() returns a plain TypeGuard (no further .of chaining)", () => {
    const typed = isMap.of(isString, isNumber);
    // Runtime check: the returned guard does not carry .of forward
    assertFalse("of" in typed);
  });

  await t.step(".of() wraps union key/value names in parens", () => {
    const isUnionKey = isString.or(isNumber);
    const guard = isMap.of(isUnionKey, isBoolean);
    assertEquals(guard._.name, "Map<(string | number), boolean>");
  });
});

Deno.test("isSet", async (t) => {
  await t.step("accepts Set instances", () => {
    assert(isSet(new Set()));
    assert(isSet(new Set([1, 2, 3])));
  });

  await t.step("rejects non-Set values", () => {
    assertFalse(isSet([1, 2, 3]));
    assertFalse(isSet({}));
    assertFalse(isSet(new Map()));
    assertFalse(isSet(null));
    assertFalse(isSet(undefined));
  });

  await t.step(".of() validates element types", () => {
    const isStringSet = isSet.of(isString);
    assert(isStringSet(new Set(["a", "b"])));
    assertFalse(isStringSet(new Set([1, 2])));
    assertFalse(isStringSet(new Set<unknown>(["a", 1])));
    assert(isStringSet(new Set())); // empty matches
  });

  await t.step(".of() produces descriptive name", () => {
    const isStringSet = isSet.of(isString);
    assertEquals(isStringSet._.name, "Set<string>");
  });

  await t.step("supports the full guard API", () => {
    isSet.strict(new Set());
    assertThrows(() => isSet.strict({}));
    assert(isSet.optional(undefined));
    assertFalse(isSet.optional({}));
  });

  await t.step(".of() returns a plain TypeGuard (no further .of chaining)", () => {
    const typed = isSet.of(isString);
    // Runtime check: the returned guard does not carry .of forward
    assertFalse("of" in typed);
  });

  await t.step(".of() wraps union element names in parens", () => {
    const guard = isSet.of(isString.or(isNumber));
    assertEquals(guard._.name, "Set<(string | number)>");
  });
});
