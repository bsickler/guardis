import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import {
  createTypeGuard,
  isBinary,
  isBoolean,
  isEmpty,
  isFunction,
  isJsonArray,
  isJsonObject,
  isNil,
  isNull,
  isNumber,
  isObject,
  isString,
  isUndefined,
} from "./guard.ts";

Deno.test("createTypeGuard", async (t) => {
  await t.step('injects "has" function', () => {
    const testGuard = createTypeGuard<{ a: string }>((v, has) => {
      if (isObject(v) && has(v, "a", isString)) {
        return v;
      }

      return null;
    });

    assertEquals(testGuard({ a: "1" }), true);
    assertEquals(testGuard({}), false);
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
    assert(isNull.strict(null));
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
    assert(isEmpty.strict(null));
    assert(isEmpty.strict(undefined));
    assert(isEmpty.strict(""));
    assert(isEmpty.strict({}));
    assert(isEmpty.strict([]));
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
    assert(isNil.strict(null));
    assert(isNil.strict(undefined));
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
    assert(isBoolean.strict(true));
    assert(isBoolean.strict(false));
    assert(isNumber.strict(0));
    assert(isString.strict("1"));
  });
});

Deno.test("notEmpty", () => {
  assert(isString.notEmpty("a string"));

  assertFalse(isString.notEmpty(0));
  assertFalse(isString.notEmpty(10));
  assertFalse(isString.notEmpty(""));
});
