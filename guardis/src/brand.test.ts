import { assert, assertEquals, assertFalse, assertThrows } from "@std/assert";
import { type Brand, createBrandedTypeGuard, type RemoveBrand } from "./brand.ts";
import { createTypeGuard, isNumber, isObject, isString } from "./guard.ts";
import { hasMeta, hasName } from "./introspect.ts";
import type { TypeGuard } from "./types.ts";
import { type Equals, assertType } from "./test-utils.ts";

// === Branded primitive types ===

type UserId = Brand<string, "UserId">;
type ProductId = Brand<string, "ProductId">;
type Score = Brand<number, "Score">;

const parseUserId = (val: unknown): string | null =>
  typeof val === "string" && val.startsWith("user_") ? val : null;

const parseProductId = (val: unknown): string | null =>
  typeof val === "string" && val.startsWith("prod_") ? val : null;

const parseScore = (val: unknown): number | null =>
  typeof val === "number" && val >= 0 && val <= 100 ? val : null;

Deno.test("createBrandedTypeGuard - basic functionality", async (t) => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);
  const isProductId = createBrandedTypeGuard<string, "ProductId">(parseProductId);

  await t.step("valid inputs pass", () => {
    assert(isUserId("user_123"));
    assert(isUserId("user_abc"));
    assert(isProductId("prod_456"));
  });

  await t.step("invalid inputs fail", () => {
    assertFalse(isUserId("prod_123"));
    assertFalse(isUserId("123"));
    assertFalse(isUserId(42));
    assertFalse(isUserId(null));
    assertFalse(isUserId(undefined));

    assertFalse(isProductId("user_123"));
    assertFalse(isProductId(42));
  });

  await t.step("branded types are not interchangeable at type level", () => {
    // These are compile-time checks — UserId and ProductId are distinct
    assertType<Equals<typeof isUserId, TypeGuard<UserId>>>();
    assertType<Equals<typeof isProductId, TypeGuard<ProductId>>>();

    // UserId !== ProductId at the type level
    type NotSame = [UserId] extends [ProductId] ? never : true;
    assertType<NotSame>();
  });
});

Deno.test("createBrandedTypeGuard - overload with Brand type param", async (t) => {
  // Second overload: pass the branded type directly
  const isUserId = createBrandedTypeGuard<UserId>(parseUserId);
  const isScore = createBrandedTypeGuard<Score>(parseScore);

  await t.step("basic functionality", () => {
    assert(isUserId("user_123"));
    assertFalse(isUserId("bad"));
    assertFalse(isUserId(42));

    assert(isScore(50));
    assert(isScore(0));
    assert(isScore(100));
    assertFalse(isScore(-1));
    assertFalse(isScore(101));
    assertFalse(isScore("50"));
  });

  await t.step("correct branded type inferred", () => {
    assertType<Equals<typeof isUserId, TypeGuard<UserId>>>();
    assertType<Equals<typeof isScore, TypeGuard<Score>>>();
    assertType<Equals<typeof isUserId._TYPE, UserId>>();
    assertType<Equals<typeof isScore._TYPE, Score>>();
  });
});

Deno.test("createBrandedTypeGuard - strict mode", async (t) => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);

  await t.step("valid input does not throw", () => {
    isUserId.strict("user_123");
  });

  await t.step("invalid input throws TypeError", () => {
    assertThrows(() => isUserId.strict("bad"), TypeError);
    assertThrows(() => isUserId.strict(42), TypeError);
    assertThrows(() => isUserId.strict(null), TypeError);
  });

  await t.step("custom error message is used", () => {
    assertThrows(() => isUserId.strict("bad", "Not a user ID"), TypeError, "Not a user ID");
  });
});

Deno.test("createBrandedTypeGuard - assert mode", () => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);
  const assertIsUserId: typeof isUserId.assert = isUserId.assert;

  assertIsUserId("user_123");
  assertThrows(() => assertIsUserId("bad"), TypeError);
});

Deno.test("createBrandedTypeGuard - optional mode", () => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);

  assert(isUserId.optional("user_123"));
  assert(isUserId.optional(undefined));
  assertFalse(isUserId.optional("bad"));
  assertFalse(isUserId.optional(null));
});

Deno.test("createBrandedTypeGuard - notEmpty mode", () => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);

  assert(isUserId.notEmpty("user_123"));
  assertFalse(isUserId.notEmpty(""));
  assertFalse(isUserId.notEmpty(null));
  assertFalse(isUserId.notEmpty(undefined));
});

Deno.test("createBrandedTypeGuard - validate method", async (t) => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);

  await t.step("valid input returns value", () => {
    const result = isUserId.validate("user_123");
    assert("value" in result);
    assertEquals(result.value, "user_123");
  });

  await t.step("invalid input returns issues", () => {
    const result = isUserId.validate("bad");
    assert("issues" in result && result.issues);
    assert(result.issues.length > 0);
  });
});

Deno.test("createBrandedTypeGuard - or method", () => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);
  const isUserIdOrNumber = isUserId.or(isNumber);

  assert(isUserIdOrNumber("user_123"));
  assert(isUserIdOrNumber(42));
  assertFalse(isUserIdOrNumber("bad"));
  assertFalse(isUserIdOrNumber(null));
});

Deno.test("createBrandedTypeGuard - extend method", () => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);
  const isLongUserId = isUserId.extend((val) => val.length > 10 ? val : null);

  assert(isLongUserId("user_123456"));
  assertFalse(isLongUserId("user_1")); // too short
  assertFalse(isLongUserId("bad_long_string")); // fails base guard
});

Deno.test("createBrandedTypeGuard - StandardSchemaV1 compatibility", () => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);

  assert(isUserId["~standard"]);
  assertEquals(isUserId["~standard"].version, 1);
  assertEquals(isUserId["~standard"].vendor, "guardis");
  assert(typeof isUserId["~standard"].validate === "function");
});

// === Named branded type guards ===

Deno.test("createBrandedTypeGuard - name infers brand type", async (t) => {
  // No explicit type params needed — B is inferred from "UserId"
  const isUserId = createBrandedTypeGuard("UserId", parseUserId);

  await t.step("valid inputs pass", () => {
    assert(isUserId("user_123"));
  });

  await t.step("invalid inputs fail", () => {
    assertFalse(isUserId("bad"));
    assertFalse(isUserId(42));
  });

  await t.step("name is stored in metadata", () => {
    assert(hasName(isUserId));
    assertEquals(isUserId._.name, "UserId");
  });

  await t.step("name appears in validation error messages", () => {
    const result = isUserId.validate("bad");
    assert("issues" in result && result.issues);
    assert(result.issues[0].message.includes("UserId"));
  });

  await t.step("infers Brand<string, 'UserId'> from name", () => {
    assertType<Equals<typeof isUserId, TypeGuard<Brand<string, "UserId">>>>();
  });
});

Deno.test("createBrandedTypeGuard - name infers brand for number type", async (t) => {
  const isScore = createBrandedTypeGuard("Score", parseScore);

  await t.step("valid inputs pass", () => {
    assert(isScore(50));
  });

  await t.step("invalid inputs fail", () => {
    assertFalse(isScore(-1));
  });

  await t.step("name is stored in metadata", () => {
    assert(hasName(isScore));
    assertEquals(isScore._.name, "Score");
  });

  await t.step("infers Brand<number, 'Score'> from name", () => {
    assertType<Equals<typeof isScore, TypeGuard<Brand<number, "Score">>>>();
  });
});

Deno.test("createBrandedTypeGuard - without name has undefined name", () => {
  const isUserId = createBrandedTypeGuard<string, "UserId">(parseUserId);
  assert(hasMeta(isUserId));
  assertEquals(isUserId._.name, undefined);
});

// === Branded object types ===

type User = Brand<{ name: string; age: number }, "User">;

Deno.test("createBrandedTypeGuard - branded object type", async (t) => {
  const isUser = createBrandedTypeGuard<User>((v, { has }) =>
    isObject(v) && has(v, "name", isString) && has(v, "age", isNumber) ? v : null
  );

  await t.step("valid objects pass", () => {
    assert(isUser({ name: "Alice", age: 30 }));
  });

  await t.step("invalid objects fail", () => {
    assertFalse(isUser({ name: "Alice" }));
    assertFalse(isUser({ name: 123, age: 30 }));
    assertFalse(isUser("not an object"));
    assertFalse(isUser(null));
  });

  await t.step("full TypeGuard API works", () => {
    isUser.strict({ name: "Alice", age: 30 });
    assertThrows(() => isUser.strict({ name: "Alice" }), TypeError);

    assert(isUser.optional({ name: "Alice", age: 30 }));
    assert(isUser.optional(undefined));
    assertFalse(isUser.optional(null));

    const result = isUser.validate({ name: "Alice", age: 30 });
    assert("value" in result);
  });

  await t.step("correct branded type inferred", () => {
    assertType<Equals<typeof isUser._TYPE, User>>();
    assertType<Equals<typeof isUser, TypeGuard<User>>>();
  });
});

// === Branded type with shape-created guard ===

Deno.test("createBrandedTypeGuard - with shape-created base guard", async (t) => {
  // Create a shape guard, then use its parser to brand it
  const isUserShape = createTypeGuard({ name: isString, age: isNumber });

  type BrandedUser = Brand<typeof isUserShape._TYPE, "User">;
  const isBrandedUser = createBrandedTypeGuard<typeof isUserShape._TYPE, "User">(
    (v) => isUserShape(v) ? v as typeof isUserShape._TYPE : null,
  );

  await t.step("valid objects pass", () => {
    assert(isBrandedUser({ name: "Alice", age: 30 }));
  });

  await t.step("invalid objects fail", () => {
    assertFalse(isBrandedUser({ name: 123, age: 30 }));
    assertFalse(isBrandedUser("not an object"));
  });

  await t.step("infers branded type", () => {
    assertType<Equals<typeof isBrandedUser._TYPE, BrandedUser>>();
  });
});

// === RemoveBrand type tests ===

Deno.test("RemoveBrand - compile-time type stripping", () => {
  assertType<Equals<RemoveBrand<Brand<string, "X">>, string>>();
  assertType<Equals<RemoveBrand<Brand<number, "X">>, number>>();
  assertType<Equals<RemoveBrand<Brand<{ a: string }, "X">>, { a: string }>>();
});
