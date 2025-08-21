import { assert, assertFalse } from "@std/assert";
import { isBoolean, isNull, isNumber, isString } from "./guard.ts";
import { hasOptionalProperty, hasProperty, includes, tupleHas } from "./utilities.ts";

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
