import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { extend } from "./extend.ts";
import { isArray, isNumber, isString } from "./guard.ts";

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

Deno.test("extend with TypeGuardShape", async (t) => {
  const Is = extend({
    Person: { name: isString, age: isNumber },
    Address: { street: isString, city: isString, zip: isNumber },
  });

  await t.step("basic functionality", () => {
    assert(Is.Person({ name: "Alice", age: 30 }));
    assert(Is.Address({ street: "123 Main", city: "Springfield", zip: 62701 }));

    assertFalse(Is.Person({ name: "Alice", age: "thirty" }));
    assertFalse(Is.Person("not an object"));
    assertFalse(Is.Person(null));

    assertFalse(Is.Address({ street: "123 Main" }));
    assertFalse(Is.Address({ street: 123, city: "Springfield", zip: 62701 }));
  });

  await t.step("strict mode", () => {
    Is.Person.strict({ name: "Alice", age: 30 });
    assertThrows(() => Is.Person.strict({ name: "Alice", age: "thirty" }), TypeError);
  });

  await t.step("assert mode", () => {
    const assertIsPerson: typeof Is.Person.assert = Is.Person.assert;
    assertIsPerson({ name: "Alice", age: 30 });
    assertThrows(() => assertIsPerson({ name: 123, age: 30 }), TypeError);
  });

  await t.step("optional mode", () => {
    assert(Is.Person.optional({ name: "Alice", age: 30 }));
    assert(Is.Person.optional(undefined));
    assertFalse(Is.Person.optional(null));
    assertFalse(Is.Person.optional({ name: "Alice", age: "thirty" }));
  });

  await t.step("notEmpty mode", () => {
    assert(Is.Person.notEmpty({ name: "Alice", age: 30 }));
    assertFalse(Is.Person.notEmpty(null));
    assertFalse(Is.Person.notEmpty(undefined));
    assertFalse(Is.Person.notEmpty({}));
  });

  await t.step("validate method", () => {
    const valid = Is.Person.validate({ name: "Alice", age: 30 });
    assert("value" in valid);
    assertEquals(valid.value, { name: "Alice", age: 30 });

    const invalid = Is.Person.validate({ name: "Alice", age: "thirty" });
    assert("issues" in invalid && invalid.issues);
    assert(invalid.issues.length > 0);
  });

  await t.step("or method", () => {
    const isPersonOrString = Is.Person.or(isString);
    assert(isPersonOrString({ name: "Alice", age: 30 }));
    assert(isPersonOrString("hello"));
    assertFalse(isPersonOrString(42));
  });

  await t.step("extend method", () => {
    const isAdult = Is.Person.extend((val) => val.age >= 18 ? val : null);
    assert(isAdult({ name: "Alice", age: 30 }));
    assertFalse(isAdult({ name: "Charlie", age: 10 }));
  });

  await t.step("preserves built-in Is guards", () => {
    assert(Is.String("hello"));
    assert(Is.Number(42));
    assert(Is.Boolean(true));
    assert(Is.Array([1, 2]));
    assert(Is.Object({ a: 1 }));
  });
});

Deno.test("extend with mixed parsers and shapes", async (t) => {
  const Is = extend({
    Color: (v: unknown) =>
      typeof v === "string" && ["red", "green", "blue"].includes(v) ? v : null,
    User: { name: isString, email: isString },
  });

  await t.step("parser-based guard works", () => {
    assert(Is.Color("red"));
    assertFalse(Is.Color("yellow"));
    assertFalse(Is.Color(42));
  });

  await t.step("shape-based guard works", () => {
    assert(Is.User({ name: "Alice", email: "a@b.com" }));
    assertFalse(Is.User({ name: "Alice" }));
    assertFalse(Is.User({ name: 123, email: "a@b.com" }));
  });

  await t.step("both have full TypeGuard API", () => {
    Is.Color.strict("red");
    assertThrows(() => Is.Color.strict("yellow"), TypeError);

    Is.User.strict({ name: "Alice", email: "a@b.com" });
    assertThrows(() => Is.User.strict({ name: 123, email: "a@b.com" }), TypeError);

    assert(Is.Color.optional("red"));
    assert(Is.Color.optional(undefined));
    assert(Is.User.optional({ name: "Alice", email: "a@b.com" }));
    assert(Is.User.optional(undefined));
  });

  await t.step("preserves built-in Is guards alongside custom", () => {
    assert(Is.String("hello"));
    assert(Is.Number(42));
    assert(Is.Color("red"));
    assert(Is.User({ name: "Alice", email: "a@b.com" }));
  });
});

Deno.test("extend chaining with shapes", async (t) => {
  await t.step("second extend adds shape to existing extension", () => {
    const Is1 = extend({
      Color: (v: unknown) =>
        typeof v === "string" && ["red", "green", "blue"].includes(v) ? v : null,
    });

    const Is2 = extend(Is1, {
      Person: { name: isString, age: isNumber },
    });

    // Both guards work
    assert(Is2.Color("red"));
    assert(Is2.Person({ name: "Alice", age: 30 }));

    // Built-ins preserved
    assert(Is2.String("hello"));

    // Original unchanged
    assertFalse("Person" in Is1);
  });

  await t.step("chaining shape then parser", () => {
    const Is1 = extend({
      Person: { name: isString, age: isNumber },
    });

    const Is2 = extend(Is1, {
      Meatball: (v: unknown) => v === "meatball" ? v : null,
    });

    assert(Is2.Person({ name: "Alice", age: 30 }));
    assert(Is2.Meatball("meatball"));
    assertFalse(Is2.Person({ name: 123, age: 30 }));
    assertFalse(Is2.Meatball("sausage"));
  });
});

Deno.test("extend with shape using guard modes as field values", async (t) => {
  const Is = extend({
    Form: {
      required: isString,
      optional: isString.optional,
      union: isString.or(isNumber),
      tags: isArray.of(isString),
    },
  });

  await t.step("accepts valid input with all mode variants", () => {
    assert(Is.Form({ required: "hello", optional: undefined, union: 42, tags: ["a"] }));
    assert(Is.Form({ required: "hello", optional: "world", union: "text", tags: [] }));
  });

  await t.step("rejects invalid inputs per field mode", () => {
    assertFalse(Is.Form({ required: 123, optional: undefined, union: 42, tags: ["a"] }));
    assertFalse(Is.Form({ required: "hello", optional: 123, union: 42, tags: ["a"] }));
    assertFalse(Is.Form({ required: "hello", optional: undefined, union: true, tags: ["a"] }));
    assertFalse(Is.Form({ required: "hello", optional: undefined, union: 42, tags: [1] }));
  });

  await t.step("validate returns issues", () => {
    const result = Is.Form.validate({ required: 123, optional: 456, union: true, tags: "bad" });
    assert("issues" in result && result.issues);
    assert(result.issues.length > 0);
  });
});
