import { assert, assertFalse } from "@std/assert";
import { isBoolean, isNull, isNumber, isString } from "./guard.ts";
import { hasOptionalProperty, hasProperty, includes, keyOf, tupleHas } from "./utilities.ts";

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
