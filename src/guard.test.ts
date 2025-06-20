import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import {
  createTypeGuard,
  hasOptionalProperty,
  hasProperty,
  includes,
  isArray,
  isBinary,
  isBoolean,
  isDate,
  isEmpty,
  isFunction,
  isIterator,
  isJsonArray,
  isJsonObject,
  isJsonPrimitive,
  isJsonValue,
  isNil,
  isNull,
  isNumber,
  isNumeric,
  isObject,
  isString,
  isTuple,
  isUndefined,
  tupleHas,
} from "./guard.ts";

Deno.test("createTypeGuard", async (t) => {
  await t.step('injects "has" function', () => {
    const testGuard = createTypeGuard<{ a: string }>((v, { has }) => {
      if (isObject(v) && has(v, "a", isString)) {
        return v;
      }

      return null;
    });

    assertEquals(testGuard({ a: "1" }), true);
    assertEquals(testGuard({}), false);
  });

  await t.step('injects "includes" function', () => {
    const tuple = ["a", "b", "c"] as const;

    const testGuard = createTypeGuard<typeof tuple[number]>(
      (v, { includes }) => {
        if (includes(tuple, v)) return v;

        return null;
      },
    );

    assertEquals(testGuard("a"), true);
    assertEquals(testGuard("f"), false);
    assertEquals(testGuard([]), false);
    assertEquals(testGuard({}), false);
    assertEquals(testGuard(1), false);
    assertEquals(testGuard(0), false);
    assertEquals(testGuard(true), false);
    assertEquals(testGuard(false), false);
    assertEquals(testGuard(null), false);
    assertEquals(testGuard(undefined), false);
  });
});

Deno.test("isBoolean", async (t) => {
  await t.step("returns true only on boolean value types", () => {
    assert(isBoolean(true));
    assert(isBoolean(false));

    assertFalse(isBoolean(0));
    assertFalse(isBoolean(null));
    assertFalse(isBoolean(undefined));
    assertFalse(isBoolean("a"));
    assertFalse(isBoolean({}));
    assertFalse(isBoolean([]));
  });
});

Deno.test("isString", async (t) => {
  await t.step("returns true only on string value types", () => {
    assert(isString("a"));
    assert(isString(""));

    assertFalse(isString(0));
    assertFalse(isString(null));
    assertFalse(isString(undefined));
    assertFalse(isString(true));
    assertFalse(isString({}));
    assertFalse(isString([]));
  });
});

Deno.test("isNumber", async (t) => {
  await t.step("returns true only on numeric value types", () => {
    assert(isNumber(0));
    assert(isNumber(100));
    assert(isNumber(0.1));

    assertFalse(isNumber("a"));
    assertFalse(isNumber(null));
    assertFalse(isNumber(undefined));
    assertFalse(isNumber(true));
    assertFalse(isNumber({}));
    assertFalse(isNumber([]));
  });
});

Deno.test("isBinary", async (t) => {
  await t.step("returns true only on values of 1 or 0", () => {
    assert(isBinary(0));
    assert(isBinary(1));

    assertFalse(isBinary(2));
    assertFalse(isBinary(0.1));
    assertFalse(isBinary("a"));
    assertFalse(isBinary(null));
    assertFalse(isBinary(undefined));
    assertFalse(isBinary(true));
    assertFalse(isBinary({}));
    assertFalse(isBinary([]));
  });
});

Deno.test("isFunction", async (t) => {
  await t.step("returns true only on function type values", () => {
    assert(isFunction(() => {}));

    assertFalse(isFunction(true));
    assertFalse(isFunction(false));
    assertFalse(isFunction(0));
    assertFalse(isFunction(null));
    assertFalse(isFunction(undefined));
    assertFalse(isFunction("a"));
    assertFalse(isFunction({}));
    assertFalse(isFunction([]));
  });
});

Deno.test("isJsonArray", async (t) => {
  await t.step("returns true only on array type values", () => {
    assert(isJsonArray([]));

    assertFalse(isJsonArray(true));
    assertFalse(isJsonArray(false));
    assertFalse(isJsonArray(0));
    assertFalse(isJsonArray(null));
    assertFalse(isJsonArray(undefined));
    assertFalse(isJsonArray("a"));
    assertFalse(isJsonArray({}));
  });
});

Deno.test("isJsonObject", async (t) => {
  await t.step("returns true only on object type values", () => {
    assert(isJsonObject({}));

    assertFalse(isJsonObject(true));
    assertFalse(isJsonObject(false));
    assertFalse(isJsonObject(0));
    assertFalse(isJsonObject(null));
    assertFalse(isJsonObject(undefined));
    assertFalse(isJsonObject([]));
  });
});

Deno.test("isNull", async (t) => {
  await t.step("returns true only on null values", () => {
    assert(isNull(null));

    assertFalse(isNull(true));
    assertFalse(isNull(false));
    assertFalse(isNull(0));
    assertFalse(isNull(undefined));
    assertFalse(isNull("a"));
    assertFalse(isNull({}));
    assertFalse(isNull([]));
  });

  await t.step("strict mode", () => {
    isNull.strict(null);
    assertThrows(() => isNull.strict(true));
    assertThrows(() => isNull.strict(false));
    assertThrows(() => isNull.strict(0));
    assertThrows(() => isNull.strict("a"));
    assertThrows(() => isNull.strict({}));
    assertThrows(() => isNull.strict([]));
  });
});

Deno.test("isUndefined", async (t) => {
  await t.step("returns true only on undefined values", () => {
    assert(isUndefined(undefined));

    assertFalse(isUndefined(true));
    assertFalse(isUndefined(false));
    assertFalse(isUndefined(0));
    assertFalse(isUndefined(null));
    assertFalse(isUndefined("a"));
    assertFalse(isUndefined({}));
    assertFalse(isUndefined([]));
  });
});

Deno.test("isEmpty", async (t) => {
  await t.step(
    "returns true only on null, undefined, or empty string values",
    () => {
      assert(isEmpty(null));
      assert(isEmpty(undefined));
      assert(isEmpty(""));
      assert(isEmpty({}));
      assert(isEmpty([]));

      assertFalse(isEmpty(true));
      assertFalse(isEmpty(false));
      assertFalse(isEmpty(0));
      assertFalse(isEmpty("a"));
    },
  );

  await t.step("strict mode", () => {
    isEmpty.strict(null);
    isEmpty.strict(undefined);
    isEmpty.strict("");
    isEmpty.strict({});
    isEmpty.strict([]);
    assertThrows(() => isEmpty.strict(true));
    assertThrows(() => isEmpty.strict(false));
    assertThrows(() => isEmpty.strict(0));
    assertThrows(() => isEmpty.strict("a"));
  });
});

Deno.test("isNil", async (t) => {
  await t.step("returns true only on null or undefined values", () => {
    assert(isNil(null));
    assert(isNil(undefined));
    assertFalse(isNil(true));
    assertFalse(isNil(false));
    assertFalse(isNil(0));
    assertFalse(isNil("a"));
    assertFalse(isNil({}));
    assertFalse(isNil([]));
  });

  await t.step("strict mode", () => {
    isNil.strict(null);
    isNil.strict(undefined);
    assertThrows(() => isNil.strict(true));
    assertThrows(() => isNil.strict(false));
    assertThrows(() => isNil.strict(0));
    assertThrows(() => isNil.strict("a"));
    assertThrows(() => isNil.strict({}));
    assertThrows(() => isNil.strict([]));
  });
});

Deno.test("strict mode", async (t) => {
  await t.step("throws on failed typeguard", () => {
    assertThrows(() => isBoolean.strict("a"));
    assertThrows(() => isBoolean.strict(1));
    assertThrows(() => isBoolean.strict(null));
    assertThrows(() => isBoolean.strict(undefined));
    assertThrows(() => isBoolean.strict({}));
  });

  await t.step("does not throw on successful typeguard", () => {
    isBoolean.strict(true);
    isBoolean.strict(false);
    isNumber.strict(0);
    isString.strict("1");
  });
});

Deno.test("notEmpty", () => {
  assert(isString.notEmpty("a string"));

  assertFalse(isString.notEmpty(0));
  assertFalse(isString.notEmpty(10));
  assertFalse(isString.notEmpty(""));
});

Deno.test("isTuple", () => {
  assert(isTuple([], 0));
  assert(isTuple([1], 1));
  assert(isTuple([1, 2], 2));
  assert(isTuple([1, 2, 3], 3));
  assert(isTuple([1, 2, 3, 4], 4));
  assert(isTuple([1, 2, 3, 4, 5], 5));
  assert(isTuple([1, 2, 3, 4, 5, 6], 6));
  assert(isTuple([1, 2, 3, 4, 5, 6, 7], 7));
  assert(isTuple([1, 2, 3, 4, 5, 6, 7, 8], 8));
  assert(isTuple([1, 2, 3, 4, 5, 6, 7, 8, 9], 9));
  assert(isTuple([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 10));
  assertFalse(isTuple([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 10));
  assertFalse(isTuple([1, 2, 3, 4, 5, 6, 7, 8, 9], 10));
});
Deno.test("hasProperty", async (t) => {
  await t.step("returns true if property exists", () => {
    const obj = { a: 1, b: "test" };
    assert(hasProperty(obj, "a"));
    assert(hasProperty(obj, "b"));
    assertFalse(hasProperty(obj, "c"));
  });

  await t.step("returns true if property exists and passes guard", () => {
    const obj = { a: 1, b: "test" };
    assert(hasProperty(obj, "a", isNumber));
    assertFalse(hasProperty(obj, "b", isNumber));
    assert(hasProperty(obj, "b", isString));
    assertFalse(hasProperty(obj, "c", isString));
  });
});

Deno.test("tupleHas", async (t) => {
  await t.step("returns true if index exists and passes guard", () => {
    const tuple = [1, "a", true] as const;
    assert(tupleHas(tuple, 0, isNumber));
    assert(tupleHas(tuple, 1, isString));
    assert(tupleHas(tuple, 2, isBoolean));
    assertFalse(tupleHas(tuple, 1, isNumber));
    assertFalse(tupleHas(tuple, 3, isString));
  });
});

Deno.test("includes", () => {
  const arr = [1, 2, 3] as const;
  assert(includes(arr, 1));
  assert(includes(arr, 2));
  assertFalse(includes(arr, 4));
  assertFalse(includes(arr, "1"));
});

Deno.test("isNumeric", async (t) => {
  await t.step("returns true for numbers and numeric strings", () => {
    assert(isNumeric(1));
    assert(isNumeric(0));
    assert(isNumeric("42"));
    assert(isNumeric("3.14"));
  });

  await t.step("returns false for non-numeric values", () => {
    assertFalse(isNumeric("abc"));
    assertFalse(isNumeric({}));
    assertFalse(isNumeric([]));
    assertFalse(isNumeric(null));
    assertFalse(isNumeric(undefined));
  });
});

Deno.test("isJsonPrimitive", () => {
  assert(isJsonPrimitive(true));
  assert(isJsonPrimitive(false));
  assert(isJsonPrimitive(1));
  assert(isJsonPrimitive("str"));
  assert(isJsonPrimitive(null));
  assertFalse(isJsonPrimitive(undefined));
  assertFalse(isJsonPrimitive({}));
  assertFalse(isJsonPrimitive([]));
});

Deno.test("isObject", () => {
  assert(isObject({}));
  assert(isObject({ a: 1 }));
  assertFalse(isObject([]));
  assertFalse(isObject(null));
  assertFalse(isObject("str"));
  assertFalse(isObject(1));
});

Deno.test("isArray", () => {
  assert(isArray([]));
  assert(isArray([1, 2, 3]));
  assertFalse(isArray({}));
  assertFalse(isArray("str"));
  assertFalse(isArray(1));
  assertFalse(isArray(null));
});

Deno.test("isJsonValue", () => {
  assert(isJsonValue(true));
  assert(isJsonValue(1));
  assert(isJsonValue("str"));
  assert(isJsonValue([]));
  assert(isJsonValue([1, 2, 3]));
  assert(isJsonValue({}));
  assert(isJsonValue({ a: 1, b: "str", c: null }));
  assertFalse(isJsonValue(undefined));
  assertFalse(isJsonValue({ a: undefined }));
  assertFalse(isJsonValue({ a: () => {} }));
});

Deno.test("isIterator", async (t) => {
  await t.step("returns true for iterators", () => {
    const arr = [1, 2, 3];
    const iter = arr[Symbol.iterator]();
    assert(isIterator(iter));
  });

  await t.step("returns false for non-iterators", () => {
    assertFalse(isIterator({}));
    assertFalse(isIterator(null));
    assertFalse(isIterator(undefined));
    assertFalse(isIterator("str"));
  });

  await t.step("strict mode throws on non-iterators", () => {
    const arr = [1, 2, 3];
    const iter = arr[Symbol.iterator]();
    isIterator.strict(iter);
    assertThrows(() => isIterator.strict({}));
    assertThrows(() => isIterator.strict(null));
    assertThrows(() => isIterator.strict(undefined));
    assertThrows(() => isIterator.strict("str"));
  });
});
Deno.test("isDate", async (t) => {
  await t.step("returns true only for Date objects", () => {
    const date = new Date();
    assert(isDate(date));

    assertFalse(isDate("2023-01-01"));
    assertFalse(isDate(1672531200000)); // timestamp
    assertFalse(isDate({}));
    assertFalse(isDate(null));
    assertFalse(isDate(undefined));
    assertFalse(isDate(true));
    assertFalse(isDate([]));
  });

  await t.step("strict mode throws on non-Date values", () => {
    const date = new Date();
    isDate.strict(date);

    assertThrows(() => isDate.strict("2023-01-01"));
    assertThrows(() => isDate.strict(1672531200000));
    assertThrows(() => isDate.strict({}));
    assertThrows(() => isDate.strict(null));
    assertThrows(() => isDate.strict(undefined));
  });
});
Deno.test("hasOptionalProperty", async (t) => {
  await t.step("returns true if property exists and passes guard", () => {
    const obj = { a: 1, b: "test" };
    assert(hasOptionalProperty(obj, "a", isNumber));
    assert(hasOptionalProperty(obj, "b", isString));
    assertFalse(hasOptionalProperty(obj, "b", isNumber));
  });

  await t.step("returns true if property is undefined", () => {
    const obj = { a: 1, b: undefined };
    assert(hasOptionalProperty(obj, "b"));
    assert(hasOptionalProperty(obj, "b", isString));
  });
});

Deno.test("isDate with ISO string conversion", async (t) => {
  await t.step("can validate dates created from ISO strings", () => {
    const isoString = "2023-01-01T00:00:00.000Z";
    const dateFromISO = new Date(isoString);

    assert(isDate(dateFromISO));
    assert(dateFromISO.toISOString() === isoString);

    assertFalse(isDate(isoString));
  });
});

Deno.test("isJsonValue with nested structures", async (t) => {
  await t.step("validates complex nested JSON structures", () => {
    const validJson = {
      string: "value",
      number: 123,
      boolean: true,
      null: null,
      array: [1, "two", false, null],
      object: {
        nestedProp: "nested",
        deepNesting: {
          evenDeeper: [{ a: 1 }],
        },
      },
    };

    assert(isJsonValue(validJson));

    const invalidJson = {
      func: () => {},
      date: new Date(),
      undef: undefined,
      symbol: Symbol("test"),
    };

    assertFalse(isJsonValue(invalidJson));
    assertFalse(isJsonValue({ nested: { prop: undefined } }));
  });
});

Deno.test("isTuple with strict mode", async (t) => {
  await t.step("strict mode throws with correct error message", () => {
    const tuple = [1, 2, 3] as const;

    isTuple.strict(tuple, 3);

    assertThrows(() => isTuple.strict(tuple, 4), TypeError);

    const customMsg = "Custom error message";
    assertThrows(() => isTuple.strict(tuple, 2, customMsg), TypeError, customMsg);
  });
});

Deno.test("isNumeric with edge cases", async (t) => {
  await t.step("handles numeric edge cases correctly", () => {
    assert(isNumeric(0));
    assert(isNumeric(-0));
    assert(isNumeric(Infinity));
    assert(isNumeric(-Infinity));
    assert(isNumeric("0"));
    assert(isNumeric("-1.5"));
    assert(isNumeric("3.14159"));

    assertFalse(isNumeric(""));
    assertFalse(isNumeric("abc123"));
    assertFalse(isNumeric("123abc"));
  });
});

Deno.test("createTypeGuard with custom parser", async (t) => {
  await t.step("creates custom type guards with complex logic", () => {
    // Custom type guard for positive integers
    const isPositiveInteger = createTypeGuard<number>((val) => {
      if (typeof val !== "number") return null;
      if (!Number.isInteger(val)) return null;
      if (val <= 0) return null;
      return val;
    });

    assert(isPositiveInteger(1));
    assert(isPositiveInteger(42));
    assertFalse(isPositiveInteger(0));
    assertFalse(isPositiveInteger(-1));
    assertFalse(isPositiveInteger(3.14));
    assertFalse(isPositiveInteger("5"));

    // Test strict mode
    isPositiveInteger.strict(5);
    assertThrows(() => isPositiveInteger.strict(-5));

    // Test notEmpty (should work the same as regular for numbers)
    assert(isPositiveInteger.notEmpty(10));
    assertFalse(isPositiveInteger.notEmpty(0));
  });
});

// Assert tests for all guards
Deno.test("assert method tests", async (t) => {
  // Primitive type guards
  await t.step("isBoolean.assert", () => {
    const assertIsBoolean: typeof isBoolean.assert = isBoolean.assert;
    assertIsBoolean(true);
    assertIsBoolean(false);
    assertThrows(() => assertIsBoolean("not a boolean"));
    assertThrows(() => assertIsBoolean(1));
    assertThrows(() => assertIsBoolean(null));
    assertThrows(() => assertIsBoolean(undefined));
    assertThrows(() => assertIsBoolean({}));
    assertThrows(() => assertIsBoolean([]), TypeError, "Type guard failed");
  });

  await t.step("isString.assert", () => {
    const assertIsString: typeof isString.assert = isString.assert;
    assertIsString("hello");
    assertIsString("");
    assertThrows(() => assertIsString(123));
    assertThrows(() => assertIsString(true));
    assertThrows(() => assertIsString(null));
    assertThrows(() => assertIsString(undefined));
    assertThrows(() => assertIsString({}));
    assertThrows(() => assertIsString([]), TypeError, "Type guard failed");
  });

  await t.step("isNumber.assert", () => {
    const assertIsNumber: typeof isNumber.assert = isNumber.assert;
    assertIsNumber(0);
    assertIsNumber(42);
    assertIsNumber(-3.14);
    assertIsNumber(Infinity);
    assertThrows(() => assertIsNumber("123"));
    assertThrows(() => assertIsNumber(true));
    assertThrows(() => assertIsNumber(null));
    assertThrows(() => assertIsNumber(undefined));
    assertThrows(() => assertIsNumber({}));
    assertThrows(() => assertIsNumber([]), TypeError, "Type guard failed");
  });

  await t.step("isBinary.assert", () => {
    const assertIsBinary: typeof isBinary.assert = isBinary.assert;
    assertIsBinary(0);
    assertIsBinary(1);
    assertThrows(() => assertIsBinary(2));
    assertThrows(() => assertIsBinary(0.5));
    assertThrows(() => assertIsBinary("1"));
    assertThrows(() => assertIsBinary(true));
    assertThrows(() => assertIsBinary(null));
    assertThrows(() => assertIsBinary(undefined), TypeError, "Type guard failed");
  });

  await t.step("isNumeric.assert", () => {
    const assertIsNumeric: typeof isNumeric.assert = isNumeric.assert;
    assertIsNumeric(42);
    assertIsNumeric("42");
    assertIsNumeric("3.14");
    assertIsNumeric(0);
    assertThrows(() => assertIsNumeric("abc"));
    assertThrows(() => assertIsNumeric(""));
    assertThrows(() => assertIsNumeric(null));
    assertThrows(() => assertIsNumeric(undefined));
    assertThrows(() => assertIsNumeric({}), TypeError, "Type guard failed");
  });

  // Complex type guards
  await t.step("isFunction.assert", () => {
    const assertIsFunction: typeof isFunction.assert = isFunction.assert;
    assertIsFunction(() => {});
    assertIsFunction(function () {});
    assertIsFunction(Math.max);
    assertThrows(() => assertIsFunction(123));
    assertThrows(() => assertIsFunction("function"));
    assertThrows(() => assertIsFunction(null));
    assertThrows(() => assertIsFunction(undefined));
    assertThrows(() => assertIsFunction({}), TypeError, "Type guard failed");
  });

  await t.step("isObject.assert", () => {
    const assertIsObject: typeof isObject.assert = isObject.assert;
    assertIsObject({});
    assertIsObject({ a: 1 });
    assertIsObject(new Date());
    assertThrows(() => assertIsObject([])); // Arrays are not objects in this guard
    assertThrows(() => assertIsObject(null));
    assertThrows(() => assertIsObject(undefined));
    assertThrows(() => assertIsObject("object"));
    assertThrows(() => assertIsObject(123), TypeError, "Type guard failed");
  });

  await t.step("isArray.assert", () => {
    const assertIsArray: typeof isArray.assert = isArray.assert;
    assertIsArray([]);
    assertIsArray([1, 2, 3]);
    assertIsArray(new Array(5));
    assertThrows(() => assertIsArray({}));
    assertThrows(() => assertIsArray("array"));
    assertThrows(() => assertIsArray(null));
    assertThrows(() => assertIsArray(undefined), TypeError, "Type guard failed");
  });

  await t.step("isDate.assert", () => {
    const assertIsDate: typeof isDate.assert = isDate.assert;
    assertIsDate(new Date());
    assertIsDate(new Date("2023-01-01"));
    assertThrows(() => assertIsDate("2023-01-01"));
    assertThrows(() => assertIsDate(1672531200000));
    assertThrows(() => assertIsDate({}));
    assertThrows(() => assertIsDate(null), TypeError, "Type guard failed");
  });

  // Special type guards
  await t.step("isNull.assert", () => {
    const assertIsNull: typeof isNull.assert = isNull.assert;
    assertIsNull(null);
    assertThrows(() => assertIsNull(undefined));
    assertThrows(() => assertIsNull(0));
    assertThrows(() => assertIsNull(""));
    assertThrows(() => assertIsNull(false), TypeError, "Type guard failed");
  });

  await t.step("isUndefined.assert", () => {
    const assertIsUndefined: typeof isUndefined.assert = isUndefined.assert;
    assertIsUndefined(undefined);
    assertThrows(() => assertIsUndefined(null));
    assertThrows(() => assertIsUndefined(0));
    assertThrows(() => assertIsUndefined(""));
    assertThrows(() => assertIsUndefined(false), TypeError, "Type guard failed");
  });

  await t.step("isNil.assert", () => {
    const assertIsNil: typeof isNil.assert = isNil.assert;
    assertIsNil(null);
    assertIsNil(undefined);
    assertThrows(() => assertIsNil(0));
    assertThrows(() => assertIsNil(""));
    assertThrows(() => assertIsNil(false), TypeError, "Type guard failed");
  });

  await t.step("isEmpty.assert", () => {
    const assertIsEmpty: typeof isEmpty.assert = isEmpty.assert;
    assertIsEmpty(null);
    assertIsEmpty(undefined);
    assertIsEmpty("");
    assertIsEmpty([]);
    assertIsEmpty({});
    assertThrows(() => assertIsEmpty("a"));
    assertThrows(() => assertIsEmpty([1]));
    assertThrows(() => assertIsEmpty({ a: 1 }), TypeError, "Type guard failed");
  });

  // JSON type guards
  await t.step("isJsonPrimitive.assert", () => {
    const assertIsJsonPrimitive: typeof isJsonPrimitive.assert = isJsonPrimitive.assert;
    assertIsJsonPrimitive(true);
    assertIsJsonPrimitive(false);
    assertIsJsonPrimitive(123);
    assertIsJsonPrimitive("string");
    assertIsJsonPrimitive(null);
    assertThrows(() => assertIsJsonPrimitive(undefined));
    assertThrows(() => assertIsJsonPrimitive({}));
    assertThrows(() => assertIsJsonPrimitive([]), TypeError, "Type guard failed");
  });

  await t.step("isJsonObject.assert", () => {
    const assertIsJsonObject: typeof isJsonObject.assert = isJsonObject.assert;
    assertIsJsonObject({});
    assertIsJsonObject({ a: 1, b: "test" });
    assertIsJsonObject({ nested: { value: true } });
    assertThrows(() => assertIsJsonObject([]));
    assertThrows(() => assertIsJsonObject(null));
    assertThrows(() => assertIsJsonObject("object"));
    assertThrows(() => assertIsJsonObject({ func: () => {} }), TypeError, "Type guard failed");
  });

  await t.step("isJsonArray.assert", () => {
    const assertIsJsonArray: typeof isJsonArray.assert = isJsonArray.assert;
    assertIsJsonArray([]);
    assertIsJsonArray([1, 2, 3]);
    assertIsJsonArray(["a", "b", "c"]);
    assertThrows(() => assertIsJsonArray({}));
    assertThrows(() => assertIsJsonArray(null));
    assertThrows(() => assertIsJsonArray("array"), TypeError, "Type guard failed");
  });

  await t.step("isJsonValue.assert", () => {
    const assertIsJsonValue: typeof isJsonValue.assert = isJsonValue.assert;
    assertIsJsonValue(true);
    assertIsJsonValue(123);
    assertIsJsonValue("string");
    assertIsJsonValue(null);
    assertIsJsonValue([]);
    assertIsJsonValue({});
    assertIsJsonValue({ a: [1, 2, { b: "test" }] });
    assertThrows(() => assertIsJsonValue(undefined));
    assertThrows(() => assertIsJsonValue({ func: () => {} }), TypeError, "Type guard failed");
  });

  // Other guards
  await t.step("isIterator.assert", () => {
    const assertIsIterator: typeof isIterator.assert = isIterator.assert;
    const arr = [1, 2, 3];
    const iter = arr[Symbol.iterator]();
    assertIsIterator(iter);
    assertIsIterator([]); // Arrays have Symbol.iterator property
    assertThrows(() => assertIsIterator({}));
    assertThrows(() => assertIsIterator(null), TypeError, "Type guard failed");
  });

  await t.step("isTuple.assert", () => {
    const assertIsTuple: typeof isTuple.assert = isTuple.assert;
    assertIsTuple([1, 2, 3], 3);
    assertIsTuple([], 0);
    assertThrows(() => assertIsTuple([1, 2], 3));
    assertThrows(() => assertIsTuple({}, 0));
    assertThrows(() => assertIsTuple(null, 0), TypeError, "Type guard failed");
  });
});

// NotEmpty tests
Deno.test("notEmpty.assert method tests", async (t) => {
  await t.step("isString.notEmpty.assert", () => {
    const assertIsNotEmptyString: typeof isString.notEmpty.assert = isString.notEmpty.assert;
    assertIsNotEmptyString("hello");
    assertIsNotEmptyString("a");
    assertThrows(() => assertIsNotEmptyString(""));
    assertThrows(() => assertIsNotEmptyString(null));
    assertThrows(() => assertIsNotEmptyString(undefined));
    assertThrows(() => assertIsNotEmptyString(123), TypeError, "Type guard failed");
  });

  await t.step("isArray.notEmpty.assert", () => {
    const assertIsNotEmptyArray: typeof isArray.notEmpty.assert = isArray.notEmpty.assert;
    assertIsNotEmptyArray([1]);
    assertIsNotEmptyArray([1, 2, 3]);
    assertThrows(() => assertIsNotEmptyArray([]));
    assertThrows(() => assertIsNotEmptyArray(null));
    assertThrows(() => assertIsNotEmptyArray(undefined));
    assertThrows(() => assertIsNotEmptyArray({}), TypeError, "Type guard failed");
  });

  await t.step("isObject.notEmpty.assert", () => {
    const assertIsNotEmptyObject: typeof isObject.notEmpty.assert = isObject.notEmpty.assert;
    assertIsNotEmptyObject({ a: 1 });
    assertIsNotEmptyObject({ a: 1, b: 2 });
    assertThrows(() => assertIsNotEmptyObject({}));
    assertThrows(() => assertIsNotEmptyObject(null));
    assertThrows(() => assertIsNotEmptyObject(undefined));
    assertThrows(() => assertIsNotEmptyObject([]), TypeError, "Type guard failed");
  });

  await t.step("isNumber.notEmpty.assert", () => {
    const assertIsNotEmptyNumber: typeof isNumber.notEmpty.assert = isNumber.notEmpty.assert;
    assertIsNotEmptyNumber(1);
    assertIsNotEmptyNumber(0); // 0 is not considered empty for numbers
    assertIsNotEmptyNumber(-42);
    assertThrows(() => assertIsNotEmptyNumber(null));
    assertThrows(() => assertIsNotEmptyNumber(undefined));
    assertThrows(() => assertIsNotEmptyNumber("42"), TypeError, "Type guard failed");
  });
});

// Optional tests
Deno.test("optional.assert method tests", async (t) => {
  await t.step("isString.optional.assert", () => {
    const assertIsOptionalString: typeof isString.optional.assert = isString.optional.assert;
    assertIsOptionalString("hello");
    assertIsOptionalString("");
    assertIsOptionalString(undefined);
    assertThrows(() => assertIsOptionalString(null));
    assertThrows(() => assertIsOptionalString(123));
    assertThrows(() => assertIsOptionalString({}), TypeError, "Type guard failed");
  });

  await t.step("isNumber.optional.assert", () => {
    const assertIsOptionalNumber: typeof isNumber.optional.assert = isNumber.optional.assert;
    assertIsOptionalNumber(42);
    assertIsOptionalNumber(0);
    assertIsOptionalNumber(undefined);
    assertThrows(() => assertIsOptionalNumber(null));
    assertThrows(() => assertIsOptionalNumber("42"));
    assertThrows(() => assertIsOptionalNumber({}), TypeError, "Type guard failed");
  });

  await t.step("isBoolean.optional.assert", () => {
    const assertIsOptionalBoolean: typeof isBoolean.optional.assert = isBoolean.optional.assert;
    assertIsOptionalBoolean(true);
    assertIsOptionalBoolean(false);
    assertIsOptionalBoolean(undefined);
    assertThrows(() => assertIsOptionalBoolean(null));
    assertThrows(() => assertIsOptionalBoolean(1));
    assertThrows(() => assertIsOptionalBoolean("true"), TypeError, "Type guard failed");
  });

  await t.step("isArray.optional.assert", () => {
    const assertIsOptionalArray: typeof isArray.optional.assert = isArray.optional.assert;
    assertIsOptionalArray([]);
    assertIsOptionalArray([1, 2, 3]);
    assertIsOptionalArray(undefined);
    assertThrows(() => assertIsOptionalArray(null));
    assertThrows(() => assertIsOptionalArray({}));
    assertThrows(() => assertIsOptionalArray("array"), TypeError, "Type guard failed");
  });

  await t.step("isObject.optional.assert", () => {
    const assertIsOptionalObject: typeof isObject.optional.assert = isObject.optional.assert;
    assertIsOptionalObject({});
    assertIsOptionalObject({ a: 1 });
    assertIsOptionalObject(undefined);
    assertThrows(() => assertIsOptionalObject(null));
    assertThrows(() => assertIsOptionalObject([]));
    assertThrows(() => assertIsOptionalObject("object"), TypeError, "Type guard failed");
  });

  await t.step("isDate.optional.assert", () => {
    const assertIsOptionalDate: typeof isDate.optional.assert = isDate.optional.assert;
    assertIsOptionalDate(new Date());
    assertIsOptionalDate(undefined);
    assertThrows(() => assertIsOptionalDate(null));
    assertThrows(() => assertIsOptionalDate("2023-01-01"));
    assertThrows(() => assertIsOptionalDate(1672531200000), TypeError, "Type guard failed");
  });

  // Tests for newly added optional methods
  await t.step("isNull.optional.assert", () => {
    const assertIsOptionalNull: typeof isNull.optional.assert = isNull.optional.assert;
    assertIsOptionalNull(null);
    assertIsOptionalNull(undefined);
    assertThrows(() => assertIsOptionalNull(0));
    assertThrows(() => assertIsOptionalNull(""));
    assertThrows(() => assertIsOptionalNull(false));
    assertThrows(() => assertIsOptionalNull({}), TypeError, "Type guard failed");
  });

  await t.step("isIterator.optional.assert", () => {
    const assertIsOptionalIterator: typeof isIterator.optional.assert = isIterator.optional.assert;
    const arr = [1, 2, 3];
    const iter = arr[Symbol.iterator]();
    assertIsOptionalIterator(iter);
    assertIsOptionalIterator(undefined);
    assertThrows(() => assertIsOptionalIterator(null));
    assertThrows(() => assertIsOptionalIterator({}));
    assertThrows(() => assertIsOptionalIterator("not iterator"), TypeError, "Type guard failed");
  });

  await t.step("isTuple.optional.assert", () => {
    const assertIsOptionalTuple: typeof isTuple.optional.assert = isTuple.optional.assert;
    assertIsOptionalTuple([1, 2, 3], 3);
    assertIsOptionalTuple([], 0);
    assertIsOptionalTuple(undefined, 5);
    assertThrows(() => assertIsOptionalTuple([1, 2], 3));
    assertThrows(() => assertIsOptionalTuple({}, 0));
    assertThrows(() => assertIsOptionalTuple(null, 0), TypeError, "Type guard failed");
  });
});

// Comprehensive tests for newly added optional methods
Deno.test("isNull.optional", async (t) => {
  await t.step("returns true for null and undefined", () => {
    assert(isNull.optional(null));
    assert(isNull.optional(undefined));
  });

  await t.step("returns false for non-null defined values", () => {
    assertFalse(isNull.optional(0));
    assertFalse(isNull.optional(""));
    assertFalse(isNull.optional(false));
    assertFalse(isNull.optional({}));
    assertFalse(isNull.optional([]));
    assertFalse(isNull.optional("null"));
  });

  await t.step("strict mode", () => {
    isNull.optional.strict(null);
    isNull.optional.strict(undefined);
    assertThrows(() => isNull.optional.strict(0));
    assertThrows(() => isNull.optional.strict(""));
    assertThrows(() => isNull.optional.strict(false));
    assertThrows(() => isNull.optional.strict({}));
    assertThrows(() => isNull.optional.strict([]));
  });
});

Deno.test("isIterator.optional", async (t) => {
  await t.step("returns true for iterators and undefined", () => {
    const arr = [1, 2, 3];
    const iter = arr[Symbol.iterator]();
    assert(isIterator.optional(iter));
    assert(isIterator.optional(undefined));

    // Arrays are iterable
    const iterableArray = [1, 2, 3];
    assert(isIterator.optional(iterableArray));
  });

  await t.step("returns false for non-iterator defined values", () => {
    assertFalse(isIterator.optional(null));
    assertFalse(isIterator.optional({}));
    assertFalse(isIterator.optional("string"));
    assertFalse(isIterator.optional(123));
    assertFalse(isIterator.optional(true));
  });

  await t.step("strict mode", () => {
    const arr = [1, 2, 3];
    const iter = arr[Symbol.iterator]();
    isIterator.optional.strict(iter);
    isIterator.optional.strict(undefined);

    assertThrows(() => isIterator.optional.strict(null));
    assertThrows(() => isIterator.optional.strict({}));
    assertThrows(() => isIterator.optional.strict("not iterator"));
    assertThrows(() => isIterator.optional.strict(123));
  });
});

Deno.test("isTuple.optional", async (t) => {
  await t.step("returns true for correct length tuples and undefined", () => {
    assert(isTuple.optional([], 0));
    assert(isTuple.optional([1], 1));
    assert(isTuple.optional([1, 2, 3], 3));
    assert(isTuple.optional(undefined, 0));
    assert(isTuple.optional(undefined, 5));
    assert(isTuple.optional(undefined, 10));
  });

  await t.step("returns false for incorrect length or non-arrays", () => {
    assertFalse(isTuple.optional([1, 2], 3));
    assertFalse(isTuple.optional([1, 2, 3], 2));
    assertFalse(isTuple.optional(null, 0));
    assertFalse(isTuple.optional({}, 0));
    assertFalse(isTuple.optional("string", 6));
    assertFalse(isTuple.optional(123, 0));
  });

  await t.step("strict mode", () => {
    isTuple.optional.strict([], 0);
    isTuple.optional.strict([1, 2], 2);
    isTuple.optional.strict(undefined, 5);

    assertThrows(() => isTuple.optional.strict([1, 2], 3));
    assertThrows(() => isTuple.optional.strict(null, 0));
    assertThrows(() => isTuple.optional.strict({}, 0));
    assertThrows(() => isTuple.optional.strict("not tuple", 1));
  });
});
