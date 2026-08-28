import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { createTypeGuard } from "../guard.ts";
import { assertType, type Equals } from "../test-utils.ts";
import { isArray, isMap, isSet, isTuple } from "./collections.ts";
import { isBoolean, isNull, isNumber, isObject, isString } from "./primitives.ts";

// Standard test values, mirroring primitives.test.ts's TEST_VALUES for the
// specific fixtures these tests need.
const TEST_VALUES = {
  string: "test",
  object: { a: 1, b: "test" },
  emptyObject: {},
  array: [1, 2, 3],
  emptyArray: [],
  boolean: true,
  number: 42,
  zero: 0,
  infinity: Infinity,
  nan: NaN,
  function: () => {},
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

  await t.step(".of() result has no further .of chaining", () => {
    const typed = isMap.of(isString, isNumber);
    // Runtime check: the returned guard does not carry .of forward
    assertFalse("of" in typed);
  });

  await t.step(".of() wraps union key/value names in parens", () => {
    const isUnionKey = isString.or(isNumber);
    const guard = isMap.of(isUnionKey, isBoolean);
    assertEquals(guard._.name, "Map<(string | number), boolean>");
  });

  await t.step(".min()/.max()/.ofSize()/.range() validate entry count", () => {
    const twoEntries = new Map([["a", 1], ["b", 2]]);

    assert(isMap.min(2)(twoEntries));
    assertFalse(isMap.min(3)(twoEntries));
    assert(isMap.max(2)(twoEntries));
    assertFalse(isMap.max(1)(twoEntries));
    assert(isMap.ofSize(2)(twoEntries));
    assertFalse(isMap.ofSize(3)(twoEntries));
    assert(isMap.range(1, 3)(twoEntries));
    assertFalse(isMap.range(3, 5)(twoEntries));
  });

  await t.step(".of() survives every size-method chain (regression)", () => {
    // Same class of bug isArray had: .of() built via a fresh .extend() call
    // at each step, so a naive implementation only keeps .of() on the
    // original guard. min/max/ofSize/range must all still lead to a
    // working .of() -- see utilities.ts's withSizeMethods doc.
    assert(isMap.min(1).of(isString, isNumber)(new Map([["a", 1]])));
    assert(isMap.max(3).of(isString, isNumber)(new Map([["a", 1]])));
    assert(isMap.ofSize(1).of(isString, isNumber)(new Map([["a", 1]])));
    assert(isMap.range(1, 3).of(isString, isNumber)(new Map([["a", 1]])));
    assertFalse(isMap.max(3).of(isString, isNumber)(new Map<unknown, unknown>([[1, "a"]])));
  });

  await t.step("a size constraint chained before .of() still holds after it (regression)", () => {
    // .of() used to validate against a bare "is a Map" check, not `guard`,
    // so isMap.min(2).of(...) accepted a 1-entry map.
    const atLeastTwo = isMap.min(2).of(isString, isNumber);
    assertFalse(atLeastTwo(new Map([["a", 1]])));
    assert(atLeastTwo(new Map([["a", 1], ["b", 2]])));

    const atMostOne = isMap.max(1).of(isString, isNumber);
    assert(atMostOne(new Map([["a", 1]])));
    assertFalse(atMostOne(new Map([["a", 1], ["b", 2]])));

    const exactlyOne = isMap.ofSize(1).of(isString, isNumber);
    assert(exactlyOne(new Map([["a", 1]])));
    assertFalse(exactlyOne(new Map([["a", 1], ["b", 2]])));
  });

  await t.step("ofSize/min/max/range keep .of() but not each other", () => {
    const sized = isMap.ofSize(2);
    // @ts-expect-error ofSize's result carries no further size methods
    sized.ofSize(3);
    // @ts-expect-error ofSize's result carries no further size methods
    sized.min(1);
    sized.of(isString, isNumber); // .of() stays reachable

    const ranged = isMap.range(1, 3);
    // @ts-expect-error range's result carries no further size methods
    ranged.range(2, 4);
    ranged.of(isString, isNumber);

    const between = isMap.min(1).max(5);
    // @ts-expect-error min/max keep each other but not ofSize
    between.ofSize(2);
    between.of(isString, isNumber);
  });

  await t.step("ofSize()/range()'s .of() is itself terminal (regression)", () => {
    // isMap.ofSize(3).of(...).ofSize(4) used to still type-check, silently
    // re-opening an already-fixed size constraint (unlike min()/max(), see
    // the deep-chain test below, which stay chainable through .of()).
    const isExactlyThree = isMap.ofSize(3).of(isString, isNumber);
    // @ts-expect-error ofSize().of()'s result has no size methods at all
    isExactlyThree.ofSize(4);
    assert(isExactlyThree(new Map([["a", 1], ["b", 2], ["c", 3]])));
    assertFalse(isExactlyThree(new Map([["a", 1]])));

    const isRangedThenTyped = isMap.range(1, 3).of(isString, isNumber);
    // @ts-expect-error range().of()'s result has no size methods at all
    isRangedThenTyped.min(1);
  });

  await t.step(".of() results chain size methods but not further .of()", () => {
    const isStrToNumOfSize2 = isMap.of(isString, isNumber).ofSize(2);
    assert(isStrToNumOfSize2(new Map([["a", 1], ["b", 2]])));
    assertFalse(isStrToNumOfSize2(new Map([["a", 1]])));
    assertFalse("of" in isStrToNumOfSize2);
  });

  await t.step("deep chain: min/max/of/ofSize all compose", () => {
    const guard = isMap.min(1).max(5).of(isString, isNumber).ofSize(2);
    assert(guard(new Map([["a", 1], ["b", 2]])));
    assertFalse(guard(new Map([["a", 1]])));
    assertFalse(guard(new Map<unknown, unknown>([[1, "a"], [2, "b"]])));
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

  await t.step(".of() result has no further .of chaining", () => {
    const typed = isSet.of(isString);
    // Runtime check: the returned guard does not carry .of forward
    assertFalse("of" in typed);
  });

  await t.step(".of() wraps union element names in parens", () => {
    const guard = isSet.of(isString.or(isNumber));
    assertEquals(guard._.name, "Set<(string | number)>");
  });

  await t.step(".min()/.max()/.ofSize()/.range() validate element count", () => {
    const twoElements = new Set(["a", "b"]);

    assert(isSet.min(2)(twoElements));
    assertFalse(isSet.min(3)(twoElements));
    assert(isSet.max(2)(twoElements));
    assertFalse(isSet.max(1)(twoElements));
    assert(isSet.ofSize(2)(twoElements));
    assertFalse(isSet.ofSize(3)(twoElements));
    assert(isSet.range(1, 3)(twoElements));
    assertFalse(isSet.range(3, 5)(twoElements));
  });

  await t.step(".of() survives every size-method chain (regression)", () => {
    // Same class of bug isArray had -- see isMap's equivalent step's doc.
    assert(isSet.min(1).of(isString)(new Set(["a"])));
    assert(isSet.max(3).of(isString)(new Set(["a"])));
    assert(isSet.ofSize(1).of(isString)(new Set(["a"])));
    assert(isSet.range(1, 3).of(isString)(new Set(["a"])));
    assertFalse(isSet.max(3).of(isString)(new Set([1])));
  });

  await t.step("a size constraint chained before .of() still holds after it (regression)", () => {
    // Same class of bug as isMap's equivalent step above.
    const atLeastTwo = isSet.min(2).of(isString);
    assertFalse(atLeastTwo(new Set(["a"])));
    assert(atLeastTwo(new Set(["a", "b"])));

    const atMostOne = isSet.max(1).of(isString);
    assert(atMostOne(new Set(["a"])));
    assertFalse(atMostOne(new Set(["a", "b"])));

    const exactlyOne = isSet.ofSize(1).of(isString);
    assert(exactlyOne(new Set(["a"])));
    assertFalse(exactlyOne(new Set(["a", "b"])));
  });

  await t.step("ofSize/min/max/range keep .of() but not each other", () => {
    const sized = isSet.ofSize(2);
    // @ts-expect-error ofSize's result carries no further size methods
    sized.ofSize(3);
    // @ts-expect-error ofSize's result carries no further size methods
    sized.min(1);
    sized.of(isString); // .of() stays reachable

    const ranged = isSet.range(1, 3);
    // @ts-expect-error range's result carries no further size methods
    ranged.range(2, 4);
    ranged.of(isString);

    const between = isSet.min(1).max(5);
    // @ts-expect-error min/max keep each other but not ofSize
    between.ofSize(2);
    between.of(isString);
  });

  await t.step("ofSize()/range()'s .of() is itself terminal (regression)", () => {
    // isSet.ofSize(3).of(...).ofSize(4) used to still type-check, silently
    // re-opening an already-fixed size constraint (unlike min()/max(), see
    // the deep-chain test below, which stay chainable through .of()).
    const isExactlyThree = isSet.ofSize(3).of(isNumber);
    // @ts-expect-error ofSize().of()'s result has no size methods at all
    isExactlyThree.ofSize(4);
    assert(isExactlyThree(new Set([1, 2, 3])));
    assertFalse(isExactlyThree(new Set([1])));

    const isRangedThenTyped = isSet.range(1, 3).of(isNumber);
    // @ts-expect-error range().of()'s result has no size methods at all
    isRangedThenTyped.min(1);
  });

  await t.step(".of() results chain size methods but not further .of()", () => {
    const isStringSetOfSize2 = isSet.of(isString).ofSize(2);
    assert(isStringSetOfSize2(new Set(["a", "b"])));
    assertFalse(isStringSetOfSize2(new Set(["a"])));
    assertFalse("of" in isStringSetOfSize2);
  });

  await t.step("deep chain: min/max/of/ofSize all compose", () => {
    const guard = isSet.min(1).max(5).of(isString).ofSize(2);
    assert(guard(new Set(["a", "b"])));
    assertFalse(guard(new Set(["a"])));
    assertFalse(guard(new Set([1, 2])));
  });
});

Deno.test("isArray", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isArray(TEST_VALUES.array));
    assert(isArray(TEST_VALUES.emptyArray));
    assert(isArray(new Array(5)));

    // Invalid inputs
    assertFalse(isArray(TEST_VALUES.object));
    assertFalse(isArray(TEST_VALUES.string));
    assertFalse(isArray(TEST_VALUES.number));
    assertFalse(isArray(TEST_VALUES.boolean));
    assertFalse(isArray(TEST_VALUES.nullValue));
    assertFalse(isArray(TEST_VALUES.undefinedValue));
    assertFalse(isArray(TEST_VALUES.function));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isArray.strict(TEST_VALUES.array);
    isArray.strict(TEST_VALUES.emptyArray);

    // Invalid inputs throw
    assertThrows(() => isArray.strict(TEST_VALUES.object));
    assertThrows(() => isArray.strict(TEST_VALUES.string));
    assertThrows(() => isArray.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsArray: typeof isArray.assert = isArray.assert;

    // Valid inputs don't throw
    assertIsArray(TEST_VALUES.array);
    assertIsArray(TEST_VALUES.emptyArray);

    // Invalid inputs throw
    assertThrows(() => assertIsArray(TEST_VALUES.object));
    assertThrows(() => assertIsArray(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isArray.optional(TEST_VALUES.array));
    assert(isArray.optional(TEST_VALUES.emptyArray));
    assert(isArray.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isArray.optional(TEST_VALUES.object));
    assertFalse(isArray.optional(TEST_VALUES.nullValue));
  });

  await t.step("notEmpty mode", () => {
    // Valid inputs
    assert(isArray.notEmpty(TEST_VALUES.array));

    // Invalid inputs (empty array is considered empty)
    assertFalse(isArray.notEmpty(TEST_VALUES.emptyArray));
    assertFalse(isArray.notEmpty(TEST_VALUES.object));
    assertFalse(isArray.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isArray.notEmpty(TEST_VALUES.undefinedValue));
  });

  await t.step("optional.notEmpty mode", () => {
    // Valid inputs
    assert(isArray.optional.notEmpty(TEST_VALUES.array));
    assert(isArray.optional.notEmpty(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isArray.optional.notEmpty(TEST_VALUES.emptyArray));
    assertFalse(isArray.optional.notEmpty(TEST_VALUES.object));
    assertFalse(isArray.optional.notEmpty(TEST_VALUES.nullValue));
  });

  await t.step("notEmpty.optional mode", () => {
    // Valid inputs
    assert(isArray.notEmpty.optional(TEST_VALUES.array));
    assert(isArray.notEmpty.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isArray.notEmpty.optional(TEST_VALUES.emptyArray));
    assertFalse(isArray.notEmpty.optional(TEST_VALUES.object));
    assertFalse(isArray.notEmpty.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isArray.validate([1, 2, 3]), { value: [1, 2, 3] });
    assertEquals(isArray.validate([]), { value: [] });

    // Invalid inputs return issues with specific error message
    assertEquals(isArray.validate({ a: 1 }), {
      issues: [{ message: 'Expected array. Received: {"a":1}' }],
    });
    assertEquals(isArray.validate("array"), {
      issues: [{ message: "Expected array. Received: 'array'" }],
    });
    assertEquals(isArray.validate(null), {
      issues: [{ message: "Expected array. Received: null" }],
    });
  });

  await t.step("notEmpty.validate method", () => {
    // Valid inputs return value
    assertEquals(isArray.notEmpty.validate([1, 2, 3]), { value: [1, 2, 3] });

    // Invalid inputs return issues with specific error message
    assertEquals(isArray.notEmpty.validate([]), {
      issues: [{ message: "Expected non-empty array. Received: []" }],
    });
    assertEquals(isArray.notEmpty.validate("array"), {
      issues: [{ message: "Expected non-empty array. Received: 'array'" }],
    });
  });
});

Deno.test("isArray.of", async (t) => {
  await t.step("basic functionality - array of strings", () => {
    const isStringArray = isArray.of(isString);

    // Valid inputs
    assert(isStringArray(["hello"]));
    assert(isStringArray(["a", "b", "c"]));
    assert(isStringArray(TEST_VALUES.emptyArray)); // Empty arrays are valid
    assert(isStringArray(["test", "another", "string"]));

    // Invalid inputs - mixed types
    assertFalse(isStringArray([1, 2, 3]));
    assertFalse(isStringArray(["string", 123]));
    assertFalse(isStringArray([true, false]));
    assertFalse(isStringArray([null]));
    assertFalse(isStringArray([TEST_VALUES.object]));

    // Invalid inputs - not arrays
    assertFalse(isStringArray(TEST_VALUES.string));
    assertFalse(isStringArray(TEST_VALUES.object));
    assertFalse(isStringArray(TEST_VALUES.nullValue));
    assertFalse(isStringArray(TEST_VALUES.undefinedValue));
  });

  await t.step("basic functionality - array of numbers", () => {
    const isNumberArray = isArray.of(isNumber);

    // Valid inputs
    assert(isNumberArray([1, 2, 3]));
    assert(isNumberArray([TEST_VALUES.zero]));
    assert(isNumberArray([3.14, 2.71, 1.41]));
    assert(isNumberArray([TEST_VALUES.infinity]));
    assert(isNumberArray(TEST_VALUES.emptyArray));

    // Invalid inputs - mixed types
    assertFalse(isNumberArray(["1", "2", "3"]));
    assertFalse(isNumberArray([1, "2", 3]));
    assertFalse(isNumberArray([TEST_VALUES.nan])); // NaN is not a valid number in isNumber
    assertFalse(isNumberArray([true, false]));

    // Invalid inputs - not arrays
    assertFalse(isNumberArray(TEST_VALUES.number));
    assertFalse(isNumberArray(TEST_VALUES.string));
  });

  await t.step("basic functionality - array of booleans", () => {
    const isBooleanArray = isArray.of(isBoolean);

    // Valid inputs
    assert(isBooleanArray([true, false]));
    assert(isBooleanArray([TEST_VALUES.boolean]));
    assert(isBooleanArray([false, false, true]));
    assert(isBooleanArray(TEST_VALUES.emptyArray));

    // Invalid inputs
    assertFalse(isBooleanArray([1, 0]));
    assertFalse(isBooleanArray(["true", "false"]));
    assertFalse(isBooleanArray([true, "false"]));
  });

  await t.step("basic functionality - array of objects", () => {
    const isObjectArray = isArray.of(isObject);

    // Valid inputs
    assert(isObjectArray([TEST_VALUES.object]));
    assert(isObjectArray([{ a: 1 }, { b: 2 }]));
    assert(isObjectArray([TEST_VALUES.emptyObject]));
    assert(isObjectArray(TEST_VALUES.emptyArray));

    // Invalid inputs - arrays within array
    assertFalse(isObjectArray([[1, 2, 3]]));
    assertFalse(isObjectArray([TEST_VALUES.object, TEST_VALUES.array]));
    assertFalse(isObjectArray([{ a: 1 }, "string"]));
  });

  await t.step("basic functionality - nested arrays", () => {
    const isStringArray = isArray.of(isString);
    const isNestedStringArray = isArray.of(isStringArray);

    // Valid inputs
    assert(isNestedStringArray([["a", "b"], ["c", "d"]]));
    assert(isNestedStringArray([["hello"], ["world"]]));
    assert(isNestedStringArray([[]]));
    assert(isNestedStringArray(TEST_VALUES.emptyArray));

    // Invalid inputs
    assertFalse(isNestedStringArray([["a", "b"], [1, 2]]));
    assertFalse(isNestedStringArray([[1, 2, 3]]));
    assertFalse(isNestedStringArray(["not", "nested"]));
  });

  await t.step("basic functionality - with custom type guards", () => {
    // Custom type guard for positive numbers
    const isPositive = createTypeGuard<number>((val) => {
      if (typeof val !== "number" || val <= 0) return null;
      return val;
    });

    const isPositiveArray = isArray.of(isPositive);

    // Valid inputs
    assert(isPositiveArray([1, 2, 3]));
    assert(isPositiveArray([3.14, 2.71]));
    assert(isPositiveArray([100, 200, 300]));
    assert(isPositiveArray(TEST_VALUES.emptyArray));

    // Invalid inputs
    assertFalse(isPositiveArray([1, 2, 0]));
    assertFalse(isPositiveArray([-1, -2, -3]));
    assertFalse(isPositiveArray([1, -1]));
  });

  await t.step("strict mode", () => {
    const isStringArray = isArray.of(isString);

    // Valid inputs don't throw
    isStringArray.strict(["a", "b", "c"]);
    isStringArray.strict(TEST_VALUES.emptyArray);

    // Invalid inputs throw
    assertThrows(() => isStringArray.strict([1, 2, 3]));
    assertThrows(() => isStringArray.strict(["a", 1]));
    assertThrows(() => isStringArray.strict(TEST_VALUES.object));
    assertThrows(() => isStringArray.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const isNumberArray = isArray.of(isNumber);
    const assertIsNumberArray: typeof isNumberArray.assert = isNumberArray.assert;

    // Valid inputs don't throw
    assertIsNumberArray([1, 2, 3]);
    assertIsNumberArray(TEST_VALUES.emptyArray);

    // Invalid inputs throw
    assertThrows(() => assertIsNumberArray(["1", "2", "3"]));
    assertThrows(() => assertIsNumberArray([1, "2", 3]));
    assertThrows(() => assertIsNumberArray(TEST_VALUES.object));
  });

  await t.step("optional mode", () => {
    const isStringArray = isArray.of(isString);

    // Valid inputs
    assert(isStringArray.optional(["a", "b", "c"]));
    assert(isStringArray.optional(TEST_VALUES.emptyArray));
    assert(isStringArray.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isStringArray.optional([1, 2, 3]));
    assertFalse(isStringArray.optional(TEST_VALUES.nullValue));
  });

  await t.step("notEmpty mode", () => {
    const isStringArray = isArray.of(isString);

    // Valid inputs
    assert(isStringArray.notEmpty(["a", "b", "c"]));
    assert(isStringArray.notEmpty(["test"]));

    // Invalid inputs - empty array is considered empty
    assertFalse(isStringArray.notEmpty(TEST_VALUES.emptyArray));
    assertFalse(isStringArray.notEmpty([1, 2, 3]));
    assertFalse(isStringArray.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isStringArray.notEmpty(TEST_VALUES.undefinedValue));
  });

  await t.step("optional.notEmpty mode", () => {
    const isNumberArray = isArray.of(isNumber);

    // Valid inputs
    assert(isNumberArray.optional.notEmpty([1, 2, 3]));
    assert(isNumberArray.optional.notEmpty(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isNumberArray.optional.notEmpty(TEST_VALUES.emptyArray));
    assertFalse(isNumberArray.optional.notEmpty(["1", "2", "3"]));
    assertFalse(isNumberArray.optional.notEmpty(TEST_VALUES.nullValue));
  });

  await t.step("notEmpty.optional mode", () => {
    const isStringArray = isArray.of(isString);

    // Valid inputs
    assert(isStringArray.notEmpty.optional(["a", "b", "c"]));
    assert(isStringArray.notEmpty.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isStringArray.notEmpty.optional(TEST_VALUES.emptyArray));
    assertFalse(isStringArray.notEmpty.optional([1, 2, 3]));
    assertFalse(isStringArray.notEmpty.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method - StandardSchemaV1 compatibility", () => {
    const isStringArray = isArray.of(isString);

    // Valid inputs
    const validResult = isStringArray.validate(["a", "b", "c"]);
    assertEquals(validResult, { value: ["a", "b", "c"] });

    const emptyResult = isStringArray.validate(TEST_VALUES.emptyArray);
    assertEquals(emptyResult, { value: [] });

    // Invalid inputs - now include path to invalid element
    const invalidResult1 = isStringArray.validate([1, 2, 3]);
    assertEquals(invalidResult1, {
      issues: [{ message: "Expected string. Received: 1", path: [0] }],
    });

    const invalidResult2 = isStringArray.validate(["a", 1, "c"]);
    assertEquals(invalidResult2, {
      issues: [{ message: "Expected string. Received: 1", path: [1] }],
    });

    // Non-array input still has no path (fails at root level)
    const invalidResult3 = isStringArray.validate(TEST_VALUES.object);
    assertEquals(invalidResult3, {
      issues: [{ message: `Expected string[]. Received: ${JSON.stringify(TEST_VALUES.object)}` }],
    });
  });

  await t.step("complex scenario - array of specific object types", () => {
    // Create a type guard for person objects
    const isPerson = createTypeGuard<{ name: string; age: number }>((v, { has }) => {
      if (isObject(v) && has(v, "name", isString) && has(v, "age", isNumber)) {
        return v;
      }
      return null;
    });

    const isPeopleArray = isArray.of(isPerson);

    // Valid inputs
    assert(isPeopleArray([{ name: "Alice", age: 30 }]));
    assert(isPeopleArray([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]));
    assert(isPeopleArray(TEST_VALUES.emptyArray));

    // Invalid inputs
    assertFalse(isPeopleArray([{ name: "Alice" }])); // Missing age
    assertFalse(isPeopleArray([{ age: 30 }])); // Missing name
    assertFalse(isPeopleArray([{ name: "Alice", age: "30" }])); // Wrong type
    assertFalse(isPeopleArray([
      { name: "Alice", age: 30 },
      { name: "Bob" }, // Invalid person
    ]));
  });

  await t.step("complex scenario - using hasNot to exclude properties", () => {
    // Create a type guard for person objects that explicitly excludes 'id' property
    const isPersonWithoutId = createTypeGuard<{ name: string; age: number }>(
      (v, { has, hasNot }) => {
        if (
          isObject(v) &&
          has(v, "name", isString) &&
          has(v, "age", isNumber) &&
          hasNot(v, "id")
        ) {
          return v;
        }
        return null;
      },
    );

    const isPeopleArray = isArray.of(isPersonWithoutId);

    // Valid inputs - objects without 'id' property
    assert(isPeopleArray([{ name: "Alice", age: 30 }]));
    assert(isPeopleArray([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]));

    // Invalid inputs - objects with 'id' property should be rejected
    assertFalse(isPeopleArray([{ name: "Alice", age: 30, id: 1 }]));
    assertFalse(isPeopleArray([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25, id: 2 }, // Has id
    ]));
  });
});

Deno.test("array length methods", async (t) => {
  await t.step("ofLength", () => {
    assert(isArray.ofLength(3)([1, 2, 3]));
    assertFalse(isArray.ofLength(3)([1, 2]));
    assertFalse(isArray.ofLength(3)([1, 2, 3, 4]));
    assertFalse(isArray.ofLength(3)("abc"));
  });

  await t.step("min", () => {
    assert(isArray.min(1)([1]));
    assert(isArray.min(1)([1, 2, 3]));
    assertFalse(isArray.min(1)([]));
    assertFalse(isArray.min(1)("a"));
  });

  await t.step("max", () => {
    assert(isArray.max(3)([1, 2, 3]));
    assert(isArray.max(3)([1]));
    assert(isArray.max(3)([]));
    assertFalse(isArray.max(3)([1, 2, 3, 4]));
    assertFalse(isArray.max(3)("abc"));
  });

  await t.step("range", () => {
    assert(isArray.range(1, 3)([1]));
    assert(isArray.range(1, 3)([1, 2]));
    assert(isArray.range(1, 3)([1, 2, 3]));
    assertFalse(isArray.range(1, 3)([]));
    assertFalse(isArray.range(1, 3)([1, 2, 3, 4]));
  });

  await t.step("chaining min and max", () => {
    const between = isArray.min(1).max(5);
    assert(between([1]));
    assert(between([1, 2, 3, 4, 5]));
    assertFalse(between([]));
    assertFalse(between([1, 2, 3, 4, 5, 6]));
  });

  await t.step("validate method", () => {
    assertEquals(isArray.min(1).validate([1, 2]), { value: [1, 2] });
    assertEquals(isArray.min(1).validate([]), {
      issues: [{ message: "Expected length >= 1. Received: []" }],
    });
    assertEquals(isArray.max(2).validate([1, 2, 3]), {
      issues: [{ message: "Expected length <= 2. Received: [1,2,3]" }],
    });
    assertEquals(isArray.ofLength(2).validate([1]), {
      issues: [{ message: "Expected length == 2. Received: [1]" }],
    });
    assertEquals(isArray.range(2, 4).validate([1]), {
      issues: [{ message: "Expected length 2..4. Received: [1]" }],
    });
    assertEquals(isArray.range(2, 4).validate([1, 2, 3, 4, 5]), {
      issues: [{ message: "Expected length 2..4. Received: [1,2,3,4,5]" }],
    });
    // non-array input
    assertEquals(isArray.min(1).validate("not an array"), {
      issues: [{ message: "Expected length >= 1. Received: 'not an array'" }],
    });
  });

  await t.step("strict method", () => {
    isArray.min(1).strict([1]);
    assertThrows(() => isArray.min(1).strict([]));
  });

  await t.step("of with length methods", () => {
    const guard = isArray.of(isString).min(1);
    assert(guard(["a"]));
    assert(guard(["a", "b"]));
    assertFalse(guard([]));
    assertFalse(guard([1]));
    type Guarded = typeof guard._TYPE;
    assertType<Equals<Guarded, string[]>>();
  });

  await t.step("of with chained min and max", () => {
    const guard = isArray.of(isNumber).min(2).max(4);
    assert(guard([1, 2]));
    assert(guard([1, 2, 3, 4]));
    assertFalse(guard([1]));
    assertFalse(guard([1, 2, 3, 4, 5]));
  });

  await t.step("of with range", () => {
    const guard = isArray.of(isString).range(1, 3);
    assert(guard(["a"]));
    assert(guard(["a", "b", "c"]));
    assertFalse(guard([]));
    assertFalse(guard(["a", "b", "c", "d"]));
    type Guarded = typeof guard._TYPE;
    assertType<Equals<Guarded, string[]>>();
  });

  await t.step("or after length method", () => {
    const guard = isArray.min(1).or(isNull);
    assert(guard([1]));
    assert(guard(null));
    assertFalse(guard([]));
    assertFalse(guard(undefined));
  });

  await t.step("optional after length method", () => {
    const guard = isArray.min(1).optional;
    assert(guard([1]));
    assert(guard(undefined));
    assertFalse(guard([]));
    assertFalse(guard(null));
  });

  await t.step("extend after length method", () => {
    const guard = isArray.of(isNumber).min(1).extend((v) => v.every((n) => n > 0) ? v : null);
    assert(guard([1, 2, 3]));
    assertFalse(guard([]));
    assertFalse(guard([-1, 2]));
  });

  await t.step("length methods in shape definition", () => {
    const isForm = createTypeGuard({
      tags: isArray.of(isString).min(1).max(5),
      name: isString,
    });
    assert(isForm({ tags: ["a"], name: "test" }));
    assertFalse(isForm({ tags: [], name: "test" }));
    assertFalse(isForm({ tags: ["a", "b", "c", "d", "e", "f"], name: "test" }));
  });

  await t.step("validate with shape and length methods", () => {
    const isForm = createTypeGuard({
      items: isArray.of(isNumber).min(1),
    });
    assertEquals(isForm.validate({ items: [1, 2] }), { value: { items: [1, 2] } });
    const result = isForm.validate({ items: [] });
    assert(!("value" in result));
  });

  await t.step(".of() survives every length-method chain (regression)", () => {
    // .of() used to only exist on the original isArray singleton -- any
    // length-method call built a fresh guard via .extend() that silently
    // dropped it, so isArray.min(2).of(...) threw "not a function".
    assert(isArray.min(2).of(isNumber)([1, 2]));
    assert(isArray.max(3).of(isNumber)([1, 2]));
    assert(isArray.ofLength(2).of(isNumber)([1, 2]));
    assert(isArray.range(1, 3).of(isNumber)([1, 2]));
  });

  await t.step("a length constraint chained before .of() still holds after it (regression)", () => {
    // .of() used to validate against a bare "is an array" check, not
    // `guard`, so isArray.min(2).of(...) accepted a 1-element array.
    const atLeastTwo = isArray.min(2).of(isNumber);
    assertFalse(atLeastTwo([1]));
    assert(atLeastTwo([1, 2]));

    const atMostOne = isArray.max(1).of(isNumber);
    assert(atMostOne([1]));
    assertFalse(atMostOne([1, 2]));

    const exactlyOne = isArray.ofLength(1).of(isNumber);
    assert(exactlyOne([1]));
    assertFalse(exactlyOne([1, 2]));
  });

  await t.step("ofLength/min/max/range keep .of() but not each other", () => {
    const sized = isArray.ofLength(2);
    // @ts-expect-error ofLength's result carries no further length methods
    sized.ofLength(3);
    // @ts-expect-error ofLength's result carries no further length methods
    sized.min(1);
    sized.of(isNumber); // .of() stays reachable

    const ranged = isArray.range(1, 3);
    // @ts-expect-error range's result carries no further length methods
    ranged.range(2, 4);
    ranged.of(isNumber);

    const between = isArray.min(1).max(5);
    // @ts-expect-error min/max keep each other but not ofLength
    between.ofLength(2);
    between.of(isNumber);
  });

  await t.step("ofLength()/range()'s .of() is itself terminal (regression)", () => {
    // isArray.ofLength(3).of(...).ofLength(4) used to still type-check,
    // silently re-opening an already-fixed length constraint (unlike
    // min()/max(), see the deep-chain test below, which stay chainable
    // through .of()).
    const isExactlyThree = isArray.ofLength(3).of(isNumber);
    // @ts-expect-error ofLength().of()'s result has no length methods at all
    isExactlyThree.ofLength(4);
    assert(isExactlyThree([1, 2, 3]));
    assertFalse(isExactlyThree([1]));

    const isRangedThenTyped = isArray.range(1, 3).of(isNumber);
    // @ts-expect-error range().of()'s result has no length methods at all
    isRangedThenTyped.min(1);
  });

  await t.step("length methods survive being called on a .of() result", () => {
    assert(isArray.of(isNumber).min(2)([1, 2]));
    assert(isArray.of(isNumber).max(3)([1, 2]));
    assert(isArray.of(isNumber).ofLength(2)([1, 2]));
    assert(isArray.of(isNumber).range(1, 3)([1, 2]));
  });

  await t.step(".of() result has no further .of chaining", () => {
    // Same restriction as isMap/isSet, and for the same reason: .of() always
    // validates against the bare "is an array" check, not whatever guard it
    // was called on, so re-.of()-ing would silently discard the first
    // element-type constraint instead of composing with it.
    const typed = isArray.of(isNumber);
    assertFalse("of" in typed);
  });

  await t.step("deep chain: min/max/of/length-method all compose", () => {
    const guard = isArray.min(1).max(5).of(isNumber).ofLength(2);
    assert(guard([1, 2]));
    assertFalse(guard([1]));
    assertFalse(guard(["a", "b"]));
  });
});
