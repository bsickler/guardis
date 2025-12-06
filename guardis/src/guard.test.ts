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

    // Invalid inputs
    const invalidResult1 = isStringArray.validate([1, 2, 3]);
    assertEquals(invalidResult1, { issues: [{ message: "Invalid type" }] });

    const invalidResult2 = isStringArray.validate(["a", 1, "c"]);
    assertEquals(invalidResult2, { issues: [{ message: "Invalid type" }] });

    const invalidResult3 = isStringArray.validate(TEST_VALUES.object);
    assertEquals(invalidResult3, { issues: [{ message: "Invalid type" }] });
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
    const assertIsNonEmptyStringOrObject: typeof isNonEmptyStringOrObject.assert = isNonEmptyStringOrObject.assert;
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
    const isStatus = isString.extend((val, { includes }) => {
      if (includes(validStatuses, val)) return val as typeof validStatuses[number];
      return null;
    });

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
    assertEquals(invalidResult1, { issues: [{ message: "Invalid type" }] });

    const invalidResult2 = isPositiveNumber.validate("test");
    assertEquals(invalidResult2, { issues: [{ message: "Invalid type" }] });

    // Verify ~standard property exists
    assert(isPositiveNumber["~standard"]);
    assertEquals(isPositiveNumber["~standard"].version, 1);
    assertEquals(isPositiveNumber["~standard"].vendor, "guardis");
  });
});
