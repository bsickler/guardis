import { assert, assertFalse, assertThrows } from "@std/assert";
import { extend } from "./extend.ts";

// Standard test values for consistency across all type guard tests
const TEST_VALUES = {
  // Test-specific values
  meatball: "meatball",
  sausage: "sausage",
  ten: 10,

  // Common primitive values
  string: "test",
  emptyString: "",
  number: 42,
  one: 1,
  zero: 0,
  boolean: true,
  booleanFalse: false,
  nullValue: null,
  undefinedValue: undefined,

  // Complex values
  object: { a: 1, b: "test" },
  array: [1, 2, 3],
  function: () => {},
} as const;

Deno.test("extend function", async (t) => {
  await t.step("basic functionality", () => {
    const Is = extend({
      MySillyType: (v: unknown) => {
        if (v === 10 || v === "meatball") {
          return v;
        }
        return null;
      },
    });

    // Verify guard exists
    assert("MySillyType" in Is);

    // Valid inputs
    assert(Is.MySillyType(TEST_VALUES.ten));
    assert(Is.MySillyType(TEST_VALUES.meatball));

    // Invalid inputs
    assertFalse(Is.MySillyType(TEST_VALUES.one));
    assertFalse(Is.MySillyType(TEST_VALUES.sausage));
    assertFalse(Is.MySillyType(TEST_VALUES.string));
    assertFalse(Is.MySillyType(TEST_VALUES.nullValue));
    assertFalse(Is.MySillyType(TEST_VALUES.undefinedValue));
    assertFalse(Is.MySillyType(TEST_VALUES.object));
    assertFalse(Is.MySillyType(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    const Is = extend({
      MySillyType: (v: unknown) => {
        if (v === 10 || v === "meatball") {
          return v;
        }
        return null;
      },
    });

    // Verify strict method exists
    assert("strict" in Is.MySillyType);

    // Valid inputs don't throw
    Is.MySillyType.strict(TEST_VALUES.ten);
    Is.MySillyType.strict(TEST_VALUES.meatball);

    // Invalid inputs throw
    assertThrows(() => Is.MySillyType.strict(TEST_VALUES.sausage));
    assertThrows(() => Is.MySillyType.strict(TEST_VALUES.one));
    assertThrows(() => Is.MySillyType.strict(TEST_VALUES.string));
    assertThrows(() => Is.MySillyType.strict(TEST_VALUES.nullValue));
  });

  await t.step("assert mode", () => {
    const Is = extend({
      MySillyType: (v: unknown) => {
        if (v === 10 || v === "meatball") {
          return v;
        }
        return null;
      },
    });

    // Verify assert method exists
    assert("assert" in Is.MySillyType);

    const assertIsMySillyType: typeof Is.MySillyType.assert = Is.MySillyType.assert;

    // Valid inputs don't throw
    assertIsMySillyType(TEST_VALUES.ten);
    assertIsMySillyType(TEST_VALUES.meatball);

    // Invalid inputs throw
    assertThrows(() => assertIsMySillyType(TEST_VALUES.sausage));
    assertThrows(() => assertIsMySillyType(TEST_VALUES.one));
    assertThrows(() => assertIsMySillyType(TEST_VALUES.string));
  });

  await t.step("optional mode", () => {
    const Is = extend({
      MySillyType: (v: unknown) => {
        if (v === 10 || v === "meatball") {
          return v;
        }
        return null;
      },
    });

    // Verify optional method exists
    assert("optional" in Is.MySillyType);

    // Valid inputs
    assert(Is.MySillyType.optional(TEST_VALUES.ten));
    assert(Is.MySillyType.optional(TEST_VALUES.meatball));
    assert(Is.MySillyType.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(Is.MySillyType.optional(TEST_VALUES.sausage));
    assertFalse(Is.MySillyType.optional(TEST_VALUES.one));
    assertFalse(Is.MySillyType.optional(TEST_VALUES.nullValue));
  });

  await t.step("notEmpty mode", () => {
    const Is = extend({
      MySillyType: (v: unknown) => {
        if (v === 10 || v === "meatball") {
          return v;
        }
        return null;
      },
    });

    // Verify notEmpty method exists
    assert("notEmpty" in Is.MySillyType);
  });
});

Deno.test("extend iteration and chaining", async (t) => {
  await t.step("basic functionality", () => {
    const Is = extend({
      Meatball: (v: unknown) => v === "meatball" ? v : null,
    });

    // Verify first extension
    assert("Meatball" in Is);
    assert(Is.Meatball(TEST_VALUES.meatball));
    assertFalse(Is.Meatball(TEST_VALUES.one));
    assertFalse(Is.Meatball(TEST_VALUES.sausage));

    // Verify Sausage doesn't exist yet
    assertFalse("Sausage" in Is);

    // Create second extension
    const IsTwo = extend(Is, {
      Sausage: (v: unknown) => v === "sausage" ? v : null,
    });

    // Verify both guards exist in new extension
    assert("Sausage" in IsTwo);
    assert(IsTwo.Sausage(TEST_VALUES.sausage));
    assertFalse(IsTwo.Sausage(TEST_VALUES.one));
    assertFalse(IsTwo.Sausage(TEST_VALUES.meatball));

    assert("Meatball" in IsTwo);
    assert(IsTwo.Meatball(TEST_VALUES.meatball));
    assertFalse(IsTwo.Meatball(TEST_VALUES.one));
    assertFalse(IsTwo.Meatball(TEST_VALUES.sausage));

    // Verify original extension unchanged
    assertFalse("Sausage" in Is);
  });

  await t.step("strict mode", () => {
    const Is = extend({
      Meatball: (v: unknown) => v === "meatball" ? v : null,
    });

    const IsTwo = extend(Is, {
      Sausage: (v: unknown) => v === "sausage" ? v : null,
    });

    // Valid inputs don't throw
    IsTwo.Meatball.strict(TEST_VALUES.meatball);
    IsTwo.Sausage.strict(TEST_VALUES.sausage);

    // Invalid inputs throw
    assertThrows(() => IsTwo.Meatball.strict(TEST_VALUES.sausage));
    assertThrows(() => IsTwo.Sausage.strict(TEST_VALUES.meatball));
    assertThrows(() => IsTwo.Meatball.strict(TEST_VALUES.one));
    assertThrows(() => IsTwo.Sausage.strict(TEST_VALUES.one));
  });

  await t.step("assert mode", () => {
    const Is = extend({
      Meatball: (v: unknown) => v === "meatball" ? v : null,
    });

    const IsTwo = extend(Is, {
      Sausage: (v: unknown) => v === "sausage" ? v : null,
    });

    const assertIsMeatball: typeof IsTwo.Meatball.assert = IsTwo.Meatball.assert;
    const assertIsSausage: typeof IsTwo.Sausage.assert = IsTwo.Sausage.assert;

    // Valid inputs don't throw
    assertIsMeatball(TEST_VALUES.meatball);
    assertIsSausage(TEST_VALUES.sausage);

    // Invalid inputs throw
    assertThrows(() => assertIsMeatball(TEST_VALUES.sausage));
    assertThrows(() => assertIsSausage(TEST_VALUES.meatball));
  });

  await t.step("optional mode", () => {
    const Is = extend({
      Meatball: (v: unknown) => v === "meatball" ? v : null,
    });

    const IsTwo = extend(Is, {
      Sausage: (v: unknown) => v === "sausage" ? v : null,
    });

    // Valid inputs
    assert(IsTwo.Meatball.optional(TEST_VALUES.meatball));
    assert(IsTwo.Meatball.optional(TEST_VALUES.undefinedValue));
    assert(IsTwo.Sausage.optional(TEST_VALUES.sausage));
    assert(IsTwo.Sausage.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(IsTwo.Meatball.optional(TEST_VALUES.sausage));
    assertFalse(IsTwo.Sausage.optional(TEST_VALUES.meatball));
    assertFalse(IsTwo.Meatball.optional(TEST_VALUES.nullValue));
    assertFalse(IsTwo.Sausage.optional(TEST_VALUES.nullValue));
  });
});
