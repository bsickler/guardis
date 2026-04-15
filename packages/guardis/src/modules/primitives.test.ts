import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import {
  isArray,
  isBinary,
  isBoolean,
  isDate,
  isEmpty,
  isEnum,
  isFunction,
  isInt,
  isIterable,
  isJsonArray,
  isJsonObject,
  isJsonPrimitive,
  isJsonValue,
  isMap,
  isNil,
  isNumber,
  isNumeric,
  isObject,
  isPropertyKey,
  isSet,
  isString,
  isSymbol,
  isTuple,
} from "./primitives.ts";
import { createTypeGuard, isInstanceOf, isNull } from "../guard.ts";
import { assertType, type Equals } from "../test-utils.ts";

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

  await t.step("rejects non-finite numbers (Infinity, -Infinity, NaN)", () => {
    // JSON does not represent non-finite numbers — JSON.stringify serializes
    // them as `null`, so they do not round-trip.
    assertFalse(isJsonPrimitive(Infinity));
    assertFalse(isJsonPrimitive(-Infinity));
    assertFalse(isJsonPrimitive(NaN));
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

    // Invalid inputs return issues with specific error message (union type name).
    // Note: the number branch uses `isNumber.finite`, which is named "finite" by
    // the .extend() rename — so the union reads "boolean | string | finite | null".
    assertEquals(isJsonPrimitive.validate({ a: 1 }), {
      issues: [{ message: 'Expected boolean | string | finite | null. Received: {"a":1}' }],
    });
    assertEquals(isJsonPrimitive.validate(undefined), {
      issues: [{ message: "Expected boolean | string | finite | null. Received: undefined" }],
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

  await t.step("rejects arrays containing non-JSON values", () => {
    // Per the JsonValue type, elements must be string | number | boolean | null
    // | JsonArray | JsonObject. These should NOT pass:
    assertFalse(isJsonArray([() => {}])); // function
    assertFalse(isJsonArray([Symbol("x")])); // symbol
    assertFalse(isJsonArray([undefined])); // undefined is not JSON
    assertFalse(isJsonArray([1n])); // BigInt
    assertFalse(isJsonArray([new Date()])); // Date
    assertFalse(isJsonArray([new Map()])); // Map
    assertFalse(isJsonArray([new Set()])); // Set
    assertFalse(isJsonArray([/regex/])); // RegExp
    assertFalse(isJsonArray([new Error("boom")])); // Error
    assertFalse(isJsonArray([1, 2, () => {}])); // mixed: one invalid element
    assertFalse(isJsonArray([NaN])); // NaN is not representable in JSON
    assertFalse(isJsonArray([Infinity])); // Infinity is not representable in JSON
    assertFalse(isJsonArray([-Infinity])); // -Infinity is not representable in JSON
  });

  await t.step("accepts nested JSON structures", () => {
    assert(isJsonArray([[1, 2], [3, 4]])); // nested arrays
    assert(isJsonArray([{ a: 1 }, { b: 2 }])); // array of objects
    assert(isJsonArray([1, "x", true, null, [], {}])); // all JSON primitives
    assert(isJsonArray([{ nested: { deep: [1, 2, 3] } }])); // deeply nested
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

// === Numeric Comparison Methods ===

Deno.test("numeric comparison methods", async (t) => {
  await t.step("gt", () => {
    assert(isNumber.gt(0)(5));
    assert(isNumber.gt(0)(0.1));
    assertFalse(isNumber.gt(0)(0));
    assertFalse(isNumber.gt(0)(-1));
    assertFalse(isNumber.gt(0)("5"));
  });

  await t.step("gte", () => {
    assert(isNumber.gte(0)(0));
    assert(isNumber.gte(0)(1));
    assertFalse(isNumber.gte(0)(-1));
    assertFalse(isNumber.gte(0)("0"));
  });

  await t.step("lt", () => {
    assert(isNumber.lt(10)(5));
    assert(isNumber.lt(10)(9.9));
    assertFalse(isNumber.lt(10)(10));
    assertFalse(isNumber.lt(10)(11));
    assertFalse(isNumber.lt(10)("5"));
  });

  await t.step("lte", () => {
    assert(isNumber.lte(10)(10));
    assert(isNumber.lte(10)(5));
    assertFalse(isNumber.lte(10)(11));
    assertFalse(isNumber.lte(10)("10"));
  });

  await t.step("eq", () => {
    assert(isNumber.eq(42)(42));
    assertFalse(isNumber.eq(42)(43));
    assertFalse(isNumber.eq(42)("42"));
  });

  await t.step("chaining gt and lt", () => {
    const between = isNumber.gt(-1).lt(1);
    assert(between(0));
    assert(between(0.5));
    assert(between(-0.5));
    assertFalse(between(-1));
    assertFalse(between(1));
    assertFalse(between(100));
  });

  await t.step("chaining gte and lte for range", () => {
    const isPercentage = isNumber.gte(0).lte(100);
    assert(isPercentage(0));
    assert(isPercentage(50));
    assert(isPercentage(100));
    assertFalse(isPercentage(-1));
    assertFalse(isPercentage(101));
  });

  await t.step("validate method", () => {
    assertEquals(isNumber.gt(0).validate(5), { value: 5 });
    assertEquals(isNumber.gt(0).validate(-1), {
      issues: [{ message: "Expected > 0. Received: -1" }],
    });
    assertEquals(isNumber.gt(0).validate("5"), {
      issues: [{ message: "Expected > 0. Received: '5'" }],
    });
  });

  await t.step("strict method", () => {
    isNumber.gt(0).strict(5);
    assertThrows(() => isNumber.gt(0).strict(-1));
  });

  await t.step("or after comparison", () => {
    const guard = isNumber.gt(0).or(isNull);
    assert(guard(5));
    assert(guard(null));
    assertFalse(guard(0));
    assertFalse(guard(-1));
  });

  await t.step("isNumeric has comparison methods", () => {
    assert(isNumeric.gt(0)(5));
    assert(isNumeric.gt(0)("5"));
    assertFalse(isNumeric.gt(0)(-1));
    assertFalse(isNumeric.gt(0)("abc"));
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
});

Deno.test("string length methods", async (t) => {
  await t.step("min", () => {
    assert(isString.min(1)("hello"));
    assertFalse(isString.min(1)(""));
  });

  await t.step("max", () => {
    assert(isString.max(5)("hi"));
    assertFalse(isString.max(3)("toolong"));
  });

  await t.step("ofLength", () => {
    assert(isString.ofLength(3)("abc"));
    assertFalse(isString.ofLength(3)("ab"));
  });

  await t.step("range", () => {
    assert(isString.range(1, 10)("hello"));
    assertFalse(isString.range(1, 10)(""));
  });

  await t.step("chaining min and max", () => {
    assert(isString.min(1).max(255)("hello"));
    assertFalse(isString.min(1).max(255)(""));
  });

  await t.step("edge case: ofLength(0)", () => {
    assert(isString.ofLength(0)(""));
  });

  await t.step("strict throws on invalid", () => {
    assertThrows(() => isString.min(1).strict(""));
  });

  await t.step("validate returns issues on invalid", () => {
    const result = isString.min(1).validate("");
    assert(!("value" in result));
    assert("issues" in result);
  });

  await t.step("non-string input rejected", () => {
    assertFalse(isString.min(1)(42));
    assertFalse(isString.max(5)(null));
    assertFalse(isString.ofLength(3)(undefined));
    assertFalse(isString.range(1, 10)(123));
  });
});

Deno.test("isInt", async (t) => {
  await t.step("basic functionality", () => {
    // Valid inputs
    assert(isInt(42));
    assert(isInt(-1));
    assert(isInt(0));

    // Invalid inputs
    assertFalse(isInt(3.14));
    assertFalse(isInt(NaN));
    assertFalse(isInt(Infinity));
    assertFalse(isInt("42"));
  });

  await t.step("chaining comparisons", () => {
    assert(isInt.gt(0).lt(100)(50));
    assertFalse(isInt.gt(0).lt(100)(0));
    assertFalse(isInt.gt(0).lt(100)(100));
  });

  await t.step("strict mode", () => {
    isInt.strict(42);
    assertThrows(() => isInt.strict(3.14));
  });

  await t.step("validate method", () => {
    assertEquals(isInt.validate(42), { value: 42 });
    const result = isInt.validate(3.14);
    assert("issues" in result);
  });

  await t.step("optional mode", () => {
    assert(isInt.optional(undefined));
    assert(isInt.optional(42));
    assertFalse(isInt.optional(3.14));
  });
});

Deno.test("isNumber.finite", async (t) => {
  await t.step("basic functionality", () => {
    assert(isNumber.finite(42));
    assert(isNumber.finite(-3.14));

    assertFalse(isNumber.finite(Infinity));
    assertFalse(isNumber.finite(-Infinity));
  });

  await t.step("chaining after finite", () => {
    assert(isNumber.finite.gte(0)(5));
    assertFalse(isNumber.finite.gte(0)(-1));
  });

  await t.step("strict mode", () => {
    isNumber.finite.strict(42);
    assertThrows(() => isNumber.finite.strict(Infinity));
  });
});

Deno.test("isEnum", async (t) => {
  // Define test enums
  enum Color {
    Red = "red",
    Green = "green",
    Blue = "blue",
  }
  enum Direction {
    Up = 0,
    Down = 1,
    Left = 2,
    Right = 3,
  }
  enum Mixed {
    Name = "alice",
    Age = 30,
  }

  const isColor = isEnum(Color);
  const isDirection = isEnum(Direction);

  await t.step("validates string enum members", () => {
    assert(isColor("red"));
    assert(isColor("green"));
    assert(isColor("blue"));
  });

  await t.step("rejects non-members of string enum", () => {
    assertFalse(isColor("yellow"));
    assertFalse(isColor(""));
    assertFalse(isColor(42));
  });

  await t.step("validates numeric enum members", () => {
    assert(isDirection(0));
    assert(isDirection(1));
    assert(isDirection(3));
  });

  await t.step("rejects non-members of numeric enum", () => {
    assertFalse(isDirection(4));
    assertFalse(isDirection(-1));
    // Reverse mapping keys should NOT be valid
    assertFalse(isDirection("Up"));
    assertFalse(isDirection("Down"));
  });

  await t.step("handles mixed enum", () => {
    const isMixed = isEnum(Mixed);
    assert(isMixed("alice"));
    assert(isMixed(30));
    assertFalse(isMixed("bob"));
    assertFalse(isMixed(31));
  });

  await t.step("strict mode throws on non-member", () => {
    assertThrows(() => isColor.strict("yellow"));
  });

  await t.step("validate mode returns issues", () => {
    const result = isColor.validate("yellow");
    assert("issues" in result && result.issues);
  });

  await t.step("optional accepts undefined", () => {
    assert(isColor.optional(undefined));
    assert(isColor.optional("red"));
  });

  await t.step("works in shapes", () => {
    const isPayload = createTypeGuard({ color: isColor });
    assert(isPayload({ color: "red" }));
    assertFalse(isPayload({ color: "yellow" }));
  });

  await t.step("inferred type matches the original enum", () => {
    assertType<Equals<typeof isColor._TYPE, typeof Color[keyof typeof Color]>>();
    assertType<Equals<typeof isDirection._TYPE, typeof Direction[keyof typeof Direction]>>();
  });
});

Deno.test("isInstanceOf", async (t) => {
  class Foo {
    constructor(public x: number) {}
  }
  class Bar extends Foo {}
  class Unrelated {}

  await t.step("accepts instances of the given class", () => {
    const isFoo = isInstanceOf(Foo);
    assert(isFoo(new Foo(1)));
    assert(isFoo(new Bar(2))); // subclass
  });

  await t.step("rejects unrelated instances and non-objects", () => {
    const isFoo = isInstanceOf(Foo);
    assertFalse(isFoo(new Unrelated()));
    assertFalse(isFoo({}));
    assertFalse(isFoo("Foo"));
    assertFalse(isFoo(null));
    assertFalse(isFoo(undefined));
  });

  await t.step("uses constructor name in error messages by default", () => {
    const isFoo = isInstanceOf(Foo);
    assertEquals(isFoo.validate({}), {
      issues: [{ message: "Expected Foo. Received: {}" }],
    });
  });

  await t.step("allows a custom name", () => {
    const isThing = isInstanceOf(Foo, "Thing");
    assertEquals(isThing.validate({}), {
      issues: [{ message: "Expected Thing. Received: {}" }],
    });
  });

  await t.step("supports the full guard API", () => {
    const isFoo = isInstanceOf(Foo);

    // strict
    isFoo.strict(new Foo(1));
    assertThrows(() => isFoo.strict({}));

    // optional
    assert(isFoo.optional(new Foo(1)));
    assert(isFoo.optional(undefined));
    assertFalse(isFoo.optional({}));

    // or
    const isFooOrString = isFoo.or(isString);
    assert(isFooOrString(new Foo(1)));
    assert(isFooOrString("hello"));
    assertFalse(isFooOrString({}));
  });

  await t.step("works with built-in classes", () => {
    const isError = isInstanceOf(Error);
    assert(isError(new Error("boom")));
    assert(isError(new TypeError("boom"))); // subclass
    assertFalse(isError({ message: "boom" }));

    const isRegExp = isInstanceOf(RegExp);
    assert(isRegExp(/abc/));
    assertFalse(isRegExp("abc"));
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
