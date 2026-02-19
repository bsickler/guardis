import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { isBoolean, isNull, isNumber, isString } from "./guard.ts";
import {
  doesNotHaveProperty,
  formatErrorMessage,
  hasOptionalProperty,
  hasProperty,
  includes,
  keyOf,
  tupleHas,
  unionOf,
} from "./utilities.ts";

Deno.test("hasProperty", async (t) => {
  await t.step("property existence check", () => {
    const obj = { a: 1, b: "test", c: null };

    assert(hasProperty(obj, "a"));
    assert(hasProperty(obj, "b"));
    assert(hasProperty(obj, "c"));
    assertFalse(hasProperty(obj, "d"));
  });

  await t.step("property existence with type guard", () => {
    const obj = { a: 1, b: "test", c: null };

    assert(hasProperty(obj, "a", isNumber));
    assert(hasProperty(obj, "b", isString));
    assert(hasProperty(obj, "c", isNull));

    assertFalse(hasProperty(obj, "a", isString));
    assertFalse(hasProperty(obj, "b", isNumber));
    assertFalse(hasProperty(obj, "d", isString));
  });
});

Deno.test("hasOptionalProperty", async (t) => {
  await t.step("optional property with undefined", () => {
    const obj = { a: 1, b: undefined };

    assert(hasOptionalProperty(obj, "a", isNumber));
    assert(hasOptionalProperty(obj, "b")); // undefined is valid for optional
    assert(hasOptionalProperty(obj, "b", isString)); // undefined passes optional check
  });

  await t.step("optional property type validation", () => {
    const obj = { a: 1, b: "test" };

    assert(hasOptionalProperty(obj, "a", isNumber));
    assert(hasOptionalProperty(obj, "b", isString));
    assertFalse(hasOptionalProperty(obj, "a", isString));
    assertFalse(hasOptionalProperty(obj, "b", isNumber));
  });
});

Deno.test("doesNotHaveProperty", async (t) => {
  await t.step("property absence check", () => {
    const obj = { a: 1, b: "test", c: null };

    assert(doesNotHaveProperty(obj, "d"));
    assert(doesNotHaveProperty(obj, "x"));
    assert(doesNotHaveProperty(obj, "missing"));

    assertFalse(doesNotHaveProperty(obj, "a"));
    assertFalse(doesNotHaveProperty(obj, "b"));
    assertFalse(doesNotHaveProperty(obj, "c"));
  });

  await t.step("property with undefined value", () => {
    const obj = { a: 1, b: undefined };

    // Property 'b' exists even though its value is undefined
    assertFalse(doesNotHaveProperty(obj, "b"));

    // Property 'c' does not exist at all
    assert(doesNotHaveProperty(obj, "c"));
  });

  await t.step("symbol key absence check", () => {
    const sym1 = Symbol("test");
    const sym2 = Symbol("other");
    const obj = {
      [sym1]: "value1",
      regular: "value2",
    };

    assert(doesNotHaveProperty(obj, sym2));
    assertFalse(doesNotHaveProperty(obj, sym1));
    assertFalse(doesNotHaveProperty(obj, "regular"));
  });

  await t.step("empty object check", () => {
    const empty = {};

    assert(doesNotHaveProperty(empty, "a"));
    assert(doesNotHaveProperty(empty, "b"));

    // Prototype properties are still checked by 'in' operator
    assertFalse(doesNotHaveProperty(empty, "toString"));
  });

  await t.step("inherited properties", () => {
    const parent = { inherited: "value" };
    const child = Object.create(parent);
    child.own = "ownValue";

    assertFalse(doesNotHaveProperty(child, "own"));
    assertFalse(doesNotHaveProperty(child, "inherited")); // 'in' operator checks prototype chain

    assert(doesNotHaveProperty(child, "notThere"));
  });

  await t.step("type narrowing behavior", () => {
    const obj = { name: "Alice", age: 30 };
    const key: PropertyKey = "address";

    if (doesNotHaveProperty(obj, key)) {
      // At this point, TypeScript narrows the type to exclude 'key'
      // This demonstrates the type guard working correctly
      assert(true); // Property does not exist
    }
  });
});

Deno.test("tupleHas", async (t) => {
  await t.step("tuple index validation", () => {
    const tuple = [1, "test", true] as const;

    assert(tupleHas(tuple, 0, isNumber));
    assert(tupleHas(tuple, 1, isString));
    assert(tupleHas(tuple, 2, isBoolean));

    assertFalse(tupleHas(tuple, 0, isString));
    assertFalse(tupleHas(tuple, 1, isNumber));
    assertFalse(tupleHas(tuple, 3, isString)); // Index out of bounds
  });
});

Deno.test("includes", async (t) => {
  await t.step("array membership check", () => {
    const arr = [1, 2, 3] as const;

    assert(includes(arr, 1));
    assert(includes(arr, 2));
    assert(includes(arr, 3));

    assertFalse(includes(arr, 4));
    assertFalse(includes(arr, "1")); // Type matters
    assertFalse(includes(arr, null));
  });

  await t.step("string array membership", () => {
    const colors = ["red", "green", "blue"] as const;

    assert(includes(colors, "red"));
    assert(includes(colors, "green"));
    assert(includes(colors, "blue"));

    assertFalse(includes(colors, "yellow"));
    assertFalse(includes(colors, "Red")); // Case sensitive
  });
});

Deno.test("keyOf", async (t) => {
  await t.step("string key existence check", () => {
    const obj = { a: 1, b: "test", c: true };

    assert(keyOf("a", obj));
    assert(keyOf("b", obj));
    assert(keyOf("c", obj));

    assertFalse(keyOf("d", obj));
    assertFalse(keyOf("x", obj));
  });

  await t.step("number key existence check", () => {
    const arr = [10, 20, 30];

    assert(keyOf(0, arr));
    assert(keyOf(1, arr));
    assert(keyOf(2, arr));
    assert(keyOf("length", arr)); // Arrays have length property

    assertFalse(keyOf(3, arr)); // Out of bounds
    assertFalse(keyOf(100, arr));
  });

  await t.step("symbol key existence check", () => {
    const sym1 = Symbol("test");
    const sym2 = Symbol("other");
    const obj = {
      [sym1]: "value1",
      regular: "value2",
    };

    assert(keyOf(sym1, obj));
    assert(keyOf("regular", obj));

    assertFalse(keyOf(sym2, obj)); // Symbol not in object
  });

  await t.step("empty object check", () => {
    const empty = {};

    assertFalse(keyOf("a", empty));
    assert(keyOf("toString", empty)); // 'in' operator checks prototype chain
  });

  await t.step("type narrowing behavior", () => {
    const obj = { name: "Alice", age: 30, active: true };
    const key: PropertyKey = "name";

    if (keyOf(key, obj)) {
      // At this point, TypeScript should narrow 'key' to be keyof typeof obj
      // This demonstrates the type guard working correctly
      assert(obj[key] !== undefined); // Should not error
    }
  });

  await t.step("object with various property types", () => {
    const obj = {
      str: "string",
      num: 42,
      bool: false,
      nil: null,
      undef: undefined,
      nested: { inner: "value" },
    };

    assert(keyOf("str", obj));
    assert(keyOf("num", obj));
    assert(keyOf("bool", obj));
    assert(keyOf("nil", obj));
    assert(keyOf("undef", obj)); // undefined values still have the key
    assert(keyOf("nested", obj));

    assertFalse(keyOf("missing", obj));
  });

  await t.step("inherited properties", () => {
    const parent = { inherited: "value" };
    const child = Object.create(parent);
    child.own = "ownValue";

    assert(keyOf("own", child));
    assert(keyOf("inherited", child)); // 'in' operator checks prototype chain

    assertFalse(keyOf("notThere", child));
  });
});

Deno.test("formatErrorMessage", async (t) => {
  await t.step("handles primitive values", () => {
    assertEquals(formatErrorMessage("hello", "number"), "Expected number. Received: 'hello'");
    assertEquals(formatErrorMessage(42, "string"), "Expected string. Received: 42");
    assertEquals(formatErrorMessage(true, "number"), "Expected number. Received: true");
    assertEquals(formatErrorMessage(null, "string"), "Expected string. Received: null");
    assertEquals(formatErrorMessage(undefined, "string"), "Expected string. Received: undefined");
  });

  await t.step("handles NaN without producing null", () => {
    // Bug fix: JSON.stringify(NaN) returns "null", but we want "NaN"
    assertEquals(formatErrorMessage(NaN, "string"), "Expected string. Received: NaN");
  });

  await t.step("handles Infinity values", () => {
    // Bug fix: JSON.stringify(Infinity) returns "null", but we want "Infinity"
    assertEquals(formatErrorMessage(Infinity, "number"), "Expected number. Received: Infinity");
    assertEquals(formatErrorMessage(-Infinity, "number"), "Expected number. Received: -Infinity");
  });

  await t.step("handles BigInt without throwing", () => {
    // Bug fix: JSON.stringify(BigInt) throws TypeError
    assertEquals(formatErrorMessage(BigInt(123), "number"), "Expected number. Received: 123n");
    assertEquals(formatErrorMessage(BigInt(-456), "number"), "Expected number. Received: -456n");
  });

  await t.step("handles symbols without producing undefined", () => {
    // Bug fix: JSON.stringify(Symbol) returns undefined
    const sym = Symbol("test");
    assertEquals(formatErrorMessage(sym, "string"), "Expected string. Received: Symbol(test)");
    assertEquals(formatErrorMessage(Symbol(), "string"), "Expected string. Received: Symbol()");
  });

  await t.step("handles functions without producing undefined", () => {
    // Bug fix: JSON.stringify(function) returns undefined
    assertEquals(formatErrorMessage(() => {}, "object"), "Expected object. Received: [Function]");
    assertEquals(formatErrorMessage(function namedFn() {}, "object"), "Expected object. Received: [Function: namedFn]");
  });

  await t.step("handles circular references without throwing", () => {
    // Bug fix: JSON.stringify throws on circular references
    const circular: Record<string, unknown> = { a: 1 };
    circular.self = circular;
    const result = formatErrorMessage(circular, "array");
    assert(result.startsWith("Expected array. Received:"));
    // Should not throw, and should produce some fallback representation
  });

  await t.step("handles objects with BigInt properties", () => {
    const obj = { id: BigInt(999), name: "test" };
    assertEquals(formatErrorMessage(obj, "array"), 'Expected array. Received: {"id":"999n","name":"test"}');
  });

  await t.step("works without name parameter", () => {
    assertEquals(formatErrorMessage("test"), "Invalid value. Received: 'test'");
    assertEquals(formatErrorMessage(42), "Invalid value. Received: 42");
  });
});

Deno.test("unionOf", async (t) => {
  await t.step("creates union from multiple guards", () => {
    const isStringOrNumber = unionOf(isString, isNumber);

    assert(isStringOrNumber("hello"));
    assert(isStringOrNumber(42));
    assertFalse(isStringOrNumber(true));
    assertFalse(isStringOrNumber(null));
  });

  await t.step("works with single guard", () => {
    const justString = unionOf(isString);

    assert(justString("hello"));
    assertFalse(justString(42));
  });

  await t.step("validates correctly with three or more guards", () => {
    const isStringOrNumberOrBoolean = unionOf(isString, isNumber, isBoolean);

    assert(isStringOrNumberOrBoolean("hello"));
    assert(isStringOrNumberOrBoolean(42));
    assert(isStringOrNumberOrBoolean(true));
    assertFalse(isStringOrNumberOrBoolean(null));
    assertFalse(isStringOrNumberOrBoolean(undefined));
  });

  await t.step("validate method returns proper error messages", () => {
    const isStringOrNumber = unionOf(isString, isNumber);

    assertEquals(isStringOrNumber.validate("hello"), { value: "hello" });
    assertEquals(isStringOrNumber.validate(42), { value: 42 });
    assertEquals(isStringOrNumber.validate(true), {
      issues: [{ message: 'Expected string | number. Received: true' }],
    });
  });

  await t.step("throws error when called with no guards", () => {
    // TypeScript prevents this at compile time, but we also check at runtime
    // for cases where TypeScript is bypassed (e.g., plain JS usage)
    assertThrows(
      // @ts-expect-error - intentionally bypassing TS to test runtime check
      () => unionOf(),
      Error,
      "unionOf requires at least one type guard",
    );
  });
});
