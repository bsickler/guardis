import { assert, assertFalse, assertThrows } from "@std/assert";
import { batch } from "./batch.ts";

// Standard test values for consistency across all type guard tests
const TEST_VALUES = {
  // Test-specific values
  meatball: "meatball",
  sausage: "sausage",
  spaghetti: "spaghetti",

  // Common primitive values
  string: "test",
  emptyString: "",
  number: 42,
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

Deno.test("batch function", async (t) => {
  const { isMeatball, isSausage, isSpaghetti } = batch({
    Meatball: (v) => v === "meatball" ? v : null,
    Sausage: (v) => v === "sausage" ? v : null,
    spaghetti: (v) => v === "spaghetti" ? v : null,
  });

  await t.step("basic functionality", () => {
    // Verify guards exist
    assert(isMeatball);
    assert(isSausage);
    assert(isSpaghetti);

    // Valid inputs for each guard
    assert(isMeatball(TEST_VALUES.meatball));
    assert(isSausage(TEST_VALUES.sausage));
    assert(isSpaghetti(TEST_VALUES.spaghetti));

    // Invalid inputs for each guard
    assertFalse(isMeatball(TEST_VALUES.sausage));
    assertFalse(isMeatball(TEST_VALUES.spaghetti));
    assertFalse(isSausage(TEST_VALUES.meatball));
    assertFalse(isSausage(TEST_VALUES.spaghetti));
    assertFalse(isSpaghetti(TEST_VALUES.meatball));
    assertFalse(isSpaghetti(TEST_VALUES.sausage));

    // Common invalid inputs
    assertFalse(isMeatball(TEST_VALUES.string));
    assertFalse(isMeatball(TEST_VALUES.number));
    assertFalse(isMeatball(TEST_VALUES.nullValue));
    assertFalse(isMeatball(TEST_VALUES.undefinedValue));
    assertFalse(isMeatball(TEST_VALUES.object));
    assertFalse(isMeatball(TEST_VALUES.array));
  });

  await t.step("strict mode", () => {
    // Verify strict methods exist
    assert("strict" in isMeatball);
    assert("strict" in isSausage);
    assert("strict" in isSpaghetti);

    // Valid inputs don't throw
    isMeatball.strict(TEST_VALUES.meatball);
    isSausage.strict(TEST_VALUES.sausage);
    isSpaghetti.strict(TEST_VALUES.spaghetti);

    // Invalid inputs throw
    assertThrows(() => isMeatball.strict(TEST_VALUES.sausage));
    assertThrows(() => isMeatball.strict(TEST_VALUES.string));
    assertThrows(() => isMeatball.strict(TEST_VALUES.nullValue));
    assertThrows(() => isSausage.strict(TEST_VALUES.meatball));
    assertThrows(() => isSpaghetti.strict(TEST_VALUES.sausage));
  });

  await t.step("assert mode", () => {
    // Verify assert methods exist
    assert("assert" in isMeatball);
    assert("assert" in isSausage);
    assert("assert" in isSpaghetti);

    const assertIsMeatball: typeof isMeatball.assert = isMeatball.assert;
    const assertIsSausage: typeof isSausage.assert = isSausage.assert;
    const assertIsSpaghetti: typeof isSpaghetti.assert = isSpaghetti.assert;

    // Valid inputs don't throw
    assertIsMeatball(TEST_VALUES.meatball);
    assertIsSausage(TEST_VALUES.sausage);
    assertIsSpaghetti(TEST_VALUES.spaghetti);

    // Invalid inputs throw
    assertThrows(() => assertIsMeatball(TEST_VALUES.sausage));
    assertThrows(() => assertIsSausage(TEST_VALUES.meatball));
    assertThrows(() => assertIsSpaghetti(TEST_VALUES.sausage));
  });

  await t.step("optional mode", () => {
    // Verify optional methods exist
    assert("optional" in isMeatball);
    assert("optional" in isSausage);
    assert("optional" in isSpaghetti);

    // Valid inputs
    assert(isMeatball.optional(TEST_VALUES.meatball));
    assert(isMeatball.optional(TEST_VALUES.undefinedValue));
    assert(isSausage.optional(TEST_VALUES.sausage));
    assert(isSausage.optional(TEST_VALUES.undefinedValue));
    assert(isSpaghetti.optional(TEST_VALUES.spaghetti));
    assert(isSpaghetti.optional(TEST_VALUES.undefinedValue));

    // Invalid inputs
    assertFalse(isMeatball.optional(TEST_VALUES.sausage));
    assertFalse(isMeatball.optional(TEST_VALUES.nullValue));
    assertFalse(isSausage.optional(TEST_VALUES.meatball));
    assertFalse(isSpaghetti.optional(TEST_VALUES.sausage));
  });

  await t.step("notEmpty mode", () => {
    // Verify notEmpty methods exist
    assert("notEmpty" in isMeatball);
    assert("notEmpty" in isSausage);
    assert("notEmpty" in isSpaghetti);
  });
});
