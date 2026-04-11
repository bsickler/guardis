import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { batch } from "./batch.ts";
import { isArray, isNumber, isString } from "./guard.ts";

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

Deno.test("batch with TypeGuardShape", async (t) => {
  const { isPerson, isAddress } = batch({
    Person: { name: isString, age: isNumber },
    Address: { street: isString, city: isString, zip: isNumber },
  });

  await t.step("basic functionality", () => {
    assert(isPerson({ name: "Alice", age: 30 }));
    assert(isAddress({ street: "123 Main", city: "Springfield", zip: 62701 }));

    assertFalse(isPerson({ name: "Alice", age: "thirty" }));
    assertFalse(isPerson({ name: 123, age: 30 }));
    assertFalse(isPerson("not an object"));
    assertFalse(isPerson(null));
    assertFalse(isPerson(undefined));

    assertFalse(isAddress({ street: "123 Main", city: "Springfield", zip: "62701" }));
    assertFalse(isAddress({ street: "123 Main" }));
  });

  await t.step("strict mode", () => {
    isPerson.strict({ name: "Alice", age: 30 });
    isAddress.strict({ street: "123 Main", city: "Springfield", zip: 62701 });

    assertThrows(() => isPerson.strict({ name: "Alice", age: "thirty" }), TypeError);
    assertThrows(() => isAddress.strict({ street: 123, city: "Springfield", zip: 62701 }), TypeError);
  });

  await t.step("assert mode", () => {
    const assertIsPerson: typeof isPerson.assert = isPerson.assert;
    assertIsPerson({ name: "Alice", age: 30 });
    assertThrows(() => assertIsPerson({ name: "Alice", age: "thirty" }), TypeError);
  });

  await t.step("optional mode", () => {
    assert(isPerson.optional({ name: "Alice", age: 30 }));
    assert(isPerson.optional(undefined));
    assertFalse(isPerson.optional(null));
    assertFalse(isPerson.optional({ name: "Alice", age: "thirty" }));
  });

  await t.step("notEmpty mode", () => {
    assert(isPerson.notEmpty({ name: "Alice", age: 30 }));
    assertFalse(isPerson.notEmpty(null));
    assertFalse(isPerson.notEmpty(undefined));
    assertFalse(isPerson.notEmpty({}));
  });

  await t.step("validate method", () => {
    const valid = isPerson.validate({ name: "Alice", age: 30 });
    assert("value" in valid);
    assertEquals(valid.value, { name: "Alice", age: 30 });

    const invalid = isPerson.validate({ name: "Alice", age: "thirty" });
    assert("issues" in invalid && invalid.issues);
    assert(invalid.issues.length > 0);
  });

  await t.step("or method", () => {
    const isPersonOrString = isPerson.or(isString);
    assert(isPersonOrString({ name: "Alice", age: 30 }));
    assert(isPersonOrString("hello"));
    assertFalse(isPersonOrString(42));
  });

  await t.step("extend method", () => {
    const isAdult = isPerson.extend((val) => val.age >= 18 ? val : null);
    assert(isAdult({ name: "Alice", age: 30 }));
    assertFalse(isAdult({ name: "Charlie", age: 10 }));
  });
});

Deno.test("batch with mixed parsers and shapes", async (t) => {
  const { isColor, isUser } = batch({
    Color: (v) => typeof v === "string" && ["red", "green", "blue"].includes(v) ? v : null,
    User: { name: isString, email: isString },
  });

  await t.step("parser-based guard works", () => {
    assert(isColor("red"));
    assert(isColor("green"));
    assertFalse(isColor("yellow"));
    assertFalse(isColor(42));
  });

  await t.step("shape-based guard works", () => {
    assert(isUser({ name: "Alice", email: "alice@example.com" }));
    assertFalse(isUser({ name: "Alice" }));
    assertFalse(isUser({ name: 123, email: "test" }));
  });

  await t.step("both have full TypeGuard API", () => {
    // Parser guard
    isColor.strict("red");
    assertThrows(() => isColor.strict("yellow"), TypeError);
    assert(isColor.optional("red"));
    assert(isColor.optional(undefined));

    // Shape guard
    isUser.strict({ name: "Alice", email: "alice@example.com" });
    assertThrows(() => isUser.strict({ name: 123, email: "test" }), TypeError);
    assert(isUser.optional({ name: "Alice", email: "alice@example.com" }));
    assert(isUser.optional(undefined));
  });
});

Deno.test("batch with shape using guard modes as field values", async (t) => {
  const { isForm } = batch({
    Form: {
      required: isString,
      optional: isString.optional,
      union: isString.or(isNumber),
      tags: isArray.of(isString),
    },
  });

  await t.step("accepts valid input with all mode variants", () => {
    assert(isForm({ required: "hello", optional: "world", union: 42, tags: ["a"] }));
    assert(isForm({ required: "hello", optional: undefined, union: "text", tags: [] }));
    assert(isForm({ required: "hello", union: 42, tags: ["a", "b"] }));
  });

  await t.step("rejects invalid inputs per field mode", () => {
    assertFalse(isForm({ required: 123, optional: undefined, union: 42, tags: ["a"] }));
    assertFalse(isForm({ required: "hello", optional: 123, union: 42, tags: ["a"] }));
    assertFalse(isForm({ required: "hello", optional: undefined, union: true, tags: ["a"] }));
    assertFalse(isForm({ required: "hello", optional: undefined, union: 42, tags: [1] }));
  });

  await t.step("validate returns issues", () => {
    const result = isForm.validate({ required: 123, optional: 456, union: true, tags: "bad" });
    assert("issues" in result && result.issues);
    assert(result.issues.length > 0);
  });
});
