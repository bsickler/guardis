import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import {
  createTypeGuard,
  isArray,
  isBinary,
  isBoolean,
  isDate,
  isEmpty,
  isFunction,
  isIterable,
  isJsonArray,
  isJsonObject,
  isJsonPrimitive,
  isJsonValue,
  isNil,
  isNull,
  isNumber,
  isNumeric,
  isObject,
  isPropertyKey,
  isString,
  isSymbol,
  isTuple,
  isUndefined,
} from "./guard.ts";
import type { GuardedType, TypeGuard } from "./types.ts";
import { type Equals, assertType } from "./test-utils.ts";

// Standard test values for consistency across all type guard tests
const TEST_VALUES = {
  // Primitive values
  string: "test",
  emptyString: "",
  whitespaceString: " ",
  number: 42,
  zero: 0,
  float: 3.14,
  infinity: Infinity,
  negativeInfinity: -Infinity,
  nan: NaN,
  boolean: true,
  booleanFalse: false,
  nullValue: null,
  undefinedValue: undefined,

  // Complex values
  emptyObject: {},
  object: { a: 1, b: "test" },
  emptyArray: [],
  array: [1, 2, 3],
  function: () => {},
  date: new Date(),

  // Special values
  binaryZero: 0 as const,
  binaryOne: 1 as const,
  numericString: "123",
  invalidNumericString: "abc",
  iterator: [1, 2, 3][Symbol.iterator](),
  symbol: Symbol("test"),
  symbolFor: Symbol.for("shared"),
  symbolIterator: Symbol.iterator,
} as const;

// === Core Type Guards ===

Deno.test("isBoolean", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isBoolean(TEST_VALUES.boolean));
    assert(isBoolean(TEST_VALUES.booleanFalse));

    // Invalid inputs
    assertFalse(isBoolean(TEST_VALUES.string));
    assertFalse(isBoolean(TEST_VALUES.number));
    assertFalse(isBoolean(TEST_VALUES.zero));
    assertFalse(isBoolean(TEST_VALUES.nullValue));
    assertFalse(isBoolean(TEST_VALUES.undefinedValue));
    assertFalse(isBoolean(TEST_VALUES.object));
    assertFalse(isBoolean(TEST_VALUES.array));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isBoolean.validate(true), { value: true });
    assertEquals(isBoolean.validate(false), { value: false });

    // Invalid inputs return issues with specific error message
    assertEquals(isBoolean.validate("test"), {
      issues: [{ message: "Expected boolean. Received: 'test'" }],
    });
    assertEquals(isBoolean.validate(42), {
      issues: [{ message: "Expected boolean. Received: 42" }],
    });
    assertEquals(isBoolean.validate(null), {
      issues: [{ message: "Expected boolean. Received: null" }],
    });
    assertEquals(isBoolean.validate(undefined), {
      issues: [{ message: "Expected boolean. Received: undefined" }],
    });
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isBoolean.strict(TEST_VALUES.boolean);
    isBoolean.strict(TEST_VALUES.booleanFalse);

    // Invalid inputs throw
    assertThrows(() => isBoolean.strict(TEST_VALUES.string));
    assertThrows(() => isBoolean.strict(TEST_VALUES.number));
    assertThrows(() => isBoolean.strict(TEST_VALUES.nullValue));
    assertThrows(() => isBoolean.strict(TEST_VALUES.undefinedValue));
  });

  await t.step("assert mode", () => {
    const assertIsBoolean: typeof isBoolean.assert = isBoolean.assert;

    // Valid inputs don't throw
    assertIsBoolean(TEST_VALUES.boolean);
    assertIsBoolean(TEST_VALUES.booleanFalse);

    // Invalid inputs throw
    assertThrows(() => assertIsBoolean(TEST_VALUES.string));
    assertThrows(() => assertIsBoolean(TEST_VALUES.number));
    assertThrows(() => assertIsBoolean(TEST_VALUES.nullValue));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isBoolean.optional(TEST_VALUES.boolean));
    assert(isBoolean.optional(TEST_VALUES.booleanFalse));
    assert(isBoolean.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isBoolean.optional(TEST_VALUES.string));
    assertFalse(isBoolean.optional(TEST_VALUES.nullValue));
    assertFalse(isBoolean.optional(TEST_VALUES.number));
  });
});

Deno.test("isString", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isString(TEST_VALUES.string));
    assert(isString(TEST_VALUES.emptyString));

    // Invalid inputs
    assertFalse(isString(TEST_VALUES.number));
    assertFalse(isString(TEST_VALUES.boolean));
    assertFalse(isString(TEST_VALUES.nullValue));
    assertFalse(isString(TEST_VALUES.undefinedValue));
    assertFalse(isString(TEST_VALUES.object));
    assertFalse(isString(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isString.strict(TEST_VALUES.string);
    isString.strict(TEST_VALUES.emptyString);

    // Invalid inputs throw
    assertThrows(() => isString.strict(TEST_VALUES.number));
    assertThrows(() => isString.strict(TEST_VALUES.boolean));
    assertThrows(() => isString.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsString: typeof isString.assert = isString.assert;

    // Valid inputs don't throw
    assertIsString(TEST_VALUES.string);
    assertIsString(TEST_VALUES.emptyString);

    // Invalid inputs throw
    assertThrows(() => assertIsString(TEST_VALUES.number));
    assertThrows(() => assertIsString(TEST_VALUES.boolean));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isString.optional(TEST_VALUES.string));
    assert(isString.optional(TEST_VALUES.emptyString));
    assert(isString.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isString.optional(TEST_VALUES.number));
    assertFalse(isString.optional(TEST_VALUES.nullValue));
  });

  await t.step("optional.notEmpty mode", () => {
    // Valid inputs
    assert(isString.optional.notEmpty(TEST_VALUES.string));
    assert(isString.optional.notEmpty(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isString.optional.notEmpty(TEST_VALUES.number));
    assertFalse(isString.optional.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isString.optional.notEmpty(TEST_VALUES.emptyString));
  });

  await t.step("notEmpty mode", () => {
    // Valid inputs
    assert(isString.notEmpty(TEST_VALUES.string));

    // Invalid inputs (empty string is considered empty)
    assertFalse(isString.notEmpty(TEST_VALUES.emptyString));
    assertFalse(isString.notEmpty(TEST_VALUES.number));
    assertFalse(isString.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isString.notEmpty(TEST_VALUES.undefinedValue));
  });

  await t.step("notEmpty.optional mode", () => {
    // Valid inputs
    assert(isString.notEmpty.optional(TEST_VALUES.string));
    assert(isString.notEmpty.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isString.notEmpty.optional(TEST_VALUES.emptyString));
    assertFalse(isString.notEmpty.optional(TEST_VALUES.number));
    assertFalse(isString.notEmpty.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isString.validate("hello"), { value: "hello" });
    assertEquals(isString.validate(""), { value: "" });

    // Invalid inputs return issues with specific error message
    assertEquals(isString.validate(42), {
      issues: [{ message: "Expected string. Received: 42" }],
    });
    assertEquals(isString.validate(true), {
      issues: [{ message: "Expected string. Received: true" }],
    });
    assertEquals(isString.validate(null), {
      issues: [{ message: "Expected string. Received: null" }],
    });
    assertEquals(isString.validate({ a: 1 }), {
      issues: [{ message: 'Expected string. Received: {"a":1}' }],
    });
  });

  await t.step("notEmpty.validate method", () => {
    // Valid inputs return value
    assertEquals(isString.notEmpty.validate("hello"), { value: "hello" });

    // Invalid inputs return issues with specific error message
    assertEquals(isString.notEmpty.validate(""), {
      issues: [{ message: "Expected non-empty string. Received: ''" }],
    });
    assertEquals(isString.notEmpty.validate("   "), {
      issues: [{ message: "Expected non-empty string. Received: '   '" }],
    });
    assertEquals(isString.notEmpty.validate(42), {
      issues: [{ message: "Expected non-empty string. Received: 42" }],
    });
  });
});

Deno.test("isNumber", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isNumber(TEST_VALUES.number));
    assert(isNumber(TEST_VALUES.zero));
    assert(isNumber(TEST_VALUES.float));
    assert(isNumber(TEST_VALUES.infinity));
    assert(isNumber(TEST_VALUES.negativeInfinity));

    // Invalid inputs
    assertFalse(isNumber(TEST_VALUES.string));
    assertFalse(isNumber(TEST_VALUES.numericString));
    assertFalse(isNumber(TEST_VALUES.boolean));
    assertFalse(isNumber(TEST_VALUES.nullValue));
    assertFalse(isNumber(TEST_VALUES.undefinedValue));
    assertFalse(isNumber(TEST_VALUES.object));
    assertFalse(isNumber(TEST_VALUES.array));
    assertFalse(isNumber(TEST_VALUES.nan));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isNumber.strict(TEST_VALUES.number);
    isNumber.strict(TEST_VALUES.zero);
    isNumber.strict(TEST_VALUES.float);

    // Invalid inputs throw
    assertThrows(() => isNumber.strict(TEST_VALUES.string));
    assertThrows(() => isNumber.strict(TEST_VALUES.numericString));
    assertThrows(() => isNumber.strict(TEST_VALUES.boolean));
  });

  await t.step("assert mode", () => {
    const assertIsNumber: typeof isNumber.assert = isNumber.assert;

    // Valid inputs don't throw
    assertIsNumber(TEST_VALUES.number);
    assertIsNumber(TEST_VALUES.zero);
    assertIsNumber(TEST_VALUES.float);

    // Invalid inputs throw
    assertThrows(() => assertIsNumber(TEST_VALUES.string));
    assertThrows(() => assertIsNumber(TEST_VALUES.numericString));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isNumber.optional(TEST_VALUES.number));
    assert(isNumber.optional(TEST_VALUES.zero));
    assert(isNumber.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isNumber.optional(TEST_VALUES.string));
    assertFalse(isNumber.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isNumber.validate(42), { value: 42 });
    assertEquals(isNumber.validate(0), { value: 0 });
    assertEquals(isNumber.validate(3.14), { value: 3.14 });

    // Invalid inputs return issues with specific error message
    assertEquals(isNumber.validate("42"), {
      issues: [{ message: "Expected number. Received: '42'" }],
    });
    assertEquals(isNumber.validate(NaN), {
      issues: [{ message: "Expected number. Received: NaN" }],
    });
    assertEquals(isNumber.validate(null), {
      issues: [{ message: "Expected number. Received: null" }],
    });
    assertEquals(isNumber.validate([1, 2, 3]), {
      issues: [{ message: "Expected number. Received: [1,2,3]" }],
    });
  });
});

Deno.test("isBinary", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isBinary(TEST_VALUES.binaryZero));
    assert(isBinary(TEST_VALUES.binaryOne));

    // Invalid inputs
    assertFalse(isBinary(TEST_VALUES.number)); // 42
    assertFalse(isBinary(TEST_VALUES.float));
    assertFalse(isBinary(TEST_VALUES.nan));
    assertFalse(isBinary(TEST_VALUES.string));
    assertFalse(isBinary(TEST_VALUES.boolean));
    assertFalse(isBinary(TEST_VALUES.nullValue));
    assertFalse(isBinary(TEST_VALUES.undefinedValue));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isBinary.strict(TEST_VALUES.binaryZero);
    isBinary.strict(TEST_VALUES.binaryOne);

    // Invalid inputs throw
    assertThrows(() => isBinary.strict(TEST_VALUES.number));
    assertThrows(() => isBinary.strict(TEST_VALUES.float));
    assertThrows(() => isBinary.strict(TEST_VALUES.string));
  });

  await t.step("assert mode", () => {
    const assertIsBinary: typeof isBinary.assert = isBinary.assert;

    // Valid inputs don't throw
    assertIsBinary(TEST_VALUES.binaryZero);
    assertIsBinary(TEST_VALUES.binaryOne);

    // Invalid inputs throw
    assertThrows(() => assertIsBinary(TEST_VALUES.number));
    assertThrows(() => assertIsBinary(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isBinary.optional(TEST_VALUES.binaryZero));
    assert(isBinary.optional(TEST_VALUES.binaryOne));
    assert(isBinary.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isBinary.optional(TEST_VALUES.number));
    assertFalse(isBinary.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isBinary.validate(0), { value: 0 });
    assertEquals(isBinary.validate(1), { value: 1 });

    // Invalid inputs return issues with specific error message
    assertEquals(isBinary.validate(2), {
      issues: [{ message: "Expected binary. Received: 2" }],
    });
    assertEquals(isBinary.validate(-1), {
      issues: [{ message: "Expected binary. Received: -1" }],
    });
    assertEquals(isBinary.validate("1"), {
      issues: [{ message: "Expected binary. Received: '1'" }],
    });
  });
});

Deno.test("isNumeric", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isNumeric(TEST_VALUES.number));
    assert(isNumeric(TEST_VALUES.zero));
    assert(isNumeric(TEST_VALUES.float));
    assert(isNumeric(TEST_VALUES.numericString));
    assert(isNumeric("0"));
    assert(isNumeric("-42"));
    assert(isNumeric("3.14"));

    // Invalid inputs
    assertFalse(isNumeric(TEST_VALUES.nan)); // NaN is not numeric
    assertFalse(isNumeric(TEST_VALUES.invalidNumericString));
    assertFalse(isNumeric(TEST_VALUES.emptyString));
    assertFalse(isNumeric(TEST_VALUES.boolean));
    assertFalse(isNumeric(TEST_VALUES.nullValue));
    assertFalse(isNumeric(TEST_VALUES.undefinedValue));
    assertFalse(isNumeric(TEST_VALUES.object));
    assertFalse(isNumeric(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isNumeric.strict(TEST_VALUES.number);
    isNumeric.strict(TEST_VALUES.numericString);

    // Invalid inputs throw
    assertThrows(() => isNumeric.strict(TEST_VALUES.invalidNumericString));
    assertThrows(() => isNumeric.strict(TEST_VALUES.boolean));
  });

  await t.step("assert mode", () => {
    const assertIsNumeric: typeof isNumeric.assert = isNumeric.assert;

    // Valid inputs don't throw
    assertIsNumeric(TEST_VALUES.number);
    assertIsNumeric(TEST_VALUES.numericString);

    // Invalid inputs throw
    assertThrows(() => assertIsNumeric(TEST_VALUES.invalidNumericString));
    assertThrows(() => assertIsNumeric(TEST_VALUES.boolean));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isNumeric.optional(TEST_VALUES.number));
    assert(isNumeric.optional(TEST_VALUES.numericString));
    assert(isNumeric.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isNumeric.optional(TEST_VALUES.invalidNumericString));
    assertFalse(isNumeric.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isNumeric.validate(42), { value: 42 });
    // Numeric strings are valid and return the original string value (typed as number)
    const numericStrResult = isNumeric.validate("123");
    assert("value" in numericStrResult);
    assertEquals(Number(numericStrResult.value), 123);

    // Invalid inputs return issues with specific error message
    assertEquals(isNumeric.validate("abc"), {
      issues: [{ message: "Expected numeric. Received: 'abc'" }],
    });
    assertEquals(isNumeric.validate(""), {
      issues: [{ message: "Expected numeric. Received: ''" }],
    });
    assertEquals(isNumeric.validate(null), {
      issues: [{ message: "Expected numeric. Received: null" }],
    });
  });
});

Deno.test("isFunction", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isFunction(TEST_VALUES.function));
    assert(isFunction(() => {}));
    assert(isFunction(function () {}));
    assert(isFunction(Math.max));

    // Invalid inputs
    assertFalse(isFunction(TEST_VALUES.string));
    assertFalse(isFunction(TEST_VALUES.number));
    assertFalse(isFunction(TEST_VALUES.boolean));
    assertFalse(isFunction(TEST_VALUES.nullValue));
    assertFalse(isFunction(TEST_VALUES.undefinedValue));
    assertFalse(isFunction(TEST_VALUES.object));
    assertFalse(isFunction(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isFunction.strict(TEST_VALUES.function);
    isFunction.strict(Math.max);

    // Invalid inputs throw
    assertThrows(() => isFunction.strict(TEST_VALUES.string));
    assertThrows(() => isFunction.strict(TEST_VALUES.number));
  });

  await t.step("assert mode", () => {
    const assertIsFunction: typeof isFunction.assert = isFunction.assert;

    // Valid inputs don't throw
    assertIsFunction(TEST_VALUES.function);
    assertIsFunction(Math.max);

    // Invalid inputs throw
    assertThrows(() => assertIsFunction(TEST_VALUES.string));
    assertThrows(() => assertIsFunction(TEST_VALUES.number));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isFunction.optional(TEST_VALUES.function));
    assert(isFunction.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isFunction.optional(TEST_VALUES.string));
    assertFalse(isFunction.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    const fn = () => {};
    // Valid inputs return value
    assertEquals(isFunction.validate(fn), { value: fn });

    // Invalid inputs return issues with specific error message
    assertEquals(isFunction.validate("function"), {
      issues: [{ message: "Expected function. Received: 'function'" }],
    });
    assertEquals(isFunction.validate(42), {
      issues: [{ message: "Expected function. Received: 42" }],
    });
    assertEquals(isFunction.validate(null), {
      issues: [{ message: "Expected function. Received: null" }],
    });
  });
});

Deno.test("isSymbol", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isSymbol(TEST_VALUES.symbol));
    assert(isSymbol(TEST_VALUES.symbolFor));
    assert(isSymbol(TEST_VALUES.symbolIterator));
    assert(isSymbol(Symbol("another")));
    assert(isSymbol(Symbol.asyncIterator));

    // Invalid inputs
    assertFalse(isSymbol(TEST_VALUES.string));
    assertFalse(isSymbol(TEST_VALUES.number));
    assertFalse(isSymbol(TEST_VALUES.boolean));
    assertFalse(isSymbol(TEST_VALUES.nullValue));
    assertFalse(isSymbol(TEST_VALUES.undefinedValue));
    assertFalse(isSymbol(TEST_VALUES.object));
    assertFalse(isSymbol(TEST_VALUES.array));
    assertFalse(isSymbol(TEST_VALUES.function));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isSymbol.strict(TEST_VALUES.symbol);
    isSymbol.strict(TEST_VALUES.symbolFor);
    isSymbol.strict(TEST_VALUES.symbolIterator);

    // Invalid inputs throw
    assertThrows(() => isSymbol.strict(TEST_VALUES.string));
    assertThrows(() => isSymbol.strict(TEST_VALUES.number));
    assertThrows(() => isSymbol.strict(TEST_VALUES.boolean));
    assertThrows(() => isSymbol.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsSymbol: typeof isSymbol.assert = isSymbol.assert;

    // Valid inputs don't throw
    assertIsSymbol(TEST_VALUES.symbol);
    assertIsSymbol(TEST_VALUES.symbolFor);
    assertIsSymbol(TEST_VALUES.symbolIterator);

    // Invalid inputs throw
    assertThrows(() => assertIsSymbol(TEST_VALUES.string));
    assertThrows(() => assertIsSymbol(TEST_VALUES.number));
    assertThrows(() => assertIsSymbol(TEST_VALUES.boolean));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isSymbol.optional(TEST_VALUES.symbol));
    assert(isSymbol.optional(TEST_VALUES.symbolFor));
    assert(isSymbol.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isSymbol.optional(TEST_VALUES.string));
    assertFalse(isSymbol.optional(TEST_VALUES.number));
    assertFalse(isSymbol.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    const sym = Symbol("test");
    // Valid inputs return value
    assertEquals(isSymbol.validate(sym), { value: sym });

    // Invalid inputs return issues with specific error message
    assertEquals(isSymbol.validate("symbol"), {
      issues: [{ message: "Expected symbol. Received: 'symbol'" }],
    });
    assertEquals(isSymbol.validate(42), {
      issues: [{ message: "Expected symbol. Received: 42" }],
    });
    assertEquals(isSymbol.validate(null), {
      issues: [{ message: "Expected symbol. Received: null" }],
    });
  });
});

Deno.test("isPropertyKey", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs - strings
    assert(isPropertyKey(TEST_VALUES.string));
    assert(isPropertyKey(TEST_VALUES.emptyString));
    assert(isPropertyKey("propertyName"));

    // Valid inputs - numbers
    assert(isPropertyKey(TEST_VALUES.number));
    assert(isPropertyKey(TEST_VALUES.zero));
    assert(isPropertyKey(TEST_VALUES.float));
    assert(isPropertyKey(42));

    // Valid inputs - symbols
    assert(isPropertyKey(TEST_VALUES.symbol));
    assert(isPropertyKey(TEST_VALUES.symbolFor));
    assert(isPropertyKey(TEST_VALUES.symbolIterator));
    assert(isPropertyKey(Symbol("key")));

    // Invalid inputs
    assertFalse(isPropertyKey(TEST_VALUES.boolean));
    assertFalse(isPropertyKey(TEST_VALUES.nullValue));
    assertFalse(isPropertyKey(TEST_VALUES.undefinedValue));
    assertFalse(isPropertyKey(TEST_VALUES.object));
    assertFalse(isPropertyKey(TEST_VALUES.array));
    assertFalse(isPropertyKey(TEST_VALUES.function));
    assertFalse(isPropertyKey(TEST_VALUES.nan));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isPropertyKey.strict(TEST_VALUES.string);
    isPropertyKey.strict(TEST_VALUES.number);
    isPropertyKey.strict(TEST_VALUES.symbol);
    isPropertyKey.strict(TEST_VALUES.symbolFor);

    // Invalid inputs throw
    assertThrows(() => isPropertyKey.strict(TEST_VALUES.boolean));
    assertThrows(() => isPropertyKey.strict(TEST_VALUES.nullValue));
    assertThrows(() => isPropertyKey.strict(TEST_VALUES.undefinedValue));
    assertThrows(() => isPropertyKey.strict(TEST_VALUES.object));
    assertThrows(() => isPropertyKey.strict(TEST_VALUES.array));
  });

  await t.step("assert mode", () => {
    const assertIsPropertyKey: typeof isPropertyKey.assert = isPropertyKey.assert;

    // Valid inputs don't throw
    assertIsPropertyKey(TEST_VALUES.string);
    assertIsPropertyKey(TEST_VALUES.number);
    assertIsPropertyKey(TEST_VALUES.symbol);
    assertIsPropertyKey(TEST_VALUES.symbolIterator);

    // Invalid inputs throw
    assertThrows(() => assertIsPropertyKey(TEST_VALUES.boolean));
    assertThrows(() => assertIsPropertyKey(TEST_VALUES.nullValue));
    assertThrows(() => assertIsPropertyKey(TEST_VALUES.undefinedValue));
    assertThrows(() => assertIsPropertyKey(TEST_VALUES.object));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isPropertyKey.optional(TEST_VALUES.string));
    assert(isPropertyKey.optional(TEST_VALUES.number));
    assert(isPropertyKey.optional(TEST_VALUES.symbol));
    assert(isPropertyKey.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isPropertyKey.optional(TEST_VALUES.boolean));
    assertFalse(isPropertyKey.optional(TEST_VALUES.nullValue));
    assertFalse(isPropertyKey.optional(TEST_VALUES.object));
    assertFalse(isPropertyKey.optional(TEST_VALUES.array));
  });
});

// === Special Type Guards ===

Deno.test("isNull", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isNull(TEST_VALUES.nullValue));

    // Invalid inputs
    assertFalse(isNull(TEST_VALUES.undefinedValue));
    assertFalse(isNull(TEST_VALUES.string));
    assertFalse(isNull(TEST_VALUES.number));
    assertFalse(isNull(TEST_VALUES.zero));
    assertFalse(isNull(TEST_VALUES.boolean));
    assertFalse(isNull(TEST_VALUES.booleanFalse));
    assertFalse(isNull(TEST_VALUES.object));
    assertFalse(isNull(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isNull.strict(TEST_VALUES.nullValue);

    // Invalid inputs throw
    assertThrows(() => isNull.strict(TEST_VALUES.undefinedValue));
    assertThrows(() => isNull.strict(TEST_VALUES.string));
    assertThrows(() => isNull.strict(TEST_VALUES.number));
    assertThrows(() => isNull.strict(TEST_VALUES.boolean));
  });

  await t.step("assert mode", () => {
    const assertIsNull: typeof isNull.assert = isNull.assert;

    // Valid inputs don't throw
    assertIsNull(TEST_VALUES.nullValue);

    // Invalid inputs throw
    assertThrows(() => assertIsNull(TEST_VALUES.undefinedValue));
    assertThrows(() => assertIsNull(TEST_VALUES.string));
    assertThrows(() => assertIsNull(TEST_VALUES.number));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isNull.optional(TEST_VALUES.nullValue));
    assert(isNull.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isNull.optional(TEST_VALUES.string));
    assertFalse(isNull.optional(TEST_VALUES.number));
    assertFalse(isNull.optional(TEST_VALUES.boolean));
    assertFalse(isNull.optional(TEST_VALUES.object));
  });

  await t.step("validate method", () => {
    // Valid inputs return value (null returns true as the value)
    assertEquals(isNull.validate(null), { value: null });

    // Invalid inputs return issues with specific error message
    assertEquals(isNull.validate(undefined), {
      issues: [{ message: "Expected null. Received: undefined" }],
    });
    assertEquals(isNull.validate("null"), {
      issues: [{ message: "Expected null. Received: 'null'" }],
    });
    assertEquals(isNull.validate(0), {
      issues: [{ message: "Expected null. Received: 0" }],
    });
  });
});

Deno.test("isUndefined", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isUndefined(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isUndefined(TEST_VALUES.nullValue));
    assertFalse(isUndefined(TEST_VALUES.string));
    assertFalse(isUndefined(TEST_VALUES.number));
    assertFalse(isUndefined(TEST_VALUES.zero));
    assertFalse(isUndefined(TEST_VALUES.boolean));
    assertFalse(isUndefined(TEST_VALUES.booleanFalse));
    assertFalse(isUndefined(TEST_VALUES.object));
    assertFalse(isUndefined(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isUndefined.strict(TEST_VALUES.undefinedValue);

    // Invalid inputs throw
    assertThrows(() => isUndefined.strict(TEST_VALUES.nullValue));
    assertThrows(() => isUndefined.strict(TEST_VALUES.string));
    assertThrows(() => isUndefined.strict(TEST_VALUES.number));
  });

  await t.step("assert mode", () => {
    const assertIsUndefined: typeof isUndefined.assert = isUndefined.assert;

    // Valid inputs don't throw
    assertIsUndefined(TEST_VALUES.undefinedValue);

    // Invalid inputs throw
    assertThrows(() => assertIsUndefined(TEST_VALUES.nullValue));
    assertThrows(() => assertIsUndefined(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    // Valid inputs (undefined optional is always undefined)
    assert(isUndefined.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isUndefined.optional(TEST_VALUES.nullValue));
    assertFalse(isUndefined.optional(TEST_VALUES.string));
    assertFalse(isUndefined.optional(TEST_VALUES.number));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isUndefined.validate(undefined), { value: undefined });

    // Invalid inputs return issues with specific error message
    assertEquals(isUndefined.validate(null), {
      issues: [{ message: "Expected undefined. Received: null" }],
    });
    assertEquals(isUndefined.validate("undefined"), {
      issues: [{ message: "Expected undefined. Received: 'undefined'" }],
    });
    assertEquals(isUndefined.validate(0), {
      issues: [{ message: "Expected undefined. Received: 0" }],
    });
  });
});

Deno.test("isNil", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isNil(TEST_VALUES.nullValue));
    assert(isNil(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isNil(TEST_VALUES.string));
    assertFalse(isNil(TEST_VALUES.emptyString));
    assertFalse(isNil(TEST_VALUES.number));
    assertFalse(isNil(TEST_VALUES.zero));
    assertFalse(isNil(TEST_VALUES.boolean));
    assertFalse(isNil(TEST_VALUES.booleanFalse));
    assertFalse(isNil(TEST_VALUES.object));
    assertFalse(isNil(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isNil.strict(TEST_VALUES.nullValue);
    isNil.strict(TEST_VALUES.undefinedValue);

    // Invalid inputs throw
    assertThrows(() => isNil.strict(TEST_VALUES.string));
    assertThrows(() => isNil.strict(TEST_VALUES.number));
    assertThrows(() => isNil.strict(TEST_VALUES.boolean));
  });

  await t.step("assert mode", () => {
    const assertIsNil: typeof isNil.assert = isNil.assert;

    // Valid inputs don't throw
    assertIsNil(TEST_VALUES.nullValue);
    assertIsNil(TEST_VALUES.undefinedValue);

    // Invalid inputs throw
    assertThrows(() => assertIsNil(TEST_VALUES.string));
    assertThrows(() => assertIsNil(TEST_VALUES.number));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isNil.validate(null), { value: null });
    assertEquals(isNil.validate(undefined), { value: undefined });

    // Invalid inputs return issues with specific error message (union type name)
    assertEquals(isNil.validate("test"), {
      issues: [{ message: "Expected null | undefined. Received: 'test'" }],
    });
    assertEquals(isNil.validate(0), {
      issues: [{ message: "Expected null | undefined. Received: 0" }],
    });
  });
});

Deno.test("isEmpty", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs (empty values)
    assert(isEmpty(TEST_VALUES.nullValue));
    assert(isEmpty(TEST_VALUES.undefinedValue));
    assert(isEmpty(TEST_VALUES.emptyString));
    assert(isEmpty(TEST_VALUES.emptyObject));
    assert(isEmpty(TEST_VALUES.emptyArray));
    assert(isEmpty(TEST_VALUES.whitespaceString));

    // Invalid inputs (non-empty values)
    assertFalse(isEmpty(TEST_VALUES.string));
    assertFalse(isEmpty(TEST_VALUES.number));
    assertFalse(isEmpty(TEST_VALUES.zero)); // 0 is not considered empty for numbers
    assertFalse(isEmpty(TEST_VALUES.boolean));
    assertFalse(isEmpty(TEST_VALUES.booleanFalse)); // false is not empty
    assertFalse(isEmpty(TEST_VALUES.object));
    assertFalse(isEmpty(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isEmpty.strict(TEST_VALUES.nullValue);
    isEmpty.strict(TEST_VALUES.undefinedValue);
    isEmpty.strict(TEST_VALUES.emptyString);
    isEmpty.strict(TEST_VALUES.emptyObject);
    isEmpty.strict(TEST_VALUES.emptyArray);

    // Invalid inputs throw
    assertThrows(() => isEmpty.strict(TEST_VALUES.string));
    assertThrows(() => isEmpty.strict(TEST_VALUES.number));
    assertThrows(() => isEmpty.strict(TEST_VALUES.boolean));
  });

  await t.step("assert mode", () => {
    const assertIsEmpty: typeof isEmpty.assert = isEmpty.assert;

    // Valid inputs don't throw
    assertIsEmpty(TEST_VALUES.nullValue);
    assertIsEmpty(TEST_VALUES.undefinedValue);
    assertIsEmpty(TEST_VALUES.emptyString);
    assertIsEmpty(TEST_VALUES.emptyObject);
    assertIsEmpty(TEST_VALUES.emptyArray);

    // Invalid inputs throw
    assertThrows(() => assertIsEmpty(TEST_VALUES.string));
    assertThrows(() => assertIsEmpty(TEST_VALUES.number));
  });
});

// === Complex Type Guards ===

Deno.test("isObject", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isObject(TEST_VALUES.object));
    assert(isObject(TEST_VALUES.emptyObject));
    assert(isObject(TEST_VALUES.date)); // Date objects are objects

    // Invalid inputs
    assertFalse(isObject(TEST_VALUES.array)); // Arrays are not objects in this guard
    assertFalse(isObject(TEST_VALUES.string));
    assertFalse(isObject(TEST_VALUES.number));
    assertFalse(isObject(TEST_VALUES.boolean));
    assertFalse(isObject(TEST_VALUES.nullValue));
    assertFalse(isObject(TEST_VALUES.undefinedValue));
    assertFalse(isObject(TEST_VALUES.function));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isObject.strict(TEST_VALUES.object);
    isObject.strict(TEST_VALUES.emptyObject);
    isObject.strict(TEST_VALUES.date);

    // Invalid inputs throw
    assertThrows(() => isObject.strict(TEST_VALUES.array));
    assertThrows(() => isObject.strict(TEST_VALUES.string));
    assertThrows(() => isObject.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsObject: typeof isObject.assert = isObject.assert;

    // Valid inputs don't throw
    assertIsObject(TEST_VALUES.object);
    assertIsObject(TEST_VALUES.emptyObject);
    assertIsObject(TEST_VALUES.date);

    // Invalid inputs throw
    assertThrows(() => assertIsObject(TEST_VALUES.array));
    assertThrows(() => assertIsObject(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isObject.optional(TEST_VALUES.object));
    assert(isObject.optional(TEST_VALUES.emptyObject));
    assert(isObject.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isObject.optional(TEST_VALUES.array));
    assertFalse(isObject.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isObject.validate({ a: 1 }), { value: { a: 1 } });
    assertEquals(isObject.validate({}), { value: {} });

    // Invalid inputs return issues with specific error message
    assertEquals(isObject.validate([1, 2, 3]), {
      issues: [{ message: "Expected object. Received: [1,2,3]" }],
    });
    assertEquals(isObject.validate("object"), {
      issues: [{ message: "Expected object. Received: 'object'" }],
    });
    assertEquals(isObject.validate(null), {
      issues: [{ message: "Expected object. Received: null" }],
    });
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

Deno.test("isDate", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isDate(TEST_VALUES.date));
    assert(isDate(new Date("2023-01-01")));
    assert(isDate(new Date("2023-01-01T00:00:00.000Z")));

    // Invalid inputs
    assertFalse(isDate("2023-01-01")); // String date
    assertFalse(isDate(1672531200000)); // Timestamp
    assertFalse(isDate(TEST_VALUES.object));
    assertFalse(isDate(TEST_VALUES.string));
    assertFalse(isDate(TEST_VALUES.number));
    assertFalse(isDate(TEST_VALUES.nullValue));
    assertFalse(isDate(TEST_VALUES.undefinedValue));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isDate.strict(TEST_VALUES.date);
    isDate.strict(new Date("2023-01-01"));

    // Invalid inputs throw
    assertThrows(() => isDate.strict("2023-01-01"));
    assertThrows(() => isDate.strict(1672531200000));
    assertThrows(() => isDate.strict(TEST_VALUES.object));
  });

  await t.step("assert mode", () => {
    const assertIsDate: typeof isDate.assert = isDate.assert;

    // Valid inputs don't throw
    assertIsDate(TEST_VALUES.date);
    assertIsDate(new Date("2023-01-01"));

    // Invalid inputs throw
    assertThrows(() => assertIsDate("2023-01-01"));
    assertThrows(() => assertIsDate(1672531200000));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isDate.optional(TEST_VALUES.date));
    assert(isDate.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isDate.optional("2023-01-01"));
    assertFalse(isDate.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    const date = new Date("2023-01-01");
    // Valid inputs return value
    assertEquals(isDate.validate(date), { value: date });

    // Invalid inputs return issues with specific error message
    assertEquals(isDate.validate("2023-01-01"), {
      issues: [{ message: "Expected Date. Received: '2023-01-01'" }],
    });
    assertEquals(isDate.validate(1672531200000), {
      issues: [{ message: "Expected Date. Received: 1672531200000" }],
    });
    assertEquals(isDate.validate(null), {
      issues: [{ message: "Expected Date. Received: null" }],
    });
  });
});

Deno.test("isIterable", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isIterable(TEST_VALUES.iterator));
    assert(isIterable(TEST_VALUES.array)); // Arrays are iterable

    // Invalid inputs
    assertFalse(isIterable("string")); // Strings are iterable but this function requires objects
    assertFalse(isIterable(TEST_VALUES.object));
    assertFalse(isIterable(TEST_VALUES.number));
    assertFalse(isIterable(TEST_VALUES.boolean));
    assertFalse(isIterable(TEST_VALUES.nullValue));
    assertFalse(isIterable(TEST_VALUES.undefinedValue));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isIterable.strict(TEST_VALUES.iterator);
    isIterable.strict(TEST_VALUES.array);

    // Invalid inputs throw
    assertThrows(() => isIterable.strict(TEST_VALUES.object));
    assertThrows(() => isIterable.strict(TEST_VALUES.number));
    assertThrows(() => isIterable.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsIterable: typeof isIterable.assert = isIterable.assert;

    // Valid inputs don't throw
    assertIsIterable(TEST_VALUES.iterator);
    assertIsIterable(TEST_VALUES.array);

    // Invalid inputs throw
    assertThrows(() => assertIsIterable(TEST_VALUES.object));
    assertThrows(() => assertIsIterable(TEST_VALUES.number));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isIterable.optional(TEST_VALUES.iterator));
    assert(isIterable.optional(TEST_VALUES.array));
    assert(isIterable.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isIterable.optional(TEST_VALUES.object));
    assertFalse(isIterable.optional(TEST_VALUES.nullValue));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    const arr = [1, 2, 3];
    assertEquals(isIterable.validate(arr), { value: arr });

    // Invalid inputs return issues with specific error message
    assertEquals(isIterable.validate({ a: 1 }), {
      issues: [{ message: 'Expected Iterable. Received: {"a":1}' }],
    });
    assertEquals(isIterable.validate(42), {
      issues: [{ message: "Expected Iterable. Received: 42" }],
    });
    assertEquals(isIterable.validate(null), {
      issues: [{ message: "Expected Iterable. Received: null" }],
    });
  });
});

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

// === JSON Type Guards ===

Deno.test("isJsonPrimitive", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isJsonPrimitive(TEST_VALUES.boolean));
    assert(isJsonPrimitive(TEST_VALUES.booleanFalse));
    assert(isJsonPrimitive(TEST_VALUES.number));
    assert(isJsonPrimitive(TEST_VALUES.string));
    assert(isJsonPrimitive(TEST_VALUES.nullValue));

    // Invalid inputs
    assertFalse(isJsonPrimitive(TEST_VALUES.nan)); // NaN is not valid JSON
    assertFalse(isJsonPrimitive(TEST_VALUES.undefinedValue)); // undefined is not JSON
    assertFalse(isJsonPrimitive(TEST_VALUES.object));
    assertFalse(isJsonPrimitive(TEST_VALUES.array));
    assertFalse(isJsonPrimitive(TEST_VALUES.function));
    assertFalse(isJsonPrimitive(TEST_VALUES.date));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isJsonPrimitive.strict(TEST_VALUES.boolean);
    isJsonPrimitive.strict(TEST_VALUES.number);
    isJsonPrimitive.strict(TEST_VALUES.string);
    isJsonPrimitive.strict(TEST_VALUES.nullValue);

    // Invalid inputs throw
    assertThrows(() => isJsonPrimitive.strict(TEST_VALUES.undefinedValue));
    assertThrows(() => isJsonPrimitive.strict(TEST_VALUES.object));
    assertThrows(() => isJsonPrimitive.strict(TEST_VALUES.function));
  });

  await t.step("assert mode", () => {
    const assertIsJsonPrimitive: typeof isJsonPrimitive.assert = isJsonPrimitive.assert;

    // Valid inputs don't throw
    assertIsJsonPrimitive(TEST_VALUES.boolean);
    assertIsJsonPrimitive(TEST_VALUES.number);
    assertIsJsonPrimitive(TEST_VALUES.string);
    assertIsJsonPrimitive(TEST_VALUES.nullValue);

    // Invalid inputs throw
    assertThrows(() => assertIsJsonPrimitive(TEST_VALUES.undefinedValue));
    assertThrows(() => assertIsJsonPrimitive(TEST_VALUES.object));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isJsonPrimitive.optional(TEST_VALUES.boolean));
    assert(isJsonPrimitive.optional(TEST_VALUES.string));
    assert(isJsonPrimitive.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isJsonPrimitive.optional(TEST_VALUES.object));
    assertFalse(isJsonPrimitive.optional(TEST_VALUES.function));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isJsonPrimitive.validate("test"), { value: "test" });
    assertEquals(isJsonPrimitive.validate(42), { value: 42 });
    assertEquals(isJsonPrimitive.validate(true), { value: true });
    assertEquals(isJsonPrimitive.validate(null), { value: null });

    // Invalid inputs return issues with specific error message (union type name)
    assertEquals(isJsonPrimitive.validate({ a: 1 }), {
      issues: [{ message: 'Expected boolean | string | number | null. Received: {"a":1}' }],
    });
    assertEquals(isJsonPrimitive.validate(undefined), {
      issues: [{ message: "Expected boolean | string | number | null. Received: undefined" }],
    });
  });
});

Deno.test("isJsonObject", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isJsonObject(TEST_VALUES.object));
    assert(isJsonObject(TEST_VALUES.emptyObject));
    assert(isJsonObject({ a: 1, b: "test", c: null, d: true }));

    // Invalid inputs
    assertFalse(isJsonObject(TEST_VALUES.array)); // Arrays are not objects
    assertFalse(isJsonObject(TEST_VALUES.string));
    assertFalse(isJsonObject(TEST_VALUES.number));
    assertFalse(isJsonObject(TEST_VALUES.nullValue));
    assertFalse(isJsonObject(TEST_VALUES.undefinedValue));
    assertFalse(isJsonObject(TEST_VALUES.date)); // Date objects are not JSON objects
    assertFalse(isJsonObject({ func: TEST_VALUES.function })); // Functions not allowed
    assertFalse(isJsonObject({ date: TEST_VALUES.date })); // Dates not allowed
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isJsonObject.strict(TEST_VALUES.object);
    isJsonObject.strict(TEST_VALUES.emptyObject);

    // Invalid inputs throw
    assertThrows(() => isJsonObject.strict(TEST_VALUES.array));
    assertThrows(() => isJsonObject.strict(TEST_VALUES.string));
    assertThrows(() => isJsonObject.strict({ func: TEST_VALUES.function }));
  });

  await t.step("assert mode", () => {
    const assertIsJsonObject: typeof isJsonObject.assert = isJsonObject.assert;

    // Valid inputs don't throw
    assertIsJsonObject(TEST_VALUES.object);
    assertIsJsonObject(TEST_VALUES.emptyObject);

    // Invalid inputs throw
    assertThrows(() => assertIsJsonObject(TEST_VALUES.array));
    assertThrows(() => assertIsJsonObject({ func: TEST_VALUES.function }));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isJsonObject.optional(TEST_VALUES.object));
    assert(isJsonObject.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isJsonObject.optional(TEST_VALUES.array));
    assertFalse(isJsonObject.optional(TEST_VALUES.nullValue));
  });

  await t.step("notEmpty mode", () => {
    // Valid inputs
    assert(isJsonObject.notEmpty(TEST_VALUES.object));

    // Invalid inputs (empty object is considered empty)
    assertFalse(isJsonObject.notEmpty(TEST_VALUES.emptyObject));
    assertFalse(isJsonObject.notEmpty(TEST_VALUES.array));
    assertFalse(isJsonObject.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isJsonObject.notEmpty(TEST_VALUES.undefinedValue));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isJsonObject.validate({ a: 1 }), { value: { a: 1 } });
    assertEquals(isJsonObject.validate({}), { value: {} });

    // Invalid inputs return issues with specific error message
    assertEquals(isJsonObject.validate([1, 2, 3]), {
      issues: [{ message: "Expected JsonObject. Received: [1,2,3]" }],
    });
    assertEquals(isJsonObject.validate("object"), {
      issues: [{ message: "Expected JsonObject. Received: 'object'" }],
    });
    assertEquals(isJsonObject.validate(null), {
      issues: [{ message: "Expected JsonObject. Received: null" }],
    });
  });
});

Deno.test("isJsonArray", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isJsonArray(TEST_VALUES.array));
    assert(isJsonArray(TEST_VALUES.emptyArray));
    assert(isJsonArray([1, "test", true, null]));

    // Invalid inputs
    assertFalse(isJsonArray(TEST_VALUES.object));
    assertFalse(isJsonArray(TEST_VALUES.string));
    assertFalse(isJsonArray(TEST_VALUES.number));
    assertFalse(isJsonArray(TEST_VALUES.boolean));
    assertFalse(isJsonArray(TEST_VALUES.nullValue));
    assertFalse(isJsonArray(TEST_VALUES.undefinedValue));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isJsonArray.strict(TEST_VALUES.array);
    isJsonArray.strict(TEST_VALUES.emptyArray);

    // Invalid inputs throw
    assertThrows(() => isJsonArray.strict(TEST_VALUES.object));
    assertThrows(() => isJsonArray.strict(TEST_VALUES.string));
    assertThrows(() => isJsonArray.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const assertIsJsonArray: typeof isJsonArray.assert = isJsonArray.assert;

    // Valid inputs don't throw
    assertIsJsonArray(TEST_VALUES.array);
    assertIsJsonArray(TEST_VALUES.emptyArray);

    // Invalid inputs throw
    assertThrows(() => assertIsJsonArray(TEST_VALUES.object));
    assertThrows(() => assertIsJsonArray(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isJsonArray.optional(TEST_VALUES.array));
    assert(isJsonArray.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isJsonArray.optional(TEST_VALUES.object));
    assertFalse(isJsonArray.optional(TEST_VALUES.nullValue));
  });

  await t.step("notEmpty mode", () => {
    // Valid inputs
    assert(isJsonArray.notEmpty(TEST_VALUES.array));

    // Invalid inputs (empty array is considered empty)
    assertFalse(isJsonArray.notEmpty(TEST_VALUES.emptyArray));
    assertFalse(isJsonArray.notEmpty(TEST_VALUES.object));
    assertFalse(isJsonArray.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isJsonArray.notEmpty(TEST_VALUES.undefinedValue));
  });

  await t.step("validate method", () => {
    // Valid inputs return value
    assertEquals(isJsonArray.validate([1, 2, 3]), { value: [1, 2, 3] });
    assertEquals(isJsonArray.validate([]), { value: [] });

    // Invalid inputs return issues with specific error message
    assertEquals(isJsonArray.validate({ a: 1 }), {
      issues: [{ message: 'Expected JsonArray. Received: {"a":1}' }],
    });
    assertEquals(isJsonArray.validate("array"), {
      issues: [{ message: "Expected JsonArray. Received: 'array'" }],
    });
    assertEquals(isJsonArray.validate(null), {
      issues: [{ message: "Expected JsonArray. Received: null" }],
    });
  });
});

Deno.test("isJsonValue", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs - primitives
    assert(isJsonValue(TEST_VALUES.boolean));
    assert(isJsonValue(TEST_VALUES.number));
    assert(isJsonValue(TEST_VALUES.string));
    assert(isJsonValue(TEST_VALUES.nullValue));

    // Valid inputs - arrays and objects
    assert(isJsonValue(TEST_VALUES.array));
    assert(isJsonValue(TEST_VALUES.emptyArray));
    assert(isJsonValue(TEST_VALUES.object));
    assert(isJsonValue(TEST_VALUES.emptyObject));

    // Valid inputs - complex nested structures
    assert(isJsonValue({
      string: "value",
      number: 123,
      boolean: true,
      null: null,
      array: [1, "two", false, null],
      object: { nested: "value" },
    }));

    // Invalid inputs
    assertFalse(isJsonValue(TEST_VALUES.undefinedValue));
    assertFalse(isJsonValue(TEST_VALUES.function));
    assertFalse(isJsonValue(TEST_VALUES.date));
    assertFalse(isJsonValue({ func: TEST_VALUES.function }));
    assertFalse(isJsonValue({ date: TEST_VALUES.date }));
    assertFalse(isJsonValue({ nested: { undef: TEST_VALUES.undefinedValue } }));
  });

  await t.step("strict mode", () => {
    // Valid inputs don't throw
    isJsonValue.strict(TEST_VALUES.boolean);
    isJsonValue.strict(TEST_VALUES.array);
    isJsonValue.strict(TEST_VALUES.object);

    // Invalid inputs throw
    assertThrows(() => isJsonValue.strict(TEST_VALUES.undefinedValue));
    assertThrows(() => isJsonValue.strict(TEST_VALUES.function));
    assertThrows(() => isJsonValue.strict({ func: TEST_VALUES.function }));
  });

  await t.step("assert mode", () => {
    const assertIsJsonValue: typeof isJsonValue.assert = isJsonValue.assert;

    // Valid inputs don't throw
    assertIsJsonValue(TEST_VALUES.boolean);
    assertIsJsonValue(TEST_VALUES.array);
    assertIsJsonValue(TEST_VALUES.object);

    // Invalid inputs throw
    assertThrows(() => assertIsJsonValue(TEST_VALUES.undefinedValue));
    assertThrows(() => assertIsJsonValue({ func: TEST_VALUES.function }));
  });

  await t.step("optional mode", () => {
    // Valid inputs
    assert(isJsonValue.optional(TEST_VALUES.boolean));
    assert(isJsonValue.optional(TEST_VALUES.array));
    assert(isJsonValue.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isJsonValue.optional(TEST_VALUES.function));
    assertFalse(isJsonValue.optional({ func: TEST_VALUES.function }));
  });

  await t.step("notEmpty mode", () => {
    // Valid inputs
    assert(isJsonValue.notEmpty(TEST_VALUES.boolean));
    assert(isJsonValue.notEmpty(TEST_VALUES.number));
    assert(isJsonValue.notEmpty(TEST_VALUES.string));
    assert(isJsonValue.notEmpty(TEST_VALUES.array));
    assert(isJsonValue.notEmpty(TEST_VALUES.object));

    // Invalid inputs (empty values)
    assertFalse(isJsonValue.notEmpty(TEST_VALUES.nullValue));
    assertFalse(isJsonValue.notEmpty(TEST_VALUES.undefinedValue));
    assertFalse(isJsonValue.notEmpty(TEST_VALUES.emptyString));
    assertFalse(isJsonValue.notEmpty(TEST_VALUES.emptyArray));
    assertFalse(isJsonValue.notEmpty(TEST_VALUES.emptyObject));
    assertFalse(isJsonValue.notEmpty(TEST_VALUES.function));
  });
});

// === Utility Functions ===

Deno.test("createTypeGuard", async (t) => {
  await t.step("basic functionality with helper injection", () => {
    const testGuard = createTypeGuard<{ a: string }>((v, { has }) => {
      if (isObject(v) && has(v, "a", isString)) {
        return v;
      }
      return null;
    });

    assertEquals(testGuard({ a: "test" }), true);
    assertEquals(testGuard({}), false);
    assertEquals(testGuard({ a: 123 }), false);
  });

  await t.step("hasNot helper injection", () => {
    // Guard that ensures object has 'a' but NOT 'b'
    const testGuard = createTypeGuard<{ a: string }>((v, { has, hasNot }) => {
      if (isObject(v) && has(v, "a", isString) && hasNot(v, "b")) {
        return v;
      }
      return null;
    });

    // Valid - has 'a' and no 'b'
    assertEquals(testGuard({ a: "test" }), true);
    assertEquals(testGuard({ a: "test", c: "other" }), true);

    // Invalid - missing 'a' or has 'b'
    assertEquals(testGuard({}), false);
    assertEquals(testGuard({ a: 123 }), false);
    assertEquals(testGuard({ a: "test", b: "value" }), false);
    assertEquals(testGuard({ b: "value" }), false);
  });

  await t.step("includes helper injection", () => {
    const validValues = ["red", "green", "blue"] as const;
    const colorGuard = createTypeGuard<typeof validValues[number]>((v, { includes }) => {
      if (includes(validValues, v)) return v;
      return null;
    });

    assert(colorGuard("red"));
    assert(colorGuard("green"));
    assert(colorGuard("blue"));
    assertFalse(colorGuard("yellow"));
    assertFalse(colorGuard(123));
    assertFalse(colorGuard(null));
  });

  await t.step("custom complex parser", () => {
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

    // Test all modes
    isPositiveInteger.strict(5);
    assertThrows(() => isPositiveInteger.strict(-5));

    assert(isPositiveInteger.optional(10));
    assert(isPositiveInteger.optional(TEST_VALUES.undefinedValue));
    assertFalse(isPositiveInteger.optional(-5));
  });

  await t.step("or method - union type guards", () => {
    // Create a union type guard for string | number
    const isStringOrNumber = isString.or(isNumber);

    // Valid inputs - strings
    assert(isStringOrNumber(TEST_VALUES.string));
    assert(isStringOrNumber(TEST_VALUES.emptyString));

    // Valid inputs - numbers
    assert(isStringOrNumber(TEST_VALUES.number));
    assert(isStringOrNumber(TEST_VALUES.zero));
    assert(isStringOrNumber(TEST_VALUES.float));

    // Invalid inputs
    assertFalse(isStringOrNumber(TEST_VALUES.boolean));
    assertFalse(isStringOrNumber(TEST_VALUES.nullValue));
    assertFalse(isStringOrNumber(TEST_VALUES.undefinedValue));
    assertFalse(isStringOrNumber(TEST_VALUES.object));
    assertFalse(isStringOrNumber(TEST_VALUES.array));
  });

  await t.step("or method - complex union types", () => {
    // Create a union type guard for boolean | null | undefined
    const isBooleanOrNil = isBoolean.or(isNil);

    // Valid inputs
    assert(isBooleanOrNil(TEST_VALUES.boolean));
    assert(isBooleanOrNil(TEST_VALUES.booleanFalse));
    assert(isBooleanOrNil(TEST_VALUES.nullValue));
    assert(isBooleanOrNil(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isBooleanOrNil(TEST_VALUES.string));
    assertFalse(isBooleanOrNil(TEST_VALUES.number));
    assertFalse(isBooleanOrNil(TEST_VALUES.object));
    assertFalse(isBooleanOrNil(TEST_VALUES.array));
  });

  await t.step("or method - chained unions", () => {
    // Create a union type guard for string | number | boolean
    const isStringOrNumberOrBoolean = isString.or(isNumber).or(isBoolean);

    // Valid inputs
    assert(isStringOrNumberOrBoolean(TEST_VALUES.string));
    assert(isStringOrNumberOrBoolean(TEST_VALUES.number));
    assert(isStringOrNumberOrBoolean(TEST_VALUES.boolean));
    assert(isStringOrNumberOrBoolean(TEST_VALUES.booleanFalse));

    // Invalid inputs
    assertFalse(isStringOrNumberOrBoolean(TEST_VALUES.nullValue));
    assertFalse(isStringOrNumberOrBoolean(TEST_VALUES.undefinedValue));
    assertFalse(isStringOrNumberOrBoolean(TEST_VALUES.object));
    assertFalse(isStringOrNumberOrBoolean(TEST_VALUES.array));
  });

  await t.step("or method - with custom type guards", () => {
    // Custom type guard for positive numbers
    const isPositive = createTypeGuard<number>((val) => {
      if (typeof val !== "number" || val <= 0) return null;
      return val;
    });

    // Custom type guard for negative numbers
    const isNegative = createTypeGuard<number>((val) => {
      if (typeof val !== "number" || val >= 0) return null;
      return val;
    });

    // Create union for positive or negative (excludes zero)
    const isNonZero = isPositive.or(isNegative);

    // Valid inputs
    assert(isNonZero(TEST_VALUES.number)); // 42
    assert(isNonZero(-10));
    assert(isNonZero(3.14));
    assert(isNonZero(-3.14));

    // Invalid inputs
    assertFalse(isNonZero(TEST_VALUES.zero));
    assertFalse(isNonZero(TEST_VALUES.string));
    assertFalse(isNonZero(TEST_VALUES.nullValue));
  });

  await t.step("or method - all modes work on union guards", () => {
    const isStringOrNumber = isString.or(isNumber);

    // Strict mode
    isStringOrNumber.strict(TEST_VALUES.string);
    isStringOrNumber.strict(TEST_VALUES.number);
    assertThrows(() => isStringOrNumber.strict(TEST_VALUES.boolean));
    assertThrows(() => isStringOrNumber.strict(TEST_VALUES.nullValue));

    // Assert mode
    const assertIsStringOrNumber: typeof isStringOrNumber.assert = isStringOrNumber.assert;
    assertIsStringOrNumber(TEST_VALUES.string);
    assertIsStringOrNumber(TEST_VALUES.number);
    assertThrows(() => assertIsStringOrNumber(TEST_VALUES.boolean));

    // Optional mode
    assert(isStringOrNumber.optional(TEST_VALUES.string));
    assert(isStringOrNumber.optional(TEST_VALUES.number));
    assert(isStringOrNumber.optional(TEST_VALUES.undefinedValue));
    assertFalse(isStringOrNumber.optional(TEST_VALUES.boolean));
    assertFalse(isStringOrNumber.optional(TEST_VALUES.nullValue));

    // NotEmpty mode
    assert(isStringOrNumber.notEmpty(TEST_VALUES.string));
    assert(isStringOrNumber.notEmpty(TEST_VALUES.number));
    assertFalse(isStringOrNumber.notEmpty(TEST_VALUES.emptyString));
    assertFalse(isStringOrNumber.notEmpty(TEST_VALUES.boolean));
    assertFalse(isStringOrNumber.notEmpty(TEST_VALUES.nullValue));
  });

  await t.step("or method - notEmpty guards can be chained", () => {
    // Create a union of notEmpty guards
    const isNonEmptyStringOrNumber = isString.notEmpty.or(isNumber);

    // Valid inputs
    assert(isNonEmptyStringOrNumber(TEST_VALUES.string));
    assert(isNonEmptyStringOrNumber(TEST_VALUES.number));
    assert(isNonEmptyStringOrNumber(TEST_VALUES.zero));
    assert(isNonEmptyStringOrNumber(TEST_VALUES.float));

    // Invalid inputs - empty string should fail
    assertFalse(isNonEmptyStringOrNumber(TEST_VALUES.emptyString));
    assertFalse(isNonEmptyStringOrNumber(TEST_VALUES.whitespaceString));
    assertFalse(isNonEmptyStringOrNumber(TEST_VALUES.boolean));
    assertFalse(isNonEmptyStringOrNumber(TEST_VALUES.nullValue));
    assertFalse(isNonEmptyStringOrNumber(TEST_VALUES.undefinedValue));
    assertFalse(isNonEmptyStringOrNumber(TEST_VALUES.object));
  });

  await t.step("or method - chained notEmpty guards", () => {
    // Chain multiple notEmpty guards
    const isNonEmptyStringOrArray = isString.notEmpty.or(isArray.notEmpty);

    // Valid inputs
    assert(isNonEmptyStringOrArray(TEST_VALUES.string));
    assert(isNonEmptyStringOrArray(TEST_VALUES.array));
    assert(isNonEmptyStringOrArray(["test"]));

    // Invalid inputs - empty values should fail
    assertFalse(isNonEmptyStringOrArray(TEST_VALUES.emptyString));
    assertFalse(isNonEmptyStringOrArray(TEST_VALUES.emptyArray));
    assertFalse(isNonEmptyStringOrArray(TEST_VALUES.nullValue));
    assertFalse(isNonEmptyStringOrArray(TEST_VALUES.undefinedValue));
  });

  await t.step("or method - notEmpty unions with all modes", () => {
    const isNonEmptyStringOrObject = isString.notEmpty.or(isObject.notEmpty);

    // Basic functionality
    assert(isNonEmptyStringOrObject(TEST_VALUES.string));
    assert(isNonEmptyStringOrObject(TEST_VALUES.object));
    assertFalse(isNonEmptyStringOrObject(TEST_VALUES.emptyString));
    assertFalse(isNonEmptyStringOrObject(TEST_VALUES.emptyObject));

    // Strict mode
    isNonEmptyStringOrObject.strict(TEST_VALUES.string);
    isNonEmptyStringOrObject.strict(TEST_VALUES.object);
    assertThrows(() => isNonEmptyStringOrObject.strict(TEST_VALUES.emptyString));
    assertThrows(() => isNonEmptyStringOrObject.strict(TEST_VALUES.emptyObject));
    assertThrows(() => isNonEmptyStringOrObject.strict(TEST_VALUES.boolean));

    // Assert mode
    const assertIsNonEmptyStringOrObject: typeof isNonEmptyStringOrObject.assert =
      isNonEmptyStringOrObject.assert;
    assertIsNonEmptyStringOrObject(TEST_VALUES.string);
    assertIsNonEmptyStringOrObject(TEST_VALUES.object);
    assertThrows(() => assertIsNonEmptyStringOrObject(TEST_VALUES.emptyString));
    assertThrows(() => assertIsNonEmptyStringOrObject(TEST_VALUES.emptyObject));

    // Optional mode
    assert(isNonEmptyStringOrObject.optional(TEST_VALUES.string));
    assert(isNonEmptyStringOrObject.optional(TEST_VALUES.object));
    assert(isNonEmptyStringOrObject.optional(TEST_VALUES.undefinedValue));
    assertFalse(isNonEmptyStringOrObject.optional(TEST_VALUES.emptyString));
    assertFalse(isNonEmptyStringOrObject.optional(TEST_VALUES.nullValue));
  });

  await t.step("or method - complex notEmpty union chains", () => {
    // Create a complex chain of notEmpty guards
    const isNonEmptyValue = isString.notEmpty.or(isArray.notEmpty).or(isObject.notEmpty);

    // Valid inputs - all non-empty values
    assert(isNonEmptyValue(TEST_VALUES.string));
    assert(isNonEmptyValue(TEST_VALUES.array));
    assert(isNonEmptyValue(TEST_VALUES.object));
    assert(isNonEmptyValue(["test"]));
    assert(isNonEmptyValue({ key: "value" }));

    // Invalid inputs - all empty values and other types
    assertFalse(isNonEmptyValue(TEST_VALUES.emptyString));
    assertFalse(isNonEmptyValue(TEST_VALUES.emptyArray));
    assertFalse(isNonEmptyValue(TEST_VALUES.emptyObject));
    assertFalse(isNonEmptyValue(TEST_VALUES.number));
    assertFalse(isNonEmptyValue(TEST_VALUES.boolean));
    assertFalse(isNonEmptyValue(TEST_VALUES.nullValue));
    assertFalse(isNonEmptyValue(TEST_VALUES.undefinedValue));
  });

  await t.step("or method - variadic arguments", () => {
    // Create a union type guard with multiple arguments in a single call
    const isStringOrNumberOrBoolean = isString.or(isNumber, isBoolean);

    // Valid inputs
    assert(isStringOrNumberOrBoolean(TEST_VALUES.string));
    assert(isStringOrNumberOrBoolean(TEST_VALUES.number));
    assert(isStringOrNumberOrBoolean(TEST_VALUES.boolean));
    assert(isStringOrNumberOrBoolean(TEST_VALUES.booleanFalse));
    assert(isStringOrNumberOrBoolean(TEST_VALUES.zero));
    assert(isStringOrNumberOrBoolean(TEST_VALUES.emptyString));

    // Invalid inputs
    assertFalse(isStringOrNumberOrBoolean(TEST_VALUES.nullValue));
    assertFalse(isStringOrNumberOrBoolean(TEST_VALUES.undefinedValue));
    assertFalse(isStringOrNumberOrBoolean(TEST_VALUES.object));
    assertFalse(isStringOrNumberOrBoolean(TEST_VALUES.array));
  });

  await t.step("or method - variadic with many guards", () => {
    // Union of 5 guards in a single .or() call
    const isAny = isString.or(isNumber, isBoolean, isNull, isUndefined);

    assert(isAny("hello"));
    assert(isAny(42));
    assert(isAny(true));
    assert(isAny(null));
    assert(isAny(undefined));

    // Invalid
    assertFalse(isAny({}));
    assertFalse(isAny([]));
    assertFalse(isAny(Symbol()));
  });

  await t.step("or method - variadic produces correct union name", () => {
    const guard = isString.or(isNumber, isBoolean);
    const result = guard.validate([]);
    assert(result.issues !== undefined);
    assertEquals(result.issues[0].message, "Expected string | number | boolean. Received: []");
  });

  await t.step("or method - variadic all modes work", () => {
    const guard = isString.or(isNumber, isBoolean);

    // Strict mode
    guard.strict("hello");
    guard.strict(42);
    guard.strict(true);
    assertThrows(() => guard.strict(null));

    // Optional mode
    assert(guard.optional("hello"));
    assert(guard.optional(42));
    assert(guard.optional(true));
    assert(guard.optional(undefined));
    assertFalse(guard.optional(null));
    assertFalse(guard.optional([]));

    // NotEmpty mode
    assert(guard.notEmpty("hello"));
    assert(guard.notEmpty(42));
    assert(guard.notEmpty(true));
    assertFalse(guard.notEmpty(""));
    assertFalse(guard.notEmpty(null));
    assertFalse(guard.notEmpty(undefined));
  });

  await t.step("or method - variadic on notEmpty", () => {
    const guard = isString.notEmpty.or(isNumber, isBoolean);

    assert(guard("hello"));
    assert(guard(42));
    assert(guard(true));

    // Empty string should still fail because of notEmpty on isString
    assertFalse(guard(""));
    assertFalse(guard(null));
    assertFalse(guard(undefined));
  });

  await t.step("or method - variadic on optional", () => {
    const guard = isString.optional.or(isNumber, isBoolean);

    assert(guard("hello"));
    assert(guard(42));
    assert(guard(true));
    assert(guard(undefined));

    assertFalse(guard(null));
    assertFalse(guard([]));
  });

  await t.step("or method - variadic with unnamed guards falls back to generic", () => {
    const unnamed = createTypeGuard((v): symbol | null => typeof v === "symbol" ? v : null);
    const guard = isString.or(isNumber, unnamed);

    // One guard is unnamed, so error message should be generic
    const result = guard.validate([]);
    assert(result.issues !== undefined);
    assertFalse(result.issues[0].message.includes("undefined"));
    assertEquals(result.issues[0].message, "Invalid value. Received: []");
  });

  await t.step("or method - variadic equivalence to chaining", () => {
    // Variadic and chained should produce the same results
    const variadic = isString.or(isNumber, isBoolean);
    const chained = isString.or(isNumber).or(isBoolean);

    const values = [
      "hello", "", 42, 0, true, false, null, undefined, {}, [], Symbol(),
    ];

    for (const v of values) {
      assertEquals(variadic(v), chained(v), `Mismatch for value: ${String(v)}`);
    }
  });

  await t.step("or method - variadic with extended guards", () => {
    const isPositive = isNumber.extend("positive", (v) => v > 0 ? v : null);
    const isNonEmptyString = isString.extend("non-empty string", (v) => v.length > 0 ? v : null);

    // Use extended guards as variadic .or() arguments
    const guard = isBoolean.or(isPositive, isNonEmptyString);

    // Valid inputs
    assert(guard(true));
    assert(guard(false));
    assert(guard(42));
    assert(guard(1));
    assert(guard("hello"));

    // Invalid — fails extension constraints
    assertFalse(guard(0));
    assertFalse(guard(-5));
    assertFalse(guard(""));

    // Invalid — wrong types entirely
    assertFalse(guard(null));
    assertFalse(guard(undefined));
    assertFalse(guard([]));
    assertFalse(guard({}));
  });

  await t.step("or method - variadic with extended guard as base", () => {
    // Extended guard calls .or() with variadic args
    const isPositive = isNumber.extend("positive", (v) => v > 0 ? v : null);
    const guard = isPositive.or(isString, isBoolean);

    assert(guard(1));
    assert(guard(100));
    assert(guard("hello"));
    assert(guard(""));
    assert(guard(true));

    // Fails positive constraint
    assertFalse(guard(0));
    assertFalse(guard(-1));

    // Wrong types
    assertFalse(guard(null));
    assertFalse(guard(undefined));
    assertFalse(guard([]));
  });

  await t.step("or method - variadic with extended guard all modes", () => {
    const isPositive = isNumber.extend("positive", (v) => v > 0 ? v : null);
    const guard = isPositive.or(isString, isNull);

    // Strict
    guard.strict(1);
    guard.strict("hello");
    guard.strict(null);
    assertThrows(() => guard.strict(0));
    assertThrows(() => guard.strict(undefined));

    // Optional
    assert(guard.optional(1));
    assert(guard.optional("hello"));
    assert(guard.optional(null));
    assert(guard.optional(undefined));
    assertFalse(guard.optional(0));
    assertFalse(guard.optional(false));

    // Validate
    const success = guard.validate(42);
    assert("value" in success);

    const failure = guard.validate(0);
    assert(failure.issues !== undefined);
  });

  await t.step("or method - variadic with multiple extended guards", () => {
    // All arguments are extended guards
    const isPositive = isNumber.extend("positive", (v) => v > 0 ? v : null);
    const isNonEmptyString = isString.extend("non-empty string", (v) => v.length > 0 ? v : null);
    const isNonEmptyArray = isArray.extend("non-empty array", (v) => v.length > 0 ? v : null);

    const guard = isPositive.or(isNonEmptyString, isNonEmptyArray);

    // Valid
    assert(guard(1));
    assert(guard("hello"));
    assert(guard([1, 2]));

    // Fails extension constraints
    assertFalse(guard(0));
    assertFalse(guard(-1));
    assertFalse(guard(""));
    assertFalse(guard([]));

    // Wrong types
    assertFalse(guard(null));
    assertFalse(guard(true));
    assertFalse(guard({}));
  });

  await t.step("or method - variadic with extended guard produces correct union name", () => {
    const isPositive = isNumber.extend("positive", (v) => v > 0 ? v : null);
    const guard = isPositive.or(isString, isBoolean);

    const result = guard.validate(null);
    assert(result.issues !== undefined);
    assertEquals(result.issues[0].message, "Expected positive | string | boolean. Received: null");
  });

  await t.step("or method - variadic extend then chain", () => {
    // Mix variadic with chaining after extend
    const isPositive = isNumber.extend("positive", (v) => v > 0 ? v : null);
    const guard = isPositive.or(isString, isBoolean).or(isNull);

    assert(guard(1));
    assert(guard("hello"));
    assert(guard(true));
    assert(guard(null));
    assertFalse(guard(0));
    assertFalse(guard(undefined));
  });

  await t.step("extend method - basic functionality", () => {
    // Extend isString to only accept non-empty strings
    const isNonEmptyString = isString.extend((val) => {
      return val.length > 0 ? val : null;
    });

    // Valid inputs
    assert(isNonEmptyString("test"));
    assert(isNonEmptyString("hello world"));
    assert(isNonEmptyString("a"));

    // Invalid inputs - empty string fails extended validation
    assertFalse(isNonEmptyString(""));

    // Invalid inputs - non-strings fail base validation
    assertFalse(isNonEmptyString(TEST_VALUES.number));
    assertFalse(isNonEmptyString(TEST_VALUES.boolean));
    assertFalse(isNonEmptyString(TEST_VALUES.nullValue));
    assertFalse(isNonEmptyString(TEST_VALUES.undefinedValue));
  });

  await t.step("extend method - number with range validation", () => {
    // Extend isNumber to only accept numbers between 1 and 100
    const isPercentage = isNumber.extend((val) => {
      return val >= 0 && val <= 100 ? val : null;
    });

    // Valid inputs
    assert(isPercentage(0));
    assert(isPercentage(50));
    assert(isPercentage(100));
    assert(isPercentage(25.5));

    // Invalid inputs - outside range
    assertFalse(isPercentage(-1));
    assertFalse(isPercentage(101));
    assertFalse(isPercentage(1000));

    // Invalid inputs - non-numbers
    assertFalse(isPercentage("50"));
    assertFalse(isPercentage(TEST_VALUES.boolean));
  });

  await t.step("extend method - object with property validation", () => {
    // Base type guard for objects with an 'age' property
    const isAgeObject = createTypeGuard<{ age: number }>((v, { has }) => {
      if (isObject(v) && has(v, "age", isNumber)) {
        return v;
      }
      return null;
    });

    // Extend to only accept adults (age >= 18)
    const isAdult = isAgeObject.extend((val) => {
      return val.age >= 18 ? val : null;
    });

    // Valid inputs
    assert(isAdult({ age: 18 }));
    assert(isAdult({ age: 25 }));
    assert(isAdult({ age: 100 }));

    // Invalid inputs - age too low
    assertFalse(isAdult({ age: 17 }));
    assertFalse(isAdult({ age: 0 }));

    // Invalid inputs - invalid structure
    assertFalse(isAdult({ age: "25" }));
    assertFalse(isAdult({}));
    assertFalse(isAdult(TEST_VALUES.string));
  });

  await t.step("extend method - chained extensions", () => {
    // Start with isString, extend to non-empty, then extend to minimum length
    const isNonEmptyString = isString.extend((val) => {
      return val.length > 0 ? val : null;
    });

    const isMinLength5 = isNonEmptyString.extend((val) => {
      return val.length >= 5 ? val : null;
    });

    // Valid inputs
    assert(isMinLength5("hello"));
    assert(isMinLength5("testing"));
    assert(isMinLength5("12345"));

    // Invalid inputs - too short
    assertFalse(isMinLength5("test"));
    assertFalse(isMinLength5("abc"));
    assertFalse(isMinLength5(""));

    // Invalid inputs - non-strings
    assertFalse(isMinLength5(TEST_VALUES.number));
    assertFalse(isMinLength5(TEST_VALUES.nullValue));
  });

  await t.step("extend method - with helper functions", () => {
    // Base type guard for person objects
    const isPerson = createTypeGuard<{ name: string; age: number }>((v, { has }) => {
      if (isObject(v) && has(v, "name", isString) && has(v, "age", isNumber)) {
        return v;
      }
      return null;
    });

    // Extend to verify name is not empty and age is positive
    const isValidPerson = isPerson.extend((val) => {
      if (val.name.length === 0 || val.age < 0) return null;
      return val;
    });

    // Valid inputs
    assert(isValidPerson({ name: "Alice", age: 30 }));
    assert(isValidPerson({ name: "Bob", age: 0 }));

    // Invalid inputs
    assertFalse(isValidPerson({ name: "", age: 30 }));
    assertFalse(isValidPerson({ name: "Charlie", age: -1 }));
    assertFalse(isValidPerson({ name: "", age: -1 }));
  });

  await t.step("extend method - with hasNot helper", () => {
    // Create a guard for public user objects (no sensitive fields)
    const isPublicUser = createTypeGuard<{ name: string; email: string }>((v, { has, hasNot }) => {
      if (
        isObject(v) &&
        has(v, "name", isString) &&
        has(v, "email", isString) &&
        hasNot(v, "password") &&
        hasNot(v, "apiKey")
      ) {
        return v;
      }
      return null;
    });

    // Valid inputs - no sensitive fields
    assert(isPublicUser({ name: "Alice", email: "alice@example.com" }));
    assert(isPublicUser({ name: "Bob", email: "bob@example.com", role: "admin" }));

    // Invalid inputs - contain sensitive fields
    assertFalse(isPublicUser({ name: "Alice", email: "alice@example.com", password: "secret" }));
    assertFalse(isPublicUser({ name: "Bob", email: "bob@example.com", apiKey: "key123" }));
    assertFalse(
      isPublicUser({
        name: "Charlie",
        email: "charlie@example.com",
        password: "pw",
        apiKey: "key",
      }),
    );
    assertFalse(isPublicUser({ name: "Alice" })); // Missing email
  });

  await t.step("extend method - all modes work on extended guards", () => {
    const isPositiveNumber = isNumber.extend((val) => {
      return val > 0 ? val : null;
    });

    // Basic functionality
    assert(isPositiveNumber(1));
    assert(isPositiveNumber(42));
    assertFalse(isPositiveNumber(0));
    assertFalse(isPositiveNumber(-5));

    // Strict mode
    isPositiveNumber.strict(1);
    isPositiveNumber.strict(100);
    assertThrows(() => isPositiveNumber.strict(0));
    assertThrows(() => isPositiveNumber.strict(-1));
    assertThrows(() => isPositiveNumber.strict(TEST_VALUES.string));

    // Assert mode
    const assertIsPositiveNumber: typeof isPositiveNumber.assert = isPositiveNumber.assert;
    assertIsPositiveNumber(5);
    assertIsPositiveNumber(999);
    assertThrows(() => assertIsPositiveNumber(0));
    assertThrows(() => assertIsPositiveNumber(-10));

    // Optional mode
    assert(isPositiveNumber.optional(10));
    assert(isPositiveNumber.optional(TEST_VALUES.undefinedValue));
    assertFalse(isPositiveNumber.optional(0));
    assertFalse(isPositiveNumber.optional(-5));
    assertFalse(isPositiveNumber.optional(TEST_VALUES.nullValue));
  });

  await t.step("extend method - with array validation", () => {
    // Extend isArray to only accept arrays with at least one element
    const isNonEmptyArray = isArray.extend((val) => {
      return val.length > 0 ? val : null;
    });

    // Valid inputs
    assert(isNonEmptyArray([1]));
    assert(isNonEmptyArray([1, 2, 3]));
    assert(isNonEmptyArray(["test"]));

    // Invalid inputs
    assertFalse(isNonEmptyArray([]));
    assertFalse(isNonEmptyArray(TEST_VALUES.object));
    assertFalse(isNonEmptyArray(TEST_VALUES.string));
  });

  await t.step("extend method - narrowing type with literal values", () => {
    // Extend isString to only accept specific string literals
    const validStatuses = ["active", "inactive", "pending"] as const;
    const isStatus = isString.extend((val, { includes }) =>
      includes(validStatuses, val) ? val : null
    );

    // Valid inputs
    assert(isStatus("active"));
    assert(isStatus("inactive"));
    assert(isStatus("pending"));

    // Invalid inputs
    assertFalse(isStatus("completed"));
    assertFalse(isStatus(""));
    assertFalse(isStatus("ACTIVE"));
    assertFalse(isStatus(TEST_VALUES.number));
  });

  await t.step("extend method - StandardSchemaV1 validate compatibility", () => {
    // Create extended type guard
    const isPositiveNumber = isNumber.extend((val) => {
      return val > 0 ? val : null;
    });

    // Test validate method
    const validResult = isPositiveNumber.validate(42);
    assertEquals(validResult, { value: 42 });

    const invalidResult1 = isPositiveNumber.validate(0);
    assertEquals(invalidResult1, { issues: [{ message: "Invalid value. Received: 0" }] });

    const invalidResult2 = isPositiveNumber.validate("test");
    assertEquals(invalidResult2, { issues: [{ message: "Invalid value. Received: 'test'" }] });

    // Verify ~standard property exists
    assert(isPositiveNumber["~standard"]);
    assertEquals(isPositiveNumber["~standard"].version, 1);
    assertEquals(isPositiveNumber["~standard"].vendor, "guardis");
  });
});

// === Chaining Coverage ===

Deno.test("Chaining coverage", async (t) => {
  await t.step("optional.validate", async (t) => {
    await t.step("returns success for undefined", () => {
      const result = isString.optional.validate(undefined);
      assert("value" in result);
      assertEquals(result.value, undefined);
    });

    await t.step("returns success for valid value", () => {
      const result = isString.optional.validate("hello");
      assert("value" in result);
      assertEquals(result.value, "hello");
    });

    await t.step("returns issues for invalid value", () => {
      const result = isString.optional.validate(42);
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);
    });
  });

  await t.step("optional.or", async (t) => {
    const isStringOrUndefinedOrNumber = isString.optional.or(isNumber);

    await t.step("accepts base type", () => {
      assert(isStringOrUndefinedOrNumber("hello"));
    });

    await t.step("accepts undefined", () => {
      assert(isStringOrUndefinedOrNumber(undefined));
    });

    await t.step("accepts union type", () => {
      assert(isStringOrUndefinedOrNumber(42));
    });

    await t.step("rejects non-matching types", () => {
      assertFalse(isStringOrUndefinedOrNumber(null));
      assertFalse(isStringOrUndefinedOrNumber(true));
    });
  });

  await t.step("notEmpty.optional.strict", async (t) => {
    await t.step("passes for valid non-empty value", () => {
      isString.notEmpty.optional.strict("hello");
    });

    await t.step("passes for undefined", () => {
      isString.notEmpty.optional.strict(undefined);
    });

    await t.step("throws for invalid value", () => {
      assertThrows(() => isString.notEmpty.optional.strict(42), TypeError);
    });

    await t.step("throws for empty value", () => {
      assertThrows(() => isString.notEmpty.optional.strict(""), TypeError);
    });
  });

  await t.step("notEmpty.optional.assert", () => {
    const assertFn: typeof isString.notEmpty.optional.assert =
      isString.notEmpty.optional.assert;
    assertFn("hello");
    assertFn(undefined);
    assertThrows(() => assertFn(42), TypeError);
  });

  await t.step("notEmpty.optional.validate", async (t) => {
    await t.step("returns success for undefined", () => {
      const result = isString.notEmpty.optional.validate(undefined);
      assert("value" in result);
      assertEquals(result.value, undefined);
    });

    await t.step("returns success for valid non-empty value", () => {
      const result = isString.notEmpty.optional.validate("hello");
      assert("value" in result);
      assertEquals(result.value, "hello");
    });

    await t.step("returns issues for empty value", () => {
      const result = isString.notEmpty.optional.validate("");
      assert("issues" in result && result.issues);
    });
  });

  await t.step("notEmpty.optional.or", () => {
    const guard = isString.notEmpty.optional.or(isNumber);
    assert(guard("hello"));
    assert(guard(undefined));
    assert(guard(42));
    assertFalse(guard(""));
    assertFalse(guard(null));
    assertFalse(guard(true));
  });

  await t.step("optional.notEmpty.strict", async (t) => {
    await t.step("passes for valid non-empty value", () => {
      isString.optional.notEmpty.strict("hello");
    });

    await t.step("passes for undefined", () => {
      isString.optional.notEmpty.strict(undefined);
    });

    await t.step("throws for empty value", () => {
      assertThrows(() => isString.optional.notEmpty.strict(""), TypeError);
    });
  });

  await t.step("optional.notEmpty.validate", async (t) => {
    await t.step("returns success for undefined", () => {
      const result = isString.optional.notEmpty.validate(undefined);
      assert("value" in result);
      assertEquals(result.value, undefined);
    });

    await t.step("returns success for valid non-empty value", () => {
      const result = isString.optional.notEmpty.validate("hello");
      assert("value" in result);
    });

    await t.step("returns issues for empty value", () => {
      const result = isString.optional.notEmpty.validate("");
      assert("issues" in result && result.issues);
    });
  });

  await t.step("optional.notEmpty.or", () => {
    const guard = isString.optional.notEmpty.or(isNumber);
    assert(guard("hello"));
    assert(guard(undefined));
    assert(guard(42));
    assertFalse(guard(""));
    assertFalse(guard(null));
  });

  await t.step("type inference", async (t) => {
    await t.step("optional.or produces T | undefined | T2", () => {
      const guard = isString.optional.or(isNumber);
      assertType<Equals<typeof guard._TYPE, string | undefined | number>>();
    });

    await t.step("optional.validate returns Result<T | undefined>", () => {
      const result = isString.optional.validate("hello");
      if ("value" in result) {
        assertType<Equals<typeof result.value, string | undefined>>();
      }
    });

    await t.step("notEmpty.optional.or produces T | undefined | T2", () => {
      const guard = isString.notEmpty.optional.or(isNumber);
      assertType<Equals<typeof guard._TYPE, string | undefined | number>>();
    });

    await t.step("notEmpty.optional.validate returns Result<T | undefined>", () => {
      const result = isString.notEmpty.optional.validate("hello");
      if ("value" in result) {
        assertType<Equals<typeof result.value, string | undefined>>();
      }
    });

    await t.step("optional.notEmpty.or produces T | undefined | T2", () => {
      const guard = isString.optional.notEmpty.or(isNumber);
      assertType<Equals<typeof guard._TYPE, string | undefined | number>>();
    });

    await t.step("optional.notEmpty.validate returns Result<T | undefined>", () => {
      const result = isString.optional.notEmpty.validate("hello");
      if ("value" in result) {
        assertType<Equals<typeof result.value, string | undefined>>();
      }
    });

    await t.step("variadic or produces union of all types", () => {
      const guard = isString.or(isNumber, isBoolean);
      assertType<Equals<typeof guard._TYPE, string | number | boolean>>();
    });

    await t.step("variadic or with many guards produces full union", () => {
      const guard = isString.or(isNumber, isBoolean, isNull, isUndefined);
      assertType<Equals<typeof guard._TYPE, string | number | boolean | null | undefined>>();
    });

    await t.step("variadic optional.or produces T | undefined | union", () => {
      const guard = isString.optional.or(isNumber, isBoolean);
      assertType<Equals<typeof guard._TYPE, string | undefined | number | boolean>>();
    });

    await t.step("variadic notEmpty.or produces T | union", () => {
      const guard = isString.notEmpty.or(isNumber, isBoolean);
      assertType<Equals<typeof guard._TYPE, string | number | boolean>>();
    });

    await t.step("variadic or with extended guard as base", () => {
      const isPositive = isNumber.extend("positive", (v) => v > 0 ? v : null);
      const guard = isPositive.or(isString, isBoolean);
      assertType<Equals<typeof guard._TYPE, number | string | boolean>>();
    });

    await t.step("variadic or with extended guards as arguments", () => {
      const isPositive = isNumber.extend("positive", (v) => v > 0 ? v : null);
      const isNonEmptyString = isString.extend("non-empty string", (v) => v.length > 0 ? v : null);
      const guard = isBoolean.or(isPositive, isNonEmptyString);
      assertType<Equals<typeof guard._TYPE, boolean | number | string>>();
    });
  });
});

// === Guard Name Edge Cases ===

Deno.test("Guard name edge cases", async (t) => {
  await t.step("union of unnamed guards does not produce 'undefined | undefined'", () => {
    // Bug fix: When guards don't have names, the union name should be undefined,
    // not "undefined | undefined" which would produce confusing error messages

    // Create an unnamed guard (no name parameter)
    const unnamedGuard1 = createTypeGuard((v): string | null =>
      typeof v === "string" && v.startsWith("a") ? v : null
    );
    const unnamedGuard2 = createTypeGuard((v): number | null =>
      typeof v === "number" && v > 0 ? v : null
    );

    // Create union of unnamed guards
    const unionGuard = unnamedGuard1.or(unnamedGuard2);

    // Validate returns generic message, not "Expected undefined | undefined..."
    const result = unionGuard.validate(false);
    assert(result.issues !== undefined);
    assertFalse(result.issues[0].message.includes("undefined | undefined"));
    // Should be a generic message since no names are available
    assertEquals(result.issues[0].message, "Invalid value. Received: false");
  });

  await t.step("notEmpty of unnamed guard does not produce 'non-empty undefined'", () => {
    // Bug fix: When a guard doesn't have a name, notEmpty should not produce
    // "non-empty undefined" in error messages

    // Create an unnamed guard
    const unnamedGuard = createTypeGuard((v): string | null =>
      typeof v === "string" ? v : null
    );

    // Use notEmpty on it
    const notEmptyGuard = unnamedGuard.notEmpty;

    // Validate returns generic message, not "Expected non-empty undefined..."
    const result = notEmptyGuard.validate("");
    assert(result.issues !== undefined);
    assertFalse(result.issues[0].message.includes("non-empty undefined"));
    // Should be a generic message since no name is available
    assertEquals(result.issues[0].message, "Invalid value. Received: ''");
  });

  await t.step("union with one named and one unnamed guard falls back to generic", () => {
    // When only one guard has a name, the union name should be undefined
    // (not "string | undefined" or similar partial names)

    const unnamedGuard = createTypeGuard((v): number | null =>
      typeof v === "number" ? v : null
    );

    // isString has a name, unnamedGuard does not
    const mixedUnion = isString.or(unnamedGuard);

    const result = mixedUnion.validate(false);
    assert(result.issues !== undefined);
    // Should not have partial undefined in the message
    assertFalse(result.issues[0].message.includes("| undefined"));
    assertFalse(result.issues[0].message.includes("undefined |"));
  });

  await t.step("named guards still produce proper union names", () => {
    // Verify that when both guards have names, we still get the union name
    const result = isString.or(isNumber).validate(false);
    assertEquals(result, {
      issues: [{ message: "Expected string | number. Received: false" }],
    });
  });

  await t.step("named guards still produce proper notEmpty names", () => {
    // Verify that when the guard has a name, notEmpty still works
    const result = isString.notEmpty.validate("");
    assertEquals(result, {
      issues: [{ message: "Expected non-empty string. Received: ''" }],
    });
  });
});

// === Validation Path Tracking ===

Deno.test("Validation path tracking", async (t) => {
  await t.step("root level validation - no path in error", () => {
    // Root level errors should not include a path
    const result = isString.validate(123);
    assertEquals(result, { issues: [{ message: "Expected string. Received: 123" }] });

    const result2 = isNumber.validate("test");
    assertEquals(result2, { issues: [{ message: "Expected number. Received: 'test'" }] });
  });

  await t.step("array validation - includes index in path", () => {
    const isStringArray = isArray.of(isString);

    // Valid array
    const validResult = isStringArray.validate(["a", "b", "c"]);
    assertEquals(validResult, { value: ["a", "b", "c"] });

    // Invalid element at index 1
    const invalidResult = isStringArray.validate(["valid", 123, "also valid"]);
    assert("issues" in invalidResult && invalidResult.issues);
    assertEquals(invalidResult.issues.length, 1);
    assertEquals(invalidResult.issues[0].message, "Expected string. Received: 123");
    assertEquals(invalidResult.issues[0].path, [1]);
  });

  await t.step("array validation - first error only", () => {
    const isNumberArray = isArray.of(isNumber);

    // Multiple invalid elements - should report only the first one
    const result = isNumberArray.validate(["a", "b", "c"]);
    assert("issues" in result && result.issues);
    assertEquals(result.issues.length, 1);
    assertEquals(result.issues[0].path, [0]);
  });

  await t.step("nested object validation - includes property key in path", () => {
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) => isObject(v) && has(v, "name", isString) && has(v, "age", isNumber) ? v : null,
    );

    // Valid object
    const validResult = isPerson.validate({ name: "Alice", age: 30 });
    assertEquals(validResult, { value: { name: "Alice", age: 30 } });

    // Invalid age type
    const invalidResult = isPerson.validate({ name: "Alice", age: "thirty" });
    assert("issues" in invalidResult && invalidResult.issues);
    assertEquals(invalidResult.issues.length, 1);
    assertEquals(invalidResult.issues[0].message, "Expected number. Received: 'thirty'");
    assertEquals(invalidResult.issues[0].path, ["age"]);
  });

  await t.step("nested object validation - missing property", () => {
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) => isObject(v) && has(v, "name", isString) && has(v, "age", isNumber) ? v : null,
    );

    // Missing required property
    const result = isPerson.validate({ name: "Alice" });
    assert("issues" in result && result.issues);
    assertEquals(result.issues.length, 1);
    assertEquals(result.issues[0].message, "Missing required property: age");
    assertEquals(result.issues[0].path, ["age"]);
  });

  await t.step("array of objects - combined path", () => {
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) => isObject(v) && has(v, "name", isString) && has(v, "age", isNumber) ? v : null,
    );
    const isPeopleArray = isArray.of(isPerson);

    // Valid array of objects
    const validResult = isPeopleArray.validate([
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
    assertEquals(validResult, { value: [{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }] });

    // Invalid object at index 1
    const invalidResult = isPeopleArray.validate([
      { name: "Alice", age: 30 },
      { name: "Bob", age: "invalid" },
    ]);
    assert("issues" in invalidResult && invalidResult.issues);
    assertEquals(invalidResult.issues.length, 1);
    assertEquals(invalidResult.issues[0].message, "Expected number. Received: 'invalid'");
    assertEquals(invalidResult.issues[0].path, [1, "age"]);
  });

  await t.step("deeply nested structures - 2 levels", () => {
    const isAddress = createTypeGuard(
      "Address",
      (v, { has }) => isObject(v) && has(v, "city", isString) && has(v, "zip", isNumber) ? v : null,
    );
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) =>
        isObject(v) && has(v, "name", isString) && has(v, "address", isAddress) ? v : null,
    );

    // Invalid nested property
    const result = isPerson.validate({
      name: "Alice",
      address: { city: "NYC", zip: "invalid" },
    });
    assert("issues" in result && result.issues);
    assertEquals(result.issues.length, 1);
    assertEquals(result.issues[0].message, "Expected number. Received: 'invalid'");
    assertEquals(result.issues[0].path, ["address", "zip"]);
  });

  await t.step("deeply nested structures - 3 levels", () => {
    // Level 3: coordinates within location
    const isCoordinates = createTypeGuard(
      "Coordinates",
      (v, { has }) => isObject(v) && has(v, "lat", isNumber) && has(v, "lng", isNumber) ? v : null,
    );

    // Level 2: location within address
    const isLocation = createTypeGuard(
      "Location",
      (v, { has }) =>
        isObject(v) && has(v, "name", isString) && has(v, "coordinates", isCoordinates) ? v : null,
    );

    // Level 1: address within company
    const isAddress = createTypeGuard(
      "Address",
      (v, { has }) =>
        isObject(v) && has(v, "street", isString) && has(v, "location", isLocation) ? v : null,
    );

    // Root: company
    const isCompany = createTypeGuard(
      "Company",
      (v, { has }) =>
        isObject(v) && has(v, "name", isString) && has(v, "headquarters", isAddress) ? v : null,
    );

    // Valid 3-level nested object
    const validData = {
      name: "Acme Corp",
      headquarters: {
        street: "123 Main St",
        location: {
          name: "Downtown",
          coordinates: { lat: 40.7128, lng: -74.006 },
        },
      },
    };
    const validResult = isCompany.validate(validData);
    assertEquals(validResult, { value: validData });

    // Invalid at level 3 - wrong type for lat
    const invalidLat = isCompany.validate({
      name: "Acme Corp",
      headquarters: {
        street: "123 Main St",
        location: {
          name: "Downtown",
          coordinates: { lat: "invalid", lng: -74.006 },
        },
      },
    });
    assert("issues" in invalidLat && invalidLat.issues);
    assertEquals(invalidLat.issues.length, 1);
    assertEquals(invalidLat.issues[0].message, "Expected number. Received: 'invalid'");
    assertEquals(invalidLat.issues[0].path, ["headquarters", "location", "coordinates", "lat"]);

    // Invalid at level 2 - wrong type for location.name
    const invalidLocationName = isCompany.validate({
      name: "Acme Corp",
      headquarters: {
        street: "123 Main St",
        location: {
          name: 12345,
          coordinates: { lat: 40.7128, lng: -74.006 },
        },
      },
    });
    assert("issues" in invalidLocationName && invalidLocationName.issues);
    assertEquals(invalidLocationName.issues.length, 1);
    assertEquals(invalidLocationName.issues[0].message, "Expected string. Received: 12345");
    assertEquals(invalidLocationName.issues[0].path, ["headquarters", "location", "name"]);

    // Missing property at level 3
    const missingLng = isCompany.validate({
      name: "Acme Corp",
      headquarters: {
        street: "123 Main St",
        location: {
          name: "Downtown",
          coordinates: { lat: 40.7128 },
        },
      },
    });
    assert("issues" in missingLng && missingLng.issues);
    assertEquals(missingLng.issues.length, 1);
    assertEquals(missingLng.issues[0].message, "Missing required property: lng");
    assertEquals(missingLng.issues[0].path, ["headquarters", "location", "coordinates", "lng"]);

    // Missing nested object at level 2
    const missingCoordinates = isCompany.validate({
      name: "Acme Corp",
      headquarters: {
        street: "123 Main St",
        location: {
          name: "Downtown",
        },
      },
    });
    assert("issues" in missingCoordinates && missingCoordinates.issues);
    assertEquals(missingCoordinates.issues.length, 1);
    assertEquals(missingCoordinates.issues[0].message, "Missing required property: coordinates");
    assertEquals(missingCoordinates.issues[0].path, ["headquarters", "location", "coordinates"]);
  });

  await t.step("optional property validation", () => {
    const isPerson = createTypeGuard(
      "Person",
      (v, { has, hasOptional }) =>
        isObject(v) && has(v, "name", isString) && hasOptional(v, "age", isNumber) ? v : null,
    );

    // Valid with optional property
    const validResult1 = isPerson.validate({ name: "Alice", age: 30 });
    assertEquals(validResult1, { value: { name: "Alice", age: 30 } });

    // Valid without optional property
    const validResult2 = isPerson.validate({ name: "Alice" });
    assertEquals(validResult2, { value: { name: "Alice" } });

    // Invalid optional property type
    const invalidResult = isPerson.validate({ name: "Alice", age: "thirty" });
    assert("issues" in invalidResult && invalidResult.issues);
    assertEquals(invalidResult.issues.length, 1);
    assertEquals(invalidResult.issues[0].message, "Expected number. Received: 'thirty'");
    assertEquals(invalidResult.issues[0].path, ["age"]);
  });

  await t.step("array of arrays - nested indices", () => {
    const isNumberMatrix = isArray.of(isArray.of(isNumber));

    // Valid matrix
    const validResult = isNumberMatrix.validate([[1, 2], [3, 4]]);
    assertEquals(validResult, { value: [[1, 2], [3, 4]] });

    // Invalid element in nested array
    const invalidResult = isNumberMatrix.validate([[1, 2], [3, "four"]]);
    assert("issues" in invalidResult && invalidResult.issues);
    assertEquals(invalidResult.issues.length, 1);
    assertEquals(invalidResult.issues[0].message, "Expected number. Received: 'four'");
    assertEquals(invalidResult.issues[0].path, [1, 1]);
  });

  await t.step("validation still works with boolean guards (no context)", () => {
    // Guards work normally as type guards
    assert(isString("test"));
    assertFalse(isString(123));

    // isArray.of still works as type guard
    const isStringArray = isArray.of(isString);
    assert(isStringArray(["a", "b"]));
    assertFalse(isStringArray([1, 2]));

    // Custom guards still work
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) => isObject(v) && has(v, "name", isString) ? v : null,
    );
    assert(isPerson({ name: "Alice" }));
    assertFalse(isPerson({ name: 123 }));
  });
});

// === Custom Error Messages ===

Deno.test("Custom error messages", async (t) => {
  await t.step("fail helper - custom error in validation", () => {
    const isPositiveAge = createTypeGuard("PositiveAge", (v, { fail }) => {
      if (typeof v !== "number") return fail("Age must be a number");
      if (v < 0) return fail("Age cannot be negative");
      return v;
    });

    const result = isPositiveAge.validate(-5);
    assertEquals(result, { issues: [{ message: "Age cannot be negative" }] });
  });

  await t.step("fail helper - first fail for non-number", () => {
    const isPositiveAge = createTypeGuard("PositiveAge", (v, { fail }) => {
      if (typeof v !== "number") return fail("Age must be a number");
      if (v < 0) return fail("Age cannot be negative");
      return v;
    });

    const result = isPositiveAge.validate("not a number");
    assertEquals(result, { issues: [{ message: "Age must be a number" }] });
  });

  await t.step("fail helper - works in boolean mode (returns false)", () => {
    const isPositiveAge = createTypeGuard("PositiveAge", (v, { fail }) => {
      if (typeof v !== "number") return fail("Age must be a number");
      return v;
    });

    assertFalse(isPositiveAge("not a number"));
  });

  await t.step("fail helper - valid values still work", () => {
    const isPositiveAge = createTypeGuard("PositiveAge", (v, { fail }) => {
      if (typeof v !== "number") return fail("Age must be a number");
      if (v < 0) return fail("Age cannot be negative");
      return v;
    });

    assert(isPositiveAge(25));
    assertEquals(isPositiveAge.validate(25), { value: 25 });
  });

  await t.step("has helper - custom error message parameter", () => {
    const isPerson = createTypeGuard("Person", (v, { has }) => {
      if (!isObject(v)) return null;
      if (!has(v, "name", isString, "Name is required")) return null;
      if (!has(v, "age", isNumber, "Age must be a number")) return null;
      return v;
    });

    const result = isPerson.validate({ name: "Alice", age: "bad" });
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Age must be a number");
    assertEquals(result.issues[0].path, ["age"]);
  });

  await t.step("has helper - missing property with custom message", () => {
    const isPerson = createTypeGuard("Person", (v, { has }) => {
      if (!isObject(v)) return null;
      if (!has(v, "name", isString, "Name is required")) return null;
      return v;
    });

    const result = isPerson.validate({});
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Name is required");
    assertEquals(result.issues[0].path, ["name"]);
  });

  await t.step("hasOptional helper - custom error message parameter", () => {
    const isPerson = createTypeGuard("Person", (v, { has, hasOptional }) => {
      if (!isObject(v)) return null;
      if (!has(v, "name", isString)) return null;
      if (!hasOptional(v, "age", isNumber, "Age must be a valid number if provided")) {
        return null;
      }
      return v;
    });

    // Valid without optional
    assertEquals(isPerson.validate({ name: "Alice" }), { value: { name: "Alice" } });

    // Invalid optional type
    const result = isPerson.validate({ name: "Alice", age: "thirty" });
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Age must be a valid number if provided");
    assertEquals(result.issues[0].path, ["age"]);
  });

  await t.step("custom error with path tracking in arrays", () => {
    const isPerson = createTypeGuard("Person", (v, { has, fail }) => {
      if (!isObject(v)) return fail("Must be an object");
      if (!has(v, "age", isNumber, "Age must be valid")) return null;
      if (v.age < 0) return fail("Age cannot be negative");
      return v;
    });

    const result = isArray.of(isPerson).validate([{ age: -5 }]);
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Age cannot be negative");
    assertEquals(result.issues[0].path, [0]);
  });

  await t.step("custom error in nested object with array - custom message overrides", () => {
    const isPerson = createTypeGuard("Person", (v, { has }) => {
      if (!isObject(v)) return null;
      if (!has(v, "name", isString, "Name must be a string")) return null;
      return v;
    });

    const isTeam = createTypeGuard("Team", (v, { has }) => {
      if (!isObject(v)) return null;
      // Custom message overrides nested errors
      if (!has(v, "members", isArray.of(isPerson), "Members must be valid")) return null;
      return v;
    });

    // Invalid member name - custom message is used at the "members" level
    const result = isTeam.validate({
      members: [{ name: "Alice" }, { name: 123 }],
    });
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Members must be valid");
    assertEquals(result.issues[0].path, ["members"]);
  });

  await t.step("nested errors bubble up without custom message", () => {
    const isPerson = createTypeGuard("Person", (v, { has }) => {
      if (!isObject(v)) return null;
      if (!has(v, "name", isString, "Name must be a string")) return null;
      return v;
    });

    const isTeam = createTypeGuard("Team", (v, { has }) => {
      if (!isObject(v)) return null;
      // No custom message - nested errors bubble up
      if (!has(v, "members", isArray.of(isPerson))) return null;
      return v;
    });

    // Invalid member name - nested error bubbles up with full path
    const result = isTeam.validate({
      members: [{ name: "Alice" }, { name: 123 }],
    });
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Name must be a string");
    assertEquals(result.issues[0].path, ["members", 1, "name"]);
  });

  await t.step("combining fail with has custom messages", () => {
    const isPerson = createTypeGuard("Person", (v, { has, fail }) => {
      if (!isObject(v)) return fail("Value must be an object");
      if (
        has(v, "name", isString, "Name is required and must be a string") &&
        has(v, "age", isNumber, "Age must be a valid number")
      ) {
        if (v.age < 0) return fail("Age must be non-negative");
        if (v.age > 150) return fail("Age must be realistic (under 150)");
        return v;
      }
      return null;
    });

    // Test object validation via fail
    assertEquals(isPerson.validate("not an object"), {
      issues: [{ message: "Value must be an object" }],
    });

    // Test has with custom message
    const missingName = isPerson.validate({ age: 25 });
    assert("issues" in missingName && missingName.issues);
    assertEquals(missingName.issues[0].message, "Name is required and must be a string");

    // Test custom validation logic via fail
    const negativeAge = isPerson.validate({ name: "Alice", age: -5 });
    assert("issues" in negativeAge && negativeAge.issues);
    assertEquals(negativeAge.issues[0].message, "Age must be non-negative");

    // Test valid case
    assertEquals(isPerson.validate({ name: "Alice", age: 30 }), {
      value: { name: "Alice", age: 30 },
    });
  });

  await t.step("boolean mode ignores custom messages (no crash)", () => {
    const isPerson = createTypeGuard("Person", (v, { has, fail }) => {
      if (!isObject(v)) return fail("Must be an object");
      if (!has(v, "name", isString, "Name required")) return null;
      return v;
    });

    // Boolean mode should work and return false without throwing
    assertFalse(isPerson("not an object"));
    assertFalse(isPerson({}));
    assertFalse(isPerson({ name: 123 }));
    assert(isPerson({ name: "Alice" }));
  });

  await t.step("hasNot helper - default error message", () => {
    const isPersonWithoutId = createTypeGuard(
      "PersonWithoutId",
      (v, { has, hasNot }) => {
        if (isObject(v) && has(v, "name", isString) && hasNot(v, "id")) {
          return v;
        }
        return null;
      },
    );

    // Valid - no id property
    const validResult = isPersonWithoutId.validate({ name: "Alice" });
    assert("value" in validResult);
    assertEquals(validResult.value.name, "Alice");

    // Invalid - has id property, should show default error message
    const result = isPersonWithoutId.validate({ name: "Alice", id: 123 });
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Unexpected property: id");
    assertEquals(result.issues[0].path, ["id"]);
  });

  await t.step("hasNot helper - custom error message", () => {
    const isPersonWithoutId = createTypeGuard(
      "PersonWithoutId",
      (v, { has, hasNot }) => {
        if (
          isObject(v) && has(v, "name", isString) && hasNot(v, "id", "ID property is not allowed")
        ) {
          return v;
        }
        return null;
      },
    );

    const result = isPersonWithoutId.validate({ name: "Alice", id: 123 });
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "ID property is not allowed");
    assertEquals(result.issues[0].path, ["id"]);
  });

  await t.step("hasNot helper - nested object depth 2", () => {
    const isAddress = createTypeGuard("Address", (v, { has, hasNot }) => {
      if (isObject(v) && has(v, "city", isString) && hasNot(v, "internal_code")) {
        return v;
      }
      return null;
    });

    const isPerson = createTypeGuard("Person", (v, { has }) => {
      if (isObject(v) && has(v, "name", isString) && has(v, "address", isAddress)) {
        return v;
      }
      return null;
    });

    // Valid - no internal_code in address
    const validResult = isPerson.validate({ name: "Alice", address: { city: "NYC" } });
    assert("value" in validResult);
    assertEquals(validResult.value.name, "Alice");

    // Invalid - address has internal_code
    const result = isPerson.validate({
      name: "Alice",
      address: { city: "NYC", internal_code: "ABC" },
    });
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Unexpected property: internal_code");
    assertEquals(result.issues[0].path, ["address", "internal_code"]);
  });

  await t.step("hasNot helper - nested object depth 3", () => {
    const isCoordinates = createTypeGuard("Coordinates", (v, { has, hasNot }) => {
      if (
        isObject(v) &&
        has(v, "lat", isNumber) &&
        has(v, "lng", isNumber) &&
        hasNot(v, "debug_info", "Debug info not allowed in coordinates")
      ) {
        return v;
      }
      return null;
    });

    const isAddress = createTypeGuard("Address", (v, { has }) => {
      if (isObject(v) && has(v, "city", isString) && has(v, "coords", isCoordinates)) {
        return v;
      }
      return null;
    });

    const isPerson = createTypeGuard("Person", (v, { has }) => {
      if (isObject(v) && has(v, "name", isString) && has(v, "address", isAddress)) {
        return v;
      }
      return null;
    });

    // Valid - no debug_info in coordinates
    const validResult = isPerson.validate({
      name: "Alice",
      address: { city: "NYC", coords: { lat: 40.7, lng: -74.0 } },
    });
    assert("value" in validResult);
    assertEquals(validResult.value.name, "Alice");

    // Invalid - coordinates has debug_info at depth 3
    const result = isPerson.validate({
      name: "Alice",
      address: { city: "NYC", coords: { lat: 40.7, lng: -74.0, debug_info: "test" } },
    });
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Debug info not allowed in coordinates");
    assertEquals(result.issues[0].path, ["address", "coords", "debug_info"]);
  });

  await t.step("hasNot helper - in array of objects", () => {
    const isPersonWithoutSecret = createTypeGuard(
      "PersonWithoutSecret",
      (v, { has, hasNot }) => {
        if (isObject(v) && has(v, "name", isString) && hasNot(v, "secret")) {
          return v;
        }
        return null;
      },
    );

    const result = isArray.of(isPersonWithoutSecret).validate([
      { name: "Alice" },
      { name: "Bob", secret: "password" },
    ]);
    assert("issues" in result && result.issues);
    assertEquals(result.issues[0].message, "Unexpected property: secret");
    assertEquals(result.issues[0].path, [1, "secret"]);
  });

  await t.step("hasNot helper - boolean mode works (no crash)", () => {
    const isPersonWithoutId = createTypeGuard(
      "PersonWithoutId",
      (v, { has, hasNot }) => {
        if (isObject(v) && has(v, "name", isString) && hasNot(v, "id", "ID not allowed")) {
          return v;
        }
        return null;
      },
    );

    // Boolean mode should work without throwing
    assert(isPersonWithoutId({ name: "Alice" }));
    assertFalse(isPersonWithoutId({ name: "Alice", id: 123 }));
  });
});

Deno.test("Strict mode error messaging", async (t) => {
  await t.step("simple type guard - includes type name in error", () => {
    try {
      isString.strict(123);
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected string. Received: 123");
    }
  });

  await t.step("simple type guard - shows correct value in error", () => {
    try {
      isNumber.strict("not a number");
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected number. Received: 'not a number'");
    }
  });

  await t.step("nested object validation - includes path in error", () => {
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) => isObject(v) && has(v, "name", isString) ? v : null,
    );

    try {
      isPerson.strict({ name: 123 });
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected string. Received: 123 at path: name");
    }
  });

  await t.step("deeply nested validation - includes full path", () => {
    const isAddress = createTypeGuard(
      "Address",
      (v, { has }) => isObject(v) && has(v, "city", isString) && has(v, "zip", isNumber) ? v : null,
    );
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) =>
        isObject(v) && has(v, "name", isString) && has(v, "address", isAddress) ? v : null,
    );

    try {
      isPerson.strict({ name: "Alice", address: { city: 456, zip: 12345 } });
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected string. Received: 456 at path: address.city");
    }
  });

  await t.step("array validation - includes index in path", () => {
    const isStringArray = isArray.of(isString);

    try {
      isStringArray.strict(["a", "b", 123, "d"]);
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected string. Received: 123 at path: 2");
    }
  });

  await t.step("array of objects - includes combined path", () => {
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) => isObject(v) && has(v, "name", isString) ? v : null,
    );
    const isPeople = isArray.of(isPerson);

    try {
      isPeople.strict([{ name: "Alice" }, { name: 123 }]);
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected string. Received: 123 at path: 1.name");
    }
  });

  await t.step("optional strict - passes undefined", () => {
    // Should not throw
    isString.optional.strict(undefined);
    isNumber.optional.strict(undefined);
  });

  await t.step("optional strict - includes combined type name in error", () => {
    try {
      isString.optional.strict(123);
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected string | undefined. Received: 123");
    }
  });

  await t.step("custom error message - overrides default", () => {
    try {
      isString.strict(123, "Custom error message");
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Custom error message");
    }
  });

  await t.step("notEmpty strict - includes type name", () => {
    try {
      isString.notEmpty.strict("");
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected non-empty string. Received: ''");
    }
  });

  await t.step("fails fast - only first error thrown", () => {
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) => isObject(v) && has(v, "name", isString) && has(v, "age", isNumber) ? v : null,
    );

    // Both name and age are wrong, but only first error should be thrown
    try {
      isPerson.strict({ name: 123, age: "not a number" });
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      // First property checked fails, so that's the error we get
      assertEquals(e.message, "Expected string. Received: 123 at path: name");
    }
  });

  await t.step("missing property - shows missing property error with path", () => {
    const isPerson = createTypeGuard(
      "Person",
      (v, { has }) => isObject(v) && has(v, "name", isString) ? v : null,
    );

    try {
      isPerson.strict({});
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Missing required property: name at path: name");
    }
  });

  await t.step("fail helper - custom message with path", () => {
    const isPositiveNumber = createTypeGuard("positive number", (v, { fail }) => {
      if (!isNumber(v)) return fail("Must be a number");
      if (v <= 0) return fail("Must be positive");
      return v;
    });

    const hasScore = createTypeGuard(
      "HasScore",
      (v, { has }) => isObject(v) && has(v, "score", isPositiveNumber) ? v : null,
    );

    try {
      hasScore.strict({ score: -5 });
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Must be positive at path: score");
    }
  });

  await t.step("union type guard - shows union name in error", () => {
    const isStringOrNumber = isString.or(isNumber);

    try {
      isStringOrNumber.strict(true);
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected string | number. Received: true");
    }
  });

  await t.step("extended type guard - shows extended name in error", () => {
    const isNonEmptyString = isString.extend(
      "non-empty string",
      (v) => v.length > 0 ? v : null,
    );

    try {
      isNonEmptyString.strict(123);
      assert(false, "Expected to throw");
    } catch (e) {
      assert(e instanceof TypeError);
      assertEquals(e.message, "Expected non-empty string. Received: 123");
    }
  });
});

// === createTypeGuard shape parity ===
// These tests verify that shape-created guards have complete functional parity
// with parser-created guards across all TypeGuard features.

Deno.test("createTypeGuard shape", async (t) => {
  await t.step("basic boolean guard behavior", async (t) => {
    // Parser-based equivalent for comparison
    const isPersonParser = createTypeGuard<{ name: string; age: number }>(
      "Person",
      (v, { has }) => isObject(v) && has(v, "name", isString) && has(v, "age", isNumber) ? v : null,
    );

    // Shape-based equivalent
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    const valid = { name: "Alice", age: 30 };
    const missingAge = { name: "Alice" };
    const wrongType = { name: "Alice", age: "thirty" };
    const notAnObject = "not an object";
    const extraFields = { name: "Alice", age: 30, email: "alice@example.com" };

    await t.step("valid objects pass both", () => {
      assert(isPersonParser(valid));
      assert(isPersonShape(valid));
    });

    await t.step("objects with extra fields pass both", () => {
      assert(isPersonParser(extraFields));
      assert(isPersonShape(extraFields));
    });

    await t.step("missing properties fail both", () => {
      assertFalse(isPersonParser(missingAge));
      assertFalse(isPersonShape(missingAge));
    });

    await t.step("wrong property types fail both", () => {
      assertFalse(isPersonParser(wrongType));
      assertFalse(isPersonShape(wrongType));
    });

    await t.step("non-objects fail both", () => {
      assertFalse(isPersonParser(notAnObject));
      assertFalse(isPersonShape(notAnObject));
      assertFalse(isPersonParser(null));
      assertFalse(isPersonShape(null));
      assertFalse(isPersonParser(undefined));
      assertFalse(isPersonShape(undefined));
      assertFalse(isPersonParser(42));
      assertFalse(isPersonShape(42));
      assertFalse(isPersonParser([1, 2]));
      assertFalse(isPersonShape([1, 2]));
    });
  });

  await t.step("validate method", async (t) => {
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    await t.step("valid input returns value", () => {
      const result = isPersonShape.validate({ name: "Alice", age: 30 });
      assert("value" in result);
      assertEquals(result.value, { name: "Alice", age: 30 });
    });

    await t.step("invalid property type returns issues with path", () => {
      const result = isPersonShape.validate({ name: "Alice", age: "thirty" });
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);
      // Should contain path information pointing to the failing field
      const ageIssue = result.issues.find((i) =>
        i.path && (i.path as PropertyKey[]).includes("age")
      );
      assert(ageIssue, "Expected an issue with path containing 'age'");
    });

    await t.step("missing property returns issues with path", () => {
      const result = isPersonShape.validate({ name: "Alice" });
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);
    });

    await t.step("non-object returns issues", () => {
      const result = isPersonShape.validate("not an object");
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);

      const nullResult = isPersonShape.validate(null);
      assert("issues" in nullResult);

      const arrayResult = isPersonShape.validate([1, 2]);
      assert("issues" in arrayResult);
    });

    await t.step("multiple invalid fields produce multiple issues", () => {
      const result = isPersonShape.validate({ name: 123, age: "thirty" });
      assert("issues" in result && result.issues);
      assert(result.issues.length >= 2, `Expected at least 2 issues, got ${result.issues.length}`);
    });
  });

  await t.step("strict mode", async (t) => {
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    await t.step("valid input does not throw", () => {
      isPersonShape.strict({ name: "Alice", age: 30 });
    });

    await t.step("invalid input throws TypeError", () => {
      assertThrows(
        () => isPersonShape.strict({ name: "Alice", age: "thirty" }),
        TypeError,
      );
    });

    await t.step("non-object input throws TypeError", () => {
      assertThrows(() => isPersonShape.strict("not an object"), TypeError);
      assertThrows(() => isPersonShape.strict(null), TypeError);
      assertThrows(() => isPersonShape.strict(undefined), TypeError);
    });

    await t.step("custom error message overrides on non-object input", () => {
      // Custom error message is used when the parser returns null without
      // the strict context throwing first (e.g. non-object input)
      assertThrows(
        () => isPersonShape.strict(42, "Custom error"),
        TypeError,
      );
    });

    await t.step("field-level errors include path info", () => {
      // For object inputs with invalid fields, strict mode throws with
      // the specific field error and path information
      try {
        isPersonShape.strict({ name: "Alice", age: "thirty" });
        assert(false, "Expected to throw");
      } catch (e) {
        assert(e instanceof TypeError);
        assert(e.message.includes("at path: age"), `Expected path in error, got: ${e.message}`);
      }
    });
  });

  await t.step("assert mode", async (t) => {
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    await t.step("valid input does not throw", () => {
      const assertIsPerson: typeof isPersonShape.assert = isPersonShape.assert;
      assertIsPerson({ name: "Alice", age: 30 });
    });

    await t.step("invalid input throws TypeError", () => {
      const assertIsPerson: typeof isPersonShape.assert = isPersonShape.assert;
      assertThrows(
        () => assertIsPerson({ name: "Alice", age: "thirty" }),
        TypeError,
      );
    });
  });

  await t.step("optional mode", async (t) => {
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    await t.step("valid input returns true", () => {
      assert(isPersonShape.optional({ name: "Alice", age: 30 }));
    });

    await t.step("undefined returns true", () => {
      assert(isPersonShape.optional(undefined));
    });

    await t.step("invalid input returns false", () => {
      assertFalse(isPersonShape.optional({ name: "Alice", age: "thirty" }));
      assertFalse(isPersonShape.optional(null));
      assertFalse(isPersonShape.optional("string"));
      assertFalse(isPersonShape.optional(42));
    });

    await t.step("optional.strict - valid input does not throw", () => {
      isPersonShape.optional.strict({ name: "Alice", age: 30 });
      isPersonShape.optional.strict(undefined);
    });

    await t.step("optional.strict - invalid input throws", () => {
      assertThrows(
        () => isPersonShape.optional.strict({ name: "Alice", age: "thirty" }),
        TypeError,
      );
      assertThrows(() => isPersonShape.optional.strict(null), TypeError);
    });

    await t.step("optional.assert works", () => {
      const assertFn: typeof isPersonShape.optional.assert = isPersonShape.optional.assert;
      assertFn({ name: "Alice", age: 30 });
      assertFn(undefined);
      assertThrows(() => assertFn(42), TypeError);
    });
  });

  await t.step("notEmpty mode", async (t) => {
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    await t.step("valid non-empty object returns true", () => {
      assert(isPersonShape.notEmpty({ name: "Alice", age: 30 }));
    });

    await t.step("empty-like values return false", () => {
      assertFalse(isPersonShape.notEmpty(null));
      assertFalse(isPersonShape.notEmpty(undefined));
      assertFalse(isPersonShape.notEmpty({}));
    });

    await t.step("invalid object returns false", () => {
      assertFalse(isPersonShape.notEmpty({ name: 123, age: "thirty" }));
    });

    await t.step("notEmpty.strict works", () => {
      isPersonShape.notEmpty.strict({ name: "Alice", age: 30 });
      assertThrows(() => isPersonShape.notEmpty.strict(null), TypeError);
      assertThrows(() => isPersonShape.notEmpty.strict({}), TypeError);
    });

    await t.step("notEmpty.validate works", () => {
      const valid = isPersonShape.notEmpty.validate({ name: "Alice", age: 30 });
      assert("value" in valid);

      const invalid = isPersonShape.notEmpty.validate({});
      assert("issues" in invalid);
    });

    await t.step("notEmpty.or works", () => {
      const isPersonOrString = isPersonShape.notEmpty.or(isString);
      assert(isPersonOrString({ name: "Alice", age: 30 }));
      assert(isPersonOrString("hello"));
      assertFalse(isPersonOrString(null));
      assertFalse(isPersonOrString({}));
    });

    await t.step("notEmpty.optional works", () => {
      assert(isPersonShape.notEmpty.optional({ name: "Alice", age: 30 }));
      assert(isPersonShape.notEmpty.optional(undefined));
      assertFalse(isPersonShape.notEmpty.optional(null));
      assertFalse(isPersonShape.notEmpty.optional({}));
    });
  });

  await t.step("or method", async (t) => {
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    await t.step("union with primitive guard", () => {
      const isPersonOrString = isPersonShape.or(isString);

      assert(isPersonOrString({ name: "Alice", age: 30 }));
      assert(isPersonOrString("hello"));
      assertFalse(isPersonOrString(42));
      assertFalse(isPersonOrString(null));
    });

    await t.step("union with another shape guard", () => {
      const isAddressShape = createTypeGuard({ street: isString, city: isString });
      const isPersonOrAddress = isPersonShape.or(isAddressShape);

      assert(isPersonOrAddress({ name: "Alice", age: 30 }));
      assert(isPersonOrAddress({ street: "123 Main St", city: "Springfield" }));
      assertFalse(isPersonOrAddress({ foo: "bar" }));
      assertFalse(isPersonOrAddress(42));
    });

    await t.step("chained unions", () => {
      const isPersonOrStringOrNumber = isPersonShape.or(isString).or(isNumber);

      assert(isPersonOrStringOrNumber({ name: "Alice", age: 30 }));
      assert(isPersonOrStringOrNumber("hello"));
      assert(isPersonOrStringOrNumber(42));
      assertFalse(isPersonOrStringOrNumber(null));
      assertFalse(isPersonOrStringOrNumber(true));
    });

    await t.step("all modes work on union guards", () => {
      const isPersonOrString = isPersonShape.or(isString);

      // Strict
      isPersonOrString.strict({ name: "Alice", age: 30 });
      isPersonOrString.strict("hello");
      assertThrows(() => isPersonOrString.strict(42), TypeError);

      // Optional
      assert(isPersonOrString.optional({ name: "Alice", age: 30 }));
      assert(isPersonOrString.optional("hello"));
      assert(isPersonOrString.optional(undefined));
      assertFalse(isPersonOrString.optional(42));

      // NotEmpty
      assert(isPersonOrString.notEmpty({ name: "Alice", age: 30 }));
      assert(isPersonOrString.notEmpty("hello"));
      assertFalse(isPersonOrString.notEmpty(""));
      assertFalse(isPersonOrString.notEmpty(null));
    });
  });

  await t.step("extend method", async (t) => {
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    await t.step("basic extension narrows the type", () => {
      const isAdult = isPersonShape.extend((val) => {
        return val.age >= 18 ? val : null;
      });

      assert(isAdult({ name: "Alice", age: 30 }));
      assert(isAdult({ name: "Bob", age: 18 }));
      assertFalse(isAdult({ name: "Charlie", age: 17 }));
      assertFalse(isAdult({ name: "Dave", age: -1 }));

      // Base validation still applies
      assertFalse(isAdult({ name: 123, age: 30 }));
      assertFalse(isAdult("not an object"));
    });

    await t.step("chained extensions", () => {
      const isAdult = isPersonShape.extend((val) => val.age >= 18 ? val : null);
      const isNamedAdult = isAdult.extend((val) => val.name.length > 0 ? val : null);

      assert(isNamedAdult({ name: "Alice", age: 30 }));
      assertFalse(isNamedAdult({ name: "", age: 30 }));
      assertFalse(isNamedAdult({ name: "Alice", age: 10 }));
    });

    await t.step("named extension", () => {
      const isAdult = isPersonShape.extend("Adult", (val) => val.age >= 18 ? val : null);

      assert(isAdult({ name: "Alice", age: 30 }));
      assertThrows(
        () => isAdult.strict({ name: "Alice", age: 10 }),
        TypeError,
        "Expected Adult",
      );
    });

    await t.step("all modes work on extended shape guards", () => {
      const isAdult = isPersonShape.extend((val) => val.age >= 18 ? val : null);

      // Strict
      isAdult.strict({ name: "Alice", age: 30 });
      assertThrows(() => isAdult.strict({ name: "Alice", age: 10 }), TypeError);

      // Assert
      const assertIsAdult: typeof isAdult.assert = isAdult.assert;
      assertIsAdult({ name: "Alice", age: 30 });
      assertThrows(() => assertIsAdult({ name: "Alice", age: 10 }), TypeError);

      // Optional
      assert(isAdult.optional({ name: "Alice", age: 30 }));
      assert(isAdult.optional(undefined));
      assertFalse(isAdult.optional({ name: "Alice", age: 10 }));
      assertFalse(isAdult.optional(null));

      // Validate
      const validResult = isAdult.validate({ name: "Alice", age: 30 });
      assert("value" in validResult);
      const invalidResult = isAdult.validate({ name: "Alice", age: 10 });
      assert("issues" in invalidResult);
    });
  });

  await t.step("extend with shape", async (t) => {
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    await t.step("extends shape guard with additional shape properties", () => {
      const isEmployee = isPersonShape.extend({ role: isString });

      assert(isEmployee({ name: "Alice", age: 30, role: "engineer" }));
      assertFalse(isEmployee({ name: "Alice", age: 30 })); // missing role
      assertFalse(isEmployee({ name: "Alice", age: 30, role: 42 })); // wrong type
      assertFalse(isEmployee({ name: 123, age: 30, role: "engineer" })); // base fails
      assertFalse(isEmployee("not an object"));
    });

    await t.step("named shape extend", () => {
      const isEmployee = isPersonShape.extend("Employee", { role: isString });

      assert(isEmployee({ name: "Alice", age: 30, role: "engineer" }));
      assertThrows(
        () => isEmployee.strict({ name: "Alice", age: 30 }),
        TypeError,
        "Expected Employee",
      );
    });

    await t.step("all modes work on shape-extended guards", () => {
      const isEmployee = isPersonShape.extend({ role: isString });

      // Strict
      isEmployee.strict({ name: "Alice", age: 30, role: "engineer" });
      assertThrows(() => isEmployee.strict({ name: "Alice", age: 30 }), TypeError);

      // Optional
      assert(isEmployee.optional({ name: "Alice", age: 30, role: "engineer" }));
      assert(isEmployee.optional(undefined));
      assertFalse(isEmployee.optional({ name: "Alice", age: 30 }));

      // Validate
      const validResult = isEmployee.validate({ name: "Alice", age: 30, role: "engineer" });
      assert("value" in validResult);
      const invalidResult = isEmployee.validate({ name: "Alice", age: 30 });
      assert("issues" in invalidResult);
    });

    await t.step("type inference produces T1 & InferShape<S>", () => {
      const isEmployee = isPersonShape.extend({ role: isString, dept: isNumber });
      type Employee = typeof isEmployee._TYPE;
      assertType<
        Equals<Employee, { name: string; age: number } & { role: string; dept: number }>
      >();
    });

    await t.step("chained shape extensions", () => {
      const isEmployee = isPersonShape.extend({ role: isString });
      const isSenior = isEmployee.extend({ level: isNumber });

      assert(isSenior({ name: "Alice", age: 30, role: "engineer", level: 5 }));
      assertFalse(isSenior({ name: "Alice", age: 30, role: "engineer" })); // missing level
      assertFalse(isSenior({ name: "Alice", age: 30, level: 5 })); // missing role
    });
  });

  await t.step("StandardSchemaV1 compatibility", async (t) => {
    const isPersonShape = createTypeGuard({ name: isString, age: isNumber });

    await t.step("~standard property exists with correct values", () => {
      assert(isPersonShape["~standard"]);
      assertEquals(isPersonShape["~standard"].version, 1);
      assertEquals(isPersonShape["~standard"].vendor, "guardis");
      assert(typeof isPersonShape["~standard"].validate === "function");
    });

    await t.step("~standard.validate returns same result as .validate", () => {
      const input = { name: "Alice", age: 30 };
      const directResult = isPersonShape.validate(input);
      const standardResult = isPersonShape["~standard"].validate(input);
      assertEquals(directResult, standardResult);
    });
  });

  await t.step("named shape", async (t) => {
    const isPersonShape = createTypeGuard("Person", { name: isString, age: isNumber });

    await t.step("basic guard behavior works", () => {
      assert(isPersonShape({ name: "Alice", age: 30 }));
      assertFalse(isPersonShape({ name: 123, age: "thirty" }));
    });

    await t.step("strict mode throws with field-level error", () => {
      // Strict mode on shape guards throws the first specific field error
      // rather than the generic "Expected Person" — this provides more
      // useful error messages with path info
      try {
        isPersonShape.strict({ name: 123, age: "thirty" });
        assert(false, "Expected to throw");
      } catch (e) {
        assert(e instanceof TypeError);
        assert(e.message.includes("at path:"), `Expected path in error, got: ${e.message}`);
      }
    });
  });

  await t.step("nested shapes", async (t) => {
    const isAddressShape = createTypeGuard({
      street: isString,
      city: isString,
      zip: isNumber,
    });

    const isPersonWithAddress = createTypeGuard({
      name: isString,
      address: isAddressShape,
    });

    await t.step("valid nested object passes", () => {
      assert(isPersonWithAddress({
        name: "Alice",
        address: { street: "123 Main", city: "Springfield", zip: 62701 },
      }));
    });

    await t.step("invalid nested property fails", () => {
      assertFalse(isPersonWithAddress({
        name: "Alice",
        address: { street: "123 Main", city: "Springfield", zip: "62701" },
      }));
    });

    await t.step("missing nested property fails", () => {
      assertFalse(isPersonWithAddress({
        name: "Alice",
        address: { street: "123 Main", city: "Springfield" },
      }));
    });

    await t.step("validate returns path-aware issues for nested failures", () => {
      const result = isPersonWithAddress.validate({
        name: "Alice",
        address: { street: "123 Main", city: "Springfield", zip: "62701" },
      });
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);
      // Should have path pointing into the nested object
      const hasNestedPath = result.issues.some((i) =>
        i.path && (i.path as PropertyKey[]).length >= 2
      );
      assert(hasNestedPath, "Expected nested path in issues");
    });

    await t.step("all modes work on nested shapes", () => {
      const valid = { name: "Alice", address: { street: "123 Main", city: "Springfield", zip: 62701 } };
      const invalid = { name: "Alice", address: { street: 123, city: "Springfield", zip: 62701 } };

      // Strict
      isPersonWithAddress.strict(valid);
      assertThrows(() => isPersonWithAddress.strict(invalid), TypeError);

      // Optional
      assert(isPersonWithAddress.optional(valid));
      assert(isPersonWithAddress.optional(undefined));
      assertFalse(isPersonWithAddress.optional(invalid));

      // Or
      const isPersonOrString = isPersonWithAddress.or(isString);
      assert(isPersonOrString(valid));
      assert(isPersonOrString("hello"));
      assertFalse(isPersonOrString(invalid));

      // Extend
      const isNamedPerson = isPersonWithAddress.extend((val) =>
        val.name.length > 0 ? val : null
      );
      assert(isNamedPerson(valid));
      assertFalse(isNamedPerson({ ...valid, name: "" }));
    });
  });

  await t.step("inline nested shape objects", async (t) => {
    // Shapes defined inline (not via createTypeGuard) should also work recursively
    const isPersonInline = createTypeGuard({
      name: isString,
      address: {
        street: isString,
        city: isString,
      },
    });

    await t.step("valid nested object passes", () => {
      assert(isPersonInline({ name: "Alice", address: { street: "123 Main", city: "Springfield" } }));
    });

    await t.step("invalid nested property fails", () => {
      assertFalse(isPersonInline({ name: "Alice", address: { street: 123, city: "Springfield" } }));
    });

    await t.step("validate returns issues for nested inline shapes", () => {
      const result = isPersonInline.validate({
        name: "Alice",
        address: { street: 123, city: "Springfield" },
      });
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);
    });
  });

  await t.step("guards with .optional and .notEmpty in shapes", async (t) => {
    await t.step("optional guard in shape accepts undefined values", () => {
      const isFormShape = createTypeGuard({
        name: isString,
        nickname: isString.optional,
      });

      assert(isFormShape({ name: "Alice", nickname: "Ali" }));
      assert(isFormShape({ name: "Alice", nickname: undefined }));
      assert(isFormShape({ name: "Alice" })); // missing = undefined
      assertFalse(isFormShape({ name: "Alice", nickname: 42 }));
    });

    await t.step("notEmpty guard in shape rejects empty values", () => {
      const isFormShape = createTypeGuard({
        name: isString.notEmpty,
        bio: isString,
      });

      assert(isFormShape({ name: "Alice", bio: "A person" }));
      assert(isFormShape({ name: "Alice", bio: "" }));
      assertFalse(isFormShape({ name: "", bio: "A person" }));
      assertFalse(isFormShape({ name: "  ", bio: "A person" }));
    });

    await t.step("notEmpty validate returns issues with path", () => {
      const isFormShape = createTypeGuard({
        name: isString.notEmpty,
        bio: isString,
      });

      const result = isFormShape.validate({ name: "", bio: "A person" });
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);
    });

    await t.step("optional.notEmpty guard in shape works", () => {
      const isFormShape = createTypeGuard({
        name: isString,
        nickname: isString.optional.notEmpty,
      });

      assert(isFormShape({ name: "Alice", nickname: "Ali" }));
      assert(isFormShape({ name: "Alice", nickname: undefined }));
      assert(isFormShape({ name: "Alice" }));
      assertFalse(isFormShape({ name: "Alice", nickname: "" }));
    });
  });

  await t.step("isArray.of in shapes", async (t) => {
    const isTeamShape = createTypeGuard({
      name: isString,
      members: isArray.of(isString),
    });

    await t.step("valid array field passes", () => {
      assert(isTeamShape({ name: "Alpha", members: ["Alice", "Bob"] }));
      assert(isTeamShape({ name: "Alpha", members: [] }));
    });

    await t.step("invalid array elements fail", () => {
      assertFalse(isTeamShape({ name: "Alpha", members: [1, 2, 3] }));
      assertFalse(isTeamShape({ name: "Alpha", members: ["Alice", 42] }));
    });

    await t.step("non-array fails", () => {
      assertFalse(isTeamShape({ name: "Alpha", members: "not an array" }));
    });

    await t.step("validate returns issues for invalid array elements", () => {
      const result = isTeamShape.validate({ name: "Alpha", members: ["Alice", 42] });
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);
    });
  });

  await t.step("complex real-world shapes", async (t) => {
    await t.step("API response shape", () => {
      const isApiResponse = createTypeGuard({
        status: isNumber,
        message: isString,
        data: isObject,
      });

      assert(isApiResponse({ status: 200, message: "OK", data: { id: 1 } }));
      assertFalse(isApiResponse({ status: "200", message: "OK", data: {} }));
      assertFalse(isApiResponse({ status: 200, message: "OK" }));

      // Validate
      const result = isApiResponse.validate({ status: 200, message: "OK", data: { id: 1 } });
      assert("value" in result);
      assertEquals(result.value, { status: 200, message: "OK", data: { id: 1 } });
    });

    await t.step("deeply nested shape (3 levels)", () => {
      const isDeep = createTypeGuard({
        level1: {
          level2: {
            level3: isString,
          },
        },
      });

      assert(isDeep({ level1: { level2: { level3: "deep" } } }));
      assertFalse(isDeep({ level1: { level2: { level3: 42 } } }));
      assertFalse(isDeep({ level1: { level2: {} } }));
    });
  });

  await t.step(".or() as shape field value", async (t) => {
    const isRecord = createTypeGuard({
      id: isString.or(isNumber),
      label: isString,
    });

    await t.step("accepts first union member", () => {
      assert(isRecord({ id: "abc", label: "test" }));
    });

    await t.step("accepts second union member", () => {
      assert(isRecord({ id: 42, label: "test" }));
    });

    await t.step("rejects values matching neither member", () => {
      assertFalse(isRecord({ id: true, label: "test" }));
      assertFalse(isRecord({ id: null, label: "test" }));
      assertFalse(isRecord({ id: [1], label: "test" }));
    });

    await t.step("validate returns issues for non-matching union field", () => {
      const result = isRecord.validate({ id: true, label: "test" });
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);
      const idIssue = result.issues.find((i) =>
        i.path && (i.path as PropertyKey[]).includes("id")
      );
      assert(idIssue, "Expected an issue with path containing 'id'");
    });

    await t.step("validate succeeds for both union members", () => {
      const r1 = isRecord.validate({ id: "abc", label: "test" });
      assert("value" in r1);
      assertEquals(r1.value, { id: "abc", label: "test" });

      const r2 = isRecord.validate({ id: 42, label: "test" });
      assert("value" in r2);
      assertEquals(r2.value, { id: 42, label: "test" });
    });

    await t.step("chained .or() as shape field value", () => {
      const isFlexible = createTypeGuard({
        value: isString.or(isNumber).or(isBoolean),
      });

      assert(isFlexible({ value: "hello" }));
      assert(isFlexible({ value: 42 }));
      assert(isFlexible({ value: true }));
      assertFalse(isFlexible({ value: null }));
      assertFalse(isFlexible({ value: [] }));
    });
  });

  await t.step(".extend() as shape field value", async (t) => {
    const isPositiveNumber = isNumber.extend((v) => v > 0 ? v : null);

    const isProduct = createTypeGuard({
      name: isString,
      price: isPositiveNumber,
    });

    await t.step("accepts valid extended field", () => {
      assert(isProduct({ name: "Widget", price: 9.99 }));
      assert(isProduct({ name: "Gadget", price: 1 }));
    });

    await t.step("rejects values failing extension", () => {
      assertFalse(isProduct({ name: "Widget", price: 0 }));
      assertFalse(isProduct({ name: "Widget", price: -5 }));
    });

    await t.step("rejects values failing base guard", () => {
      assertFalse(isProduct({ name: "Widget", price: "9.99" }));
      assertFalse(isProduct({ name: "Widget", price: null }));
    });

    await t.step("validate returns issues for extended field failure", () => {
      const result = isProduct.validate({ name: "Widget", price: -5 });
      assert("issues" in result && result.issues);
      assert(result.issues.length > 0);
    });

    await t.step("validate succeeds for valid extended field", () => {
      const result = isProduct.validate({ name: "Widget", price: 9.99 });
      assert("value" in result);
      assertEquals(result.value, { name: "Widget", price: 9.99 });
    });

    await t.step("named .extend() as shape field value", () => {
      const isNonEmptyString = isString.extend(
        "non-empty string",
        (v) => v.length > 0 ? v : null,
      );

      const isEntry = createTypeGuard({
        title: isNonEmptyString,
        count: isNumber,
      });

      assert(isEntry({ title: "Hello", count: 1 }));
      assertFalse(isEntry({ title: "", count: 1 }));
      assertFalse(isEntry({ title: 123, count: 1 }));
    });

    await t.step("chained .extend() as shape field value", () => {
      const isPercentage = isNumber
        .extend((v) => v >= 0 ? v : null)
        .extend((v) => v <= 100 ? v : null);

      const isScore = createTypeGuard({
        label: isString,
        pct: isPercentage,
      });

      assert(isScore({ label: "A", pct: 95 }));
      assert(isScore({ label: "B", pct: 0 }));
      assert(isScore({ label: "C", pct: 100 }));
      assertFalse(isScore({ label: "D", pct: -1 }));
      assertFalse(isScore({ label: "E", pct: 101 }));
    });
  });

  await t.step(".notEmpty as shape field value", async (t) => {
    const isProfile = createTypeGuard({
      name: isString.notEmpty,
      tags: isArray.notEmpty,
      meta: isObject.notEmpty,
    });

    await t.step("accepts non-empty values", () => {
      assert(isProfile({ name: "Alice", tags: ["a"], meta: { k: 1 } }));
    });

    await t.step("rejects empty string", () => {
      assertFalse(isProfile({ name: "", tags: ["a"], meta: { k: 1 } }));
      assertFalse(isProfile({ name: "  ", tags: ["a"], meta: { k: 1 } }));
    });

    await t.step("rejects empty array", () => {
      assertFalse(isProfile({ name: "Alice", tags: [], meta: { k: 1 } }));
    });

    await t.step("rejects empty object", () => {
      assertFalse(isProfile({ name: "Alice", tags: ["a"], meta: {} }));
    });

    await t.step("validate returns issues for empty fields", () => {
      const result = isProfile.validate({ name: "", tags: [], meta: {} });
      assert("issues" in result && result.issues);
      assert(result.issues.length >= 3, `Expected at least 3 issues, got ${result.issues.length}`);
    });
  });

  await t.step(".notEmpty.or() as shape field value", async (t) => {
    const isRecord = createTypeGuard({
      value: isString.notEmpty.or(isNumber),
    });

    await t.step("accepts non-empty string", () => {
      assert(isRecord({ value: "hello" }));
    });

    await t.step("accepts number", () => {
      assert(isRecord({ value: 42 }));
      assert(isRecord({ value: 0 }));
    });

    await t.step("rejects empty string", () => {
      assertFalse(isRecord({ value: "" }));
    });

    await t.step("rejects other types", () => {
      assertFalse(isRecord({ value: true }));
      assertFalse(isRecord({ value: null }));
    });
  });

  await t.step("combined guard modes as field values", async (t) => {
    await t.step("mix of .optional, .notEmpty, .or, .extend in one shape", () => {
      const isPositive = isNumber.extend((v) => v > 0 ? v : null);

      const isForm = createTypeGuard({
        required: isString,
        optional: isString.optional,
        nonEmpty: isString.notEmpty,
        union: isString.or(isNumber),
        extended: isPositive,
        arrayOf: isArray.of(isNumber),
      });

      // All valid
      assert(isForm({
        required: "hello",
        optional: undefined,
        nonEmpty: "world",
        union: 42,
        extended: 5,
        arrayOf: [1, 2, 3],
      }));

      assert(isForm({
        required: "hello",
        optional: "present",
        nonEmpty: "world",
        union: "text",
        extended: 1,
        arrayOf: [],
      }));

      // Each field mode failure
      assertFalse(isForm({
        required: 123,
        optional: undefined,
        nonEmpty: "world",
        union: 42,
        extended: 5,
        arrayOf: [1],
      }));

      assertFalse(isForm({
        required: "hello",
        optional: 123,
        nonEmpty: "world",
        union: 42,
        extended: 5,
        arrayOf: [1],
      }));

      assertFalse(isForm({
        required: "hello",
        optional: undefined,
        nonEmpty: "",
        union: 42,
        extended: 5,
        arrayOf: [1],
      }));

      assertFalse(isForm({
        required: "hello",
        optional: undefined,
        nonEmpty: "world",
        union: true,
        extended: 5,
        arrayOf: [1],
      }));

      assertFalse(isForm({
        required: "hello",
        optional: undefined,
        nonEmpty: "world",
        union: 42,
        extended: -1,
        arrayOf: [1],
      }));

      assertFalse(isForm({
        required: "hello",
        optional: undefined,
        nonEmpty: "world",
        union: 42,
        extended: 5,
        arrayOf: ["bad"],
      }));
    });

    await t.step("validate reports all field failures in mixed shape", () => {
      const isForm = createTypeGuard({
        name: isString.notEmpty,
        age: isNumber,
        tag: isString.or(isNumber),
      });

      const result = isForm.validate({ name: "", age: "old", tag: true });
      assert("issues" in result && result.issues);
      assert(result.issues.length >= 3, `Expected at least 3 issues, got ${result.issues.length}`);
    });
  });

  // === Compile-time type inference tests ===
  // These tests verify that createTypeGuard with shapes produces correct types.
  // They have no runtime assertions — they pass if the file type-checks.

  await t.step("type inference", () => {
    // Basic shape infers correct property types
    const isUser = createTypeGuard({ name: isString, age: isNumber });
    type User = typeof isUser._TYPE;
    assertType<Equals<User, { name: string; age: number }>>();

    // GuardedType utility works on shape guards
    type UserViaGuardedType = GuardedType<typeof isUser>;
    assertType<Equals<UserViaGuardedType, { name: string; age: number }>>();

    // Shape guard is a proper TypeGuard
    assertType<Equals<typeof isUser, TypeGuard<{ name: string; age: number }>>>();
  });

  await t.step("type inference with guard modes", () => {
    // .optional field infers T | undefined
    const isForm = createTypeGuard({
      required: isString,
      optional: isString.optional,
    });
    type Form = typeof isForm._TYPE;
    assertType<Equals<Form, { required: string; optional: string | undefined }>>();

    // .or() field infers union
    const isRecord = createTypeGuard({
      id: isString.or(isNumber),
    });
    type Record_ = typeof isRecord._TYPE;
    assertType<Equals<Record_, { id: string | number }>>();

    // .notEmpty still infers the base type
    const isProfile = createTypeGuard({
      name: isString.notEmpty,
    });
    type Profile = typeof isProfile._TYPE;
    assertType<Equals<Profile, { name: string }>>();

    // isArray.of infers typed array
    const isTeam = createTypeGuard({
      members: isArray.of(isString),
    });
    type Team = typeof isTeam._TYPE;
    assertType<Equals<Team, { members: string[] }>>();
  });

  await t.step("type inference with nested shapes", () => {
    // Nested TypeGuard shape
    const isAddress = createTypeGuard({ street: isString, city: isString });
    const isPerson = createTypeGuard({ name: isString, address: isAddress });
    type Person = typeof isPerson._TYPE;
    assertType<Equals<Person, { name: string; address: { street: string; city: string } }>>();

    // Inline nested shape
    const isInline = createTypeGuard({
      name: isString,
      address: { street: isString, zip: isNumber },
    });
    type Inline = typeof isInline._TYPE;
    assertType<Equals<Inline, { name: string; address: { street: string; zip: number } }>>();

    // Deeply nested inline
    const isDeep = createTypeGuard({
      a: { b: { c: isBoolean } },
    });
    type Deep = typeof isDeep._TYPE;
    assertType<Equals<Deep, { a: { b: { c: boolean } } }>>();
  });

  await t.step("type inference with .extend()", () => {
    const isUser = createTypeGuard({ name: isString, age: isNumber });

    // .extend() narrows the type
    const isAdult = isUser.extend((val) => val.age >= 18 ? val : null);
    type Adult = typeof isAdult._TYPE;
    assertType<Equals<Adult, { name: string; age: number }>>();

    // .or() produces a union
    const isUserOrString = isUser.or(isString);
    type UserOrString = typeof isUserOrString._TYPE;
    assertType<Equals<UserOrString, { name: string; age: number } | string>>();

    // .optional return type narrows to T | undefined
    const _check = isUser.optional;
    type OptionalReturn = typeof _check extends (v: unknown) => v is infer R ? R : never;
    assertType<Equals<OptionalReturn, { name: string; age: number } | undefined>>();
  });

  await t.step("named shape preserves type", () => {
    const isUser = createTypeGuard("User", { name: isString, age: isNumber });
    type User = typeof isUser._TYPE;
    assertType<Equals<User, { name: string; age: number }>>();

    // Named shape is still a proper TypeGuard
    assertType<Equals<typeof isUser, TypeGuard<{ name: string; age: number }>>>();
  });
});
